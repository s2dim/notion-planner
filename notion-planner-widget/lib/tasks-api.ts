type Scope = "weekly" | "daily";
type Slot = "morning" | "afternoon" | "evening";

export async function fetchTasks(params: {
  scope?: Scope;
  date_from: string;
  date_to: string;
}) {
  const qs = new URLSearchParams();
  qs.set("date_from", params.date_from);
  qs.set("date_to", params.date_to);
  if (params.scope) qs.set("scope", params.scope);

  const res = await fetch(`/api/tasks?${qs.toString()}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch tasks");
  return (await res.json()) as {
    tasks: Array<{
      id: string;
      text: string;
      date: string;
      timeSlot: Slot;
      scope: Scope;
      completed: boolean;
    }>;
  };
}

export async function createTask(input: {
  text: string;
  date: string;
  timeSlot: Slot;
  scope: Scope;
}) {
  const res = await fetch("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Failed to create task");
  return (await res.json()) as { task: { id: string } };
}

export async function toggleTask(id: string, completed: boolean) {
  const res = await fetch(`/api/tasks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ completed }),
  });
  if (!res.ok) throw new Error("Failed to toggle task");
}

export async function deleteTask(id: string) {
  const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete task");
}
