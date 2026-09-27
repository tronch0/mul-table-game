import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'
export function Modal({ title, children, close, closeLabel }: { title: string; children: ReactNode; close: () => void; closeLabel: string }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => { const dialog = ref.current!; dialog.showModal(); return () => dialog.close() }, [])
  return <dialog ref={ref} className="modal" aria-labelledby="modal-title" onCancel={close} onClick={e => { if (e.target === e.currentTarget) close() }}>
    <div className="modal-inner"><button className="icon-button modal-close" aria-label={closeLabel} onClick={close}><X size={21}/></button><h2 id="modal-title">{title}</h2>{children}</div>
  </dialog>
}
