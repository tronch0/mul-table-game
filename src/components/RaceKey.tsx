import { useRef } from 'react'
export function RaceKey({ value, disabled, onDigit }: { value: string; disabled: boolean; onDigit: (value: string) => void }) {
  const pointerHandled = useRef(false)
  return <button type="button" disabled={disabled}
    onPointerDown={event => {
      if (event.button !== 0 || disabled) return
      event.preventDefault()
      pointerHandled.current = true
      onDigit(value)
    }}
    onKeyDown={() => { pointerHandled.current = false }}
    onPointerCancel={() => { pointerHandled.current = false }}
    onClick={() => {
      if (pointerHandled.current) { pointerHandled.current = false; return }
      onDigit(value)
    }}>{value}</button>
}
