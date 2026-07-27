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

/**
 * Inline error / success / advisory line. Flat tint, hairline bar, no toast.
 * `info` is the docs' callout voice — same shape, cobalt instead of a status hue.
 * A <div> rather than a <p> so docs callouts can hold a list or a code block.
 */
export function Notice({
  kind,
  className,
  children,
}: {
  kind: 'ok' | 'err' | 'warn' | 'info';
  className?: string;
  children: React.ReactNode;
}) {
  const tone = {
    ok: 'border-[var(--color-ok)] text-[var(--color-ok)] bg-[var(--color-ok-soft)]',
    err: 'border-[var(--color-bad)] text-[var(--color-bad)] bg-[var(--color-bad-soft)]',
    warn: 'border-[var(--color-warn)] text-[var(--color-warn)] bg-[var(--color-warn-soft)]',
    info: 'border-[var(--color-accent)] text-[var(--color-ink-2)] bg-[var(--color-accent-soft)]',
  }[kind];
  return (
    <div
      role={kind === 'err' ? 'alert' : 'status'}
      className={`rounded-[var(--radius-sm)] border-l-2 px-3 py-2 text-[length:var(--text-sm)] ${tone} ${className ?? ''}`}
    >
      {children}
    </div>
  );
}
