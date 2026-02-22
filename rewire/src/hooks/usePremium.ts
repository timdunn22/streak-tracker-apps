import { useEffect } from 'react'

/**
 * Detects `?premium=activated` in the URL (set by Stripe Payment Link success redirect),
 * activates premium in the streak data, and cleans the URL parameter.
 */
export function usePremium(
  isPremium: boolean,
  setPremium: (value: boolean) => void
) {
  useEffect(() => {
    if (isPremium) return
    const params = new URLSearchParams(window.location.search)
    if (params.get('premium') === 'activated') {
      setPremium(true)
      // Clean URL without triggering a page reload
      params.delete('premium')
      const clean = params.toString()
      const newUrl = window.location.pathname + (clean ? `?${clean}` : '') + window.location.hash
      window.history.replaceState(window.history.state, '', newUrl)
    }
  }, [isPremium, setPremium])
}
