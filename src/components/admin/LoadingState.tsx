import { Loader } from 'lucide-react'

interface LoadingStateProps {
    type?: 'spinner' | 'skeleton' | 'table'
    rows?: number
    message?: string
}

export const AdminLoadingState = ({
    type = 'spinner',
    rows = 6,
    message = 'Loading...'
}: LoadingStateProps) => {
    if (type === 'spinner') {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center space-y-4">
                    <Loader className="w-12 h-12 text-cyan-500 animate-spin mx-auto" />
                    <p className="text-zinc-400 text-sm">{message}</p>
                </div>
            </div>
        )
    }

    if (type === 'table') {
        return (
            <>
                {Array.from({ length: rows }).map((_, i) => (
                    <tr key={`skeleton-${i}`} className="border-t border-zinc-800">
                        <td className="px-3 py-2"><div className="h-4 w-20 animate-pulse rounded bg-zinc-800" /></td>
                        <td className="px-3 py-2"><div className="h-4 w-32 animate-pulse rounded bg-zinc-800" /></td>
                        <td className="px-3 py-2"><div className="h-4 w-24 animate-pulse rounded bg-zinc-800" /></td>
                        <td className="px-3 py-2"><div className="h-4 w-16 animate-pulse rounded bg-zinc-800" /></td>
                        <td className="px-3 py-2"><div className="h-4 w-20 animate-pulse rounded bg-zinc-800" /></td>
                    </tr>
                ))}
            </>
        )
    }

    // skeleton grid
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: rows }).map((_, i) => (
                <div key={`skeleton-${i}`} className="aspect-[2/3] bg-zinc-800/50 rounded-xl animate-pulse" />
            ))}
        </div>
    )
}
