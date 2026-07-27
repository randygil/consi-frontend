/**
 * Every app route opens the same way: display title, optional one-line lede,
 * optional action hard-right. Collapses to one column below sm.
 * This is the rhythm design.md locks — don't hand-roll a variant per page.
 */
export function PageHead({
  title,
  lede,
  action,
}: {
  title: string;
  lede?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-[var(--space-xs)] border-b border-[var(--color-rule)] pb-[var(--space-sm)] sm:flex-row sm:items-start sm:justify-between sm:gap-[var(--space-md)]">
      <div className="min-w-0">
        <h1 className="text-[length:var(--text-xl)]">{title}</h1>
        {lede ? (
          <p className="mt-1.5 max-w-[62ch] text-[length:var(--text-sm)] text-[var(--color-ink-3)]">
            {lede}
          </p>
        ) : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}

/** Inline error / success line. Flat tint, hairline, mono prefix — no toast. */
export function Notice({ kind, children }: { kind: 'ok' | 'err' | 'warn'; children: React.ReactNode }) {
  const tone = {
    ok: 'border-[var(--color-ok)] text-[var(--color-ok)] bg-[var(--color-ok-soft)]',
    err: 'border-[var(--color-bad)] text-[var(--color-bad)] bg-[var(--color-bad-soft)]',
    warn: 'border-[var(--color-warn)] text-[var(--color-warn)] bg-[var(--color-warn-soft)]',
  }[kind];
  return (
    <p
      role={kind === 'err' ? 'alert' : 'status'}
      className={`rounded-[var(--radius-sm)] border-l-2 px-3 py-2 text-[length:var(--text-sm)] ${tone}`}
    >
      {children}
    </p>
  );
}
