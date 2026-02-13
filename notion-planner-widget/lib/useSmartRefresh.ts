"use client";

import { useCallback, useEffect, useRef } from "react";

type Options = {
  // 평소 폴링
  idleIntervalMs?: number;
  // 편집 직후 폴링
  burstIntervalMs?: number;
  burstDurationMs?: number;
  // 화면 보일 때만 동작
  onlyWhenVisible?: boolean;
};

export function useSmartRefresh(
  refresh: () => void | Promise<void>,
  opts: Options = {},
) {
  const {
    idleIntervalMs = 0,
    burstIntervalMs = 2000,
    burstDurationMs = 15000,
    onlyWhenVisible = true,
  } = opts;

  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  const burstTimerRef = useRef<number | null>(null);
  const burstEndRef = useRef<number>(0);

  const safeRefresh = useCallback(() => {
    if (onlyWhenVisible && document.visibilityState !== "visible") return;
    void refreshRef.current();
  }, [onlyWhenVisible]);

  // 포커스 시 즉시 갱신
  useEffect(() => {
    const onFocus = () => safeRefresh();
    const onVisibility = () => {
      if (document.visibilityState === "visible") safeRefresh();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [safeRefresh]);

  // 평소 폴링
  useEffect(() => {
    if (!idleIntervalMs || idleIntervalMs <= 0) return;
    const id = window.setInterval(() => safeRefresh(), idleIntervalMs);
    return () => window.clearInterval(id);
  }, [idleIntervalMs, safeRefresh]);

  // 편집 직후: 기준 시간에 맞춰 갱신 (현재 1초)
  const startBurst = useCallback(() => {
    burstEndRef.current = Date.now() + burstDurationMs;

    if (burstTimerRef.current != null) return;

    burstTimerRef.current = window.setInterval(() => {
      if (onlyWhenVisible && document.visibilityState !== "visible") return;

      if (Date.now() > burstEndRef.current) {
        window.clearInterval(burstTimerRef.current!);
        burstTimerRef.current = null;
        return;
      }
      void refreshRef.current();
    }, burstIntervalMs);
  }, [burstDurationMs, burstIntervalMs, onlyWhenVisible]);

  return { refreshNow: safeRefresh, startBurst };
}
