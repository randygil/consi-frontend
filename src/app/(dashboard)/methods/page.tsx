import { Info } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { CATEGORY_ICON, METHOD_CATEGORIES } from '@/lib/payment-methods';

export default function MethodsPage() {
  return (
    <div className="flex flex-col gap-[18px]">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-strong)]">
          Métodos de pago
        </h1>
        <p className="mt-0.5 text-[13px] text-[var(--text-subtle)]">
          Estos son los métodos que tus clientes pueden usar para pagarte. Elige cuáles ofrecer en
          cada cobro.
        </p>
      </div>

      <div className="flex items-start gap-2.5 rounded-[var(--radius-sm)] border border-[var(--blue-200)] bg-[var(--blue-50)] p-3.5">
        <Info size={16} className="mt-0.5 shrink-0 text-[var(--blue-700)]" />
        <p className="text-[12.5px] leading-relaxed text-[var(--text-muted)]">
          Los métodos se activan <strong>por cobro</strong>: al{' '}
          <Link href="/links" className="font-semibold text-[var(--blue-700)] hover:underline">
            crear un link de pago
          </Link>{' '}
          marcas los que quieras aceptar, o los pasas en el campo{' '}
          <code className="rounded bg-white px-1 py-0.5 font-mono text-[11px]">methods</code> al usar
          la{' '}
          <Link href="/docs" className="font-semibold text-[var(--blue-700)] hover:underline">
            API
          </Link>
          . Si no marcas un método, queda desactivado para ese cobro y el cliente no lo verá.
        </p>
      </div>

      {METHOD_CATEGORIES.map(({ category, methods }) => {
        const CatIcon = CATEGORY_ICON[category];
        return (
          <div key={category} className="space-y-2.5">
            <div className="flex items-center gap-2">
              <CatIcon size={15} className="text-[var(--text-subtle)]" />
              <h2 className="text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--text-subtle)]">
                {category}
              </h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {methods.map((m) => {
                const Icon = m.icon;
                return (
                  <Card key={m.key} className="p-[18px]">
                    <CardContent className="space-y-3 p-0">
                      <div className="flex items-start gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--blue-50)] text-[var(--blue-700)]">
                          <Icon size={18} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-[15px] font-bold text-[var(--text-strong)]">
                              {m.label}
                            </h3>
                            {m.badge ? (
                              <span className="rounded-[var(--radius-pill)] bg-[var(--success-100)] px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-[var(--success-600)]">
                                {m.badge}
                              </span>
                            ) : null}
                          </div>
                          <p className="text-[12px] text-[var(--text-subtle)]">{m.tagline}</p>
                        </div>
                      </div>

                      <p className="text-[12.5px] leading-relaxed text-[var(--text-muted)]">
                        {m.description}
                      </p>

                      <dl className="grid grid-cols-1 gap-2 border-t border-[var(--ink-100)] pt-3 text-[12px] sm:grid-cols-3">
                        <Spec label="Moneda" value={m.currencies.join(' · ')} />
                        <Spec label="El cliente aporta" value={m.customerProvides} />
                        <Spec label="Confirmación" value={m.confirmation} />
                      </dl>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-subtle)]">
        {label}
      </dt>
      <dd className="font-semibold text-[var(--text-strong)]">{value}</dd>
    </div>
  );
}
