import { X, Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface AnalysisModalProps {
  experimentId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AnalysisModal({ experimentId, isOpen, onClose }: AnalysisModalProps) {
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ["/api/experiments", experimentId],
    enabled: !!experimentId && isOpen,
  });

  const downloadReport = async () => {
    if (!experimentId) return;
    
    try {
      const response = await fetch(`/api/experiments/${experimentId}/report/download`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${data?.experiment?.originalFilename}_report.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Failed to download report",
        variant: "destructive",
      });
    }
  };

  const shareResults = () => {
    if (navigator.share && data?.experiment) {
      navigator.share({
        title: `Analysis Results - ${data.experiment.originalFilename}`,
        text: `Analysis complete for ${data.experiment.originalFilename}`,
        url: window.location.href,
      }).catch(console.error);
    } else {
      // Fallback: copy URL to clipboard
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied",
        description: "Results link copied to clipboard",
      });
    }
  };

  if (!experimentId) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Analysis Details - {data?.experiment?.originalFilename}</span>
            <Button variant="ghost" size="sm" onClick={onClose} data-testid="button-close-modal">
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="text-center py-8">Loading analysis details...</div>
        ) : (
          <div className="space-y-6">
            {/* Experiment Info */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <h4 className="font-medium text-sm">File Information</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Type: {data?.experiment?.analysisType?.replace('_', ' ')}
                </p>
                <p className="text-sm text-muted-foreground">
                  Status: {data?.experiment?.status}
                </p>
              </div>
              <div>
                <h4 className="font-medium text-sm">Processing Info</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Processed: {new Date(data?.experiment?.createdAt).toLocaleString()}
                </p>
                {data?.report?.processingTime && (
                  <p className="text-sm text-muted-foreground">
                    Processing time: {data.report.processingTime}ms
                  </p>
                )}
              </div>
            </div>

            {/* Analysis Summary */}
            {data?.report?.summary && (
              <div className="space-y-2">
                <h4 className="font-medium">Analysis Summary</h4>
                <p className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                  {data.report.summary}
                </p>
              </div>
            )}

            {/* Mock Data Visualization */}
            <div className="bg-muted rounded-lg p-6">
              <h4 className="font-medium mb-4">
                {data?.experiment?.analysisType === 'chromatography' ? 'Chromatography Results' : 'Analysis Results'}
              </h4>
              <div className="h-64 flex items-center justify-center text-muted-foreground border-2 border-dashed border-border rounded">
                <div className="text-center">
                  <div className="text-4xl mb-2">📊</div>
                  <p>Interactive data visualization would be displayed here</p>
                  <p className="text-sm">
                    {data?.experiment?.analysisType === 'chromatography' 
                      ? 'Peak detection, baseline correction, and quantification results'
                      : 'Data analysis and statistical results'
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Flags and Issues */}
            {data?.report?.flags && data.report.flags.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Critical Flags */}
                {data.report.flags.filter((f: any) => f.level === 'critical').length > 0 && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                    <h5 className="font-medium text-destructive mb-2">Critical Flags</h5>
                    <ul className="space-y-2 text-sm">
                      {data.report.flags
                        .filter((f: any) => f.level === 'critical')
                        .map((flag: any, index: number) => (
                          <li key={index} className="flex items-start space-x-2">
                            <span className="text-destructive mt-0.5">⚠️</span>
                            <div>
                              <span className="font-medium">{flag.parameter}:</span> {flag.message}
                              {flag.value && flag.expectedRange && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  Value: {flag.value} (Expected: {flag.expectedRange})
                                </div>
                              )}
                            </div>
                          </li>
                        ))}
                    </ul>
                  </div>
                )}

                {/* Warning Flags */}
                {data.report.flags.filter((f: any) => f.level === 'warning').length > 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <h5 className="font-medium text-orange-800 mb-2">Warnings</h5>
                    <ul className="space-y-2 text-sm text-orange-700">
                      {data.report.flags
                        .filter((f: any) => f.level === 'warning')
                        .map((flag: any, index: number) => (
                          <li key={index} className="flex items-start space-x-2">
                            <span className="text-orange-600 mt-0.5">⚠️</span>
                            <div>
                              <span className="font-medium">{flag.parameter}:</span> {flag.message}
                              {flag.value && flag.expectedRange && (
                                <div className="text-xs text-orange-600 mt-1">
                                  Value: {flag.value} (Expected: {flag.expectedRange})
                                </div>
                              )}
                            </div>
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Recommendations */}
            {data?.report?.recommendations && (
              <div className="space-y-2">
                <h4 className="font-medium">Recommendations</h4>
                <p className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                  {data.report.recommendations}
                </p>
              </div>
            )}

            {/* Confidence Score */}
            {data?.report?.confidence && (
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Analysis Confidence:</span>
                <Badge variant="default">{data.report.confidence}%</Badge>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4 border-t">
              <Button onClick={downloadReport} data-testid="button-download-report">
                <Download className="h-4 w-4 mr-2" />
                Download JSON Report
              </Button>
              <Button variant="secondary" onClick={shareResults} data-testid="button-share-results">
                <Share2 className="h-4 w-4 mr-2" />
                Share Results
              </Button>
              <Button variant="outline" onClick={onClose} data-testid="button-close">
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
