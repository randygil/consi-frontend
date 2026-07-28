'use client';

/* Hallmark · component: data-table · genre: modern-minimal · theme: Cobalt
 * states: default · hover · focus · active · disabled · loading · error · success
 * design-system: design.md — the one table standard for the platform.
 */

import * as React from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown, Columns3, Download, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Notice } from '@/components/ui/page-head';
import { Select } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { EXPORT_LABEL, exportRows, type ExportFormat } from '@/lib/table-export';
import { sortRows } from '@/lib/table-sort';

export type Align = 'left' | 'right' | 'center';

export interface Column<T> {
  /** Stable id — also the column-visibility key. */
  id: string;
  header: string;
  /** Rendered cell. Falls back to the `value` string. */
  cell?: (row: T) => React.ReactNode;
  /**
   * The sortable / searchable / exportable primitive behind the cell.
   * Return a number for money and counts so they sort numerically and land
   * in a spreadsheet as real numbers. Return an ISO string for dates —
   * ISO-8601 sorts chronologically as text.
   */
  value?: (row: T) => string | number | null | undefined;
  /** Human string for CSV/PDF when `value` is a raw number. */
  text?: (row: T) => string;
  align?: Align;
  /** Mono + tabular-nums. Money, references, counts, dates. */
  num?: boolean;
  /** Defaults to true when `value` is present. */
  sortable?: boolean;
  /** Defaults to true when `value` is present. */
  searchable?: boolean;
  exportable?: boolean;
  /** Kept out of the column-visibility menu (action columns). */
  pinned?: boolean;
  /** Off until the user turns it on. For wide tables. */
  defaultHidden?: boolean;
  className?: string;
  headClassName?: string;
}

export interface DataTableProps<T> {
  /** Stable id — column visibility and page size persist under it. */
  id: string;
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** Names the table for screen readers and titles the export. */
  caption: string;
  loading?: boolean;
  error?: string | null;
  empty?: React.ReactNode;
  searchable?: boolean;
  searchPlaceholder?: string;
  /**
   * Delegate searching to the server. When set, the same search field renders
   * but client-side filtering is skipped — `rows` is assumed already filtered.
   * Debounce on the page side.
   */
  onSearchChange?: (query: string) => void;
  defaultSort?: { id: string; dir: SortDir };
  pageSize?: number;
  /** Page-specific filters, rendered in the toolbar beside the search field. */
  toolbar?: React.ReactNode;
  exportable?: boolean;
  exportFilename?: string;
  /**
   * Export the full server-side set rather than what is on screen. Use where
   * the list endpoint is capped and the export should not be.
   */
  exportAll?: () => Promise<T[]>;
  /** Extra lines for the PDF banner — totals, active filters. */
  exportSummary?: (rows: T[]) => string[];
}

export type SortDir = 'asc' | 'desc';

const PAGE_SIZES = [10, 25, 50, 100];
const FORMATS: ExportFormat[] = ['csv', 'xlsx', 'pdf'];

const alignClass: Record<Align, string> = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
};

const canSort = <T,>(c: Column<T>) => (c.sortable ?? true) && Boolean(c.value);
const canSearch = <T,>(c: Column<T>) => (c.searchable ?? true) && Boolean(c.value);

/** Column visibility + page size, remembered per table. */
function usePrefs(id: string, defaultHidden: string[], defaultSize: number) {
  const [hidden, setHidden] = React.useState<string[]>(defaultHidden);
  const [size, setSize] = React.useState(defaultSize);
  const key = `consi-table:${id}`;

  // Read after mount — reading localStorage during render would break hydration.
  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return;
      const saved = JSON.parse(raw) as { hidden?: string[]; size?: number };
      if (Array.isArray(saved.hidden)) setHidden(saved.hidden);
      if (PAGE_SIZES.includes(saved.size as number)) setSize(saved.size as number);
    } catch {
      // A corrupt entry is not worth a broken table.
    }
  }, [key]);

  const persist = React.useCallback(
    (next: { hidden?: string[]; size?: number }) => {
      if (next.hidden) setHidden(next.hidden);
      if (next.size) setSize(next.size);
      try {
        window.localStorage.setItem(
          key,
          JSON.stringify({ hidden: next.hidden ?? hidden, size: next.size ?? size }),
        );
      } catch {
        // Private mode / quota. The table still works, it just forgets.
      }
    },
    [key, hidden, size],
  );

  return { hidden, size, persist };
}

export function DataTable<T>({
  id,
  columns,
  rows,
  rowKey,
  caption,
  loading = false,
  error = null,
  empty = 'Sin resultados.',
  searchable = true,
  searchPlaceholder = 'Buscar…',
  onSearchChange,
  defaultSort,
  pageSize = 25,
  toolbar,
  exportable = true,
  exportFilename,
  exportAll,
  exportSummary,
}: DataTableProps<T>) {
  const [query, setQuery] = React.useState('');
  const [sort, setSort] = React.useState<{ id: string; dir: SortDir } | null>(defaultSort ?? null);
  const [page, setPage] = React.useState(0);
  const [busy, setBusy] = React.useState<ExportFormat | null>(null);
  const [exportError, setExportError] = React.useState<string | null>(null);

  const defaultHidden = React.useMemo(
    () => columns.filter((c) => c.defaultHidden).map((c) => c.id),
    [columns],
  );
  const { hidden, size, persist } = usePrefs(id, defaultHidden, pageSize);

  const shown = React.useMemo(
    () => columns.filter((c) => !hidden.includes(c.id)),
    [columns, hidden],
  );

  const filtered = React.useMemo(() => {
    // ponytail: client-side filter over the loaded set. Tables whose endpoint
    // caps the result pass `onSearchChange` and let the server do the matching.
    if (onSearchChange) return rows;
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    const searchCols = shown.filter(canSearch);
    return rows.filter((row) =>
      searchCols.some((c) => String(c.value?.(row) ?? '').toLowerCase().includes(q)),
    );
  }, [rows, query, shown, onSearchChange]);

  const sorted = React.useMemo(() => {
    if (!sort) return filtered;
    const col = columns.find((c) => c.id === sort.id);
    if (!col?.value) return filtered;
    return sortRows(filtered, col.value, sort.dir);
  }, [filtered, sort, columns]);

  const lastPage = Math.max(0, Math.ceil(sorted.length / size) - 1);
  // Clamp rather than reset: filtering down to one page must never strand the
  // user on an empty page 4.
  const current = Math.min(page, lastPage);
  const paged = React.useMemo(
    () => sorted.slice(current * size, current * size + size),
    [sorted, current, size],
  );

  function toggleSort(col: Column<T>) {
    setSort((prev) => {
      if (prev?.id !== col.id) return { id: col.id, dir: 'asc' };
      if (prev.dir === 'asc') return { id: col.id, dir: 'desc' };
      return null; // third click restores the source order
    });
  }

  function toggleColumn(colId: string) {
    persist({
      hidden: hidden.includes(colId) ? hidden.filter((x) => x !== colId) : [...hidden, colId],
    });
  }

  async function runExport(format: ExportFormat) {
    setBusy(format);
    setExportError(null);
    try {
      const data = exportAll ? await exportAll() : sorted;
      await exportRows(format, data, shown, {
        filename: exportFilename ?? id,
        title: caption,
        summary: exportSummary?.(data),
      });
    } catch (e) {
      setExportError(e instanceof Error ? e.message : `No se pudo exportar a ${EXPORT_LABEL[format]}`);
    } finally {
      setBusy(null);
    }
  }

  const hideable = columns.filter((c) => !c.pinned);
  const showToolbar = searchable || toolbar || hideable.length > 0 || exportable;
  const showFooter = !loading && sorted.length > size;

  return (
    <div className="flex flex-col gap-[var(--space-sm)]">
      {showToolbar ? (
        <div className="flex flex-wrap items-center gap-2">
          {searchable ? (
            <div className="relative min-w-0 flex-1 basis-56">
              <Search
                size={15}
                aria-hidden
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-ink-4)]"
              />
              <Input
                type="search"
                aria-label={`Buscar en ${caption}`}
                placeholder={searchPlaceholder}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  onSearchChange?.(e.target.value);
                  setPage(0);
                }}
                className="pl-8 pr-8"
              />
              {query ? (
                <button
                  type="button"
                  aria-label="Limpiar búsqueda"
                  onClick={() => {
                    setQuery('');
                    onSearchChange?.('');
                  }}
                  className="absolute right-2 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded-[var(--radius-xs)] text-[var(--color-ink-4)] transition-colors duration-[var(--dur-fast)] hover:text-[var(--color-ink)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-focus)]"
                >
                  <X size={13} />
                </button>
              ) : null}
            </div>
          ) : null}

          {toolbar}

          <div className="ml-auto flex items-center gap-2">
            {hideable.length > 0 ? (
              <Menu label="Columnas" icon={<Columns3 size={14} />}>
                <p className="label px-2 pb-1 pt-1.5">Mostrar columnas</p>
                {hideable.map((c) => (
                  <label
                    key={c.id}
                    className="flex cursor-pointer items-center gap-2 rounded-[var(--radius-xs)] px-2 py-1.5 text-[length:var(--text-sm)] text-[var(--color-ink-2)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--color-paper-3)]"
                  >
                    {/* Native checkbox, accent-tinted — no re-drawn control. */}
                    <input
                      type="checkbox"
                      checked={!hidden.includes(c.id)}
                      onChange={() => toggleColumn(c.id)}
                      className="size-3.5 shrink-0 accent-[var(--color-accent)]"
                    />
                    {c.header}
                  </label>
                ))}
              </Menu>
            ) : null}

            {exportable ? (
              <Menu
                label={busy ? 'Exportando…' : 'Exportar'}
                icon={<Download size={14} />}
                closeOnSelect
                disabled={busy !== null || (sorted.length === 0 && !exportAll)}
              >
                {FORMATS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    disabled={busy !== null}
                    onClick={() => runExport(f)}
                    className="flex w-full items-center justify-between gap-4 rounded-[var(--radius-xs)] px-2 py-1.5 text-left text-[length:var(--text-sm)] text-[var(--color-ink-2)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--color-paper-3)] hover:text-[var(--color-ink)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-focus)] disabled:opacity-45"
                  >
                    {EXPORT_LABEL[f]}
                    {busy === f ? <span className="label">…</span> : null}
                  </button>
                ))}
              </Menu>
            ) : null}
          </div>
        </div>
      ) : null}

      {error ? <Notice kind="err">{error}</Notice> : null}
      {exportError ? <Notice kind="err">{exportError}</Notice> : null}

      <Table>
        <caption className="sr-only">{caption}</caption>
        <TableHeader>
          <TableRow>
            {shown.map((c) => {
              const active = sort?.id === c.id;
              const align = c.align ?? (c.num ? 'right' : 'left');
              return (
                <TableHead
                  key={c.id}
                  aria-sort={active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                  className={cn(alignClass[align], c.headClassName)}
                >
                  {canSort(c) ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(c)}
                      className="group inline-flex items-center gap-1 rounded-[var(--radius-xs)] uppercase tracking-[var(--tracking-mono-label)] transition-colors duration-[var(--dur-fast)] hover:text-[var(--color-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
                    >
                      {c.header}
                      {active ? (
                        sort!.dir === 'asc' ? (
                          <ArrowUp size={12} className="text-[var(--color-accent)]" aria-hidden />
                        ) : (
                          <ArrowDown size={12} className="text-[var(--color-accent)]" aria-hidden />
                        )
                      ) : (
                        <ChevronsUpDown
                          size={12}
                          aria-hidden
                          className="opacity-0 transition-opacity duration-[var(--dur-fast)] group-hover:opacity-100 group-focus-visible:opacity-100"
                        />
                      )}
                    </button>
                  ) : (
                    c.header
                  )}
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <StateRow span={shown.length}>Cargando…</StateRow>
          ) : sorted.length === 0 ? (
            <StateRow span={shown.length}>
              {query ? `Ningún resultado para “${query}”.` : empty}
            </StateRow>
          ) : (
            paged.map((row) => (
              <TableRow key={rowKey(row)}>
                {shown.map((c) => {
                  const align = c.align ?? (c.num ? 'right' : 'left');
                  return (
                    <TableCell
                      key={c.id}
                      className={cn(alignClass[align], c.num && 'num', c.className)}
                    >
                      {c.cell ? c.cell(row) : (c.value?.(row) ?? '—')}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {showFooter ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="label">
            {current * size + 1}–{Math.min((current + 1) * size, sorted.length)} de {sorted.length}
          </span>
          <div className="flex items-center gap-2">
            <Select
              aria-label="Filas por página"
              value={String(size)}
              onChange={(e) => {
                persist({ size: Number(e.target.value) });
                setPage(0);
              }}
              className="h-8 w-auto pl-2 pr-7 text-[length:var(--text-xs)]"
            >
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n} / pág.
                </option>
              ))}
            </Select>
            <Button
              size="sm"
              variant="outline"
              disabled={current === 0}
              onClick={() => setPage(current - 1)}
            >
              Anterior
            </Button>
            <span className="label whitespace-nowrap">
              {current + 1} / {lastPage + 1}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={current >= lastPage}
              onClick={() => setPage(current + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StateRow({ span, children }: { span: number; children: React.ReactNode }) {
  return (
    <TableRow>
      <TableCell
        colSpan={span}
        className="py-[var(--space-lg)] text-center text-[length:var(--text-sm)] text-[var(--color-ink-3)]"
      >
        {children}
      </TableCell>
    </TableRow>
  );
}

/**
 * Native <details> disclosure: keyboard behaviour and the expanded/collapsed
 * semantics come free. Only outside-click and Escape need wiring.
 */
function Menu({
  label,
  icon,
  disabled,
  closeOnSelect = false,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
  /** Off for the column toggles — that menu is multi-select. */
  closeOnSelect?: boolean;
  children: React.ReactNode;
}) {
  const ref = React.useRef<HTMLDetailsElement>(null);

  React.useEffect(() => {
    const close = (e: Event) => {
      const el = ref.current;
      if (el?.open && !el.contains(e.target as Node)) el.open = false;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && ref.current?.open) {
        ref.current.open = false;
        ref.current.querySelector('summary')?.focus();
      }
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <details ref={ref} className="relative">
      <summary
        aria-disabled={disabled}
        onClick={(e) => {
          if (disabled) e.preventDefault();
        }}
        className={cn(
          'inline-flex h-8 cursor-pointer list-none items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-sm)]',
          'border border-[var(--color-rule)] bg-[var(--color-surface)] px-2.5',
          'text-[length:var(--text-sm)] font-medium text-[var(--color-ink-2)]',
          'transition-[background-color,border-color,color] duration-[var(--dur-fast)]',
          'hover:border-[var(--color-rule-2)] hover:bg-[var(--color-paper-3)] hover:text-[var(--color-ink)]',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]',
          'active:translate-y-px',
          '[&::-webkit-details-marker]:hidden',
          disabled && 'pointer-events-none opacity-45',
        )}
      >
        {icon}
        {label}
      </summary>
      <div
        onClick={closeOnSelect ? () => ref.current && (ref.current.open = false) : undefined}
        className="absolute right-0 top-[calc(100%+4px)] z-20 min-w-[11rem] rounded-[var(--radius-sm)] border border-[var(--color-rule)] bg-[var(--color-surface)] p-1"
      >
        {children}
      </div>
    </details>
  );
}
