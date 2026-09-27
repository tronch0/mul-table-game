import { createClient } from '@supabase/supabase-js'
import type { GameState, Score } from './game'
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
export const configured = Boolean(url && key)
// Only public/publishable keys belong in the static bundle. Admin authorization lives in Postgres.
export const supabase = configured ? createClient(url, key, { auth: { storageKey: 'multiply.admin.v1', persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } }) : null
export class GameApiError extends Error { constructor(public code: string) { super(code) } }
export async function rpc<T>(name: string, args: Record<string, unknown> = {}): Promise<T> {
  if (!supabase) throw new GameApiError('NOT_CONFIGURED')
  const { data, error } = await supabase.rpc(name, args).abortSignal(AbortSignal.timeout(15000))
  if (error) throw new GameApiError(error.message.includes('SESSION_NOT_FOUND') ? 'SESSION_NOT_FOUND' : error.message.includes('RATE_LIMIT') ? 'RATE_LIMIT' : 'NETWORK')
  return data as T
}
type ServerState = { solved: number; elapsed_ms: number; finished: boolean; question: { id: number; a: number; b: number } | null; player_name: string; correct?: boolean }
export function fromServer(server: ServerState, token: string): GameState {
  return { token, name: server.player_name, mode: 'competition', solved: server.solved, elapsed: server.elapsed_ms, startedAt: Date.now() - server.elapsed_ms, finished: server.finished, question: server.question }
}
export async function startCompetition(name: string, token: string) { return fromServer(await rpc<ServerState>('start_game', { p_name: name, p_token: token }), token) }
export async function resumeCompetition(token: string) { return fromServer(await rpc<ServerState>('get_game', { p_token: token }), token) }
export async function submitAnswer(game: GameState, answer: string) {
  const state = await rpc<ServerState>('answer_question', { p_token: game.token, p_question: game.question!.id, p_answer: Number(answer) })
  return { game: fromServer(state, game.token), correct: state.correct === true }
}
export async function finishCompetition(token: string) { return fromServer(await rpc<ServerState>('finish_game', { p_token: token }), token) }
export async function getScores(offset = 0) { return rpc<Score[]>('get_leaderboard', { p_offset: offset }) }
