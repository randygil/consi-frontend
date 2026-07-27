'use client';

import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface Command {
  /** Grouping heading, e.g. "Ir a" / "Acciones". */
  group: string;
  label: string;
  /** Extra words to match on that aren't shown, e.g. English route names. */
  keywords?: string;
  href: string;
}

/** Case- and accent-insensitive so "Liquidaciones" matches a typed "liquid". */
function normalize(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

/**
 * Inline ⌘K pill (N13) + the spotlight it opens. Combobox/listbox pattern:
 * focus stays on the input and arrow keys move `aria-activedescendant`, so the
 * dialog needs no focus trap — there is only ever one focusable node inside it.
 */
export function CommandPalette({ commands }: { commands: Command[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  const results = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return commands;
    return commands.filter((c) => normalize(`${c.label} ${c.keywords ?? ''}`).includes(q));
  }, [commands, query]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setIndex(0);
    restoreRef.current?.focus();
  }, []);

  const run = useCallback(
    (command: Command | undefined) => {
      if (!command) return;
      close();
      router.push(command.href);
    },
    [close, router],
  );

  // ⌘K / Ctrl+K from anywhere in the app.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Keep the active row in view when arrowing past the fold.
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLLIElement>(`[data-i="${index}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [index]);

  function onInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndex((i) => (results.length ? (i + 1) % results.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndex((i) => (results.length ? (i - 1 + results.length) % results.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      run(results[index]);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex h-8 items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-rule)] pl-2.5 pr-1.5 text-[var(--color-ink-4)] transition-colors duration-[var(--dur-fast)] hover:border-[var(--color-rule-2)] hover:text-[var(--color-ink-3)]"
      >
        <Search size={13} />
        <span className="hidden text-[length:var(--text-sm)] sm:inline">Buscar</span>
        <kbd className="ml-2 hidden rounded-[var(--radius-xs)] border border-[var(--color-rule)] bg-[var(--color-paper-3)] px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[length:var(--text-2xs)] leading-none text-[var(--color-ink-4)] sm:block">
          ⌘K
        </kbd>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]"
          onMouseDown={close}
        >
          <div className="absolute inset-0 bg-[var(--color-scrim)]" aria-hidden />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Buscador de comandos"
            onMouseDown={(e) => e.stopPropagation()}
            className="relative w-full max-w-[540px] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-rule-2)] bg-[var(--color-surface)]"
          >
            <div className="flex items-center gap-2.5 border-b border-[var(--color-rule)] px-3.5">
              <Search size={15} className="shrink-0 text-[var(--color-ink-4)]" />
              <input
                ref={inputRef}
                role="combobox"
                aria-expanded
                aria-controls="cmdk-list"
                aria-activedescendant={results[index] ? `cmdk-opt-${index}` : undefined}
                aria-autocomplete="list"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setIndex(0);
                }}
                onKeyDown={onInputKeyDown}
                placeholder="Buscar páginas y acciones…"
                className="h-12 w-full bg-transparent text-[length:var(--text-md)] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-4)]"
              />
              <kbd className="shrink-0 rounded-[var(--radius-xs)] border border-[var(--color-rule)] px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[length:var(--text-2xs)] text-[var(--color-ink-4)]">
                ESC
              </kbd>
            </div>

            <ul id="cmdk-list" role="listbox" ref={listRef} className="max-h-[320px] overflow-y-auto py-1.5">
              {results.length === 0 ? (
                <li className="px-3.5 py-6 text-center text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
                  Sin resultados para “{query}”
                </li>
              ) : (
                results.map((c, i) => {
                  const first = i === 0 || results[i - 1].group !== c.group;
                  return (
                    <li key={c.href + c.label} role="presentation">
                      {first ? <div className="label px-3.5 pb-1 pt-2.5">{c.group}</div> : null}
                      <div
                        id={`cmdk-opt-${i}`}
                        data-i={i}
                        role="option"
                        aria-selected={i === index}
                        onMouseMove={() => setIndex(i)}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          run(c);
                        }}
                        className={`mx-1.5 flex cursor-pointer items-center justify-between rounded-[var(--radius-sm)] px-2 py-2 text-[length:var(--text-base)] ${
                          i === index
                            ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                            : 'text-[var(--color-ink-2)]'
                        }`}
                      >
                        <span>{c.label}</span>
                        {i === index ? (
                          <span className="font-[family-name:var(--font-mono)] text-[length:var(--text-2xs)]">
                            ↵
                          </span>
                        ) : null}
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </div>
      ) : null}
    </>
  );
}
