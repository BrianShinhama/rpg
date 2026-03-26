// hooks/useWebSocket.ts
// Hook que gerencia a conexão WebSocket com o servidor /api/ws.
//
// PROBLEMAS CORRIGIDOS vs. abordagem anterior:
//   1. O servidor WS precisa ser "aquecido" via fetch() antes do new WebSocket().
//      Sem isso, o servidor nunca registra o listener de "upgrade" e a conexão falha.
//   2. Reconexão automática com backoff exponencial.
//   3. Heartbeat (ping/pong) para manter a conexão viva e detectar quedas.
//   4. Cleanup correto no unmount (evita memory leaks e conexões zumbis).

"use client";

import { useEffect, useRef, useCallback, useState } from "react";

/* ─── TIPOS ─────────────────────────────────────────────────── */
export interface WsPlayer {
  id: string;
  name: string;
  ready: boolean;
}

export type ServerMessage =
  | { type: "welcome"; id: string }
  | { type: "players"; players: WsPlayer[] }
  | { type: "start_game"; state: { round: number; players: WsPlayer[] } }
  | { type: "error"; message: string }
  | { type: "pong" };

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

interface UseWebSocketOptions {
  onMessage?: (msg: ServerMessage) => void;
  /** Reconectar automaticamente? (padrão: true) */
  autoReconnect?: boolean;
  /** Máximo de tentativas de reconexão (padrão: 5) */
  maxRetries?: number;
}

interface UseWebSocketReturn {
  status: ConnectionStatus;
  send: (msg: object) => void;
  /** ID gerado pelo servidor para este cliente */
  myId: string | null;
}

/* ─── HOOK ──────────────────────────────────────────────────── */
export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const { onMessage, autoReconnect = true, maxRetries = 5 } = options;

  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [myId, setMyId] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const retriesRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  // Usa uma ref para onMessage para não recriar o connect() a cada render
  const onMessageRef = useRef(onMessage);
  useEffect(() => { onMessageRef.current = onMessage; }, [onMessage]);

  const clearTimers = useCallback(() => {
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    if (pingTimerRef.current) clearInterval(pingTimerRef.current);
  }, []);

  const connect = useCallback(async () => {
    if (!mountedRef.current) return;
    clearTimers();

    setStatus("connecting");

    // ── PASSO 1: Inicializa o servidor WS via fetch ──────────────
    // Sem este fetch, o handler /api/ws nunca é chamado e o listener
    // de "upgrade" nunca é registrado → conexão WebSocket falha silenciosamente.
    try {
      await fetch("/api/ws");
    } catch {
      console.warn("[useWebSocket] Falha ao inicializar /api/ws. Tentando mesmo assim...");
    }

    // ── PASSO 2: Conecta via WebSocket ───────────────────────────
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const wsUrl = `${protocol}://${window.location.host}/api/ws`;

    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
    } catch (err) {
      console.error("[useWebSocket] Falha ao criar WebSocket:", err);
      setStatus("error");
      return;
    }

    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) { ws.close(); return; }
      console.log("[useWebSocket] Conectado!");
      retriesRef.current = 0;
      setStatus("connected");

      // Heartbeat a cada 20s para manter a conexão e detectar quedas
      pingTimerRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }));
        }
      }, 20_000);
    };

    ws.onmessage = (event: MessageEvent) => {
      let msg: ServerMessage;
      try {
        msg = JSON.parse(event.data as string);
      } catch {
        console.warn("[useWebSocket] Mensagem não-JSON recebida:", event.data);
        return;
      }

      if (msg.type === "welcome") {
        setMyId(msg.id);
      }

      onMessageRef.current?.(msg);
    };

    ws.onclose = (event) => {
      if (pingTimerRef.current) clearInterval(pingTimerRef.current);
      if (!mountedRef.current) return;

      console.log(`[useWebSocket] Desconectado — código ${event.code}, motivo: ${event.reason || "nenhum"}`);
      setStatus("disconnected");

      // Reconexão automática com backoff exponencial
      if (autoReconnect && retriesRef.current < maxRetries && event.code !== 1008) {
        const delay = Math.min(1000 * 2 ** retriesRef.current, 15_000);
        retriesRef.current += 1;
        console.log(`[useWebSocket] Reconectando em ${delay}ms (tentativa ${retriesRef.current}/${maxRetries})...`);
        reconnectTimerRef.current = setTimeout(connect, delay);
      }
    };

    ws.onerror = (err) => {
      console.error("[useWebSocket] Erro no WebSocket:", err);
      setStatus("error");
    };
  }, [autoReconnect, maxRetries, clearTimers]);

  // Inicia conexão ao montar
  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      clearTimers();
      if (wsRef.current) {
        wsRef.current.onclose = null; // evita reconexão ao desmontar
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect, clearTimers]);

  const send = useCallback((msg: object) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn("[useWebSocket] Tentativa de envio com WebSocket fechado.");
      return;
    }
    ws.send(JSON.stringify(msg));
  }, []);

  return { status, send, myId };
}