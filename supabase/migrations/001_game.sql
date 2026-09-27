-- Run once in a new Supabase project's SQL editor. No secrets belong in this file.
begin;
create schema if not exists game_private;
revoke all on schema game_private from public, anon, authenticated;

create table game_private.games (
  id uuid primary key default gen_random_uuid(),
  token uuid not null unique,
  player_name text not null check (char_length(player_name) between 1 and 24),
  -- Reserved for a future classroom feature; never supplied by today's client.
  classroom_id uuid,
  deck smallint[] not null check (array_length(deck, 1) = 100),
  solved smallint not null default 0 check (solved between 0 and 100),
  started_at timestamptz not null default clock_timestamp(),
  finished_at timestamptz,
  elapsed_ms bigint check (elapsed_ms >= 0)
);
create index games_leaderboard on game_private.games (solved desc, elapsed_ms, finished_at, id) where finished_at is not null;
create index games_unfinished on game_private.games (started_at) where finished_at is null;
create table game_private.admins (user_id uuid primary key references auth.users(id) on delete cascade);
alter table game_private.games enable row level security;
alter table game_private.admins enable row level security;
revoke all on all tables in schema game_private from public, anon, authenticated;

create function game_private.game_state(g game_private.games, correct boolean default null)
returns jsonb language sql volatile set search_path = '' as $$
  select jsonb_build_object(
    'player_name', g.player_name, 'solved', g.solved, 'finished', g.finished_at is not null,
    'elapsed_ms', coalesce(g.elapsed_ms, greatest(0, floor(extract(epoch from (clock_timestamp() - g.started_at)) * 1000)::bigint)),
    'correct', correct,
    'question', case when g.solved < 100 and g.finished_at is null then jsonb_build_object(
      'id', g.deck[g.solved + 1], 'a', g.deck[g.solved + 1] / 10 + 1, 'b', g.deck[g.solved + 1] % 10 + 1
    ) else null end
  );
$$;
revoke all on function game_private.game_state(game_private.games, boolean) from public, anon, authenticated;

create function public.start_game(p_name text, p_token uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare g game_private.games; clean_name text; cards smallint[];
begin
  clean_name := btrim(regexp_replace(p_name, '[[:cntrl:]]', '', 'g'));
  if p_token is null or clean_name is null or char_length(clean_name) not between 1 and 24 then raise exception 'INVALID_NAME'; end if;
  -- A retry with the same secret token returns the original game and cannot reset its clock.
  select * into g from game_private.games where token = p_token;
  if found then return game_private.game_state(g); end if;
  select array_agg(n::smallint order by random()) into cards from generate_series(0, 99) n;
  insert into game_private.games(token, player_name, deck) values(p_token, clean_name, cards)
    on conflict (token) do nothing;
  select * into g from game_private.games where token = p_token;
  -- Incomplete, abandoned games expire after seven days. Finished scores are retained.
  delete from game_private.games where finished_at is null and started_at < clock_timestamp() - interval '7 days';
  return game_private.game_state(g);
end;
$$;

create function public.get_game(p_token uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare g game_private.games;
begin
  select * into g from game_private.games where token = p_token;
  if not found then raise exception 'SESSION_NOT_FOUND'; end if;
  return game_private.game_state(g);
end;
$$;

create function public.answer_question(p_token uuid, p_question integer, p_answer integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare g game_private.games; current_card integer; is_correct boolean;
begin
  select * into g from game_private.games where token = p_token for update;
  if not found then raise exception 'SESSION_NOT_FOUND'; end if;
  -- Network retries are idempotent. A solved question can never earn another point.
  if p_question = any(g.deck[1:g.solved]) then return game_private.game_state(g, true); end if;
  if g.finished_at is not null then return game_private.game_state(g, false); end if;
  current_card := g.deck[g.solved + 1];
  if p_question is distinct from current_card then raise exception 'QUESTION_MISMATCH'; end if;
  is_correct := coalesce(p_answer = (current_card / 10 + 1) * (current_card % 10 + 1), false);
  if is_correct then
    update game_private.games set solved = solved + 1,
      finished_at = case when solved = 99 then clock_timestamp() else null end,
      elapsed_ms = case when solved = 99 then greatest(0, floor(extract(epoch from (clock_timestamp() - started_at)) * 1000)::bigint) else null end
    where id = g.id returning * into g;
  end if;
  return game_private.game_state(g, is_correct);
end;
$$;

create function public.finish_game(p_token uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare g game_private.games;
begin
  select * into g from game_private.games where token = p_token for update;
  if not found then raise exception 'SESSION_NOT_FOUND'; end if;
  if g.finished_at is null then
    update game_private.games set finished_at = clock_timestamp(),
      elapsed_ms = greatest(0, floor(extract(epoch from (clock_timestamp() - started_at)) * 1000)::bigint)
    where id = g.id returning * into g;
  end if;
  return game_private.game_state(g);
end;
$$;

create function public.get_leaderboard(p_offset integer default 0)
returns jsonb language sql security definer set search_path = '' as $$
  select coalesce(jsonb_agg(row_to_json(s)), '[]'::jsonb) from (
    select id, player_name, solved, elapsed_ms, finished_at from game_private.games
    where finished_at is not null
    order by solved desc, elapsed_ms asc, finished_at asc, id asc
    limit 50 offset greatest(0, least(coalesce(p_offset, 0), 100000))
  ) s;
$$;

create function public.is_game_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from game_private.admins where user_id = auth.uid());
$$;
create function public.delete_attempt(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_game_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  delete from game_private.games where id = p_id and finished_at is not null;
end;
$$;
create function public.reset_competition()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_game_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  -- Invalidate active games too, so old rounds cannot repopulate a cleared competition.
  delete from game_private.games;
end;
$$;

revoke all on function public.start_game(text, uuid), public.get_game(uuid), public.answer_question(uuid, integer, integer), public.finish_game(uuid), public.get_leaderboard(integer), public.is_game_admin(), public.delete_attempt(uuid), public.reset_competition() from public, anon, authenticated;
grant execute on function public.start_game(text, uuid), public.get_game(uuid), public.answer_question(uuid, integer, integer), public.finish_game(uuid), public.get_leaderboard(integer), public.is_game_admin() to anon, authenticated;
grant execute on function public.delete_attempt(uuid), public.reset_competition() to authenticated;
commit;
