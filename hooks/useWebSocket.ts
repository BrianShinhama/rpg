// hooks/useWebSocket.ts
import { useEffect, useRef, useState, useCallback } from 'react';

export interface WsPlayer {
  id: string;
  name: string;
  ready: boolean;
}

export interface ServerMessage {
  type: 'welcome' | 'players' | 'start_game' | 'error' | 'pong';
  id?: string;
  players?: WsPlayer[];
  message?: string;
  state?: any;
}

export function useWebSocket({ onMessage }: { onMessage: (msg: ServerMessage) => void }) {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [myId, setMyId] = useState<string | null>(null);
  const ws = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (typeof window === 'undefined') return;

    // Detecta automaticamente a URL do Railway ou Localhost
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/api/ws`;

    const socket = new WebSocket(wsUrl);
    ws.current = socket;

    socket.onopen = () => setStatus('connected');
    socket.onclose = () => {
      setStatus('disconnected');
      setTimeout(connect, 3000); // Tenta reconectar se cair
    };

    socket.onmessage = (event) => {
      const data: ServerMessage = JSON.parse(event.data);
      if (data.type === 'welcome' && data.id) setMyId(data.id);
      onMessage(data);
    };
  }, [onMessage]);

  useEffect(() => {
    connect();
    return () => ws.current?.close();
  }, [connect]);

  const send = useCallback((msg: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(msg));
    }
  }, []);

  return { status, send, myId };
}