"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Sunrise,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { addDays, subDays, format } from "date-fns";
import { ko } from "date-fns/locale";

import {
  fetchTasks,
  toggleTask as toggleTaskApi,
  deleteTask as deleteTaskApi,
  updateTask,
} from "@/lib/tasks-api";

import {
  type TimeSlot,
  type PlannerData,
  type DailyTask,
  formatDate,
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

interface DailyWidgetProps {
  data: PlannerData;
  onUpdate: (data: PlannerData) => void;
}

export function DailyWidget({ data, onUpdate }: DailyWidgetProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const dateStr = useMemo(() => formatDate(currentDate), [currentDate]);
  const isToday = formatDate(new Date()) === dateStr;
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const dailyTasksForDay = data.dailyTasks.filter((t) => t.date === dateStr);

  // 오늘 tasks를 노션에서 다시 불러와 dailyTasks 캐시 갱신
  const refreshDaily = useCallback(async () => {
    const res = await fetchTasks({ date_from: dateStr, date_to: dateStr });

    const dailyFromNotion: DailyTask[] = res.tasks.map((t: any) => ({
      id: t.id,
      text: t.text,
      timeSlot: t.timeSlot,
      completed: !!t.completed,
      date: t.date,
    }));

    const base = loadData();
    onUpdate({
      ...base,
      dailyTasks: [
        ...base.dailyTasks.filter((x) => x.date !== dateStr),
        ...dailyFromNotion,
      ],
    });
  }, [dateStr, onUpdate]);

  const { startBurst } = useSmartRefresh(refreshDaily, {
    onlyWhenVisible: false,
    idleIntervalMs: 25000,
    burstIntervalMs: 1500,
    burstDurationMs: 8000,
    burstCount: 3,
  });

  useEffect(() => {
    refreshDaily().catch(console.error);
  }, [refreshDaily]);

  // ✅ 다른 위젯(iframe)에서 변경이 일어나면 즉시 갱신
  useEffect(() => {
    return subscribeTasksChanged(() => {
      refreshDaily().catch(console.error);
    });
  }, [refreshDaily]);

  const toggleTask = async (taskId: string) => {
    const prev = data.dailyTasks.find((t) => t.id === taskId);
    if (!prev) return;

    const nextCompleted = !prev.completed;

    // optimistic
    onUpdate({
      ...data,
      dailyTasks: data.dailyTasks.map((t) =>
        t.id === taskId ? { ...t, completed: nextCompleted } : t,
      ),
    });

    try {
      await toggleTaskApi(taskId, nextCompleted);

      publishTasksChanged("daily");
      startBurst();
    } catch (e) {
      // rollback
      onUpdate({
        ...data,
        dailyTasks: data.dailyTasks.map((t) =>
          t.id === taskId ? { ...t, completed: !nextCompleted } : t,
        ),
      });
      console.error(e);
    }
  };

  const removeDailyTask = async (taskId: string) => {
    const base = loadData();
    onUpdate({
      ...base,
      dailyTasks: base.dailyTasks.filter((t) => t.id !== taskId),
    });

    try {
      await deleteTaskApi(taskId);

      publishTasksChanged("daily");
      startBurst();
    } catch (e) {
      console.error(e);
    }
  };

  const allTasks = dailyTasksForDay.length > 0 ? dailyTasksForDay : [];
  const completedCount = allTasks.filter((t) => t.completed).length;
  const totalCount = allTasks.length;
  const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Daily</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentDate((d) => subDays(d, 1))}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Previous day"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[100px] text-center text-sm font-medium text-muted-foreground">
            {format(currentDate, "M/d (EEE)", { locale: ko })}
            {isToday && (
              <span className="ml-1 text-xs text-primary">today</span>
            )}
          </span>
          <button
            onClick={() => setCurrentDate((d) => addDays(d, 1))}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Next day"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {totalCount > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {completedCount}/{totalCount} completed
            </span>
            <span>{Math.round(progressPct)}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {(["morning", "afternoon", "evening"] as TimeSlot[]).map((slot) => {
        const Icon = SLOT_ICONS[slot];
        const config = TIME_SLOT_CONFIG[slot];
        const slotTasks = allTasks.filter((t) => t.timeSlot === slot);

        if (slotTasks.length === 0) return null;

        return (
          <div key={slot} className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
              <Icon className={`h-3.5 w-3.5 ${config.colorClass}`} />
              <span className="text-xs font-medium text-muted-foreground">
                {config.label}
              </span>
            </div>
            <div
              className="flex flex-col gap-1"
              onDragOver={(e) => e.preventDefault()}
              onDrop={async (e) => {
                const raw = e.dataTransfer.getData("application/json");
                if (!raw) return;
                try {
                  const payload = JSON.parse(raw) as {
                    id: string;
                    fromSlot: TimeSlot;
                  };
                  const baseMove = loadData();
                  const nextList = baseMove.dailyTasks.map((t) =>
                    t.id === payload.id ? { ...t, timeSlot: slot } : t,
                  );
                  onUpdate({ ...baseMove, dailyTasks: nextList });
                  try {
                    await updateTask({ id: payload.id, timeSlot: slot });
                    publishTasksChanged("daily");
                    startBurst();
                  } catch (err) {
                    console.error(err);
                  }
                } catch {
                  // ignore
                }
              }}
            >
              {slotTasks.map((task) => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(e) => {
                    setDraggingId(task.id);
                    e.dataTransfer.setData(
                      "application/json",
                      JSON.stringify({ id: task.id, fromSlot: slot }),
                    );
                  }}
                  onDragEnd={() => {
                    setDraggingId(null);
                    setDragOverId(null);
                  }}
                  onDragEnter={() => setDragOverId(task.id)}
                  onDragLeave={() => setDragOverId(null)}
                  className={`group flex items-start gap-1 ${
                    draggingId === task.id ? "rounded-md bg-secondary/60" : ""
                  } ${
                    dragOverId === task.id
                      ? "rounded-md ring-1 ring-primary/30"
                      : ""
                  }`}
                >
                  <button
                    onClick={() => toggleTask(task.id)}
                    className="flex flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-secondary"
                  >
                    {task.completed ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" />
                    ) : (
                      <Circle className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                    )}
                    <span
                      className={`text-sm leading-tight ${
                        task.completed
                          ? "text-muted-foreground line-through"
                          : "text-foreground"
                      }`}
                    >
                      {task.text}
                    </span>
                  </button>
                  <button
                    onClick={() => removeDailyTask(task.id)}
                    className="mt-0.5 hidden shrink-0 text-muted-foreground hover:text-destructive group-hover:inline-flex"
                    aria-label={`Remove task: ${task.text}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {totalCount === 0 && (
        <div className="py-8 text-center text-sm text-muted-foreground/50">
          No tasks for this day
        </div>
      )}
    </div>
  );
}
