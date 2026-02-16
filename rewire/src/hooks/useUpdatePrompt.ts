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

    navigator.serviceWorker.ready.then((reg) => {
      // Check if a new worker is already waiting
      checkForWaiting(reg)

      // Listen for new updates that arrive later
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing
        if (!newWorker) return

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New content is available, show update prompt
            setWaitingWorker(newWorker)
            setHasUpdate(true)
          }
        })
      })
    })

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
    }
  }, [])

  const applyUpdate = useCallback(() => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' })
    }
  }, [waitingWorker])

  return { hasUpdate, applyUpdate }
}
