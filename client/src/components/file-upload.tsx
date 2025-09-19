import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { CloudUpload, File, Download, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ExperimentListItem } from "@shared/types/api";

interface FileUploadProps {
  selectedProjectId?: string | null;
}

export function FileUpload({ selectedProjectId }: FileUploadProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

  const { data: experiments = [], isLoading } = useQuery<ExperimentListItem[]>({
    queryKey: ["/api/experiments", { userId: "user-1", projectId: selectedProjectId }],
    refetchInterval: 2000, // Poll for updates
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      if (selectedProjectId) {
        formData.append('projectId', selectedProjectId);
      }
      
      const response = await apiRequest('POST', '/api/experiments/upload', formData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "File uploaded successfully",
        description: "Your file is being processed by the Data Agent.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/experiments"] });
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach((file) => {
      uploadMutation.mutate(file);
    });
  }, [uploadMutation]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/x-netcdf': ['.cdf'],
      'chemical/x-jcamp-dx': ['.jdx', '.dx'],
    },
    multiple: true,
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
      toast({
        title: "Download failed",
        description: "Failed to download report",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-orange-600 animate-spin" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <File className="h-4 w-4 text-primary" />;
    }
  };

  const getStatusBadge = (experiment: ExperimentListItem) => {
    const flags = experiment.flags || [];
    const criticalFlags = flags.filter((f: any) => f.level === 'critical').length;
    const warningFlags = flags.filter((f: any) => f.level === 'warning').length;

    if (experiment.status === 'processing') {
      return <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">Processing</span>;
    }

    if (criticalFlags > 0) {
      return <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Critical</span>;
    }

    if (warningFlags > 0) {
      return <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">{warningFlags} Warning{warningFlags > 1 ? 's' : ''}</span>;
    }

    return <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">All Clear</span>;
  };

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold mb-4">Data Upload & Processing</h3>
        
        {/* File Upload Area */}
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer",
            isDragActive && "border-primary bg-primary/5"
          )}
          data-testid="file-upload-area"
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center space-y-4">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <CloudUpload className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-lg font-medium">Drop files here to analyze</p>
              <p className="text-sm text-muted-foreground">Supports .CSV, .XLSX, .CDF, .JCAMP-DX files</p>
            </div>
            <Button variant="outline" size="sm" data-testid="button-browse-files">
              Browse Files
            </Button>
          </div>
        </div>

        {/* Recent Uploads */}
        <div className="mt-6">
          <h4 className="text-sm font-medium mb-3">Recent Uploads</h4>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : experiments.length === 0 ? (
            <div className="text-sm text-muted-foreground">No files uploaded yet.</div>
          ) : (
            <div className="space-y-2">
              {experiments.slice(0, 5).map((experiment) => (
                <div
                  key={experiment.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-md"
                  data-testid={`upload-item-${experiment.id}`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center">
                      {getStatusIcon(experiment.status)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{experiment.originalFilename}</p>
                      <p className="text-xs text-muted-foreground">
                        {experiment.status === 'processing' ? 'Processing...' : 'Processing complete'} • {(experiment.fileSize / 1024 / 1024).toFixed(1)} MB
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(experiment)}
                    {experiment.status === 'completed' && (
                      <button
                        onClick={() => downloadReport(experiment.id, experiment.originalFilename)}
                        className="text-muted-foreground hover:text-foreground"
                        data-testid={`button-download-${experiment.id}`}
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
