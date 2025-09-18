import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Plus,
  Download,
  Bell
} from "lucide-react";

interface QuickActionsCardProps {
  className?: string;
}

export function QuickActionsCard({ className }: QuickActionsCardProps) {
  const actions = [
    {
      title: "Submit Analysis Request",
      description: "Create new analysis task",
      icon: Plus,
      testId: "button-submit-request",
      onClick: () => window.location.href = '/task-management',
    },
    {
      title: "Export Reports",
      description: "Download JSON/PDF reports",
      icon: Download,
      testId: "button-export-reports",
      onClick: () => window.location.href = '/analysis-results',
    },
    {
      title: "Set Notifications",
      description: "Configure alert preferences",
      icon: Bell,
      testId: "button-notifications",
      onClick: () => {
        // TODO: Implement notification settings
        console.log("Opening notification settings...");
      },
    },
  ];

  return (
    <Card className={className}>
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="space-y-3">
          {actions.map((action) => (
            <Button 
              key={action.testId}
              variant="ghost" 
              className="w-full justify-start p-3 h-auto"
              onClick={action.onClick}
              data-testid={action.testId}
            >
              <div className="flex items-center space-x-3">
                <action.icon className="h-4 w-4 text-primary" />
                <div className="text-left">
                  <p className="text-sm font-medium">{action.title}</p>
                  <p className="text-xs text-muted-foreground">{action.description}</p>
                </div>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}