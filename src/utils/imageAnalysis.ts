/**
 * Utility to analyze image brightness and determine optimal overlay
 */

import { useState, useEffect } from 'react'

export interface OverlayConfig {
  gradient: string
  textShadow: string
  isDark: boolean
}

/**
 * Analyzes an image and returns optimal overlay configuration
 * @param imagePath - Path to the backdrop image
 * @returns Promise with overlay configuration
 */
export const analyzeImageBrightness = async (imagePath: string): Promise<OverlayConfig> => {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'Anonymous'
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        
        if (!ctx) {
          // Fallback to default dark overlay
          resolve(getDefaultDarkOverlay())
          return
        }

        // Sample a smaller size for performance
        canvas.width = 100
        canvas.height = 100
        
        ctx.drawImage(img, 0, 0, 100, 100)
        const imageData = ctx.getImageData(0, 0, 100, 100)
        const data = imageData.data
        
        let totalBrightness = 0
        let pixelCount = 0
        
        // Sample every 4th pixel for better performance
        for (let i = 0; i < data.length; i += 16) {
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]
          
          // Calculate perceived brightness (weighted for human perception)
          const brightness = (0.299 * r + 0.587 * g + 0.114 * b)
          totalBrightness += brightness
          pixelCount++
        }
        
        const avgBrightness = totalBrightness / pixelCount
        
        // Determine if image is dark or light
        const isDark = avgBrightness < 128
        
        resolve(getOverlayConfig(avgBrightness, isDark))
      } catch (error) {
        console.error('Error analyzing image:', error)
        resolve(getDefaultDarkOverlay())
      }
    }
    
    img.onerror = () => {
      // Fallback to default dark overlay on error
      resolve(getDefaultDarkOverlay())
    }
    
    img.src = imagePath
  })
}

/**
 * Get overlay configuration based on brightness
 */
const getOverlayConfig = (brightness: number, isDark: boolean): OverlayConfig => {
  if (isDark) {
    // Dark image - lighter overlay for contrast
    if (brightness < 64) {
      // Very dark - minimal overlay
      return {
        gradient: 'bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/40',
        textShadow: 'drop-shadow-lg',
        isDark: true
      }
    } else {
      // Medium dark
      return {
        gradient: 'bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-950/50',
        textShadow: 'drop-shadow-md',
        isDark: true
      }
    }
  } else {
    // Light image - darker overlay for contrast
    if (brightness > 192) {
      // Very bright - strong overlay
      return {
        gradient: 'bg-gradient-to-t from-slate-950 via-slate-950/95 to-slate-950/80',
        textShadow: 'drop-shadow-2xl',
        isDark: false
      }
    } else {
      // Medium bright
      return {
        gradient: 'bg-gradient-to-t from-slate-950 via-slate-950/90 to-slate-950/70',
        textShadow: 'drop-shadow-xl',
        isDark: false
      }
    }
  }
}

/**
 * Default overlay for dark images (most common case)
 */
const getDefaultDarkOverlay = (): OverlayConfig => ({
  gradient: 'bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-950/50',
  textShadow: 'drop-shadow-md',
  isDark: true
})

/**
 * React Hook: Analyzes image brightness and returns adaptive overlay config
 * @param imagePath - Path to the backdrop image
 * @returns Overlay configuration object
 */
export const useImageBrightness = (imagePath: string | null) => {
  const [overlayConfig, setOverlayConfig] = useState<OverlayConfig>(getDefaultDarkOverlay())
  
  useEffect(() => {
    if (!imagePath) {
      setOverlayConfig(getDefaultDarkOverlay())
      return
    }
    
    analyzeImageBrightness(imagePath)
      .then(setOverlayConfig)
      .catch(() => setOverlayConfig(getDefaultDarkOverlay()))
  }, [imagePath])
  
  return overlayConfig
}
