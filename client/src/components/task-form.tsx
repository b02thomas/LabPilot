import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function TaskForm() {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    requestType: "",
    priority: "standard",
    deadline: "",
    notificationRecipients: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const submitTaskMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest('POST', '/api/tasks', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Task submitted successfully",
        description: "Your analysis request has been submitted.",
      });
      setFormData({
        title: "",
        description: "",
        requestType: "",
        priority: "standard",
        deadline: "",
        notificationRecipients: "",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to submit task",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.requestType) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    
    // Convert date string to Date object for API
    const submitData = {
      ...formData,
      deadline: formData.deadline ? new Date(formData.deadline) : undefined,
    };
    
    submitTaskMutation.mutate(submitData);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submit Analysis Request</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Request Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Brief description of your request"
              required
              data-testid="input-task-title"
            />
          </div>

          <div>
            <Label htmlFor="requestType">Request Type *</Label>
            <Select value={formData.requestType} onValueChange={(value) => handleInputChange('requestType', value)}>
              <SelectTrigger data-testid="select-request-type">
                <SelectValue placeholder="Select request type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard_analysis">Standard Analysis</SelectItem>
                <SelectItem value="priority_analysis">Priority Analysis</SelectItem>
                <SelectItem value="custom_protocol">Custom Protocol</SelectItem>
                <SelectItem value="batch_processing">Batch Processing</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="priority">Priority</Label>
            <Select value={formData.priority} onValueChange={(value) => handleInputChange('priority', value)}>
              <SelectTrigger data-testid="select-priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="description">Sample Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe your sample and analysis requirements..."
              className="h-20 resize-none"
              data-testid="textarea-description"
            />
          </div>
          
          <div>
            <Label htmlFor="deadline">Deadline</Label>
            <Input
              id="deadline"
              type="date"
              value={formData.deadline}
              onChange={(e) => handleInputChange('deadline', e.target.value)}
              data-testid="input-deadline"
            />
          </div>
          
          <div>
            <Label htmlFor="recipients">Notification Recipients</Label>
            <Input
              id="recipients"
              type="text"
              value={formData.notificationRecipients}
              onChange={(e) => handleInputChange('notificationRecipients', e.target.value)}
              placeholder="Enter email addresses (comma-separated)"
              data-testid="input-recipients"
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full"
            disabled={submitTaskMutation.isPending}
            data-testid="button-submit-task"
          >
            {submitTaskMutation.isPending ? "Submitting..." : "Submit Request"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
