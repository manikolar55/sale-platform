import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '../../utils/format'

interface StatCardProps {
  title: string
  value: string
  icon: React.ReactNode
  iconBg: string
  change?: string
  changeType?: 'up' | 'down'
  changeLabel?: string
  link?: string
  linkLabel?: string
}

export default function StatCard({
  title, value, icon, iconBg, change, changeType, changeLabel, link, linkLabel
}: StatCardProps) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-500 font-medium mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {change && (
            <div className={cn(
              'flex items-center gap-1 mt-2 text-xs font-medium',
              changeType === 'up' ? 'text-green-600' : 'text-red-500'
            )}>
              {changeType === 'up'
                ? <TrendingUp className="w-3.5 h-3.5" />
                : <TrendingDown className="w-3.5 h-3.5" />
              }
              <span>{change} {changeLabel}</span>
            </div>
          )}
          {linkLabel && (
            <a href={link} className="text-xs text-blue-600 hover:underline mt-2 inline-block">
              {linkLabel} →
            </a>
          )}
        </div>
        <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0', iconBg)}>
          {icon}
        </div>
      </div>
    </div>
  )
}
