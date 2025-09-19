import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { WebSocketMessage, ExperimentStatusUpdate } from '@shared/types/api';

interface UseWebSocketOptions {
  url?: string;
  onMessage?: (message: WebSocketMessage) => void;
  onError?: (error: Event) => void;
  onClose?: (event: CloseEvent) => void;
  reconnectAttempts?: number;
  reconnectInterval?: number;
}

export function useWebSocket({
  url = '/ws',
  onMessage,
  onError,
  onClose,
  reconnectAttempts = 5,
  reconnectInterval = 3000,
}: UseWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectCount, setReconnectCount] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const queryClient = useQueryClient();

  const connect = useCallback(() => {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}${url}`;
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setReconnectCount(0);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          handleMessage(message);
          onMessage?.(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        onError?.(error);
      };

      wsRef.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        onClose?.(event);

        // Attempt reconnection if not a manual close
        if (event.code !== 1000 && reconnectCount < reconnectAttempts) {
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectCount(prev => prev + 1);
            connect();
          }, reconnectInterval);
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  }, [url, onMessage, onError, onClose, reconnectAttempts, reconnectInterval, reconnectCount]);

  const handleMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case 'experiment_status':
        handleExperimentStatusUpdate(message.payload as ExperimentStatusUpdate);
        break;
      case 'chat_message':
        invalidateChatQueries();
        break;
      case 'task_update':
        invalidateTaskQueries();
        break;
      case 'system_alert':
        handleSystemAlert(message.payload);
        break;
      default:
        console.log('Unknown WebSocket message type:', message.type);
    }
  }, []);

  const handleExperimentStatusUpdate = useCallback((update: ExperimentStatusUpdate) => {
    // Update specific experiment query
    queryClient.setQueryData(['experiment', update.experimentId], (oldData: any) => {
      if (oldData) {
        return { ...oldData, status: update.status };
      }
      return oldData;
    });

    // Invalidate experiments list to refresh status
    queryClient.invalidateQueries({ queryKey: ['experiments'] });
    
    // Update dashboard stats if experiment completed or failed
    if (update.status === 'completed' || update.status === 'failed') {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
    }
  }, [queryClient]);

  const invalidateChatQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['chat', 'messages'] });
  }, [queryClient]);

  const invalidateTaskQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
  }, [queryClient]);

  const handleSystemAlert = useCallback((alert: any) => {
    // Handle system-wide alerts (could trigger notifications)
    console.log('System alert:', alert);
    
    // Invalidate system health query
    queryClient.invalidateQueries({ queryKey: ['system', 'health'] });
  }, [queryClient]);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected. Cannot send message.');
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setReconnectCount(0);
  }, []);

  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    reconnectCount,
    sendMessage,
    disconnect,
    connect,
  };
}

// Hook specifically for experiment status updates
export function useExperimentStatusUpdates() {
  const [experimentUpdates, setExperimentUpdates] = useState<Record<string, ExperimentStatusUpdate>>({});

  const handleMessage = useCallback((message: WebSocketMessage) => {
    if (message.type === 'experiment_status') {
      const update = message.payload as ExperimentStatusUpdate;
      setExperimentUpdates(prev => ({
        ...prev,
        [update.experimentId]: update,
      }));
    }
  }, []);

  const { isConnected } = useWebSocket({
    onMessage: handleMessage,
  });

  const getExperimentStatus = useCallback((experimentId: string) => {
    return experimentUpdates[experimentId];
  }, [experimentUpdates]);

  const clearExperimentStatus = useCallback((experimentId: string) => {
    setExperimentUpdates(prev => {
      const { [experimentId]: removed, ...rest } = prev;
      return rest;
    });
  }, []);

  return {
    isConnected,
    experimentUpdates,
    getExperimentStatus,
    clearExperimentStatus,
  };
}

// Hook for real-time chat updates
export function useChatWebSocket(projectId?: string) {
  const [newMessageCount, setNewMessageCount] = useState(0);
  const queryClient = useQueryClient();

  const handleMessage = useCallback((message: WebSocketMessage) => {
    if (message.type === 'chat_message') {
      // Optimistically add the message to the cache
      queryClient.setQueryData(['chat', 'messages', { projectId }], (oldData: any) => {
        if (oldData && Array.isArray(oldData)) {
          return [...oldData, message.payload];
        }
        return oldData;
      });
      
      setNewMessageCount(prev => prev + 1);
    }
  }, [queryClient, projectId]);

  const { isConnected, sendMessage } = useWebSocket({
    onMessage: handleMessage,
  });

  const markMessagesAsRead = useCallback(() => {
    setNewMessageCount(0);
  }, []);

  const sendChatMessage = useCallback((message: string, agentType: string) => {
    sendMessage({
      type: 'chat_message',
      payload: {
        message,
        projectId,
        agentType,
        timestamp: new Date().toISOString(),
      },
    });
  }, [sendMessage, projectId]);

  return {
    isConnected,
    newMessageCount,
    markMessagesAsRead,
    sendChatMessage,
  };
}

// Hook for system-wide notifications
export function useSystemNotifications() {
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: 'info' | 'warning' | 'error' | 'success';
    title: string;
    message: string;
    timestamp: string;
  }>>([]);

  const handleMessage = useCallback((message: WebSocketMessage) => {
    if (message.type === 'system_alert') {
      const notification = {
        id: `notif-${Date.now()}`,
        type: message.payload.level || 'info',
        title: message.payload.title || 'System Alert',
        message: message.payload.message,
        timestamp: message.timestamp,
      };
      
      setNotifications(prev => [notification, ...prev].slice(0, 10)); // Keep last 10
    }
  }, []);

  const { isConnected } = useWebSocket({
    onMessage: handleMessage,
  });

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    isConnected,
    notifications,
    dismissNotification,
    clearAllNotifications,
  };
}