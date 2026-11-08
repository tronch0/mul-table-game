-- Rank the exact completed attempt, using the same total order as the leaderboard.
begin;
create function public.get_attempt_rank(p_token uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'rank', 1 + (select count(*) from game_private.games other
      where other.finished_at is not null and
        (-other.solved, other.elapsed_ms, other.finished_at, other.id) <
        (-g.solved, g.elapsed_ms, g.finished_at, g.id)),
    'total', (select count(*) from game_private.games where finished_at is not null)
  ) from game_private.games g where g.token = p_token and g.finished_at is not null;
$$;
revoke all on function public.get_attempt_rank(uuid) from public, anon, authenticated;
grant execute on function public.get_attempt_rank(uuid) to anon, authenticated;
commit;
