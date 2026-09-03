/**
 * نمط شارة السنة — ديناميكي بالكامل نسبةً إلى السنة الحالية
 * (لا سنوات مكتوبة يدوياً — يعمل صحيحاً في أي سنة قادمة).
 * المشترك بين كروت الرئيسية (HomeTrendingSections) وأي كروت مستقبلية.
 */
export function getYearBadgeStyle(year: number | string | null | undefined): string {
  const y = Number(year)
  if (!Number.isFinite(y) || y <= 0) return ''
  const currentYear = new Date().getFullYear()
  if (y === currentYear) {
    return 'bg-purple-500 text-white border border-purple-400 shadow-lg shadow-purple-500/50 animate-pulse'
  }
  if (y >= currentYear - 6) {
    return 'bg-blue-600 text-white border border-blue-500 shadow-md'
  }
  if (y >= currentYear - 16) {
    return 'bg-cyan-600 text-white border border-cyan-500 shadow-md'
  }
  if (y >= currentYear - 26) {
    return 'bg-slate-100 text-slate-900 border border-slate-200 shadow-md font-bold'
  }
  return 'bg-slate-700 text-slate-300 border border-slate-600'
}