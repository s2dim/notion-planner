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
import { Pencil } from "lucide-react";
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

type DropPosition = "before" | "after";
type DragOverState = { id: string; pos: DropPosition } | null;

interface DailyWidgetProps {
  data: PlannerData;
  onUpdate: (data: PlannerData) => void;
}

function getDropPosition(e: React.DragEvent, el: HTMLElement): DropPosition {
  const rect = el.getBoundingClientRect();
  const offset = e.clientY - rect.top;
  return offset < rect.height / 2 ? "before" : "after";
}

function reorderIds(params: {
  bucketIds: string[];
  movingId: string;
  targetId: string;
  position: DropPosition;
}) {
  const { bucketIds, movingId, targetId, position } = params;
  const without = bucketIds.filter((id) => id !== movingId);
  const targetIndex = without.indexOf(targetId);
  const insertAt =
    targetIndex === -1
      ? without.length
      : position === "before"
        ? targetIndex
        : targetIndex + 1;

  const next = without.slice();
  next.splice(insertAt, 0, movingId);
  return next;
}

export function DailyWidget({ data, onUpdate }: DailyWidgetProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const dateStr = useMemo(() => formatDate(currentDate), [currentDate]);
  const isToday = formatDate(new Date()) === dateStr;

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<DragOverState>(null);
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);

  const dailyTasksForDay = data.dailyTasks.filter((t) => t.date === dateStr);

  const refreshDaily = useCallback(async () => {
    const res = await fetchTasks({ date_from: dateStr, date_to: dateStr });

    const dailyFromNotion: DailyTask[] = res.tasks.map((t: any) => ({
      id: t.id,
      text: t.text,
      timeSlot: t.timeSlot,
      completed: !!t.completed,
      date: t.date,
      order: typeof t.order === "number" ? t.order : null,
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

  useEffect(() => {
    return subscribeTasksChanged(() => {
      refreshDaily().catch(console.error);
    });
  }, [refreshDaily]);

  const toggleTask = async (taskId: string) => {
    const prev = data.dailyTasks.find((t) => t.id === taskId);
    if (!prev) return;

    const nextCompleted = !prev.completed;

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

        const slotTasks = allTasks
          .filter((t) => t.timeSlot === slot)
          .slice()
          .sort(
            (a: any, b: any) =>
              (a.order ?? Number.MAX_SAFE_INTEGER) -
              (b.order ?? Number.MAX_SAFE_INTEGER),
          );

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
              onDragLeave={() => setDragOver(null)}
              onDrop={async (e) => {
                const raw = e.dataTransfer.getData("application/json");
                if (!raw) return;

                try {
                  const payload = JSON.parse(raw) as {
                    id: string;
                    fromSlot: TimeSlot;
                  };

                  const baseMove = data;
                  const before = baseMove.dailyTasks
                    .filter(
                      (t: any) => t.date === dateStr && t.timeSlot === slot,
                    )
                    .slice()
                    .sort(
                      (a: any, b: any) =>
                        (a.order ?? Number.MAX_SAFE_INTEGER) -
                        (b.order ?? Number.MAX_SAFE_INTEGER),
                    );

                  const nextList = baseMove.dailyTasks.map((t: any) =>
                    t.id === payload.id
                      ? {
                          ...t,
                          date: dateStr,
                          timeSlot: slot,
                          order:
                            payload.fromSlot === slot
                              ? (t.order ?? null)
                              : before.length,
                        }
                      : t,
                  );

                  onUpdate({ ...baseMove, dailyTasks: nextList });

                  try {
                    await updateTask({
                      id: payload.id,
                      timeSlot: slot,
                      order: payload.fromSlot === slot ? null : before.length,
                    });
                    setDraggingId(null);
                    setDragOver(null);
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
              {slotTasks.map((task) => {
                const showLine =
                  draggingId &&
                  draggingId !== task.id &&
                  dragOver?.id === task.id;

                return (
                  <div
                    key={task.id}
                    className={`group relative w-full min-w-0 rounded-md ${
                      draggingId === task.id ? "bg-secondary/60" : ""
                    } ${dragOver?.id === task.id ? "bg-secondary/40" : ""}`}
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
                      setDragOver(null);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (!draggingId || draggingId === task.id) return;
                      setDragOver({
                        id: task.id,
                        pos: getDropPosition(e, e.currentTarget),
                      });
                    }}
                    onDragLeave={() => {
                      setDragOver((prev) =>
                        prev?.id === task.id ? null : prev,
                      );
                    }}
                    onDrop={async (e) => {
                      e.preventDefault();
                      const raw = e.dataTransfer.getData("application/json");
                      if (!raw) return;

                      try {
                        const payload = JSON.parse(raw) as {
                          id: string;
                          fromSlot: TimeSlot;
                        };

                        const baseMove = data;
                        const bucketBefore = baseMove.dailyTasks
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

                        const position: DropPosition =
                          dragOver?.id === task.id ? dragOver.pos : "after";

                        const bucketAfter = reorderIds({
                          bucketIds: bucketBefore,
                          movingId: payload.id,
                          targetId: task.id,
                          position,
                        });

                        const nextDaily = baseMove.dailyTasks.map((t: any) => {
                          if (
                            !bucketAfter.includes(t.id) &&
                            t.id !== payload.id
                          )
                            return t;

                          const idx = bucketAfter.indexOf(
                            t.id === payload.id ? payload.id : t.id,
                          );
                          const isInTargetBucket =
                            t.date === dateStr && t.timeSlot === slot;

                          if (t.id === payload.id) {
                            return {
                              ...t,
                              date: dateStr,
                              timeSlot: slot,
                              order: idx,
                            };
                          }

                          if (isInTargetBucket) {
                            return { ...t, order: idx };
                          }

                          return t;
                        });

                        onUpdate({ ...baseMove, dailyTasks: nextDaily });

                        try {
                          const updates = nextDaily
                            .filter((t: any) => bucketAfter.includes(t.id))
                            .slice()
                            .sort(
                              (a: any, b: any) =>
                                (a.order ?? Number.MAX_SAFE_INTEGER) -
                                (b.order ?? Number.MAX_SAFE_INTEGER),
                            );

                          for (const u of updates) {
                            await updateTask({
                              id: u.id,
                              timeSlot: u.timeSlot,
                              order: u.order ?? null,
                            });
                          }

                          setDraggingId(null);
                          setDragOver(null);
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
                    {showLine && (
                      <div
                        className={`pointer-events-none absolute left-0 right-0 h-0.5 bg-primary ${
                          dragOver?.pos === "before" ? "top-0" : "bottom-0"
                        }`}
                      />
                    )}

                    <div className="relative">
                      {editing?.id === task.id ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            const text = (editing?.text || "").trim();
                            if (!text) {
                              setEditing(null);
                              return;
                            }
                            const base = loadData();
                            onUpdate({
                              ...base,
                              dailyTasks: base.dailyTasks.map((t) =>
                                t.id === task.id ? { ...t, text } : t,
                              ),
                            });
                            (async () => {
                              try {
                                await updateTask({ id: task.id, text });
                                publishTasksChanged("daily");
                                startBurst();
                              } catch {}
                              setEditing(null);
                            })();
                          }}
                          className="flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-1.5 pr-8"
                        >
                          <input
                            autoFocus
                            value={editing.text}
                            onChange={(e) =>
                              setEditing({ id: task.id, text: e.target.value })
                            }
                            onBlur={() => setEditing(null)}
                            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none"
                          />
                        </form>
                      ) : (
                        <button
                          onClick={() => toggleTask(task.id)}
                          className="flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-1.5 pr-8 text-left transition-colors hover:bg-secondary/40"
                        >
                          {task.completed ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" />
                          ) : (
                            <Circle className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                          )}

                          <span
                            className={`min-w-0 flex-1 whitespace-normal text-sm leading-tight ${
                              task.completed
                                ? "text-muted-foreground line-through"
                                : "text-foreground"
                            }`}
                          >
                            {task.text}
                          </span>
                        </button>
                      )}

                      <button
                        onClick={() => removeDailyTask(task.id)}
                        className="absolute right-2 top-1/2 hidden -translate-y-1/2 text-muted-foreground hover:text-destructive group-hover:inline-flex"
                        aria-label={`Remove task: ${task.text}`}
                      >
                        ×
                      </button>
                      {!editing && (
                        <button
                          onClick={() =>
                            setEditing({ id: task.id, text: task.text || "" })
                          }
                          className="absolute right-6 top-1/2 hidden -translate-y-1/2 text-muted-foreground hover:text-foreground group-hover:inline-flex"
                          aria-label={`Edit task: ${task.text}`}
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
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
