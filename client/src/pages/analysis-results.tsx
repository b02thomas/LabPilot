import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { DataTable } from "@/components/data-table";
import { AnalysisModal } from "@/components/analysis-modal";
import { Card, CardContent } from "@/components/ui/card";

export default function AnalysisResults() {
  const [selectedExperimentId, setSelectedExperimentId] = useState<string | null>(null);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        <Header
          title="Analysis Results"
          description="View and manage your laboratory analysis results"
        />

        <div className="p-6">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-6">All Analysis Results</h3>
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
