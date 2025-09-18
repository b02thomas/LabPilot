import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { FileUpload } from "@/components/file-upload";
import { ChemistryChat } from "@/components/chemistry-chat";
import { DataTable } from "@/components/data-table";
import { AnalysisModal } from "@/components/analysis-modal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { 
  TestTubeDiagonal, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Plus,
  Download,
  Bell
} from "lucide-react";

export default function Dashboard() {
  const [selectedExperimentId, setSelectedExperimentId] = useState<string | null>(null);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const handleNewAnalysis = () => {
    // Navigate to data upload or show modal
    window.location.href = '/data-upload';
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        <Header
          title="Laboratory Dashboard"
          description="Monitor your analysis workflow and system status"
          actionButton={{
            text: "New Analysis",
            onClick: handleNewAnalysis
          }}
        />

        <div className="p-6 space-y-6">
          {/* Dashboard Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Analyses</p>
                    <p className="text-2xl font-bold" data-testid="stat-active-analyses">
                      {statsLoading ? "..." : stats?.activeAnalyses || 0}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <TestTubeDiagonal className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Critical Alerts</p>
                    <p className="text-2xl font-bold text-destructive" data-testid="stat-critical-alerts">
                      {statsLoading ? "..." : stats?.criticalAlerts || 0}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-destructive/10 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Completed Today</p>
                    <p className="text-2xl font-bold text-green-600" data-testid="stat-completed-today">
                      {statsLoading ? "..." : stats?.completedToday || 0}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Time Saved</p>
                    <p className="text-2xl font-bold" data-testid="stat-time-saved">
                      {statsLoading ? "..." : `${stats?.totalTimeSaved?.toFixed(1) || 0}h`}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Clock className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* File Upload Section */}
            <div className="lg:col-span-2">
              <FileUpload />
            </div>

            {/* Chemistry Expert Chat & Quick Actions */}
            <div className="space-y-6">
              <ChemistryChat />

              {/* Quick Actions */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                  <div className="space-y-3">
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start p-3 h-auto"
                      onClick={() => window.location.href = '/task-management'}
                      data-testid="button-submit-request"
                    >
                      <div className="flex items-center space-x-3">
                        <Plus className="h-4 w-4 text-primary" />
                        <div className="text-left">
                          <p className="text-sm font-medium">Submit Analysis Request</p>
                          <p className="text-xs text-muted-foreground">Create new analysis task</p>
                        </div>
                      </div>
                    </Button>
                    
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start p-3 h-auto"
                      onClick={() => window.location.href = '/analysis-results'}
                      data-testid="button-export-reports"
                    >
                      <div className="flex items-center space-x-3">
                        <Download className="h-4 w-4 text-primary" />
                        <div className="text-left">
                          <p className="text-sm font-medium">Export Reports</p>
                          <p className="text-xs text-muted-foreground">Download JSON/PDF reports</p>
                        </div>
                      </div>
                    </Button>

                    <Button 
                      variant="ghost" 
                      className="w-full justify-start p-3 h-auto"
                      data-testid="button-notifications"
                    >
                      <div className="flex items-center space-x-3">
                        <Bell className="h-4 w-4 text-primary" />
                        <div className="text-left">
                          <p className="text-sm font-medium">Set Notifications</p>
                          <p className="text-xs text-muted-foreground">Configure alert preferences</p>
                        </div>
                      </div>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Recent Analysis Results */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Recent Analysis Results</h3>
                <div className="flex items-center space-x-2">
                  <select className="px-3 py-2 border border-border rounded-md text-sm bg-background">
                    <option>Last 7 days</option>
                    <option>Last 30 days</option>
                    <option>Last 3 months</option>
                  </select>
                  <Button size="sm" data-testid="button-export-all">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>

              <DataTable onViewDetails={setSelectedExperimentId} />
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Analysis Details Modal */}
      <AnalysisModal
        experimentId={selectedExperimentId}
        isOpen={!!selectedExperimentId}
        onClose={() => setSelectedExperimentId(null)}
      />
    </div>
  );
}
