import { useEffect, useRef, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

// Keep activation and page reload separate: another tab can activate a worker
// while this tab is still playing. Neither event may interrupt a round.
export function useAutomaticUpdates(safeToUpdate: boolean) {
  const [reloadPending, setReloadPending] = useState(false)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration>()
  const activationRequested = useRef(false)
  const { needRefresh: [updateWaiting], updateServiceWorker } = useRegisterSW({
    onNeedReload() { setReloadPending(true) },
    onRegisteredSW(_url, next) { setRegistration(next) },
  })

  useEffect(() => {
    if (!registration) return
    const check = () => {
      if (navigator.onLine && document.visibilityState === 'visible' && !registration.installing) {
        void registration.update().catch(() => { /* Retry when the connection returns. */ })
      }
    }
    const timer = window.setInterval(check, 5 * 60 * 1000)
    window.addEventListener('online', check)
    document.addEventListener('visibilitychange', check)
    return () => {
      clearInterval(timer)
      window.removeEventListener('online', check)
      document.removeEventListener('visibilitychange', check)
    }
  }, [registration])

  useEffect(() => {
    if (!safeToUpdate || (!updateWaiting && !reloadPending)) return
    let timer: ReturnType<typeof setTimeout>
    const schedule = () => {
      clearTimeout(timer)
      // Leave time for a tap/keystroke to settle before refreshing an idle screen.
      timer = setTimeout(() => {
        if (document.visibilityState !== 'visible' || document.activeElement?.matches('input, textarea, [contenteditable="true"]')) return
        if (reloadPending) window.location.reload()
        else if (!activationRequested.current) {
          activationRequested.current = true
          void updateServiceWorker().catch(() => { activationRequested.current = false })
        }
      }, 1500)
    }
    schedule()
    const events = ['pointerdown', 'keydown', 'focusout', 'visibilitychange'] as const
    for (const event of events) document.addEventListener(event, schedule)
    return () => {
      clearTimeout(timer)
      for (const event of events) document.removeEventListener(event, schedule)
    }
  }, [safeToUpdate, updateWaiting, reloadPending, updateServiceWorker])
}
