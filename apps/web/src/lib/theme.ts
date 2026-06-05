export type ThemeMode = 'light' | 'dark';

export function getStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = localStorage.getItem('theme') as ThemeMode;
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
  } catch (e) {
    console.error('Failed to access localStorage for theme', e);
  }
  // Check document element class
  if (document.documentElement.classList.contains('dark')) {
    return 'dark';
  }
  // Check system preference
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

export function applyTheme(theme: ThemeMode) {
  if (typeof window === 'undefined') return;
  const root = document.documentElement;
  const body = document.body;
  if (theme === 'dark') {
    root.classList.add('dark');
    if (body) body.classList.add('dark');
  } else {
    root.classList.remove('dark');
    if (body) body.classList.remove('dark');
  }
  try {
    localStorage.setItem('theme', theme);
  } catch (e) {
    console.error('Failed to write theme to localStorage', e);
  }
}
