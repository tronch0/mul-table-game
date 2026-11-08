// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
import { RaceKey } from './RaceKey'
it('enters on press without repeating on click, and accepts keyboard activation', () => {
 Reflect.set(globalThis,'IS_REACT_ACT_ENVIRONMENT',true)
 const host=document.createElement('div');const root=createRoot(host);const digit=vi.fn()
 act(()=>root.render(<RaceKey value="7" disabled={false} onDigit={digit}/>))
 const key=host.querySelector('button')!
 act(()=>key.dispatchEvent(new MouseEvent('pointerdown',{bubbles:true,button:0})))
 expect(digit).toHaveBeenCalledTimes(1)
 act(()=>key.click());expect(digit).toHaveBeenCalledTimes(1)
 act(()=>key.dispatchEvent(new KeyboardEvent('keydown',{bubbles:true,key:'Enter'})))
 act(()=>key.click());expect(digit).toHaveBeenCalledTimes(2)
 act(()=>root.unmount())
})
