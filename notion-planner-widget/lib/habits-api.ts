export async function fetchHabits() {
  const res = await fetch("/api/habits", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch habits");
  return (await res.json()) as {
    habits: Array<{
      id: string;
      name: string;
      active: boolean;
      order: number | null;
    }>;
  };
}

export async function createHabit(input: {
  name: string;
  order?: number | null;
}) {
  const res = await fetch("/api/habits", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Failed to create habit");
  return (await res.json()) as { habit: { id: string } };
}

export async function updateHabitActive(id: string, active: boolean) {
  const res = await fetch(`/api/habits/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ active }),
  });
  if (!res.ok) throw new Error("Failed to update habit");
}

export async function updateHabitOrder(id: string, order: number | null) {
  const res = await fetch(`/api/habits/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ order }),
  });
  if (!res.ok) throw new Error("Failed to update habit order");
}

export async function updateHabitName(id: string, name: string) {
  const res = await fetch(`/api/habits/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error("Failed to update habit name");
}

export async function fetchHabitLogs(params: {
  date_from: string;
  date_to: string;
}) {
  const qs = new URLSearchParams();
  qs.set("date_from", params.date_from);
  qs.set("date_to", params.date_to);
  const res = await fetch(`/api/habit-logs?${qs.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch habit logs");
  return (await res.json()) as {
    logs: Array<{
      id: string;
      habitId: string | null;
      date: string;
      done: boolean;
    }>;
  };
}

export async function toggleHabitLog(input: {
  habitId: string;
  date: string;
  done: boolean;
}) {
  const res = await fetch("/api/habit-logs/toggle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Failed to toggle habit log");
  return (await res.json()) as { log: { id: string } };
}
