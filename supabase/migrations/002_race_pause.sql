-- Apply after 001_game.sql. Existing scores are preserved.
begin;
alter table game_private.games add column paused_at timestamptz;
create or replace function game_private.game_state(g game_private.games, correct boolean default null)
returns jsonb language sql volatile set search_path = '' as $$
  select jsonb_build_object(
    'player_name', g.player_name, 'solved', g.solved, 'finished', g.finished_at is not null, 'paused', g.paused_at is not null,
    'elapsed_ms', coalesce(g.elapsed_ms, greatest(0, floor(extract(epoch from (coalesce(g.paused_at, clock_timestamp()) - g.started_at)) * 1000)::bigint)),
    'correct', correct,
    'question', case when g.solved < 100 and g.finished_at is null and g.paused_at is null then jsonb_build_object(
      'id', g.deck[g.solved + 1], 'a', g.deck[g.solved + 1] / 10 + 1, 'b', g.deck[g.solved + 1] % 10 + 1
    ) else null end
  );
$$;
revoke all on function game_private.game_state(game_private.games, boolean) from public, anon, authenticated;


create function public.pause_game(p_token uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare g game_private.games;
begin
 select * into g from game_private.games where token=p_token for update;
 if not found then raise exception 'SESSION_NOT_FOUND'; end if;
 if g.finished_at is null and g.paused_at is null then
  update game_private.games set paused_at=clock_timestamp() where id=g.id returning * into g;
 end if;
 return game_private.game_state(g);
end; $$;
create function public.resume_game(p_token uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare g game_private.games;
begin
 select * into g from game_private.games where token=p_token for update;
 if not found then raise exception 'SESSION_NOT_FOUND'; end if;
 if g.finished_at is null and g.paused_at is not null then
  update game_private.games set started_at=started_at+(clock_timestamp()-paused_at), paused_at=null where id=g.id returning * into g;
 end if;
 return game_private.game_state(g);
end; $$;
alter function public.answer_question(uuid,integer,integer) set schema game_private;
revoke all on function game_private.answer_question(uuid,integer,integer) from public,anon,authenticated;
create function public.answer_question(p_token uuid,p_question integer,p_answer integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare g game_private.games;
begin
 select * into g from game_private.games where token=p_token for update;
 if not found then raise exception 'SESSION_NOT_FOUND'; end if;
 if g.paused_at is not null then return game_private.game_state(g,false); end if;
 return game_private.answer_question(p_token,p_question,p_answer);
end; $$;
create or replace function public.finish_game(p_token uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare g game_private.games;
begin
 select * into g from game_private.games where token=p_token for update;
 if not found then raise exception 'SESSION_NOT_FOUND'; end if;
 if g.finished_at is null then
  update game_private.games set finished_at=clock_timestamp(),
   elapsed_ms=greatest(0,floor(extract(epoch from(coalesce(paused_at,clock_timestamp())-started_at))*1000)::bigint),paused_at=null
  where id=g.id returning * into g;
 end if;
 return game_private.game_state(g);
end; $$;
revoke all on function public.pause_game(uuid),public.resume_game(uuid),public.answer_question(uuid,integer,integer) from public,anon,authenticated;
grant execute on function public.pause_game(uuid),public.resume_game(uuid),public.answer_question(uuid,integer,integer) to anon,authenticated;
commit;
