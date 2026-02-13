import { PlannerDashboard } from "@/components/planner/planner-dashboard";

export default function DailyWidgetPage() {
  return (
    <div className="min-h-screen bg-background">
      <PlannerDashboard mode="daily" />
    </div>
  );
}
