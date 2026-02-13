"use client"

import { useState, useEffect, useCallback } from "react"
import { type PlannerData, loadData, saveData, getDefaultData } from "@/lib/planner-store"
import { WeeklyWidget } from "./weekly-widget"
import { DailyWidget } from "./daily-widget"
import { MonthlyWidget } from "./monthly-widget"
import { YearlyWidget } from "./yearly-widget"
import { HabitTrackerWidget } from "./habit-tracker-widget"
import { CalendarWidget } from "./calendar-widget"
import { WidgetCard } from "./widget-card"

export function PlannerDashboard() {
  const [data, setData] = useState<PlannerData>(getDefaultData())
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setData(loadData())
    setMounted(true)
  }, [])

  const handleUpdate = useCallback((newData: PlannerData) => {
    setData(newData)
    saveData(newData)
  }, [])

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">
            My Planner
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Plan your week, track your habits, achieve your goals.
          </p>
        </div>
      </header>

      <div className="flex flex-col gap-6">
        {/* Weekly - Full Width */}
        <WidgetCard>
          <WeeklyWidget data={data} onUpdate={handleUpdate} />
        </WidgetCard>

        {/* Middle Row: Daily + Habit Tracker */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <WidgetCard>
            <DailyWidget data={data} onUpdate={handleUpdate} />
          </WidgetCard>
          <WidgetCard>
            <HabitTrackerWidget data={data} onUpdate={handleUpdate} />
          </WidgetCard>
        </div>

        {/* Bottom Row: Monthly + Yearly + Calendar */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <WidgetCard>
            <MonthlyWidget data={data} onUpdate={handleUpdate} />
          </WidgetCard>
          <WidgetCard>
            <YearlyWidget data={data} onUpdate={handleUpdate} />
          </WidgetCard>
          <WidgetCard>
            <CalendarWidget data={data} onUpdate={handleUpdate} />
          </WidgetCard>
        </div>
      </div>
    </div>
  )
}
