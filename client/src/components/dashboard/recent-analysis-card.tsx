import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { Download } from "lucide-react";

interface RecentAnalysisCardProps {
  className?: string;
  onViewDetails?: (experimentId: string) => void;
}

export function RecentAnalysisCard({ className, onViewDetails }: RecentAnalysisCardProps) {
  return (
    <Card className={className}>
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
        
        <DataTable onViewDetails={onViewDetails || (() => {})} />
      </CardContent>
    </Card>
  );
}