import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { FileUpload } from "@/components/file-upload";
import { ChemistryChat } from "@/components/chemistry-chat";
import { AnalysisModal } from "@/components/analysis-modal";
import { ProjectSelector } from "@/components/project-selector";
import { StatsCards, QuickActionsCard, RecentAnalysisCard } from "@/components/dashboard";

export default function Dashboard() {
  const [selectedExperimentId, setSelectedExperimentId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const handleNewAnalysis = () => {
    // Navigate to data upload or show modal
    window.location.href = '/data-upload';
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        <Header
          title="Dashboard"
          description="Monitor your analysis workflow and system status"
          actionButton={{
            text: "New Analysis",
            onClick: handleNewAnalysis
          }}
        />

        <div className="p-6 space-y-6">
          {/* Project Management */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1">
              <ProjectSelector 
                selectedProjectId={selectedProjectId} 
                onProjectChange={setSelectedProjectId} 
              />
            </div>
            
            {/* Dashboard Stats Cards */}
            <div className="lg:col-span-3">
              <StatsCards selectedProjectId={selectedProjectId} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* File Upload Section */}
            <div className="lg:col-span-2">
              <FileUpload selectedProjectId={selectedProjectId} />
            </div>

            {/* Chemistry Expert Chat & Quick Actions */}
            <div className="space-y-6">
              <ChemistryChat />

              {/* Quick Actions */}
              <QuickActionsCard />
            </div>
          </div>

          {/* Recent Analysis Results */}
          <RecentAnalysisCard 
            selectedProjectId={selectedProjectId}
            onViewDetails={setSelectedExperimentId} 
          />
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
