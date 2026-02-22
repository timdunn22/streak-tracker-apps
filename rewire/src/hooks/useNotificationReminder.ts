import { useEffect } from 'react'
import { config } from '../config'

const LAST_NOTIF_KEY = `${config.id}-last-notif`

export function useNotificationReminder(isActive: boolean, currentDays: number) {
  useEffect(() => {
    if (!isActive || !('Notification' in window) || !('serviceWorker' in navigator)) return
    if (currentDays < 1) return // wait until they've used it at least 1 day

    // Request permission if never asked (with delay so it's not aggressive)
    if (Notification.permission === 'default') {
      const timer = setTimeout(() => {
        Notification.requestPermission().then(perm => {
          if (perm === 'granted') registerPeriodicSync()
        })
      }, 5000)
      return () => clearTimeout(timer)
    }

    if (Notification.permission !== 'granted') return

    // Register periodic background sync (Chrome Android - progressive enhancement)
    registerPeriodicSync()

    // Show a reminder if returning after 20+ hours
    const today = new Date().toDateString()
    const lastNotif = localStorage.getItem(LAST_NOTIF_KEY)
    if (lastNotif === today) return

    const lastVisitKey = `${config.id}-last-visit`
    const lastVisit = localStorage.getItem(lastVisitKey)
    if (!lastVisit) return

    const hoursSince = (Date.now() - new Date(lastVisit).getTime()) / 3600000
    if (hoursSince < 20) return

    navigator.serviceWorker.ready.then(reg => {
      reg.showNotification(`Day ${currentDays} — Keep going!`, {
        body: `You're on a ${currentDays}-day streak with ${config.name}. Don't break the chain!`,
        icon: '/pwa-192x192.svg',
        tag: 'daily-reminder',
      })
      localStorage.setItem(LAST_NOTIF_KEY, today)
    }).catch(() => { /* sw not ready */ })
  }, [isActive, currentDays])
}

async function registerPeriodicSync() {
  try {
    const reg = await navigator.serviceWorker.ready
    if (!('periodicSync' in reg)) return
    const status = await navigator.permissions.query({
      name: 'periodic-background-sync' as PermissionName,
    })
    if (status.state === 'granted') {
      await (reg as any).periodicSync.register('daily-checkin-reminder', {
        minInterval: 24 * 60 * 60 * 1000,
      })
    }
  } catch {
    // periodic sync not supported — no-op
  }
}
