"use client"

import { useState } from "react"
import { Sunrise, Sun, Moon, ChevronLeft, ChevronRight, CheckCircle2, Circle } from "lucide-react"
import { addDays, subDays, format } from "date-fns"
import { ko } from "date-fns/locale"
import {
  type TimeSlot,
  type PlannerData,
  type DailyTask,
  formatDate,
  generateId,
  TIME_SLOT_CONFIG,
} from "@/lib/planner-store"

const SLOT_ICONS = {
  morning: Sunrise,
  afternoon: Sun,
  evening: Moon,
}

interface DailyWidgetProps {
  data: PlannerData
  onUpdate: (data: PlannerData) => void
}

export function DailyWidget({ data, onUpdate }: DailyWidgetProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const dateStr = formatDate(currentDate)
  const isToday = formatDate(new Date()) === dateStr

  const weeklyTasksForDay = data.weeklyTasks.filter((t) => t.date === dateStr)

  const dailyTasksForDay = data.dailyTasks.filter((t) => t.date === dateStr)

  const syncFromWeekly = () => {
    const existingTexts = new Set(
      dailyTasksForDay.map((t) => `${t.text}-${t.timeSlot}`)
    )
    const newTasks: DailyTask[] = weeklyTasksForDay
      .filter((wt) => !existingTexts.has(`${wt.text}-${wt.timeSlot}`))
      .map((wt) => ({
        id: generateId(),
        text: wt.text,
        timeSlot: wt.timeSlot,
        completed: false,
        date: dateStr,
      }))

    if (newTasks.length > 0) {
      onUpdate({
        ...data,
        dailyTasks: [...data.dailyTasks, ...newTasks],
      })
    }
  }

  const toggleTask = (taskId: string) => {
    onUpdate({
      ...data,
      dailyTasks: data.dailyTasks.map((t) =>
        t.id === taskId ? { ...t, completed: !t.completed } : t
      ),
    })
  }

  const allTasks = dailyTasksForDay.length > 0 ? dailyTasksForDay : []
  const completedCount = allTasks.filter((t) => t.completed).length
  const totalCount = allTasks.length
  const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

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
        const Icon = SLOT_ICONS[slot]
        const config = TIME_SLOT_CONFIG[slot]
        const slotTasks = allTasks.filter((t) => t.timeSlot === slot)

        if (slotTasks.length === 0) return null

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
                <button
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-secondary"
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
              ))}
            </div>
          </div>
        )
      })}

      {totalCount === 0 && weeklyTasksForDay.length === 0 && (
        <div className="py-8 text-center text-sm text-muted-foreground/50">
          No tasks for this day
        </div>
      )}
    </div>
  )
}
