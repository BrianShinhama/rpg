"use client";
// hooks/useWebSocket.ts

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

interface Options {
  onMessage?: (msg: ServerMessage) => void;
  autoReconnect?: boolean;
  maxRetries?: number;
}

/* ─── HOOK ──────────────────────────────────────────────────── */
export function useWebSocket({ onMessage, autoReconnect = true, maxRetries = 5 }: Options = {}) {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [myId, setMyId]     = useState<string | null>(null);

  // Refs estáveis — nunca mudam de referência, nunca causam re-render
  const wsRef          = useRef<WebSocket | null>(null);
  const retriesRef     = useRef(0);
  const mountedRef     = useRef(true);
  const onMessageRef   = useRef(onMessage);
const reconnTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
const pingTimerRef   = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // Mantém onMessage atualizado sem recriar o connect()
  useEffect(() => { onMessageRef.current = onMessage; }, [onMessage]);

  // connect() usa apenas refs → sem dependências externas → useCallback com [] é seguro
  const connect = useCallback(async () => {
    if (!mountedRef.current) return;

clearTimeout(reconnTimerRef.current);
clearInterval(pingTimerRef.current);

    setStatus("connecting");

    // PASSO 1: Inicializa o servidor — sem isso o listener de "upgrade"
    // ainda não existe e o WebSocket abaixo falha silenciosamente.
    try {
      await fetch("/api/ws");
    } catch {
      // Se o fetch falhar (ex: offline), tenta conectar mesmo assim
    }

    if (!mountedRef.current) return;

    // PASSO 2: Abre a conexão WebSocket
    const proto = location.protocol === "https:" ? "wss" : "ws";
    let ws: WebSocket;
    try {
      ws = new WebSocket(`${proto}://${location.host}/api/ws`);
    } catch {
      setStatus("error");
      return;
    }
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) { ws.close(); return; }
      retriesRef.current = 0;
      setStatus("connected");
      // Heartbeat para manter a conexão viva
      pingTimerRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "ping" }));
      }, 25_000);
    };

    ws.onmessage = ({ data }) => {
      let msg: ServerMessage;
      try { msg = JSON.parse(data); } catch { return; }
      if (msg.type === "welcome") setMyId(msg.id);
      onMessageRef.current?.(msg);
    };

    ws.onclose = ({ code }) => {
      clearInterval(pingTimerRef.current);
      if (!mountedRef.current) return;
      setStatus("disconnected");

      // Reconexão com backoff exponencial
      // Não reconecta se o servidor fechou com 1008 (lobby cheio etc.)
      if (autoReconnect && retriesRef.current < maxRetries && code !== 1008) {
        const delay = Math.min(1_000 * 2 ** retriesRef.current, 16_000);
        retriesRef.current++;
        reconnTimerRef.current = setTimeout(connect, delay);
      }
    };

    ws.onerror = () => setStatus("error");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); //   [] é intencional: connect nunca muda, só usa refs

  // Inicia a conexão uma única vez
  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      clearTimeout(reconnTimerRef.current);
      clearInterval(pingTimerRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null; // evita reconexão no unmount
        wsRef.current.close();
      }
    };
  }, [connect]); // connect tem ref estável → esse efeito roda só uma vez

  const send = useCallback((msg: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  return { status, send, myId };
}