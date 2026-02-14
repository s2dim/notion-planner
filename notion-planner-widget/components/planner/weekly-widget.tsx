"use client";

import { useState, useCallback, useEffect } from "react";
import { startOfWeek, endOfWeek, addWeeks, subWeeks } from "date-fns";
import {
  fetchTasks,
  createTask,
  deleteTask,
  updateTask,
} from "@/lib/tasks-api";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Sun,
  Moon,
  Sunrise,
} from "lucide-react";

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
  const [editingSlot, setEditingSlot] = useState<{
    date: string;
    slot: TimeSlot;
  } | null>(null);
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

  // 이번 주 tasks를 노션에서 다시 불러와 weeklyTasks 캐시를 갱신
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
    }));

    const base = loadData();
    const outside = base.weeklyTasks.filter(
      (x) => x.date < date_from || x.date > date_to,
    );

    const byId = new Map<string, (typeof weeklyFromNotion)[number]>();
    weeklyFromNotion.forEach((t) => byId.set(t.id, t));

    onUpdate({
      ...base,
      weeklyTasks: [...outside, ...Array.from(byId.values())],
    });
  }, [currentDate, onUpdate]);

  // 포커스 시 갱신 + 편집 후 잠깐 버스트
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

  // ✅ 다른 위젯(iframe)에서 변경이 일어나면 즉시 갱신
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
      weeklyTasks: [
        ...base0.weeklyTasks,
        { id: tempId, text, timeSlot: slot, date },
      ],
    });

    setNewTaskText("");
    setEditingSlot(null);

    try {
      const created = await createTask({ text, date, timeSlot: slot });

      const base1 = loadData();
      onUpdate({
        ...base1,
        weeklyTasks: base1.weeklyTasks.map((t) =>
          t.id === tempId
            ? { id: created.task.id, text, timeSlot: slot, date }
            : t,
        ),
      });

      // ✅ 다른 iframe들에 "변경됨" 신호 보내기
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
                  isToday
                    ? "border-primary/40 bg-primary/5 shadow-sm"
                    : "border-border bg-card"
                }`}
              >
                <div
                  className={`mb-3 text-center text-xs font-semibold ${
                    isToday ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {formatDateShort(day)}
                </div>

                {(["morning", "afternoon", "evening"] as TimeSlot[]).map(
                  (slot) => {
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

                        <div className="flex flex-col gap-0.5">
                          {tasks.map((task) => (
                            <div
                              key={task.id}
                              draggable
                              onDragStart={(e) => {
                                setDraggingId(task.id);
                                e.dataTransfer.setData(
                                  "application/json",
                                  JSON.stringify({
                                    id: task.id,
                                    fromDate: dateStr,
                                    fromSlot: slot,
                                  }),
                                );
                              }}
                              onDragEnd={() => {
                                setDraggingId(null);
                                setDragOverId(null);
                              }}
                              onDragEnter={() => setDragOverId(task.id)}
                              onDragLeave={() => setDragOverId(null)}
                              className={`group relative flex w-full min-w-0 cursor-move items-start gap-1 ${
                                draggingId === task.id
                                  ? "rounded-md bg-secondary/60"
                                  : ""
                              } ${
                                dragOverId === task.id
                                  ? "rounded-md ring-1 ring-primary/30"
                                  : ""
                              }`}
                            >
                              <span
                                className={`flex-1 min-w-0 break-keep whitespace-normal pr-4 text-[11px] leading-tight ${
                                  (task as any).completed
                                    ? "text-muted-foreground line-through"
                                    : "text-foreground"
                                }`}
                              >
                                {task.text}
                              </span>
                              <button
                                onClick={() => removeTask(task.id)}
                                className="absolute right-0 top-0.5 hidden shrink-0 text-muted-foreground hover:text-destructive group-hover:inline-flex"
                                aria-label={`Remove task: ${task.text}`}
                              >
                                <X className="h-2.5 w-2.5" />
                              </button>
                              <div
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={async (e) => {
                                  const raw =
                                    e.dataTransfer.getData("application/json");
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
                                          t.date === dateStr &&
                                          t.timeSlot === slot,
                                      )
                                      .sort(
                                        (a: any, b: any) =>
                                          (a.order ?? Number.MAX_SAFE_INTEGER) -
                                          (b.order ?? Number.MAX_SAFE_INTEGER),
                                      )
                                      .map((t) => t.id);
                                    const destIndex = bucketBefore.indexOf(
                                      task.id,
                                    );
                                    const bucketAfter = bucketBefore
                                      .filter((id) => id !== payload.id)
                                      .splice(0);
                                    bucketAfter.splice(
                                      destIndex === -1
                                        ? bucketAfter.length
                                        : destIndex,
                                      0,
                                      payload.id,
                                    );
                                    const nextWeekly = baseMove.weeklyTasks.map(
                                      (t: any) => {
                                        if (bucketAfter.includes(t.id)) {
                                          const idx = bucketAfter.indexOf(t.id);
                                          return {
                                            ...t,
                                            date: dateStr,
                                            timeSlot: slot,
                                            order: idx,
                                          };
                                        }
                                        if (t.id === payload.id) {
                                          return {
                                            ...t,
                                            date: dateStr,
                                            timeSlot: slot,
                                            order:
                                              bucketAfter.indexOf(t.id) === -1
                                                ? bucketAfter.length - 1
                                                : bucketAfter.indexOf(t.id),
                                          };
                                        }
                                        return t;
                                      },
                                    );
                                    onUpdate({
                                      ...baseMove,
                                      weeklyTasks: nextWeekly,
                                    });
                                    try {
                                      const updates = nextWeekly.filter(
                                        (t: any) =>
                                          t.date === dateStr &&
                                          t.timeSlot === slot,
                                      );
                                      for (const u of updates) {
                                        await updateTask({
                                          id: u.id,
                                          date: u.date,
                                          timeSlot: u.timeSlot,
                                          order: u.order ?? null,
                                        });
                                      }
                                      setDraggingId(null);
                                      setDragOverId(null);
                                      publishTasksChanged("weekly");
                                      startBurst();
                                    } catch (err) {
                                      console.error(err);
                                    }
                                  } catch {}
                                }}
                                className="h-0.5 w-full"
                              />
                            </div>
                          ))}

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
                                onBlur={() => {
                                  setEditingSlot(null);
                                }}
                                placeholder="..."
                                className="w-full bg-transparent text-[11px] text-foreground outline-none placeholder:text-muted-foreground/50"
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
                          <div
                            onDragOver={(e) => e.preventDefault()}
                            onDragLeave={() => {
                              setDragOverId(null);
                            }}
                            onDrop={async (e) => {
                              const raw =
                                e.dataTransfer.getData("application/json");
                              if (!raw) return;
                              try {
                                const payload = JSON.parse(raw) as {
                                  id: string;
                                  fromDate: string;
                                  fromSlot: TimeSlot;
                                };
                                const isSameBucket =
                                  payload.fromDate === dateStr &&
                                  payload.fromSlot === slot;
                                const baseMove = loadData();
                                const nextList = baseMove.weeklyTasks.map(
                                  (t) =>
                                    t.id === payload.id
                                      ? { ...t, date: dateStr, timeSlot: slot }
                                      : t,
                                );
                                onUpdate({
                                  ...baseMove,
                                  weeklyTasks: nextList,
                                });
                                try {
                                  await updateTask({
                                    id: payload.id,
                                    date: dateStr,
                                    timeSlot: slot,
                                    order: isSameBucket
                                      ? null
                                      : tasks.length || 0,
                                  });
                                  setDraggingId(null);
                                  setDragOverId(null);
                                  publishTasksChanged("weekly");
                                  startBurst();
                                } catch (err) {
                                  console.error(err);
                                }
                              } catch {
                                // ignore
                              }
                            }}
                            className="h-6"
                          />
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
