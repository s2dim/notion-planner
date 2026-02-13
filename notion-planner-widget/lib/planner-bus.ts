"use client";

const CHANNEL = "planner";

type Msg = { type: "tasks-changed"; at: number; from: string };

export function publishTasksChanged(from: string) {
  try {
    const bc = new BroadcastChannel(CHANNEL);
    bc.postMessage({
      type: "tasks-changed",
      at: Date.now(),
      from,
    } satisfies Msg);
    bc.close();
  } catch {
    // BroadcastChannel 미지원/차단이면 무시 (폴링이 백업)
  }
}

export function subscribeTasksChanged(handler: (msg: Msg) => void) {
  try {
    const bc = new BroadcastChannel(CHANNEL);
    bc.onmessage = (e) => handler(e.data as Msg);
    return () => bc.close();
  } catch {
    return () => {};
  }
}
