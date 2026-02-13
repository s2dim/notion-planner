"use client"

import { useState } from "react"
import { Plus, X, Check } from "lucide-react"
import {
  type PlannerData,
  type Habit,
  type HabitEntry,
  generateId,
  DAY_NAMES_KR,
} from "@/lib/planner-store"

interface HabitTrackerWidgetProps {
  data: PlannerData
  onUpdate: (data: PlannerData) => void
}

export function HabitTrackerWidget({ data, onUpdate }: HabitTrackerWidgetProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [newHabitName, setNewHabitName] = useState("")

  const addHabit = () => {
    if (!newHabitName.trim()) return
    const habit: Habit = {
      id: generateId(),
      name: newHabitName.trim(),
    }
    onUpdate({
      ...data,
      habits: [...data.habits, habit],
    })
    setNewHabitName("")
    setIsAdding(false)
  }

  const removeHabit = (habitId: string) => {
    onUpdate({
      ...data,
      habits: data.habits.filter((h) => h.id !== habitId),
      habitEntries: data.habitEntries.filter((e) => e.habitId !== habitId),
    })
  }

  const toggleEntry = (habitId: string, dayOfWeek: number) => {
    const existing = data.habitEntries.find(
      (e) => e.habitId === habitId && e.dayOfWeek === dayOfWeek
    )
    let newEntries: HabitEntry[]
    if (existing) {
      if (existing.completed) {
        newEntries = data.habitEntries.filter(
          (e) => !(e.habitId === habitId && e.dayOfWeek === dayOfWeek)
        )
      } else {
        newEntries = data.habitEntries.map((e) =>
          e.habitId === habitId && e.dayOfWeek === dayOfWeek
            ? { ...e, completed: true }
            : e
        )
      }
    } else {
      newEntries = [
        ...data.habitEntries,
        { habitId, dayOfWeek, completed: true },
      ]
    }
    onUpdate({ ...data, habitEntries: newEntries })
  }

  const isChecked = (habitId: string, dayOfWeek: number) => {
    return data.habitEntries.some(
      (e) => e.habitId === habitId && e.dayOfWeek === dayOfWeek && e.completed
    )
  }

  const getCompletionRate = (habitId: string) => {
    const checked = DAY_NAMES_KR.filter((_, i) => isChecked(habitId, i)).length
    return Math.round((checked / 7) * 100)
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-foreground">Habit Tracker</h2>

      {data.habits.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="pb-2 pr-3 text-left text-xs font-medium text-muted-foreground">
                  Habit
                </th>
                {DAY_NAMES_KR.map((day, i) => (
                  <th
                    key={i}
                    className="pb-2 text-center text-xs font-medium text-muted-foreground"
                  >
                    {day}
                  </th>
                ))}
                <th className="pb-2 pl-2 text-right text-xs font-medium text-muted-foreground">
                  %
                </th>
              </tr>
            </thead>
            <tbody>
              {data.habits.map((habit) => (
                <tr key={habit.id} className="group">
                  <td className="py-1 pr-3">
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-foreground">
                        {habit.name}
                      </span>
                      <button
                        onClick={() => removeHabit(habit.id)}
                        className="hidden shrink-0 text-muted-foreground hover:text-destructive group-hover:inline-flex"
                        aria-label={`Remove habit: ${habit.name}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                  {DAY_NAMES_KR.map((_, dayIdx) => {
                    const checked = isChecked(habit.id, dayIdx)
                    return (
                      <td key={dayIdx} className="py-1 text-center">
                        <button
                          onClick={() => toggleEntry(habit.id, dayIdx)}
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
                    )
                  })}
                  <td className="py-1 pl-2 text-right">
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
            </tbody>
          </table>
        </div>
      )}

      {isAdding ? (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            addHabit()
          }}
          className="flex items-center gap-2"
        >
          <input
            autoFocus
            value={newHabitName}
            onChange={(e) => setNewHabitName(e.target.value)}
            onBlur={() => {
              if (newHabitName.trim()) addHabit()
              else setIsAdding(false)
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
  )
}
