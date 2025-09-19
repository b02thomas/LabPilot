import { QueryClient, QueryFunction, QueryKey } from "@tanstack/react-query";
import type { ApiResponse, ApiError } from "@shared/types/api";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data instanceof FormData ? {} : data ? { "Content-Type": "application/json" } : {},
    body: data instanceof FormData ? data : data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const [url, params] = queryKey;
    let fetchUrl = url as string;
    
    // If there are query parameters, serialize them properly
    if (params && typeof params === 'object') {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        fetchUrl = `${url}?${queryString}`;
      }
    }
    
    const res = await fetch(fetchUrl, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

// Performance-optimized query configurations for different data types
const queryConfigs = {
  // Real-time data: chat messages, live status updates
  realtime: {
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 1000 * 30, // 30 seconds
    refetchOnWindowFocus: true,
    retry: 3,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
  },
  
  // Dynamic data: experiments, tasks (changes frequently)
  dynamic: {
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: false,
    refetchOnWindowFocus: true,
    retry: 2,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 10000),
  },
  
  // Static data: reports, completed analyses (rarely changes)
  static: {
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    refetchInterval: false,
    refetchOnWindowFocus: false,
    retry: 1,
    retryDelay: 5000,
  },
  
  // Cached data: user profile, project info (changes infrequently)
  cached: {
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
    refetchInterval: false,
    refetchOnWindowFocus: false,
    retry: 1,
    retryDelay: 3000,
  },
  
  // Dashboard data: aggregated stats (balance between freshness and performance)
  dashboard: {
    staleTime: 1000 * 60, // 1 minute
    gcTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: true,
    retry: 2,
    retryDelay: 2000,
  },
};

// Query key matchers for automatic config application
const getQueryConfig = (queryKey: QueryKey) => {
  const key = Array.isArray(queryKey) ? queryKey[0] as string : String(queryKey);
  
  // Real-time data patterns
  if (key.includes('chat') || key.includes('status') || key.includes('live')) {
    return queryConfigs.realtime;
  }
  
  // Static data patterns
  if (key.includes('report') && !key.includes('reports')) {
    return queryConfigs.static;
  }
  
  // Dashboard data patterns
  if (key.includes('dashboard') || key.includes('stats')) {
    return queryConfigs.dashboard;
  }
  
  // Cached data patterns
  if (key.includes('user') || key.includes('project') || key.includes('health')) {
    return queryConfigs.cached;
  }
  
  // Default to dynamic for experiments, tasks, etc.
  return queryConfigs.dynamic;
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchOnWindowFocus: false,
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors except 408, 429
        if (error?.message?.includes('4') && 
            !error?.message?.includes('408') && 
            !error?.message?.includes('429')) {
          return false;
        }
        return failureCount < 3;
      },
      retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 1000 * 60 * 2, // Default 2 minutes
      gcTime: 1000 * 60 * 5, // Default 5 minutes
    },
    mutations: {
      retry: (failureCount, error: any) => {
        // Don't retry mutations on client errors
        if (error?.message?.includes('4')) {
          return false;
        }
        return failureCount < 2;
      },
      retryDelay: 1000,
    },
  },
  queryCache: {
    onError: (error, query) => {
      // Log performance metrics and errors for monitoring
      console.error('Query error:', {
        queryKey: query.queryKey,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    },
  },
  mutationCache: {
    onError: (error, variables, context, mutation) => {
      console.error('Mutation error:', {
        mutationKey: mutation.options.mutationKey,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    },
  },
});

// Apply query-specific configurations automatically
queryClient.setQueryDefaults(['experiments'], queryConfigs.dynamic);
queryClient.setQueryDefaults(['chat', 'messages'], queryConfigs.realtime);
queryClient.setQueryDefaults(['dashboard', 'stats'], queryConfigs.dashboard);
queryClient.setQueryDefaults(['user', 'current'], queryConfigs.cached);
queryClient.setQueryDefaults(['projects'], queryConfigs.cached);
queryClient.setQueryDefaults(['experiment', '*', 'report'], queryConfigs.static);
queryClient.setQueryDefaults(['tasks'], queryConfigs.dynamic);
queryClient.setQueryDefaults(['system', 'health'], queryConfigs.cached);
