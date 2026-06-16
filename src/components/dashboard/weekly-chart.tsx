import { Card, CardContent } from '@/components/ui/card';
import { formatMoney } from '@/lib/format';

// Mock weekly sales (USD). Decoupled placeholder — swap for a real series later.
const DATA = [
  { day: 'Lun', value: 1200 },
  { day: 'Mar', value: 1800 },
  { day: 'Mié', value: 900 },
  { day: 'Jue', value: 2400 },
  { day: 'Vie', value: 2100 },
  { day: 'Sáb', value: 3200 },
  { day: 'Dom', value: 1500 },
];

const W = 600;
const H = 220;
const PAD_X = 10;
const TOP = 30;
const BOTTOM = 200;

function points(): { x: number; y: number }[] {
  const max = Math.max(...DATA.map((d) => d.value));
  const span = DATA.length - 1;
  return DATA.map((d, i) => ({
    x: PAD_X + (i / span) * (W - PAD_X * 2),
    y: BOTTOM - (d.value / max) * (BOTTOM - TOP),
  }));
}

// Smooth S-curve through the points using horizontal-midpoint cubic controls.
function smoothPath(pts: { x: number; y: number }[]): string {
  return pts.reduce((acc, p, i) => {
    if (i === 0) return `M${p.x},${p.y}`;
    const prev = pts[i - 1];
    const midX = (prev.x + p.x) / 2;
    return `${acc} C${midX},${prev.y} ${midX},${p.y} ${p.x},${p.y}`;
  }, '');
}

export function WeeklyChart() {
  const pts = points();
  const line = smoothPath(pts);
  const area = `${line} L${pts[pts.length - 1].x},${H} L${pts[0].x},${H} Z`;
  const last = pts[pts.length - 1];
  const total = DATA.reduce((sum, d) => sum + d.value, 0);

  return (
    <Card className="p-6">
      <CardContent className="p-0">
        <div className="mb-[18px] flex items-center justify-between">
          <div>
            <div className="text-[15px] font-bold text-[var(--text-strong)]">Ventas de la semana</div>
            <div className="text-[12.5px] text-[var(--text-subtle)]">USD · últimos 7 días</div>
          </div>
          <div className="text-right">
            <div className="font-mono text-lg font-semibold text-[var(--text-strong)]">
              {formatMoney(total, 'USD')}
            </div>
            <div className="text-[11px] font-bold text-[var(--success-600)]">
              ▲ {DATA.length} días
            </div>
          </div>
        </div>

        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="block h-[190px] w-full"
          role="img"
          aria-label="Gráfico de área de ventas semanales en USD"
        >
          <defs>
            <linearGradient id="areaA" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2F7BF6" stopOpacity="0.34" />
              <stop offset="100%" stopColor="#9F4DFA" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="lineA" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#1DC8FE" />
              <stop offset="55%" stopColor="#2F7BF6" />
              <stop offset="100%" stopColor="#9F4DFA" />
            </linearGradient>
          </defs>

          <line x1="0" y1="60" x2={W} y2="60" stroke="#EEF1F6" strokeWidth="1" />
          <line x1="0" y1="130" x2={W} y2="130" stroke="#EEF1F6" strokeWidth="1" />

          <path d={area} fill="url(#areaA)" />
          <path
            d={line}
            fill="none"
            stroke="url(#lineA)"
            strokeWidth="3.5"
            strokeLinecap="round"
            style={{ strokeDasharray: 1400, animation: 'drawLine 1.5s cubic-bezier(.2,.8,.2,1) .2s both' }}
          />

          {/* Pulsing endpoint */}
          <circle
            cx={last.x}
            cy={last.y}
            r="11"
            fill="#9F4DFA"
            opacity="0.18"
            style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: 'ring 1.8s ease-out 1.2s infinite' }}
          />
          <circle cx={last.x} cy={last.y} r="5" fill="#fff" stroke="#9F4DFA" strokeWidth="3" />
        </svg>

        <div className="mt-2.5 flex justify-between text-xs font-semibold text-[var(--text-subtle)]">
          {DATA.map((d) => (
            <span key={d.day}>{d.day}</span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
