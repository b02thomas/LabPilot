import { useMemo, useState, useCallback } from 'react';
import { FixedSizeList } from 'react-window';
import { Eye, Download, Clock, CheckCircle, AlertTriangle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useInfiniteExperiments } from '@/hooks/useQueries';
import { ExperimentErrorBoundary } from '@/components/error-boundary';
import type { ExperimentListItem } from '@shared/types/api';

interface VirtualTableProps {
  selectedProjectId?: string | null;
  onViewDetails: (experimentId: string) => void;
  height?: number;
}

const ITEM_HEIGHT = 72; // Height of each row in pixels

interface RowProps {
  index: number;
  style: React.CSSProperties;
  data: {
    experiments: ExperimentListItem[];
    onViewDetails: (experimentId: string) => void;
    onDownload: (experimentId: string, filename: string) => void;
  };
}

function TableRow({ index, style, data }: RowProps) {
  const { experiments, onViewDetails, onDownload } = data;
  const experiment = experiments[index];

  if (!experiment) {
    return (
      <div style={style} className="flex items-center justify-center p-4">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

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
    
    if (criticalCount > 0) {
      return (
        <Badge variant="destructive" className="text-xs">
          {criticalCount} Critical
        </Badge>
      );
    }
    
    if (warningCount > 0) {
      return (
        <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
          {warningCount} Warning{warningCount > 1 ? 's' : ''}
        </Badge>
      );
    }
    
    return (
      <Badge variant="default" className="text-xs bg-green-100 text-green-800">
        All Clear
      </Badge>
    );
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
    <div
      style={style}
      className="grid grid-cols-6 gap-4 p-4 border-b border-border hover:bg-accent/50 items-center"
    >
      {/* Sample ID */}
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center">
          {getStatusIcon(experiment.status)}
        </div>
        <span className="font-medium text-sm truncate" title={experiment.originalFilename}>
          {experiment.originalFilename}
        </span>
      </div>

      {/* Type */}
      <div className="text-sm text-muted-foreground capitalize">
        {experiment.analysisType.replace('_', ' ')}
      </div>

      {/* Status */}
      <div>
        {getStatusBadge(experiment.status)}
      </div>

      {/* Flags */}
      <div className="flex items-center">
        {getFlagsBadges(experiment.flags || [])}
      </div>

      {/* Processed */}
      <div className="text-sm text-muted-foreground">
        {formatTimeAgo(experiment.createdAt || new Date().toISOString())}
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewDetails(experiment.id)}
          className="h-8 w-8 p-0"
        >
          <Eye className="h-4 w-4" />
        </Button>
        {experiment.status === 'completed' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDownload(experiment.id, experiment.originalFilename)}
            className="h-8 w-8 p-0"
          >
            <Download className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

export function VirtualTable({ 
  selectedProjectId, 
  onViewDetails, 
  height = 600 
}: VirtualTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteExperiments(selectedProjectId);

  const experiments = useMemo(() => {
    return data?.pages.flatMap(page => page.data) || [];
  }, [data]);

  const filteredExperiments = useMemo(() => {
    if (!searchQuery) return experiments;
    
    const query = searchQuery.toLowerCase();
    return experiments.filter(experiment =>
      experiment.originalFilename.toLowerCase().includes(query) ||
      experiment.analysisType.toLowerCase().includes(query) ||
      experiment.status.toLowerCase().includes(query)
    );
  }, [experiments, searchQuery]);

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

  const handleItemsRendered = useCallback(
    ({ visibleStopIndex }: { visibleStopIndex: number }) => {
      // Load more data when approaching the end
      const buffer = 5; // Load more when within 5 items of the end
      if (
        hasNextPage &&
        !isFetchingNextPage &&
        visibleStopIndex >= filteredExperiments.length - buffer
      ) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage, filteredExperiments.length]
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">Loading experiments...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <ExperimentErrorBoundary>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-destructive">
              Error loading experiments: {error.message}
            </div>
          </CardContent>
        </Card>
      </ExperimentErrorBoundary>
    );
  }

  return (
    <ExperimentErrorBoundary>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              Experiments ({filteredExperiments.length})
            </h3>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search experiments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {/* Table Header */}
          <div className="grid grid-cols-6 gap-4 p-4 border-b border-border bg-muted/50 font-medium text-sm">
            <div>Sample ID</div>
            <div>Type</div>
            <div>Status</div>
            <div>Flags</div>
            <div>Processed</div>
            <div>Actions</div>
          </div>

          {/* Virtual Scrolling Table Body */}
          {filteredExperiments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? 'No experiments match your search.' : 'No experiments available.'}
            </div>
          ) : (
            <FixedSizeList
              height={height}
              itemCount={filteredExperiments.length}
              itemSize={ITEM_HEIGHT}
              itemData={{
                experiments: filteredExperiments,
                onViewDetails,
                onDownload: downloadReport,
              }}
              onItemsRendered={handleItemsRendered}
              className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
            >
              {TableRow}
            </FixedSizeList>
          )}

          {/* Loading indicator for infinite scroll */}
          {isFetchingNextPage && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading more experiments...
            </div>
          )}
        </CardContent>
      </Card>
    </ExperimentErrorBoundary>
  );
}