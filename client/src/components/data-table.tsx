import { Eye, Download, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";

interface Experiment {
  id: string;
  originalFilename: string;
  analysisType: string;
  status: string;
  createdAt: string;
  flags?: any[];
}

interface DataTableProps {
  onViewDetails: (experimentId: string) => void;
}

export function DataTable({ onViewDetails }: DataTableProps) {
  const { data: experiments = [], isLoading } = useQuery({
    queryKey: ["/api/experiments"],
  });

  const downloadReport = async (experimentId: string, filename: string) => {
    try {
      const response = await fetch(`/api/experiments/${experimentId}/report/download`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}_report.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-orange-600 animate-spin" />;
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variant = status === 'completed' ? 'default' : status === 'processing' ? 'secondary' : 'destructive';
    return (
      <Badge variant={variant} className="capitalize">
        {status}
      </Badge>
    );
  };

  const getFlagsBadges = (flags: any[] = []) => {
    const criticalCount = flags.filter(f => f.level === 'critical').length;
    const warningCount = flags.filter(f => f.level === 'warning').length;
    
    const badges = [];
    
    if (criticalCount > 0) {
      badges.push(
        <Badge key="critical" variant="destructive" className="text-xs">
          {criticalCount} Critical
        </Badge>
      );
    }
    
    if (warningCount > 0) {
      badges.push(
        <Badge key="warning" variant="secondary" className="text-xs bg-orange-100 text-orange-800">
          {warningCount} Warning{warningCount > 1 ? 's' : ''}
        </Badge>
      );
    }
    
    if (badges.length === 0) {
      badges.push(
        <Badge key="clear" variant="default" className="text-xs bg-green-100 text-green-800">
          All Clear
        </Badge>
      );
    }
    
    return badges;
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

  if (isLoading) {
    return <div className="text-center py-8">Loading analysis results...</div>;
  }

  if (experiments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No analysis results available. Upload some data to get started.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Sample ID</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Flags</TableHead>
            <TableHead>Processed</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {experiments.map((experiment: Experiment) => (
            <TableRow key={experiment.id} className="hover:bg-accent/50">
              <TableCell>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center">
                    {getStatusIcon(experiment.status)}
                  </div>
                  <span className="font-medium">{experiment.originalFilename}</span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground capitalize">
                {experiment.analysisType.replace('_', ' ')}
              </TableCell>
              <TableCell>
                {getStatusBadge(experiment.status)}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1 flex-wrap">
                  {getFlagsBadges(experiment.flags)}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatTimeAgo(experiment.createdAt)}
              </TableCell>
              <TableCell>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewDetails(experiment.id)}
                    data-testid={`button-view-${experiment.id}`}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {experiment.status === 'completed' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => downloadReport(experiment.id, experiment.originalFilename)}
                      data-testid={`button-download-${experiment.id}`}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
