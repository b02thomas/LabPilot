import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { TaskForm } from "@/components/task-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface Task {
  id: string;
  title: string;
  description: string;
  requestType: string;
  priority: string;
  status: string;
  deadline: string;
  createdAt: string;
}

export default function TaskManagement() {
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["/api/tasks"],
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      completed: "default",
      in_progress: "secondary",
      submitted: "secondary",
      cancelled: "destructive",
    };
    
    return (
      <Badge variant={variants[status] || "secondary"} className="capitalize">
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: "text-green-600",
      standard: "text-blue-600",
      high: "text-orange-600",
      critical: "text-red-600",
    };
    return colors[priority] || "text-gray-600";
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Less than 1 hour ago';
    if (diffInHours === 1) return '1 hour ago';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return '1 day ago';
    return `${diffInDays} days ago`;
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        <Header
          title="Task Management"
          description="Submit analysis requests and track their progress"
        />

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Task Form */}
            <TaskForm />
            
            {/* Active Tasks */}
            <Card>
              <CardHeader>
                <CardTitle>Active Requests</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-4">Loading tasks...</div>
                ) : tasks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No active requests. Submit your first analysis request using the form.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tasks.slice(0, 5).map((task: Task) => (
                      <div key={task.id} className="p-4 bg-muted rounded-lg" data-testid={`task-${task.id}`}>
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-medium text-sm">{task.title}</h4>
                            <p className="text-xs text-muted-foreground">
                              <span className={getPriorityColor(task.priority)}>
                                {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
                              </span>
                            </p>
                          </div>
                          {getStatusBadge(task.status)}
                        </div>
                        
                        {task.description && (
                          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                            {task.description}
                          </p>
                        )}
                        
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            {task.deadline ? `Due: ${new Date(task.deadline).toLocaleDateString()}` : `Created: ${formatTimeAgo(task.createdAt)}`}
                          </span>
                          <div className="flex items-center space-x-2">
                            {task.status === 'completed' && (
                              <Button size="sm" variant="ghost" data-testid={`button-download-task-${task.id}`}>
                                <Download className="h-3 w-3 mr-1" />
                                Results
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" data-testid={`button-view-task-${task.id}`}>
                              View Details
                              <ArrowRight className="h-3 w-3 ml-1" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {tasks.length > 5 && (
                      <Button 
                        variant="outline" 
                        className="w-full"
                        data-testid="button-view-all-tasks"
                      >
                        View All Requests ({tasks.length})
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
