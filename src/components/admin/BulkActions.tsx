import { CheckSquare, Square } from 'lucide-react'

interface BulkAction {
    id: string
    label: string
    icon?: React.ReactNode
    variant?: 'default' | 'danger' | 'success'
}

interface BulkActionsProps {
    selected: number
    total: number
    allSelected: boolean
    onToggleAll: (checked: boolean) => void
    actions: BulkAction[]
    selectedAction: string
    onActionChange: (actionId: string) => void
    onExecute: () => void
    disabled?: boolean
}

export const BulkActions = ({
    selected,
    total,
    allSelected,
    onToggleAll,
    actions,
    selectedAction,
    onActionChange,
    onExecute,
    disabled = false
}: BulkActionsProps) => (
    <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between bg-zinc-900/30 p-4 rounded-xl border border-zinc-800/50">
        <div className="flex items-center gap-3">
            <button
                onClick={() => onToggleAll(!allSelected)}
                className="inline-flex items-center gap-2 text-sm text-zinc-300 hover:text-white transition-colors"
            >
                {allSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                <span>تحديد الكل</span>
            </button>
            <span className="text-xs text-zinc-500">
                المحدد: <span className="font-bold text-white">{selected}</span> / {total}
            </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
            <select
                value={selectedAction}
                onChange={(e) => onActionChange(e.target.value)}
                disabled={disabled || selected === 0}
                className="bg-[#1C1B1F] border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 hover:bg-[#0F0F14] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {actions.map(action => (
                    <option key={action.id} value={action.id} className="bg-[#1C1B1F] text-white">
                        {action.label}
                    </option>
                ))}
            </select>
            <button
                onClick={onExecute}
                disabled={disabled || selected === 0}
                className="px-4 py-2 bg-primary text-black font-bold text-xs rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
                تنفيذ
            </button>
        </div>
    </div>
)
