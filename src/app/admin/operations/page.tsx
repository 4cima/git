'use client'

import { useState, useEffect, useRef } from 'react'
import { Terminal, Play, Loader, Shield, AlertTriangle, CheckCircle, XCircle, Clock, User } from 'lucide-react'

interface LogEntry {
  id: number
  timestamp: string
  username: string
  command: string
  exit_code: number | null
  duration_seconds: number | null
}

interface Operation {
  id: string
  name: string
  command: string
  risk: 'low' | 'medium' | 'high'
  description: string
}

const OPERATIONS: Record<string, Operation[]> = {
  'Core Workflow': [
    { id: 'download-ids', name: 'Download IDs', command: 'npm run download-ids', risk: 'low', description: 'Download TMDB daily export IDs (~140K movies + ~100K series)' },
    { id: 'fetch', name: 'Fetch & Enrich', command: 'npm run fetch', risk: 'low', description: 'Fetch full data from TMDB + enrich with translations' },
    { id: 'enrich', name: 'Enrich Missing', command: 'npm run enrich', risk: 'low', description: 'Complete missing/partial data' },
    { id: 'sync', name: 'Sync to Turso', command: 'npm run sync', risk: 'medium', description: 'Sync completed content from local.db → Turso' },
    { id: 'full-workflow', name: 'Full Workflow', command: 'npm run full-workflow', risk: 'medium', description: 'Run all 4 steps in sequence (download → fetch → sync)' },
    { id: 'setup', name: 'Setup Local DB', command: 'npm run setup', risk: 'medium', description: 'Initialize local.db schema' },
  ],
  'Content Quality': [
    { id: 'check-local', name: 'Check Local Data', command: 'node scripts/check-local-data.js', risk: 'low', description: 'Verify local.db integrity' },
    { id: 'check-turso', name: 'Check Turso Data', command: 'node scripts/check-turso-data.js', risk: 'low', description: 'Verify Turso database integrity' },
    { id: 'verify-sync', name: 'Verify Sync Quality', command: 'node scripts/verify-sync-quality.js', risk: 'low', description: 'Compare local.db vs Turso sync status' },
    { id: 'health', name: 'Health Check', command: 'node scripts/health-check.js', risk: 'low', description: 'Run system health diagnostics' },
    { id: 'check-schema', name: 'Check Schema', command: 'node scripts/check-schema.js', risk: 'low', description: 'Validate database schema' },
    { id: 'check-tables', name: 'Check Tables', command: 'node scripts/check-tables.js', risk: 'low', description: 'List all tables and row counts' },
    { id: 'monitoring', name: 'Monitoring Dashboard', command: 'node scripts/monitoring-dashboard.js', risk: 'low', description: 'Display system monitoring stats' },
  ],
  'Translation': [
    { id: 'translate-titles', name: 'Translate Missing Titles', command: 'node scripts/translate-missing-titles.js', risk: 'medium', description: 'Add Arabic titles where missing' },
    { id: 'translate-overviews', name: 'Translate Missing Overviews', command: 'node scripts/translate-missing-overviews.js', risk: 'medium', description: 'Add Arabic overviews where missing' },
    { id: 'complete-translations', name: 'Complete All Translations', command: 'node scripts/complete-translations.js', risk: 'medium', description: 'Bulk translation completion' },
  ],
  'Database Admin': [
    { id: 'reset-schema', name: 'Reset & Apply Schema', command: 'node scripts/0-reset-and-apply-schema.js', risk: 'high', description: '⚠️ DESTRUCTIVE: Drops and recreates local.db schema' },
    { id: 'dump-schema', name: 'Dump Schema', command: 'node scripts/dump-schema.js', risk: 'low', description: 'Export current schema to SQL file' },
  ],
}

export default function OperationsPage() {
  const [passwordUnlocked, setPasswordUnlocked] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState('')
  
  const [running, setRunning] = useState<string | null>(null)
  const [output, setOutput] = useState<string[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [logsLoading, setLogsLoading] = useState(true)
  const [confirmAction, setConfirmAction] = useState<Operation | null>(null)
  
  const outputRef = useRef<HTMLDivElement>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    // Check if password is stored in sessionStorage
    const stored = sessionStorage.getItem('operations_password')
    if (stored) {
      setPasswordUnlocked(true)
    }
    
    fetchLogs()
  }, [])

  useEffect(() => {
    // Auto-scroll output to bottom
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [output])

  const fetchLogs = async () => {
    setLogsLoading(true)
    try {
      const res = await fetch('/api/admin/operations?limit=50')
      const data = await res.json()
      if (data.ok) {
        setLogs(data.logs)
      }
    } catch (e) {
      console.error('Failed to fetch logs:', e)
    } finally {
      setLogsLoading(false)
    }
  }

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!passwordInput) {
      setPasswordError('Password required')
      return
    }
    
    sessionStorage.setItem('operations_password', passwordInput)
    setPasswordUnlocked(true)
    setPasswordInput('')
    setPasswordError('')
  }

  const runOperation = (operation: Operation) => {
    // Check if high-risk, show confirmation modal
    if (operation.risk === 'high') {
      setConfirmAction(operation)
      return
    }
    
    executeOperation(operation, false)
  }

  const executeOperation = async (operation: Operation, confirmed: boolean) => {
    setConfirmAction(null)
    setRunning(operation.id)
    setOutput([])

    const password = sessionStorage.getItem('operations_password')
    if (!password) {
      setPasswordUnlocked(false)
      setRunning(null)
      return
    }

    try {
      const res = await fetch('/api/admin/operations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-operations-password': password,
        },
        body: JSON.stringify({
          action: operation.command,
          confirm: confirmed,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setOutput([`❌ Error: ${data.error}`])
        setRunning(null)
        return
      }

      // Set up SSE
      const eventSource = new EventSource(`/api/admin/operations`)
      eventSourceRef.current = eventSource

      eventSource.addEventListener('start', (e) => {
        const data = JSON.parse(e.data)
        setOutput((prev) => [...prev, `🚀 Started at ${data.timestamp}`])
      })

      eventSource.addEventListener('stdout', (e) => {
        const data = JSON.parse(e.data)
        setOutput((prev) => [...prev, data.line])
      })

      eventSource.addEventListener('stderr', (e) => {
        const data = JSON.parse(e.data)
        setOutput((prev) => [...prev, `⚠️ ${data.line}`])
      })

      eventSource.addEventListener('exit', (e) => {
        const data = JSON.parse(e.data)
        const exitMsg = data.code === 0 
          ? `✅ Completed successfully in ${data.duration}s`
          : `❌ Exited with code ${data.code} after ${data.duration}s`
        setOutput((prev) => [...prev, exitMsg])
        setRunning(null)
        eventSource.close()
        fetchLogs()
      })

      eventSource.addEventListener('error', (e: any) => {
        const data = e.data ? JSON.parse(e.data) : {}
        setOutput((prev) => [...prev, `❌ Error: ${data.message || 'Connection lost'}`])
        setRunning(null)
        eventSource.close()
      })
    } catch (error) {
      setOutput((prev) => [...prev, `❌ Failed to start: ${error}`])
      setRunning(null)
    }
  }

  const stopOperation = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    setRunning(null)
    setOutput((prev) => [...prev, '⏹ Stopped by user'])
  }

  if (!passwordUnlocked) {
    return (
      <div className="flex items-center justify-center min-h-[500px]" dir="rtl">
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="text-orange-400" size={32} />
            <div>
              <h2 className="text-xl font-bold text-zinc-100">Operations Panel Password</h2>
              <p className="text-sm text-zinc-400">Additional authentication required</p>
            </div>
          </div>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">Operations Password</label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg py-2 px-3 text-sm text-zinc-100 focus:border-orange-500 outline-none"
                placeholder="Enter operations password"
              />
              {passwordError && (
                <p className="text-xs text-red-400 mt-1">{passwordError}</p>
              )}
            </div>
            <button
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-400 text-white font-bold py-2.5 rounded-lg transition-colors"
            >
              Unlock
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <Terminal className="text-orange-400" /> Operations Control Panel
          </h1>
          <p className="text-sm text-zinc-400 mt-1">Execute scripts and monitor system operations</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Shield size={14} className="text-green-400" />
          Password Verified
        </div>
      </div>

      {/* Operations Grid */}
      {Object.entries(OPERATIONS).map(([category, operations]) => (
        <div key={category} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-zinc-100 mb-4">{category}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {operations.map((op) => (
              <button
                key={op.id}
                onClick={() => runOperation(op)}
                disabled={running !== null}
                className={`text-right p-4 rounded-lg border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  running === op.id
                    ? 'bg-cyan-500/10 border-cyan-500/30'
                    : op.risk === 'high'
                    ? 'bg-red-500/5 border-red-500/20 hover:bg-red-500/10'
                    : op.risk === 'medium'
                    ? 'bg-yellow-500/5 border-yellow-500/20 hover:bg-yellow-500/10'
                    : 'bg-zinc-800/50 border-zinc-700/50 hover:bg-zinc-800'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-zinc-100 text-sm">{op.name}</span>
                  {running === op.id ? (
                    <Loader size={16} className="animate-spin text-cyan-400" />
                  ) : (
                    <Play size={16} className={
                      op.risk === 'high' ? 'text-red-400' :
                      op.risk === 'medium' ? 'text-yellow-400' :
                      'text-green-400'
                    } />
                  )}
                </div>
                <p className="text-xs text-zinc-500 mb-2">{op.description}</p>
                <code className="text-[10px] text-zinc-600 font-mono">{op.command}</code>
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Live Output */}
      {output.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
              <Terminal className="text-cyan-400" />
              Live Output
            </h2>
            {running && (
              <button
                onClick={stopOperation}
                className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg border border-red-500/20 transition-colors"
              >
                Stop
              </button>
            )}
          </div>
          <div
            ref={outputRef}
            className="bg-black/50 border border-zinc-800 rounded-lg p-4 h-96 overflow-y-auto font-mono text-xs text-zinc-300 whitespace-pre-wrap"
          >
            {output.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        </div>
      )}

      {/* Execution History */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-zinc-100 mb-4">Execution History</h2>
        {logsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader size={24} className="animate-spin text-zinc-400" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">No operations executed yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-zinc-950 text-zinc-400 font-medium border-b border-zinc-800">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Command</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-800/50 transition-colors">
                    <td className="px-4 py-3 flex items-center gap-1 text-zinc-400 text-xs">
                      <Clock size={11} />
                      {new Date(log.timestamp).toLocaleString('en-GB')}
                    </td>
                    <td className="px-4 py-3 flex items-center gap-1 text-zinc-300">
                      <User size={11} className="text-zinc-500" />
                      {log.username}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-400">{log.command}</td>
                    <td className="px-4 py-3">
                      {log.exit_code === null ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                          <Loader size={10} className="animate-spin" /> Running
                        </span>
                      ) : log.exit_code === 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                          <CheckCircle size={10} /> Success
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                          <XCircle size={10} /> Failed ({log.exit_code})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-400 text-xs">
                      {log.duration_seconds ? `${log.duration_seconds}s` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" dir="rtl">
          <div className="bg-zinc-900 border border-red-500/30 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="text-red-400" size={32} />
              <div>
                <h2 className="text-lg font-bold text-zinc-100">High-Risk Operation</h2>
                <p className="text-sm text-zinc-400">This action is destructive</p>
              </div>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-300 mb-2"><strong>{confirmAction.name}</strong></p>
              <p className="text-xs text-zinc-400 mb-2">{confirmAction.description}</p>
              <code className="text-xs text-zinc-500 font-mono block">{confirmAction.command}</code>
            </div>
            <p className="text-sm text-zinc-400 mb-4">
              ⚠️ Make sure you have backups before proceeding. This operation cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold py-2.5 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => executeOperation(confirmAction, true)}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 rounded-lg transition-colors"
              >
                Confirm & Run
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
