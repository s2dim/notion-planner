"use client";

import { useState, useCallback, useEffect } from "react";
import { startOfWeek, endOfWeek, addWeeks, subWeeks } from "date-fns";
import { fetchTasks, createTask, deleteTask, updateTask } from "@/lib/tasks-api";
import { ChevronLeft, ChevronRight, Plus, X, Sun, Moon, Sunrise } from "lucide-react";

import {
  type TimeSlot,
  type PlannerData,
  getCurrentWeekDays,
  getWeekLabel,
  formatDate,
  formatDateShort,
  generateId,
  TIME_SLOT_CONFIG,
  loadData,
} from "@/lib/planner-store";

import { useSmartRefresh } from "@/lib/useSmartRefresh";
import { subscribeTasksChanged, publishTasksChanged } from "@/lib/planner-bus";

const SLOT_ICONS = {
  morning: Sunrise,
  afternoon: Sun,
  evening: Moon,
};

interface WeeklyWidgetProps {
  data: PlannerData;
  onUpdate: (data: PlannerData) => void;
}

export function WeeklyWidget({ data, onUpdate }: WeeklyWidgetProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [editingSlot, setEditingSlot] = useState<{ date: string; slot: TimeSlot } | null>(null);
  const [newTaskText, setNewTaskText] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const weekDays = getCurrentWeekDays(currentDate);
  const weekLabel = getWeekLabel(currentDate);

  const getTasksForDaySlot = useCallback(
    (date: string, slot: TimeSlot) =>
      data.weeklyTasks.filter((t) => t.date === date && t.timeSlot === slot),
    [data.weeklyTasks],
  );

  const refreshWeekly = useCallback(async () => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const end = endOfWeek(currentDate, { weekStartsOn: 1 });
    const date_from = formatDate(start);
    const date_to = formatDate(end);

    const res = await fetchTasks({ date_from, date_to });
    const weeklyFromNotion = res.tasks.map((t: any) => ({
      id: t.id,
      text: t.text,
      timeSlot: t.timeSlot,
      date: t.date,
      completed: !!t.completed,
      order: typeof t.order === "number" ? t.order : null,
    }));

    const base = loadData();
    const outside = base.weeklyTasks.filter((x) => x.date < date_from || x.date > date_to);

    const byId = new Map<string, (typeof weeklyFromNotion)[number]>();
    weeklyFromNotion.forEach((t) => byId.set(t.id, t));

    onUpdate({
      ...base,
      weeklyTasks: [...outside, ...Array.from(byId.values())],
    });
  }, [currentDate, onUpdate]);

  const { startBurst } = useSmartRefresh(refreshWeekly, {
    onlyWhenVisible: false,
    idleIntervalMs: 25000,
    burstIntervalMs: 1500,
    burstDurationMs: 8000,
    burstCount: 3,
  });

  useEffect(() => {
    refreshWeekly().catch(console.error);
  }, [refreshWeekly]);

  useEffect(() => {
    return subscribeTasksChanged(() => {
      refreshWeekly().catch(console.error);
    });
  }, [refreshWeekly]);

  const addTask = async (date: string, slot: TimeSlot) => {
    const text = newTaskText.trim();
    if (!text) return;

    const tempId = generateId();
    const base0 = loadData();
    onUpdate({
      ...base0,
      weeklyTasks: [...base0.weeklyTasks, { id: tempId, text, timeSlot: slot, date }],
    });

    setNewTaskText("");
    setEditingSlot(null);

    try {
      const created = await createTask({ text, date, timeSlot: slot });

      const base1 = loadData();
      onUpdate({
        ...base1,
        weeklyTasks: base1.weeklyTasks.map((t) =>
          t.id === tempId ? { id: created.task.id, text, timeSlot: slot, date } : t,
        ),
      });

      publishTasksChanged("weekly");
      startBurst();
    } catch (e) {
      const baseErr = loadData();
      onUpdate({
        ...baseErr,
        weeklyTasks: baseErr.weeklyTasks.filter((t) => t.id !== tempId),
      });
      console.error(e);
    }
  };

  const removeTask = async (taskId: string) => {
    const baseDel = loadData();
    onUpdate({
      ...baseDel,
      weeklyTasks: baseDel.weeklyTasks.filter((t) => t.id !== taskId),
    });

    try {
      await deleteTask(taskId);
      publishTasksChanged("weekly");
      startBurst();
    } catch (e) {
      console.error(e);
    }
  };

  const prevWeek = () => setCurrentDate((d) => subWeeks(d, 1));
  const nextWeek = () => setCurrentDate((d) => addWeeks(d, 1));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Weekly</h2>

        <div className="flex items-center gap-2">
          <button
            onClick={prevWeek}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Previous week"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <span className="min-w-[120px] text-center text-sm font-medium text-muted-foreground">
            {weekLabel}
          </span>

          <button
            onClick={nextWeek}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Next week"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="grid min-w-[880px] grid-cols-7 gap-2">
          {weekDays.map((day) => {
            const dateStr = formatDate(day);
            const isToday = formatDate(new Date()) === dateStr;

            return (
              <div
                key={dateStr}
                className={`flex min-h-[200px] flex-col rounded-lg border p-3 transition-shadow ${
                  isToday ? "border-primary/40 bg-primary/5 shadow-sm" : "border-border bg-card"
                }`}
              >
                <div
                  className={`mb-3 text-center text-xs font-semibold ${
                    isToday ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {formatDateShort(day)}
                </div>

{(["morning", "afternoon", "evening"] as TimeSlot[]).map((slot) => {
  const Icon = SLOT_ICONS[slot];
  const config = TIME_SLOT_CONFIG[slot];

  const tasks = getTasksForDaySlot(dateStr, slot)
    .slice()
    .sort(
      (a: any, b: any) =>
        (a.order ?? Number.MAX_SAFE_INTEGER) -
        (b.order ?? Number.MAX_SAFE_INTEGER),
    );

  const isEditing =
    editingSlot?.date === dateStr &&
    editingSlot?.slot === slot;

  return (
    <div key={slot} className="mb-2 last:mb-0">
      <div className="mb-1 flex items-center gap-1">
        <Icon className={`h-3 w-3 ${config.colorClass}`} />
        <span className="text-[10px] text-muted-foreground">
          {config.label}
        </span>
      </div>

      <div
        className="flex flex-col gap-0.5 min-h-[20px]"
        onDragOver={(e) => e.preventDefault()}
        onDrop={async (e) => {
          const raw = e.dataTransfer.getData("application/json");
          if (!raw) return;

          try {
            const payload = JSON.parse(raw) as {
              id: string;
              fromDate: string;
              fromSlot: TimeSlot;
            };

            const baseMove = loadData();

            const bucketBefore = baseMove.weeklyTasks
              .filter(
                (t: any) =>
                  t.date === dateStr && t.timeSlot === slot,
              )
              .slice()
              .sort(
                (a: any, b: any) =>
                  (a.order ?? Number.MAX_SAFE_INTEGER) -
                  (b.order ?? Number.MAX_SAFE_INTEGER),
              )
              .map((t: any) => t.id);

            // 맨 끝에 삽입
            const bucketAfter = bucketBefore
              .filter((id) => id !== payload.id)
              .concat(payload.id);

            const nextWeekly = baseMove.weeklyTasks.map((t: any) => {
              if (!bucketAfter.includes(t.id) && t.id !== payload.id)
                return t;

              const idx =
                bucketAfter.indexOf(
                  t.id === payload.id ? payload.id : t.id,
                );

              if (t.id === payload.id) {
                return {
                  ...t,
                  date: dateStr,
                  timeSlot: slot,
                  order: idx,
                };
              }

              if (t.date === dateStr && t.timeSlot === slot) {
                return { ...t, order: idx };
              }

              return t;
            });

            onUpdate({ ...baseMove, weeklyTasks: nextWeekly });

            for (const u of nextWeekly.filter(
              (t: any) =>
                t.date === dateStr && t.timeSlot === slot,
            )) {
              await updateTask({
                id: u.id,
                date: u.date,
                timeSlot: u.timeSlot,
                order: u.order ?? null,
              });
            }

            publishTasksChanged("weekly");
            startBurst();
          } catch {
            // ignore
          }
        }}
      >
        {/* 1️⃣ 태스크 먼저 렌더 */}
        {tasks.map((task) => (
          <div
            key={task.id}
            className="group relative w-full min-w-0"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData(
                "application/json",
                JSON.stringify({
                  id: task.id,
                  fromDate: dateStr,
                  fromSlot: slot,
                }),
              );
            }}
          >
            <div className="flex min-w-0 items-start gap-1">
              <span className="flex-1 min-w-0 whitespace-normal pr-4 text-[11px] leading-tight text-foreground">
                {task.text}
              </span>

              <button
                onClick={() => removeTask(task.id)}
                className="absolute right-0 top-0.5 hidden shrink-0 text-muted-foreground hover:text-destructive group-hover:inline-flex"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          </div>
        ))}

        {/* 2️⃣ 그 다음 항상 + */}
        {isEditing ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addTask(dateStr, slot);
            }}
            className="flex"
          >
            <input
              autoFocus
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              onBlur={() => setEditingSlot(null)}
              placeholder="..."
              className="w-full bg-transparent text-[11px] text-foreground outline-none"
            />
          </form>
        ) : (
          <button
            onClick={() => {
              setEditingSlot({ date: dateStr, slot });
              setNewTaskText("");
            }}
            className="flex items-center gap-0.5 text-muted-foreground/40 transition-colors hover:text-muted-foreground"
          >
            <Plus className="h-2.5 w-2.5" />
          </button>
        )}
      </div>
    </div>
  );
})}

              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
