'use client';

import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

/**
 * Reads the theme the inline script in layout.tsx already resolved, so the
 * button never disagrees with what's on screen. Writes both the attribute and
 * localStorage on toggle.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
  }, []);

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    const root = document.documentElement;
    // Suppress per-property transitions for one frame so the swap reads as a
    // cut, not fifty surfaces cross-fading at slightly different rates.
    root.classList.add('theming');
    root.dataset.theme = next;
    try {
      localStorage.setItem('consi-theme', next);
    } catch {
      // Private mode / storage disabled — the theme still applies for this session.
    }
    setTheme(next);
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('theming')));
  }

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      title={isDark ? 'Tema claro' : 'Tema oscuro'}
      className="flex size-8 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-rule)] text-[var(--color-ink-3)] transition-colors duration-[var(--dur-fast)] hover:border-[var(--color-rule-2)] hover:text-[var(--color-ink)]"
    >
      {/* Null until mounted so SSR markup matches whatever the script picked. */}
      {theme === null ? null : isDark ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}
