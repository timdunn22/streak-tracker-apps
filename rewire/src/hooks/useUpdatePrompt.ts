import { useState, useEffect, useCallback } from 'react'

/**
 * Detects when the service worker has a new version waiting.
 * Returns a flag and a function to apply the update by reloading.
 */
export function useUpdatePrompt() {
  const [hasUpdate, setHasUpdate] = useState(false)
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const handleControllerChange = () => {
      // A new service worker took control — reload to get fresh assets
      window.location.reload()
    }

    const checkForWaiting = (reg: ServiceWorkerRegistration) => {
      if (reg.waiting) {
        setWaitingWorker(reg.waiting)
        setHasUpdate(true)
      }
    }

    // Track listeners so they can be removed in the cleanup function.
    // Without this, the updatefound and statechange listeners leak
    // if the component (or the hook's host) is unmounted and remounted.
    let registration: ServiceWorkerRegistration | null = null
    let updateFoundHandler: (() => void) | null = null
    const stateChangeHandlers: { worker: ServiceWorker; handler: () => void }[] = []

    navigator.serviceWorker.ready.then((reg) => {
      registration = reg

      // Check if a new worker is already waiting
      checkForWaiting(reg)

      // Listen for new updates that arrive later
      updateFoundHandler = () => {
        const newWorker = reg.installing
        if (!newWorker) return

        const onStateChange = () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New content is available, show update prompt
            setWaitingWorker(newWorker)
            setHasUpdate(true)
          }
        }
        newWorker.addEventListener('statechange', onStateChange)
        stateChangeHandlers.push({ worker: newWorker, handler: onStateChange })
      }
      reg.addEventListener('updatefound', updateFoundHandler)
    })

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
      if (registration && updateFoundHandler) {
        registration.removeEventListener('updatefound', updateFoundHandler)
      }
      for (const { worker, handler } of stateChangeHandlers) {
        worker.removeEventListener('statechange', handler)
      }
    }
  }, [])

  const applyUpdate = useCallback(() => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' })
    }
  }, [waitingWorker])

  return { hasUpdate, applyUpdate }
}
