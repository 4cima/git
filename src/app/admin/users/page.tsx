export default function ComingSoonPage({ params }: { params: { } }) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="text-4xl mb-4">🚧</div>
        <h1 className="text-xl font-bold text-zinc-100 mb-2">قيد التطوير</h1>
        <p className="text-zinc-500 text-sm">هذه الصفحة لم تُبنَ بعد</p>
      </div>
    </div>
  )
}