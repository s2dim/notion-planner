"use client";

import { useState, useEffect, useCallback } from "react";
import {
  type PlannerData,
  loadData,
  saveData,
  getDefaultData,
} from "@/lib/planner-store";

import { WeeklyWidget } from "./weekly-widget";
import { DailyWidget } from "./daily-widget";
import { MonthlyWidget } from "./monthly-widget";
import { YearlyWidget } from "./yearly-widget";
import { HabitTrackerWidget } from "./habit-tracker-widget";
import { CalendarWidget } from "./calendar-widget";
import { WidgetCard } from "./widget-card";

export type DashboardMode =
  | "all"
  | "weekly"
  | "daily"
  | "monthly"
  | "yearly"
  | "habit"
  | "calendar";

export function PlannerDashboard({ mode = "all" }: { mode?: DashboardMode }) {
  const [data, setData] = useState<PlannerData>(getDefaultData());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setData(loadData());
    setMounted(true);
  }, []);

  const handleUpdate = useCallback((newData: PlannerData) => {
    setData(newData);
    saveData(newData);
  }, []);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const showHeader = mode === "all";

  const containerClass =
    mode === "all"
      ? "mx-auto max-w-[1400px] px-4 py-8"
      : "mx-auto max-w-[900px] px-4 py-6";

  return (
    <div className={containerClass}>
      {showHeader && (
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
      )}

      <div className="flex flex-col gap-6">
        {(mode === "all" || mode === "weekly") && (
          <WidgetCard>
            <WeeklyWidget data={data} onUpdate={handleUpdate} />
          </WidgetCard>
        )}

        {(mode === "all" || mode === "daily" || mode === "habit") && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {(mode === "all" || mode === "daily") && (
              <WidgetCard>
                <DailyWidget data={data} onUpdate={handleUpdate} />
              </WidgetCard>
            )}
            {(mode === "all" || mode === "habit") && (
              <WidgetCard>
                <HabitTrackerWidget data={data} onUpdate={handleUpdate} />
              </WidgetCard>
            )}
          </div>
        )}

        {(mode === "all" ||
          mode === "monthly" ||
          mode === "yearly" ||
          mode === "calendar") && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {(mode === "all" || mode === "monthly") && (
              <WidgetCard>
                <MonthlyWidget data={data} onUpdate={handleUpdate} />
              </WidgetCard>
            )}
            {(mode === "all" || mode === "yearly") && (
              <WidgetCard>
                <YearlyWidget data={data} onUpdate={handleUpdate} />
              </WidgetCard>
            )}
            {(mode === "all" || mode === "calendar") && (
              <WidgetCard>
                <CalendarWidget data={data} onUpdate={handleUpdate} />
              </WidgetCard>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
