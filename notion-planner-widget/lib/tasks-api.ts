type Slot = "morning" | "afternoon" | "evening";

export async function fetchTasks(params: {
  date_from: string;
  date_to: string;
}) {
  const qs = new URLSearchParams();
  qs.set("date_from", params.date_from);
  qs.set("date_to", params.date_to);

  const res = await fetch(`/api/tasks?${qs.toString()}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch tasks");
  return (await res.json()) as {
    tasks: Array<{
      id: string;
      text: string;
      date: string;
      timeSlot: Slot;
      completed: boolean;
      order: number | null;
    }>;
  };
}

export async function createTask(input: {
  text: string;
  date: string;
  timeSlot: Slot;
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

export async function updateTask(input: {
  id: string;
  date?: string;
  timeSlot?: Slot;
  order?: number | null;
  text?: string;
}) {
  const { id, ...rest } = input;
  const res = await fetch(`/api/tasks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(rest),
  });
  if (!res.ok) throw new Error("Failed to update task");
}
