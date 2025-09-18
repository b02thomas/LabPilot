import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { 
  TestTubeDiagonal, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
} from "lucide-react";

interface StatsCardsProps {
  className?: string;
}

export function StatsCards({ className }: StatsCardsProps) {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const statItems = [
    {
      title: "Active Analyses",
      value: (stats as any)?.activeAnalyses || 0,
      icon: TestTubeDiagonal,
      testId: "stat-active-analyses",
      bgColor: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      title: "Critical Alerts",
      value: (stats as any)?.criticalAlerts || 0,
      icon: AlertTriangle,
      testId: "stat-critical-alerts",
      bgColor: "bg-destructive/10",
      iconColor: "text-destructive",
      valueColor: "text-destructive",
    },
    {
      title: "Completed Today",
      value: (stats as any)?.completedToday || 0,
      icon: CheckCircle,
      testId: "stat-completed-today",
      bgColor: "bg-green-100",
      iconColor: "text-green-600",
      valueColor: "text-green-600",
    },
    {
      title: "Time Saved",
      value: `${(stats as any)?.totalTimeSaved?.toFixed(1) || 0}h`,
      icon: Clock,
      testId: "stat-time-saved",
      bgColor: "bg-blue-100",
      iconColor: "text-blue-600",
    },
  ];

  return (
    <div className={`grid grid-cols-1 md:grid-cols-4 gap-4 ${className || ""}`}>
      {statItems.map((item) => (
        <Card key={item.title}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{item.title}</p>
                <p 
                  className={`text-2xl font-bold ${item.valueColor || ""}`}
                  data-testid={item.testId}
                >
                  {statsLoading ? "..." : item.value}
                </p>
              </div>
              <div className={`w-10 h-10 ${item.bgColor} rounded-lg flex items-center justify-center`}>
                <item.icon className={`h-5 w-5 ${item.iconColor}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}