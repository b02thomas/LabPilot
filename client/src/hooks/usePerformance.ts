import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { QueryMetrics, NetworkMetrics } from '@shared/types/api';

// Performance monitoring hook
export function usePerformanceMonitoring() {
  const queryClient = useQueryClient();
  const metricsRef = useRef<QueryMetrics[]>([]);
  const [networkMetrics, setNetworkMetrics] = useState<NetworkMetrics>({
    requestCount: 0,
    avgResponseTime: 0,
    errorRate: 0,
    cacheHitRate: 0,
  });

  useEffect(() => {
    // Monitor query performance
    const queryCache = queryClient.getQueryCache();
    
    const unsubscribe = queryCache.subscribe((event) => {
      if (event.type === 'updated') {
        const query = event.query;
        const queryKey = JSON.stringify(query.queryKey);
        const duration = Date.now() - (query.state.dataUpdatedAt || 0);
        const cacheHit = query.state.isFetching === false && query.state.data !== undefined;
        
        const metric: QueryMetrics = {
          queryKey,
          duration,
          cacheHit,
          errorCount: query.state.errorUpdateCount,
          lastUpdated: new Date().toISOString(),
        };
        
        metricsRef.current.push(metric);
        
        // Keep only last 100 metrics
        if (metricsRef.current.length > 100) {
          metricsRef.current = metricsRef.current.slice(-100);
        }
        
        // Update network metrics
        updateNetworkMetrics();
      }
    });

    return unsubscribe;
  }, [queryClient]);

  const updateNetworkMetrics = () => {
    const metrics = metricsRef.current;
    if (metrics.length === 0) return;

    const totalRequests = metrics.length;
    const avgResponseTime = metrics.reduce((sum, m) => sum + m.duration, 0) / totalRequests;
    const errorCount = metrics.filter(m => m.errorCount > 0).length;
    const cacheHits = metrics.filter(m => m.cacheHit).length;
    
    setNetworkMetrics({
      requestCount: totalRequests,
      avgResponseTime: Math.round(avgResponseTime),
      errorRate: Math.round((errorCount / totalRequests) * 100),
      cacheHitRate: Math.round((cacheHits / totalRequests) * 100),
    });
  };

  const getMetrics = () => ({
    networkMetrics,
    queryMetrics: metricsRef.current.slice(-10), // Last 10 queries
  });

  const clearMetrics = () => {
    metricsRef.current = [];
    setNetworkMetrics({
      requestCount: 0,
      avgResponseTime: 0,
      errorRate: 0,
      cacheHitRate: 0,
    });
  };

  return {
    getMetrics,
    clearMetrics,
    networkMetrics,
  };
}

// Hook to detect slow queries
export function useSlowQueryDetection(threshold = 2000) {
  const [slowQueries, setSlowQueries] = useState<string[]>([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    const queryCache = queryClient.getQueryCache();
    
    const unsubscribe = queryCache.subscribe((event) => {
      if (event.type === 'updated') {
        const query = event.query;
        const duration = Date.now() - (query.state.dataUpdatedAt || 0);
        
        if (duration > threshold) {
          const queryKey = JSON.stringify(query.queryKey);
          setSlowQueries(prev => {
            if (!prev.includes(queryKey)) {
              console.warn(`Slow query detected: ${queryKey} took ${duration}ms`);
              return [...prev, queryKey];
            }
            return prev;
          });
        }
      }
    });

    return unsubscribe;
  }, [queryClient, threshold]);

  return slowQueries;
}

// Hook to track cache efficiency
export function useCacheMetrics() {
  const queryClient = useQueryClient();
  const [cacheStats, setCacheStats] = useState({
    totalQueries: 0,
    cacheHits: 0,
    cacheMisses: 0,
    hitRate: 0,
  });

  useEffect(() => {
    const queryCache = queryClient.getQueryCache();
    
    const unsubscribe = queryCache.subscribe((event) => {
      if (event.type === 'updated') {
        const query = event.query;
        const wasFromCache = !query.state.isFetching && query.state.data !== undefined;
        
        setCacheStats(prev => {
          const newStats = {
            totalQueries: prev.totalQueries + 1,
            cacheHits: wasFromCache ? prev.cacheHits + 1 : prev.cacheHits,
            cacheMisses: !wasFromCache ? prev.cacheMisses + 1 : prev.cacheMisses,
            hitRate: 0,
          };
          
          newStats.hitRate = Math.round((newStats.cacheHits / newStats.totalQueries) * 100);
          
          return newStats;
        });
      }
    });

    return unsubscribe;
  }, [queryClient]);

  return cacheStats;
}

// Hook for memory usage tracking
export function useMemoryMonitoring() {
  const [memoryUsage, setMemoryUsage] = useState<{
    used: number;
    total: number;
    percentage: number;
  } | null>(null);

  useEffect(() => {
    if (!('memory' in performance)) {
      console.warn('Memory API not supported in this browser');
      return;
    }

    const updateMemoryUsage = () => {
      const memory = (performance as any).memory;
      if (memory) {
        const used = Math.round(memory.usedJSHeapSize / 1024 / 1024);
        const total = Math.round(memory.totalJSHeapSize / 1024 / 1024);
        const percentage = Math.round((used / total) * 100);
        
        setMemoryUsage({ used, total, percentage });
        
        // Warn if memory usage is high
        if (percentage > 85) {
          console.warn(`High memory usage detected: ${percentage}% (${used}MB / ${total}MB)`);
        }
      }
    };

    updateMemoryUsage();
    const interval = setInterval(updateMemoryUsage, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, []);

  return memoryUsage;
}

// Hook for network quality detection
export function useNetworkQuality() {
  const [networkQuality, setNetworkQuality] = useState<{
    effectiveType: string;
    downlink: number;
    rtt: number;
    quality: 'poor' | 'slow' | 'good' | 'excellent';
  } | null>(null);

  useEffect(() => {
    const updateNetworkInfo = () => {
      const connection = (navigator as any).connection;
      if (connection) {
        const { effectiveType, downlink, rtt } = connection;
        
        let quality: 'poor' | 'slow' | 'good' | 'excellent' = 'good';
        
        if (rtt > 1000 || downlink < 0.5) {
          quality = 'poor';
        } else if (rtt > 500 || downlink < 1) {
          quality = 'slow';
        } else if (rtt < 100 && downlink > 5) {
          quality = 'excellent';
        }
        
        setNetworkQuality({
          effectiveType,
          downlink,
          rtt,
          quality,
        });
      }
    };

    updateNetworkInfo();
    
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connection.addEventListener('change', updateNetworkInfo);
      
      return () => {
        connection.removeEventListener('change', updateNetworkInfo);
      };
    }
  }, []);

  return networkQuality;
}

// Performance dashboard component data hook
export function usePerformanceDashboard() {
  const performanceMetrics = usePerformanceMonitoring();
  const slowQueries = useSlowQueryDetection();
  const cacheStats = useCacheMetrics();
  const memoryUsage = useMemoryMonitoring();
  const networkQuality = useNetworkQuality();

  return {
    metrics: performanceMetrics.networkMetrics,
    slowQueries,
    cacheStats,
    memoryUsage,
    networkQuality,
    clearMetrics: performanceMetrics.clearMetrics,
  };
}