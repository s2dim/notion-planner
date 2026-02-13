"use client"

import { useState } from "react"
import { Plus, X, CheckCircle2, Circle } from "lucide-react"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { type PlannerData, type MonthlyGoal, generateId } from "@/lib/planner-store"

interface MonthlyWidgetProps {
  data: PlannerData
  onUpdate: (data: PlannerData) => void
}

export function MonthlyWidget({ data, onUpdate }: MonthlyWidgetProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [newText, setNewText] = useState("")

  const currentMonth = format(new Date(), "yyyy MMMM", { locale: ko })

  const addGoal = () => {
    if (!newText.trim()) return
    const goal: MonthlyGoal = {
      id: generateId(),
      text: newText.trim(),
      completed: false,
    }
    onUpdate({
      ...data,
      monthlyGoals: [...data.monthlyGoals, goal],
    })
    setNewText("")
    setIsAdding(false)
  }

  const toggleGoal = (goalId: string) => {
    onUpdate({
      ...data,
      monthlyGoals: data.monthlyGoals.map((g) =>
        g.id === goalId ? { ...g, completed: !g.completed } : g
      ),
    })
  }

  const removeGoal = (goalId: string) => {
    onUpdate({
      ...data,
      monthlyGoals: data.monthlyGoals.filter((g) => g.id !== goalId),
    })
  }

  const completedCount = data.monthlyGoals.filter((g) => g.completed).length

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Monthly</h2>
        <span className="text-xs text-muted-foreground">{currentMonth}</span>
      </div>

      {data.monthlyGoals.length > 0 && (
        <div className="text-xs text-muted-foreground">
          {completedCount}/{data.monthlyGoals.length} completed
        </div>
      )}

      <div className="flex flex-col gap-1">
        {data.monthlyGoals.map((goal) => (
          <div
            key={goal.id}
            className="group flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-secondary"
          >
            <button
              onClick={() => toggleGoal(goal.id)}
              className="shrink-0"
              aria-label={goal.completed ? "Uncheck goal" : "Check goal"}
            >
              {goal.completed ? (
                <CheckCircle2 className="h-4 w-4 text-accent" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground/40" />
              )}
            </button>
            <span
              className={`flex-1 text-sm ${
                goal.completed
                  ? "text-muted-foreground line-through"
                  : "text-foreground"
              }`}
            >
              {goal.text}
            </span>
            <button
              onClick={() => removeGoal(goal.id)}
              className="hidden shrink-0 text-muted-foreground hover:text-destructive group-hover:block"
              aria-label={`Remove goal: ${goal.text}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      {isAdding ? (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            addGoal()
          }}
          className="flex items-center gap-2"
        >
          <input
            autoFocus
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onBlur={() => {
              if (newText.trim()) addGoal()
              else setIsAdding(false)
            }}
            placeholder="New monthly goal..."
            className="flex-1 rounded-md border bg-transparent px-2 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-primary/30"
          />
        </form>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground/60 transition-colors hover:bg-secondary hover:text-muted-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add goal</span>
        </button>
      )}
    </div>
  )
}
