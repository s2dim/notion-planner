"use client";

import { useCallback, useEffect, useRef } from "react";

type Options = {
  idleIntervalMs?: number;
  burstIntervalMs?: number;
  burstDurationMs?: number;
  onlyWhenVisible?: boolean;
  burstCount?: number;
};

export function useSmartRefresh(
  refresh: () => void | Promise<void>,
  opts: Options = {},
) {
  const {
    idleIntervalMs = 30000,
    burstIntervalMs = 3000,
    burstDurationMs = 8000,
    onlyWhenVisible = false,
  } = opts;

  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  const inFlightRef = useRef(false);

  const runRefresh = useCallback(async () => {
    if (onlyWhenVisible && document.visibilityState !== "visible") return;
    if (inFlightRef.current) return;

    inFlightRef.current = true;
    try {
      await refreshRef.current();
    } finally {
      inFlightRef.current = false;
    }
  }, [onlyWhenVisible]);

  const burstTimerRef = useRef<number | null>(null);
  const burstEndRef = useRef<number>(0);
  const burstCountRef = useRef(0);

  useEffect(() => {
    const onFocus = () => void runRefresh();
    const onVisibility = () => {
      if (document.visibilityState === "visible") void runRefresh();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [runRefresh]);

  useEffect(() => {
    if (!idleIntervalMs || idleIntervalMs <= 0) return;
    const id = window.setInterval(() => void runRefresh(), idleIntervalMs);
    return () => window.clearInterval(id);
  }, [idleIntervalMs, runRefresh]);

  const startBurst = useCallback(() => {
    burstEndRef.current = Date.now() + burstDurationMs;
    if (burstTimerRef.current != null) return;
    burstCountRef.current = 0;

    const tick = () => {
      if (onlyWhenVisible && document.visibilityState !== "visible") {
        // 가시성 문제로 지연, 다음 틱 예약
        burstTimerRef.current = window.setTimeout(
          tick,
          burstIntervalMs,
        ) as unknown as number;
        return;
      }

      if (
        Date.now() > burstEndRef.current ||
        (opts.burstCount ?? 3) <= burstCountRef.current
      ) {
        window.clearTimeout(burstTimerRef.current!);
        burstTimerRef.current = null;
        return;
      }
      burstCountRef.current += 1;
      void runRefresh();
      burstTimerRef.current = window.setTimeout(
        tick,
        burstIntervalMs,
      ) as unknown as number;
    };

    burstTimerRef.current = window.setTimeout(
      tick,
      burstIntervalMs,
    ) as unknown as number;
  }, [
    burstDurationMs,
    burstIntervalMs,
    onlyWhenVisible,
    runRefresh,
    opts.burstCount,
  ]);

  return { refreshNow: runRefresh, startBurst };
}
