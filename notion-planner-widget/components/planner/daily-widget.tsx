"use client";

import { useState, useEffect, useMemo } from "react";
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
  createTask,
  toggleTask as toggleTaskApi,
  deleteTask as deleteTaskApi,
} from "@/lib/tasks-api";

import {
  type TimeSlot,
  type PlannerData,
  type DailyTask,
  formatDate,
  generateId,
  TIME_SLOT_CONFIG,
  loadData,
} from "@/lib/planner-store";

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

  // UI 계산용 (weekly는 이미 Notion에서 불러와 data.weeklyTasks에 들어온다고 가정)
  const weeklyTasksForDay = data.weeklyTasks.filter((t) => t.date === dateStr);
  const dailyTasksForDay = data.dailyTasks.filter((t) => t.date === dateStr);

  // ✅ 날짜 바뀔 때 Notion에서 daily tasks 로드
  useEffect(() => {
    const run = async () => {
      const res = await fetchTasks({
        scope: "daily",
        date_from: dateStr,
        date_to: dateStr,
      });

      const dailyFromNotion: DailyTask[] = res.tasks.map((t) => ({
        id: t.id,
        text: t.text,
        timeSlot: t.timeSlot,
        completed: t.completed,
        date: t.date,
      }));

      onUpdate({
        ...data,
        // 현재 날짜 daily만 교체, 다른 날짜 daily는 유지
        dailyTasks: [
          ...data.dailyTasks.filter((x) => x.date !== dateStr),
          ...dailyFromNotion,
        ],
      });
    };

    run().catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateStr]);

  // ✅ weekly → daily Sync (Notion에 daily task 생성)
  const syncFromWeekly = async () => {
    // 현재 daily(화면) + weekly의 조합에서 중복 방지
    const existingTexts = new Set(
      dailyTasksForDay.map((t) => `${t.text}-${t.timeSlot}`),
    );

    const toCreate = weeklyTasksForDay
      .filter((wt) => !existingTexts.has(`${wt.text}-${wt.timeSlot}`))
      .map((wt) => ({
        text: wt.text,
        timeSlot: wt.timeSlot,
      }));

    if (toCreate.length === 0) return;

    // 1) 화면 optimistic 반영(임시 id)
    const tempTasks: DailyTask[] = toCreate.map((t) => ({
      id: generateId(),
      text: t.text,
      timeSlot: t.timeSlot,
      completed: false,
      date: dateStr,
    }));

    onUpdate({
      ...data,
      dailyTasks: [...data.dailyTasks, ...tempTasks],
    });

    // 2) Notion에 실제 생성하고 temp를 notion id로 교체
    try {
      const createdIds: string[] = [];
      for (const t of toCreate) {
        const created = await createTask({
          text: t.text,
          date: dateStr,
          timeSlot: t.timeSlot,
          scope: "daily",
        });
        createdIds.push(created.task.id);
      }

      // temp 제거 + created 추가
      const tempIds = new Set(tempTasks.map((t) => t.id));

      onUpdate({
        ...data,
        dailyTasks: data.dailyTasks
          .filter((t) => !tempIds.has(t.id))
          .concat(
            toCreate.map((t, idx) => ({
              id: createdIds[idx],
              text: t.text,
              timeSlot: t.timeSlot,
              completed: false,
              date: dateStr,
            })),
          ),
      });
    } catch (e) {
      // 실패하면 temp rollback
      const tempIds = new Set(tempTasks.map((t) => t.id));
      onUpdate({
        ...data,
        dailyTasks: data.dailyTasks.filter((t) => !tempIds.has(t.id)),
      });
      console.error(e);
    }
  };

  // ✅ 체크 토글 → Notion PATCH
  const toggleTask = async (taskId: string) => {
    const prev = data.dailyTasks.find((t) => t.id === taskId);
    if (!prev) return;
    const nextCompleted = !prev.completed;

    // 1) optimistic UI
    onUpdate({
      ...data,
      dailyTasks: data.dailyTasks.map((t) =>
        t.id === taskId ? { ...t, completed: nextCompleted } : t,
      ),
    });

    // 2) Notion 반영
    try {
      await toggleTaskApi(taskId, nextCompleted);
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
    const target = data.dailyTasks.find((t) => t.id === taskId);
    const toRemoveWeeklyIds =
      target == null
        ? []
        : data.weeklyTasks
            .filter(
              (w) =>
                w.date === target.date &&
                w.timeSlot === target.timeSlot &&
                w.text === target.text,
            )
            .map((w) => w.id);

    const base = loadData();
    onUpdate({
      ...base,
      dailyTasks: base.dailyTasks.filter((t) => t.id !== taskId),
      weeklyTasks: base.weeklyTasks.filter(
        (t) => !toRemoveWeeklyIds.includes(t.id),
      ),
    });
    try {
      await deleteTaskApi(taskId);
      for (const id of toRemoveWeeklyIds) {
        await deleteTaskApi(id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // --- 아래는 네 원래 UI 로직 그대로 ---
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

      {weeklyTasksForDay.length > 0 && dailyTasksForDay.length === 0 && (
        <button
          onClick={syncFromWeekly}
          className="rounded-lg border border-dashed border-primary/30 bg-primary/5 px-3 py-2 text-xs text-primary transition-colors hover:bg-primary/10"
        >
          Sync {weeklyTasksForDay.length} tasks from Weekly
        </button>
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
            <div className="flex flex-col gap-1">
              {slotTasks.map((task) => (
                <div key={task.id} className="group flex items-start gap-1">
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

      {totalCount === 0 && weeklyTasksForDay.length === 0 && (
        <div className="py-8 text-center text-sm text-muted-foreground/50">
          No tasks for this day
        </div>
      )}
    </div>
  );
}
