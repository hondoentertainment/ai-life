import { useCallback, useEffect, useState } from 'react'

const THEME_KEY = 'ai-life-theme-pref'

export type ThemePref = 'system' | 'light' | 'dark'

function resolveTheme(pref: ThemePref): 'light' | 'dark' {
  if (pref === 'light') return 'light'
  if (pref === 'dark') return 'dark'
  return window.matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark'
}

export function useThemePreference() {
  const [pref, setPref] = useState<ThemePref>(() => {
    try {
      const s = localStorage.getItem(THEME_KEY)
      if (s === 'light' || s === 'dark' || s === 'system') return s
    } catch {
      /* ignore */
    }
    return 'system'
  })

  const apply = useCallback((p: ThemePref) => {
    document.documentElement.setAttribute('data-theme', resolveTheme(p))
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, pref)
    } catch {
      /* ignore */
    }
    apply(pref)
  }, [pref, apply])

  useEffect(() => {
    if (pref !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const onChange = () => apply('system')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [pref, apply])

  return { pref, setPref }
}
