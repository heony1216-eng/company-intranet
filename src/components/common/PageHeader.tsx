import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface PageHeaderProps {
    title: string
    subtitle?: string
    icon?: LucideIcon
    actions?: ReactNode
}

// 페이지 상단 공통 헤더 (아이콘 + 제목/부제 + 우측 액션)
const PageHeader = ({ title, subtitle, icon: Icon, actions }: PageHeaderProps) => {
    return (
        <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
                {Icon && (
                    <div className="w-11 h-11 rounded-toss bg-toss-blue/10 flex items-center justify-center flex-shrink-0">
                        <Icon size={22} className="text-toss-blue" />
                    </div>
                )}
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold text-toss-gray-900 truncate">{title}</h1>
                    {subtitle && <p className="text-sm text-toss-gray-500 mt-0.5">{subtitle}</p>}
                </div>
            </div>
            {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
        </div>
    )
}

export default PageHeader
