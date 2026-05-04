/**
 * 📊 Performance Monitor Component - LUMEN Design System
 * Cinema Online - اونلاين سينما
 * 
 * @description Development-only FPS counter and performance metrics
 * @author Cinema Online Team
 * @version 1.0.0
 * 
 * Implements Requirements:
 * - 4.1: FPS counter using requestAnimationFrame
 * - Monitor frame drops and GC spikes
 * - Display metrics in development mode only
 */

import { useEffect, useState, useRef } from 'react'

export interface PerformanceMonitorProps {
  /** Whether to show the monitor (defaults to dev mode only) */
  enabled?: boolean
  /** Position of the monitor on screen */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
}

interface PerformanceMetrics {
  fps: number
  avgFps: number
  minFps: number
  maxFps: number
  frameDrops: number
  gcSpikes: number
}

/**
 * PerformanceMonitor component
 * 
 * Displays real-time FPS and performance metrics in development mode.
 * Automatically detects frame drops and potential GC spikes.
 */
export function PerformanceMonitor({
  enabled = process.env.NODE_ENV === 'development',
  position = 'top-right'
}: PerformanceMonitorProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    avgFps: 0,
    minFps: Infinity,
    maxFps: 0,
    frameDrops: 0,
    gcSpikes: 0
  })
  
  const frameCountRef = useRef(0)
  const lastTimeRef = useRef(performance.now())
  const fpsHistoryRef = useRef<number[]>([])
  const rafIdRef = useRef<number>(0)
  
  useEffect(() => {
    if (!enabled) return
    
    const measureFPS = () => {
      const now = performance.now()
      const delta = now - lastTimeRef.current
      
      // Calculate FPS
      const currentFps = 1000 / delta
      frameCountRef.current++
      
      // Update FPS history (keep last 60 frames)
      fpsHistoryRef.current.push(currentFps)
      if (fpsHistoryRef.current.length > 60) {
        fpsHistoryRef.current.shift()
      }
      
      // Calculate metrics every 10 frames
      if (frameCountRef.current % 10 === 0) {
        const history = fpsHistoryRef.current
        const avgFps = history.reduce((a, b) => a + b, 0) / history.length
        const minFps = Math.min(...history)
        const maxFps = Math.max(...history)
        
        // Detect frame drops (FPS below 50)
        const frameDrops = history.filter(fps => fps < 50).length
        
        // Detect potential GC spikes (sudden FPS drops > 20)
        let gcSpikes = 0
        for (let i = 1; i < history.length; i++) {
          if (history[i - 1] - history[i] > 20) {
            gcSpikes++
          }
        }
        
        setMetrics({
          fps: Math.round(currentFps),
          avgFps: Math.round(avgFps),
          minFps: Math.round(minFps),
          maxFps: Math.round(maxFps),
          frameDrops,
          gcSpikes
        })
      }
      
      lastTimeRef.current = now
      rafIdRef.current = requestAnimationFrame(measureFPS)
    }
    
    rafIdRef.current = requestAnimationFrame(measureFPS)
    
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current)
      }
    }
  }, [enabled])
  
  if (!enabled) return null
  
  // Position classes
  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  }
  
  // FPS color indicator
  const getFpsColor = (fps: number) => {
    if (fps >= 55) return 'text-green-400'
    if (fps >= 30) return 'text-yellow-400'
    return 'text-red-400'
  }
  
  return (
    <div
      className={`fixed ${positionClasses[position]} z-50 bg-lumen-void/90 backdrop-blur-sm border border-lumen-surface/20 rounded-lg p-3 font-mono text-xs shadow-lg`}
      style={{ minWidth: '180px' }}
    >
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-silver/60">FPS:</span>
          <span className={`font-bold ${getFpsColor(metrics.fps)}`}>
            {metrics.fps}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-silver/60">Avg:</span>
          <span className="text-lumen-white">{metrics.avgFps}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-silver/60">Min/Max:</span>
          <span className="text-lumen-white">
            {metrics.minFps === Infinity ? 0 : metrics.minFps}/{metrics.maxFps}
          </span>
        </div>
        
        <div className="border-t border-lumen-surface/20 my-1" />
        
        <div className="flex justify-between items-center">
          <span className="text-silver/60">Drops:</span>
          <span className={metrics.frameDrops > 5 ? 'text-red-400' : 'text-lumen-white'}>
            {metrics.frameDrops}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-silver/60">GC Spikes:</span>
          <span className={metrics.gcSpikes > 3 ? 'text-yellow-400' : 'text-lumen-white'}>
            {metrics.gcSpikes}
          </span>
        </div>
      </div>
    </div>
  )
}
