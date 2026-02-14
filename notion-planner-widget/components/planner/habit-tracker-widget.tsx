"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, X, Check } from "lucide-react";
import { startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import {
  DAY_NAMES_KR,
  type PlannerData,
  formatDate,
} from "@/lib/planner-store";
import {
  fetchHabits,
  fetchHabitLogs,
  toggleHabitLog,
  createHabit,
  updateHabitActive,
  updateHabitOrder,
} from "@/lib/habits-api";
import { useSmartRefresh } from "@/lib/useSmartRefresh";
import { subscribeTasksChanged, publishTasksChanged } from "@/lib/planner-bus";

interface HabitTrackerWidgetProps {
  data: PlannerData;
  onUpdate: (data: PlannerData) => void;
}

type HabitItem = {
  id: string;
  name: string;
  active: boolean;
  order: number | null;
};

export function HabitTrackerWidget({
  data,
  onUpdate,
}: HabitTrackerWidgetProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newHabitName, setNewHabitName] = useState("");
  const [habits, setHabits] = useState<HabitItem[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const weekStart = useMemo(
    () => startOfWeek(new Date(), { weekStartsOn: 1 }),
    [],
  );
  const weekEnd = useMemo(() => endOfWeek(new Date(), { weekStartsOn: 1 }), []);
  const weekDates = useMemo(
    () =>
      eachDayOfInterval({ start: weekStart, end: weekEnd })
        .slice(0, 7)
        .map((d) => formatDate(d)),
    [weekStart, weekEnd],
  );

  const [weekLogs, setWeekLogs] = useState<
    Record<string, Record<string, boolean>>
  >({});

  const refreshHabits = useCallback(async () => {
    const h = await fetchHabits();
    setHabits(h.habits);
  }, []);

  const refreshLogs = useCallback(async () => {
    const date_from = weekDates[0];
    const date_to = weekDates[6];
    const res = await fetchHabitLogs({ date_from, date_to });
    const byHabit: Record<string, Record<string, boolean>> = {};
    res.logs.forEach((log) => {
      if (!log.habitId) return;
      if (!byHabit[log.habitId]) byHabit[log.habitId] = {};
      byHabit[log.habitId][log.date] = !!log.done;
    });
    setWeekLogs(byHabit);
  }, [weekDates]);

  const refreshAll = useCallback(async () => {
    await refreshHabits();
    await refreshLogs();
  }, [refreshHabits, refreshLogs]);

  const { startBurst } = useSmartRefresh(refreshAll, {
    onlyWhenVisible: false,
    idleIntervalMs: 25000,
    burstIntervalMs: 1500,
    burstDurationMs: 8000,
    burstCount: 3,
  });

  useEffect(() => {
    refreshAll().catch(console.error);
  }, [refreshAll]);

  useEffect(() => {
    return subscribeTasksChanged(() => {
      refreshAll().catch(console.error);
    });
  }, [refreshAll]);

  const isChecked = (habitId: string, dayIdx: number) => {
    const dateStr = weekDates[dayIdx];
    return !!weekLogs[habitId]?.[dateStr];
  };

  const getCompletionRate = (habitId: string) => {
    const count = DAY_NAMES_KR.filter((_, i) => isChecked(habitId, i)).length;
    return Math.round((count / 7) * 100);
  };

  const toggleDay = async (habitId: string, dayIdx: number) => {
    const dateStr = weekDates[dayIdx];
    const next = !isChecked(habitId, dayIdx);
    setWeekLogs((prev) => ({
      ...prev,
      [habitId]: { ...(prev[habitId] || {}), [dateStr]: next },
    }));
    try {
      await toggleHabitLog({ habitId, date: dateStr, done: next });
      publishTasksChanged("habit");
      startBurst();
    } catch (e) {
      setWeekLogs((prev) => ({
        ...prev,
        [habitId]: { ...(prev[habitId] || {}), [dateStr]: !next },
      }));
      console.error(e);
    }
  };

  const addHabitServer = async () => {
    if (!newHabitName.trim()) return;
    const name = newHabitName.trim();
    setNewHabitName("");
    setIsAdding(false);
    try {
      const created = await createHabit({ name });
      await refreshHabits();
      publishTasksChanged("habit");
      startBurst();
    } catch (e) {
      console.error(e);
    }
  };

  const hideHabit = async (habitId: string) => {
    try {
      await updateHabitActive(habitId, false);
      setHabits((prev) => prev.filter((h) => h.id !== habitId));
      publishTasksChanged("habit");
      startBurst();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Habit Tracker</h2>
        <div className="h-4" />
      </div>

      {habits.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm table-fixed">
            <thead>
              <tr>
                <th className="w-[180px] pb-2 pr-3 text-left text-xs font-medium text-muted-foreground">
                  Habit
                </th>
                {DAY_NAMES_KR.map((day, i) => (
                  <th
                    key={i}
                    className="w-10 pb-2 text-center text-xs font-medium text-muted-foreground"
                  >
                    {day}
                  </th>
                ))}
                <th className="w-10 pb-2 pl-2 text-right text-xs font-medium text-muted-foreground">
                  %
                </th>
              </tr>
            </thead>
            <tbody>
              {habits
                .slice()
                .sort(
                  (a, b) =>
                    (a.order ?? Number.MAX_SAFE_INTEGER) -
                    (b.order ?? Number.MAX_SAFE_INTEGER),
                )
                .map((habit) => (
                <tr
                  key={habit.id}
                  className={`group ${
                    draggingId === habit.id ? "bg-secondary/60" : ""
                  } ${
                    dragOverId === habit.id ? "ring-1 ring-primary/30" : ""
                  }`}
                  onDragEnter={() => setDragOverId(habit.id)}
                  onDragLeave={() => setDragOverId(null)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={async (e) => {
                    const raw = e.dataTransfer.getData("application/json");
                    if (!raw) return;
                    try {
                      const payload = JSON.parse(raw) as { id: string };
                      const before = habits
                        .slice()
                        .sort(
                          (a, b) =>
                            (a.order ?? Number.MAX_SAFE_INTEGER) -
                            (b.order ?? Number.MAX_SAFE_INTEGER),
                        );
                      const fromIdx = before.findIndex((h) => h.id === payload.id);
                      const toIdx = before.findIndex((h) => h.id === habit.id);
                      if (fromIdx === -1 || toIdx === -1) return;
                      const next = before.slice();
                      const [moved] = next.splice(fromIdx, 1);
                      next.splice(toIdx, 0, moved);
                      const nextWithOrder = next.map((h, idx) => ({
                        ...h,
                        order: idx,
                      }));
                      setHabits(nextWithOrder);
                      try {
                        for (const h of nextWithOrder) {
                          await updateHabitOrder(h.id, h.order ?? null);
                        }
                        setDraggingId(null);
                        setDragOverId(null);
                        publishTasksChanged("habit");
                        startBurst();
                      } catch (err) {
                        console.error(err);
                      }
                    } catch {}
                  }}
                >
                  <td className="relative w-[180px] py-1 pr-3">
                    <div
                      className="flex cursor-move items-center gap-1"
                      draggable
                      onDragStart={(e) => {
                        setDraggingId(habit.id);
                        e.dataTransfer.setData(
                          "application/json",
                          JSON.stringify({ id: habit.id }),
                        );
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragEnd={() => {
                        setDraggingId(null);
                        setDragOverId(null);
                      }}
                    >
                      <span className="text-sm text-foreground">
                        {habit.name}
                      </span>
                      <button
                        onClick={() => hideHabit(habit.id)}
                        className="absolute right-0 top-1 hidden shrink-0 text-muted-foreground hover:text-destructive group-hover:inline-flex"
                        aria-label={`Remove habit: ${habit.name}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                  {DAY_NAMES_KR.map((_, dayIdx) => {
                    const checked = isChecked(habit.id, dayIdx);
                    return (
                      <td key={dayIdx} className="w-10 py-1 text-center">
                        <button
                          onClick={() => toggleDay(habit.id, dayIdx)}
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-md transition-all ${
                            checked
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-transparent hover:bg-secondary/80 hover:text-muted-foreground/30"
                          }`}
                          aria-label={`${habit.name} - ${DAY_NAMES_KR[dayIdx]}: ${checked ? "completed" : "not completed"}`}
                        >
                          <Check className="h-3 w-3" />
                        </button>
                      </td>
                    );
                  })}
                  <td className="w-10 py-1 pl-2 text-right">
                    <span
                      className={`text-xs font-medium ${
                        getCompletionRate(habit.id) === 100
                          ? "text-accent"
                          : getCompletionRate(habit.id) >= 50
                            ? "text-primary"
                            : "text-muted-foreground"
                      }`}
                    >
                      {getCompletionRate(habit.id)}%
                    </span>
                  </td>
                </tr>
              ))}
              <tr>
                <td colSpan={9}>
                  <div
                    className="h-6 w-full"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={async (e) => {
                      const raw = e.dataTransfer.getData("application/json");
                      if (!raw) return;
                      try {
                        const payload = JSON.parse(raw) as { id: string };
                        const before = habits
                          .slice()
                          .sort(
                            (a, b) =>
                              (a.order ?? Number.MAX_SAFE_INTEGER) -
                              (b.order ?? Number.MAX_SAFE_INTEGER),
                          );
                        const fromIdx = before.findIndex((h) => h.id === payload.id);
                        if (fromIdx === -1) return;
                        const next = before.slice();
                        const [moved] = next.splice(fromIdx, 1);
                        next.push(moved);
                        const nextWithOrder = next.map((h, idx) => ({
                          ...h,
                          order: idx,
                        }));
                        setHabits(nextWithOrder);
                        try {
                          for (const h of nextWithOrder) {
                            await updateHabitOrder(h.id, h.order ?? null);
                          }
                          setDraggingId(null);
                          setDragOverId(null);
                          publishTasksChanged("habit");
                          startBurst();
                        } catch (err) {
                          console.error(err);
                        }
                      } catch {}
                    }}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {isAdding ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addHabitServer();
          }}
          className="flex items-center gap-2"
        >
          <input
            autoFocus
            value={newHabitName}
            onChange={(e) => setNewHabitName(e.target.value)}
            onBlur={() => {
              if (newHabitName.trim()) addHabitServer();
              else setIsAdding(false);
            }}
            placeholder="New habit name..."
            className="flex-1 rounded-md border bg-transparent px-2 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-primary/30"
          />
        </form>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground/60 transition-colors hover:bg-secondary hover:text-muted-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add habit</span>
        </button>
      )}
    </div>
  );
}
