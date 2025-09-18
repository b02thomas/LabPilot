import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, FolderOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Project {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  teamMembers: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ProjectSelectorProps {
  selectedProjectId: string | null;
  onProjectChange: (projectId: string | null) => void;
}

export function ProjectSelector({ selectedProjectId, onProjectChange }: ProjectSelectorProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch projects
  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ['/api/projects', { userId: 'user-1' }],
  });

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: (projectData: { name: string; description?: string }) =>
      apiRequest('POST', '/api/projects', {
        ...projectData,
        createdBy: 'user-1',
        teamMembers: []
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      setIsCreating(false);
      setNewProjectName("");
      setNewProjectDescription("");
      toast({
        title: "Success",
        description: "Project created successfully"
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create project",
        variant: "destructive"
      });
    },
  });

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    createProjectMutation.mutate({
      name: newProjectName.trim(),
      description: newProjectDescription.trim() || undefined
    });
  };

  const selectedProject = projects?.find(p => p.id === selectedProjectId);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FolderOpen className="h-4 w-4" />
          Current Project
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Select
            value={selectedProjectId || "none"}
            onValueChange={(value) => onProjectChange(value === "none" ? null : value)}
            disabled={isLoading}
          >
            <SelectTrigger className="flex-1" data-testid="select-project">
              <SelectValue placeholder={isLoading ? "Loading projects..." : "Select a project..."} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No project selected</SelectItem>
              {projects?.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog open={isCreating} onOpenChange={setIsCreating}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" data-testid="button-create-project">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateProject} className="space-y-4">
                <div>
                  <Input
                    placeholder="Project name"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    data-testid="input-project-name"
                    required
                  />
                </div>
                <div>
                  <Input
                    placeholder="Project description (optional)"
                    value={newProjectDescription}
                    onChange={(e) => setNewProjectDescription(e.target.value)}
                    data-testid="input-project-description"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={createProjectMutation.isPending || !newProjectName.trim()}
                    data-testid="button-submit-project"
                  >
                    {createProjectMutation.isPending ? "Creating..." : "Create Project"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreating(false)}
                    data-testid="button-cancel-project"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {selectedProject && (
          <div className="text-sm text-muted-foreground">
            <p className="font-medium">{selectedProject.name}</p>
            {selectedProject.description && (
              <p className="text-xs mt-1">{selectedProject.description}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}