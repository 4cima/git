type Color = 'green' | 'yellow' | 'red'

export const TrafficBadge = ({ color, label }: { color: Color; label: string }) => {
  const c =
    color === 'green'
      ? 'bg-green-500/20 text-green-400 ring-green-500/30'
      : color === 'yellow'
      ? 'bg-yellow-500/20 text-yellow-300 ring-yellow-500/30'
      : 'bg-red-500/20 text-red-400 ring-red-500/30'
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs ring-1 ${c}`}>
      <span className="inline-block h-2 w-2 rounded-full bg-current" />
      {label}
    </span>
  )
}
