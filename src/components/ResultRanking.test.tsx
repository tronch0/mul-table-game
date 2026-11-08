// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { ResultRanking } from './ResultRanking'
const getRank = vi.hoisted(() => vi.fn())
vi.mock('../lib/api', () => ({ getAttemptRank: getRank }))
vi.mock('./RowCelebration', () => ({RowCelebration: ({awardRank}: {awardRank:number}) => <div data-award={awardRank}/> }))
let host: HTMLDivElement, root: ReturnType<typeof createRoot>
const cue=vi.fn()
const render = (ready=true) => act(async()=>root.render(<ResultRanking token="attempt" ready={ready} onCelebrate={cue}/>))
beforeEach(()=>{vi.clearAllMocks();Reflect.set(globalThis,'IS_REACT_ACT_ENVIRONMENT',true);host=document.createElement('div');root=createRoot(host)})
afterEach(()=>act(()=>root.unmount()))
it.each([1,2,3,4,10,11,56])('shows exact rank %i and celebrates only the top ten once',async(rank)=>{
 getRank.mockResolvedValue({rank,total:100});await render()
 expect(host.textContent).toContain(`מקום ${rank}`)
 expect(host.querySelector('[data-award]')?.getAttribute('data-award')??null).toBe(rank<=10?String(rank):null)
 await render();expect(cue).toHaveBeenCalledTimes(rank<=10?1:0)
})
it('waits for the row finale before starting the rank celebration',async()=>{
 getRank.mockResolvedValue({rank:1,total:5});await render(false)
 expect(cue).not.toHaveBeenCalled();await render(true);expect(cue).toHaveBeenCalledWith(1)
})
it('offers retry without inventing a rank when the request fails',async()=>{
 getRank.mockRejectedValueOnce(Error('offline')).mockResolvedValueOnce({rank:3,total:9});await render()
 expect(host.querySelector('[data-award]')).toBeNull()
 await act(async()=>host.querySelector('button')!.click())
 expect(host.textContent).toContain('מקום 3')
})
it('does not celebrate removed attempts',async()=>{getRank.mockResolvedValue(null);await render();expect(cue).not.toHaveBeenCalled();expect(host.textContent).toContain('אינו מופיע')})
