export type SpectralTheme = 'dark' | 'light'

export const THEME_STORAGE_KEY = 'spectral-theme'

export function parseTheme(raw: string | null | undefined): SpectralTheme {
  return raw === 'light' ? 'light' : 'dark'
}

export function readStoredTheme(): SpectralTheme {
  if (typeof window === 'undefined') return 'dark'
  try {
    return parseTheme(window.localStorage.getItem(THEME_STORAGE_KEY))
  } catch {
    return 'dark'
  }
}

export function applyTheme(theme: SpectralTheme): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.dataset.theme = theme
  root.style.colorScheme = theme
  root.classList.toggle('dark', theme === 'dark')
  root.classList.toggle('light', theme === 'light')
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    /* private mode — theme still applies for this session */
  }
}

export function toggleTheme(current: SpectralTheme): SpectralTheme {
  const next: SpectralTheme = current === 'dark' ? 'light' : 'dark'
  applyTheme(next)
  return next
}

/** Inline boot script — runs before paint to avoid a dark flash on light preference. */
export const THEME_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t!=='light'&&t!=='dark'){t='dark';}var r=document.documentElement;r.setAttribute('data-theme',t);r.style.colorScheme=t;r.classList.toggle('dark',t==='dark');r.classList.toggle('light',t==='light');}catch(e){var r=document.documentElement;r.setAttribute('data-theme','dark');r.style.colorScheme='dark';r.classList.add('dark');}})();`
