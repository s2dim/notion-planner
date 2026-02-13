"use client";

import { useState, useCallback } from "react";
import { HabitTrackerWidget } from "@/components/planner/habit-tracker-widget";
import { WidgetCard } from "@/components/planner/widget-card";
import { type PlannerData, getDefaultData } from "@/lib/planner-store";

export default function HabitWidgetPage() {
  const [data, setData] = useState<PlannerData>(getDefaultData());
  const handleUpdate = useCallback((next: PlannerData) => {
    setData(next);
  }, []);

  return (
    <div className="mx-auto max-w-[900px] px-4 py-6">
      <WidgetCard>
        <HabitTrackerWidget data={data} onUpdate={handleUpdate} />
      </WidgetCard>
    </div>
  );
}
