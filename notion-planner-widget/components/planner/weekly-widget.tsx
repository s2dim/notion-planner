"use client";

import { useState, useCallback, useEffect } from "react";
import { startOfWeek, endOfWeek, addWeeks, subWeeks } from "date-fns";
import { fetchTasks, createTask, deleteTask } from "@/lib/tasks-api";
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
} from "@/lib/planner-store";

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

  const weekDays = getCurrentWeekDays(currentDate);
  const weekLabel = getWeekLabel(currentDate);

  const getTasksForDaySlot = useCallback(
    (date: string, slot: TimeSlot) => {
      return data.weeklyTasks.filter(
        (t) => t.date === date && t.timeSlot === slot,
      );
    },
    [data.weeklyTasks],
  );

  // ✅ currentDate가 바뀔 때 해당 주의 weekly tasks를 Notion에서 로드
  useEffect(() => {
    const run = async () => {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });

      const date_from = formatDate(start);
      const date_to = formatDate(end);

      const res = await fetchTasks({ scope: "weekly", date_from, date_to });

      const weeklyFromNotion = res.tasks.map((t) => ({
        id: t.id,
        text: t.text,
        timeSlot: t.timeSlot,
        date: t.date,
      }));

      onUpdate({
        ...data,
        weeklyTasks: [
          // 현재 주는 교체, 다른 주는 유지
          ...data.weeklyTasks.filter(
            (x) => x.date < date_from || x.date > date_to,
          ),
          ...weeklyFromNotion,
        ],
      });
    };

    run().catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate]);

  // ✅ Notion에 생성 + optimistic update
  const addTask = async (date: string, slot: TimeSlot) => {
    const text = newTaskText.trim();
    if (!text) return;

    const tempId = generateId();

    // 1) 화면 먼저 반영
    onUpdate({
      ...data,
      weeklyTasks: [
        ...data.weeklyTasks,
        { id: tempId, text, timeSlot: slot, date },
      ],
    });

    setNewTaskText("");
    setEditingSlot(null);

    // 2) Notion 저장 후 tempId 교체
    try {
      const created = await createTask({
        text,
        date,
        timeSlot: slot,
        scope: "weekly",
      });

      onUpdate({
        ...data,
        weeklyTasks: data.weeklyTasks
          .filter((t) => t.id !== tempId)
          .concat({ id: created.task.id, text, timeSlot: slot, date }),
      });
    } catch (e) {
      // 실패하면 temp 제거
      onUpdate({
        ...data,
        weeklyTasks: data.weeklyTasks.filter((t) => t.id !== tempId),
      });
      console.error(e);
    }
  };

  // ✅ Notion archived(DELETE) + optimistic remove
  const removeTask = async (taskId: string) => {
    onUpdate({
      ...data,
      weeklyTasks: data.weeklyTasks.filter((t) => t.id !== taskId),
    });

    try {
      await deleteTask(taskId);
    } catch (e) {
      console.error(e);
      // 실패했을 때 복구하고 싶으면: 여기서 currentDate 주간 다시 fetch하도록 하면 됨
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

      <div className="grid grid-cols-7 gap-2">
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
                  const tasks = getTasksForDaySlot(dateStr, slot);
                  const isEditing =
                    editingSlot?.date === dateStr && editingSlot?.slot === slot;

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
                            className="group flex items-start gap-1"
                          >
                            <span className="flex-1 text-[11px] leading-tight text-foreground">
                              {task.text}
                            </span>
                            <button
                              onClick={() => removeTask(task.id)}
                              className="mt-0.5 hidden shrink-0 text-muted-foreground hover:text-destructive group-hover:block"
                              aria-label={`Remove task: ${task.text}`}
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
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
                                if (newTaskText.trim()) addTask(dateStr, slot);
                                else setEditingSlot(null);
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
  );
}
