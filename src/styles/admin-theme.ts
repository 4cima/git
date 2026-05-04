const colors = {
    primary: 'from-cyan-500 to-blue-600',
    success: 'from-green-500 to-emerald-600',
    danger: 'from-red-500 to-rose-600',
    warning: 'from-yellow-500 to-orange-600',
    info: 'from-blue-500 to-purple-600',
    purple: 'from-purple-500 to-pink-600',
} as const

export const adminTheme = {
    colors,

    gradients: {
        primary: 'bg-gradient-to-r from-cyan-500 to-blue-600',
        success: 'bg-gradient-to-r from-green-500 to-emerald-600',
        danger: 'bg-gradient-to-r from-red-500 to-rose-600',
        warning: 'bg-gradient-to-r from-yellow-500 to-orange-600',
        info: 'bg-gradient-to-r from-blue-500 to-purple-600',
        purple: 'bg-gradient-to-r from-purple-500 to-pink-600',
    },

    cards: {
        glass: 'bg-black/20 backdrop-blur-xl border border-white/10 rounded-[1rem] shadow-2xl hover:border-white/20 transition-all',
        solid: 'bg-zinc-900/50 border border-zinc-800 rounded-[0.75rem] hover:border-zinc-700 transition-all',
        gradient: (color: keyof typeof colors) =>
            `bg-gradient-to-br ${colors[color]}/20 border border-zinc-500/30 rounded-[0.75rem] backdrop-blur-sm`,
    },

    buttons: {
        primary: 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-medium rounded-[0.5rem] transition-all shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40',
        success: 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-medium rounded-[0.5rem] transition-all',
        danger: 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-medium rounded-[0.5rem] transition-all',
        warning: 'bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white font-medium rounded-[0.5rem] transition-all',
        ghost: 'bg-zinc-800 hover:bg-zinc-700 text-white rounded-[0.5rem] transition-colors',
    },

    inputs: {
        default: 'w-full bg-zinc-900 border border-zinc-700 rounded-[0.5rem] px-3 py-2 text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all',
        search: 'w-full bg-zinc-800/50 border border-zinc-700 rounded-[0.5rem] py-2 px-4 text-white placeholder-zinc-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all',
    },

    badges: {
        success: 'bg-green-500/20 text-green-400 border border-green-500/30',
        danger: 'bg-red-500/20 text-red-400 border border-red-500/30',
        warning: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
        info: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
        default: 'bg-zinc-500/20 text-zinc-400 border border-zinc-500/30',
    }
}

export type AdminTheme = typeof adminTheme
