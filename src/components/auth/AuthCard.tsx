/**
 * AuthCard - Reusable card wrapper for auth forms
 * Provides consistent styling for login/register pages
 */

interface AuthCardProps {
  title: string
  subtitle: string
  children: React.ReactNode
}

export function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <div className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/80 backdrop-blur-xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="p-6 pb-4 border-b border-zinc-800">
        <h2 className="text-2xl font-bold text-zinc-100 mb-1">{title}</h2>
        <p className="text-sm text-zinc-400">{subtitle}</p>
      </div>
      
      {/* Content */}
      <div className="p-6">
        {children}
      </div>
    </div>
  )
}
