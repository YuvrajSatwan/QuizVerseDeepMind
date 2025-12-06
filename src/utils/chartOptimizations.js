// Chart Performance Optimizations
import { useMemo } from 'react'

// Debounce function for reducing API calls
export const debounce = (func, wait) => {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// Throttle function for animations
export const throttle = (func, limit) => {
  let inThrottle
  return function() {
    const args = arguments
    const context = this
    if (!inThrottle) {
      func.apply(context, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

// Memoized chart data transformer
export const useChartDataMemo = (rawData, dependencies = []) => {
  return useMemo(() => {
    if (!rawData || Object.keys(rawData).length === 0) {
      return {
        labels: [],
        datasets: []
      }
    }

    // Transform raw answer statistics into chart-friendly format
    const labels = Object.keys(rawData).map(key => `Option ${String.fromCharCode(65 + parseInt(key))}`)
    const data = Object.values(rawData)
    
    return {
      labels,
      data,
      totalResponses: data.reduce((sum, count) => sum + count, 0)
    }
  }, [JSON.stringify(rawData), ...dependencies])
}

// Optimized color palette generator
export const generateChartColors = (count, opacity = 0.8) => {
  const baseColors = [
    '#667eea', // Primary blue
    '#a855f7', // Secondary purple  
    '#ec4899', // Accent pink
    '#10b981', // Green
    '#f59e0b', // Orange
    '#ef4444', // Red
    '#8b5cf6', // Violet
    '#06b6d4', // Cyan
  ]
  
  const colors = []
  for (let i = 0; i < count; i++) {
    const color = baseColors[i % baseColors.length]
    colors.push(`${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`)
  }
  
  return colors
}

// Animation preset configurations
export const chartAnimations = {
  smooth: {
    duration: 800,
    easing: 'easeInOutQuart'
  },
  fast: {
    duration: 300,
    easing: 'easeOutCubic'
  },
  slow: {
    duration: 1500,
    easing: 'easeInOutSine'
  },
  bounce: {
    duration: 1000,
    easing: 'easeOutBounce'
  }
}

// Performance monitoring
export const performanceMonitor = {
  startTime: null,
  
  start(label) {
    this.startTime = performance.now()
    console.time(label)
  },
  
  end(label) {
    if (this.startTime) {
      const duration = performance.now() - this.startTime
      console.timeEnd(label)
      
      // Log performance warnings
      if (duration > 100) {
        console.warn(`⚠️ ${label} took ${duration.toFixed(2)}ms - consider optimization`)
      }
      
      this.startTime = null
      return duration
    }
  }
}

// Memory usage optimization for large datasets
export const optimizeDataForRendering = (data, maxPoints = 100) => {
  if (!data || data.length <= maxPoints) {
    return data
  }
  
  // Implement data sampling for large datasets
  const step = Math.ceil(data.length / maxPoints)
  const optimizedData = []
  
  for (let i = 0; i < data.length; i += step) {
    optimizedData.push(data[i])
  }
  
  return optimizedData
}

// Responsive breakpoints for charts
export const chartBreakpoints = {
  mobile: 768,
  tablet: 1024,
  desktop: 1440,
  
  isMobile: () => window.innerWidth < chartBreakpoints.mobile,
  isTablet: () => window.innerWidth >= chartBreakpoints.mobile && window.innerWidth < chartBreakpoints.desktop,
  isDesktop: () => window.innerWidth >= chartBreakpoints.desktop
}