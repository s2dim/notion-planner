import { PlannerDashboard } from "@/components/planner/planner-dashboard";

export default function WeeklyWidgetPage() {
  return (
    <div className="min-h-screen bg-background">
      <PlannerDashboard mode="weekly" />
    </div>
  );
}
