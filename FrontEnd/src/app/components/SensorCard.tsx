import { LucideIcon } from 'lucide-react';

interface SensorCardProps {
  title: string;
  value: number | string;
  unit: string;
  icon: LucideIcon;
  status: 'good' | 'warning' | 'danger';
  statusLabel?: string;
  description?: string;
  min?: number;
  max?: number;
}

const statusMeta = {
  good: {
    label: '정상',
    card: 'border-emerald-200 bg-emerald-50/80 text-emerald-800',
    badge: 'bg-emerald-600 text-white',
    icon: 'text-emerald-600',
    bar: 'bg-emerald-500',
  },
  warning: {
    label: '주의',
    card: 'border-amber-200 bg-amber-50/80 text-amber-800',
    badge: 'bg-amber-500 text-white',
    icon: 'text-amber-600',
    bar: 'bg-amber-500',
  },
  danger: {
    label: '위험',
    card: 'border-rose-200 bg-rose-50/80 text-rose-800',
    badge: 'bg-rose-600 text-white',
    icon: 'text-rose-600',
    bar: 'bg-rose-500',
  },
};

export function SensorCard({ title, value, unit, icon: Icon, status, statusLabel, description, min, max }: SensorCardProps) {
  const meta = statusMeta[status];
  const numericValue = typeof value === 'number' ? value : Number(value);
  const hasRange = min !== undefined && max !== undefined && Number.isFinite(numericValue);
  const rangePercent = hasRange
    ? Math.max(0, Math.min(100, ((numericValue - min) / (max - min)) * 100))
    : 0;

  return (
    <div className={`rounded-xl border p-5 shadow-sm transition-all duration-300 hover:shadow-md ${meta.card}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-600">{title}</p>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${meta.badge}`}>
              {statusLabel ?? meta.label}
            </span>
          </div>
          <p className="mt-2 text-3xl font-bold tracking-normal text-gray-900">
            {value}
            <span className="ml-1 text-base font-semibold text-gray-600">{unit}</span>
          </p>
          {description && <p className="mt-2 text-xs leading-relaxed text-gray-600">{description}</p>}
        </div>
        <div className={`rounded-lg bg-white/80 p-3 ${meta.icon}`}>
          <Icon size={26} />
        </div>
      </div>

      {hasRange && (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between text-xs text-gray-600">
            <span>최적 범위</span>
            <span>
              {min}
              {unit} - {max}
              {unit}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white">
            <div className={`h-full rounded-full ${meta.bar}`} style={{ width: `${rangePercent}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}
