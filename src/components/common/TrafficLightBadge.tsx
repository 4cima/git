type Color = 'green' | 'yellow' | 'red' | 'gray'

const colorClass = (c: Color) => {
  if (c === 'green') return 'bg-emerald-500'
  if (c === 'yellow') return 'bg-yellow-400'
  if (c === 'red') return 'bg-red-500'
  return 'bg-zinc-500'
}

export const TrafficLightBadge = ({ cert }: { cert: string }) => {
  const c = (cert || '').toUpperCase()
  let color: Color = 'gray'
  if (['G', 'PG'].includes(c)) color = 'green'
  else if (['PG-13', 'TV-14'].includes(c)) color = 'yellow'
  else if (['R', 'NC-17', 'TV-MA'].includes(c)) color = 'red'
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-zinc-700 px-3 py-1 text-sm">
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${colorClass(color)}`} />
      <span>{c || 'غير محدد'}</span>
    </span>
  )
}
