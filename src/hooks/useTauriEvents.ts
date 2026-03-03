import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type {
  HttpSession,
  SessionEvent,
  WsMessage,
  WsMessageEvent,
} from "../types";

/* Returns the session map, ordered IDs, connection status, and a clear function. */
export function useProxySessions() {
  const [sessions, setSessions] = useState<Map<number, HttpSession>>(new Map());
  const [order, setOrder] = useState<number[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let unlisten: UnlistenFn | undefined;
    let cancelled = false;

    listen<SessionEvent>("proxy-session", (event) => {
      if (cancelled) return;
      const { type, session } = event.payload;
      // works for any event
      setConnected(true);

      setSessions((prev) => {
        const next = new Map(prev);
        next.set(session.id, session);
        return next;
      });
      if (type === "start") {
        setOrder((prev) => [...prev, session.id]);
      }
    }).then((fn) => {
      if (cancelled) {
        fn();
      } else {
        unlisten = fn;
      }
    });

    const pollStatus = async () => {
      for (let i = 0; i < 10; i++) {
        if (cancelled) return;
        try {
          const status = await invoke<string>("get_proxy_status");
          if (!cancelled && status.startsWith("running")) {
            setConnected(true);
            return;
          }
        } catch {
          // ignore
        }
        await new Promise((r) => setTimeout(r, 500));
      }
    };
    pollStatus();

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  const clear = useCallback(() => {
    setSessions(new Map());
    setOrder([]);
  }, []);

  return { sessions, order, connected, clear };
}

export function useWsMessages() {
  const [messages, setMessages] = useState<Map<number, WsMessage[]>>(new Map());

  useEffect(() => {
    let unlisten: UnlistenFn | undefined;
    let cancelled = false;

    listen<WsMessageEvent>("ws-message", (event) => {
      if (cancelled) return;
      const msg = event.payload.message;
      setMessages((prev) => {
        const next = new Map(prev);
        const list = next.get(msg.sessionId) ?? [];
        next.set(msg.sessionId, [...list, msg]);
        return next;
      });
    }).then((fn) => {
      if (cancelled) {
        fn();
      } else {
        unlisten = fn;
      }
    });

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  const clear = useCallback(() => {
    setMessages(new Map());
  }, []);

  return { messages, clear };
}
