'use client'

interface StatusBadgeProps {
  status: string
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'
  size?: 'sm' | 'md'
}

const statusVariants: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  PAID: 'bg-sky-100 text-sky-700',
  SHIPPED: 'bg-purple-100 text-purple-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  ELECTRONICS: 'bg-blue-100 text-blue-700',
  CLOTHING: 'bg-emerald-100 text-emerald-700',
  BOOKS: 'bg-amber-100 text-amber-700',
  IN_STOCK: 'bg-green-100 text-green-700',
  LOW_STOCK: 'bg-amber-100 text-amber-700',
  OUT_OF_STOCK: 'bg-red-100 text-red-700',
}

export function StatusBadge({ status, variant = 'default', size = 'md' }: StatusBadgeProps) {
  const baseClasses = 'inline-flex items-center font-medium rounded-full'
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
  }
  
  const variantClasses = statusVariants[status] || 'bg-slate-100 text-slate-700'

  return (
    <span
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses}`}
    >
      {status.replace(/_/g, ' ')}
    </span>
  )
}

export function TrendIndicator({
  value,
  label,
}: {
  value: number
  label?: string
}) {
  const isPositive = value >= 0
  const TrendIcon = isPositive ? (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
    </svg>
  ) : (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
    </svg>
  )

  return (
    <div className={`flex items-center gap-1 text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
      {TrendIcon}
      <span>{Math.abs(value)}%</span>
      {label && <span className="text-slate-500 font-normal">{label}</span>}
    </div>
  )
}
