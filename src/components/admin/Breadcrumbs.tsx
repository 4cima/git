import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'

interface BreadcrumbItem {
    label: string
    path?: string
}

interface BreadcrumbsProps {
    items: BreadcrumbItem[]
}

export const Breadcrumbs = ({ items }: BreadcrumbsProps) => (
    <nav className="flex items-center gap-2 text-sm text-zinc-400 mb-4 px-2">
        <Link
            href="/admin/dashboard"
            className="flex items-center gap-1 hover:text-white transition-colors"
        >
            <Home className="w-4 h-4" />
            <span>Dashboard</span>
        </Link>
        {items.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
                <ChevronRight className="w-4 h-4" />
                {item.path ? (
                    <Link href={item.path} className="hover:text-white transition-colors">
                        {item.label}
                    </Link>
                ) : (
                    <span className="text-white font-medium">{item.label}</span>
                )}
            </div>
        ))}
    </nav>
)
