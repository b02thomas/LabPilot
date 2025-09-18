import { useState, useEffect, useRef } from "react";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Send, 
  Bot, 
  User, 
  Paperclip, 
  ChevronDown, 
  Beaker, 
  BarChart3, 
  ClipboardCheck,
  Shield
} from "lucide-react";

interface ChatMessage {
  id: string;
  userId: string;
  projectId?: string;
  agentType: 'chemistry_expert' | 'data_agent' | 'lab_assistant' | 'quality_control';
  message: string;
  response?: string;
  attachments?: Array<{
    fileName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
  }>;
  context?: any;
  createdAt: string;
}

const agentTypes = [
  { 
    value: 'chemistry_expert', 
    label: 'Chemistry Expert', 
    icon: Beaker,
    description: 'Analytical chemistry and lab expertise'
  },
  { 
    value: 'data_agent', 
    label: 'Data Agent', 
    icon: BarChart3,
    description: 'Data analysis and statistical insights'
  },
  { 
    value: 'lab_assistant', 
    label: 'Lab Assistant', 
    icon: ClipboardCheck,
    description: 'Protocol guidance and troubleshooting'
  },
  { 
    value: 'quality_control', 
    label: 'Quality Control', 
    icon: Shield,
    description: 'QC standards and compliance'
  }
];

export default function AgentChatHub() {
  const [message, setMessage] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<'chemistry_expert' | 'data_agent' | 'lab_assistant' | 'quality_control'>('chemistry_expert');
  const [selectedProject, setSelectedProject] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query chat messages based on project and agent
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["/api/chat/messages", selectedProject, selectedAgent],
    queryFn: async () => {
      const params = new URLSearchParams({
        userId: 'user-1',
        agentType: selectedAgent
      });
      
      if (selectedProject && selectedProject !== "none") {
        params.append('projectId', selectedProject);
      }
      
      const response = await fetch(`/api/chat/messages?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      return response.json();
    },
    refetchInterval: 5000,
  });

  // Query projects for dropdown
  const { data: projects = [] } = useQuery({
    queryKey: ["/api/projects"],
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest('POST', '/api/chat/messages', {
        message,
        userId: 'user-1',
        projectId: selectedProject === "none" ? null : selectedProject || null,
        agentType: selectedAgent
      });
      return response.json();
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !sendMessageMutation.isPending) {
      sendMessageMutation.mutate(message.trim());
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const currentAgent = agentTypes.find(agent => agent.value === selectedAgent);
  const AgentIcon = currentAgent?.icon || Bot;

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      {/* Full-screen chat interface */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header with agent and project selectors */}
        <div className="border-b border-border bg-card px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <AgentIcon className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-semibold">Agent Chat Hub</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Project Selector */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">Project:</span>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger className="w-48" data-testid="select-project">
                    <SelectValue placeholder="Select project..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No project</SelectItem>
                    {projects.map((project: any) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Agent Selector */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">Agent:</span>
                <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                  <SelectTrigger className="w-40" data-testid="select-agent">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="w-80">
                    {agentTypes.map((agent) => {
                      const Icon = agent.icon;
                      return (
                        <SelectItem key={agent.value} value={agent.value} className="py-3">
                          <div className="flex items-center space-x-3">
                            <Icon className="h-5 w-5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm leading-tight">{agent.label}</div>
                              <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{agent.description}</div>
                            </div>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Messages Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="max-w-4xl mx-auto space-y-6">
            {isLoading ? (
              <div className="text-center text-muted-foreground">Loading conversation...</div>
            ) : messages.length === 0 ? (
              <div className="text-center space-y-4 py-12">
                <div className="flex justify-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                    <AgentIcon className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-2">Start a conversation with {currentAgent?.label}</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    {currentAgent?.description}. Ask questions, upload files, or start analyzing your data.
                  </p>
                </div>
              </div>
            ) : (
              messages.map((msg: ChatMessage) => (
                <div key={msg.id} className="space-y-4">
                  {/* User Message */}
                  <div className="flex justify-end">
                    <div className="flex items-start space-x-3 max-w-2xl">
                      <div className="bg-primary text-primary-foreground rounded-2xl px-4 py-3">
                        <p className="text-sm">{msg.message}</p>
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {msg.attachments.map((attachment, index) => (
                              <div key={index} className="flex items-center space-x-2 text-xs bg-primary-foreground/20 rounded px-2 py-1">
                                <Paperclip className="h-3 w-3" />
                                <span>{attachment.fileName}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                  
                  {/* Agent Response */}
                  {msg.response && (
                    <div className="flex justify-start">
                      <div className="flex items-start space-x-3 max-w-2xl">
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                          <AgentIcon className="h-4 w-4 text-primary-foreground" />
                        </div>
                        <div className="bg-muted rounded-2xl px-4 py-3">
                          <p className="text-sm whitespace-pre-wrap">{msg.response}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Chat Input */}
        <div className="border-t border-border bg-card px-6 py-4">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSubmit} className="flex items-center space-x-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-shrink-0"
                data-testid="button-attach-file"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <Input
                type="text"
                placeholder={`Ask ${currentAgent?.label} anything...`}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={sendMessageMutation.isPending}
                className="flex-1"
                data-testid="input-chat-message"
              />
              <Button 
                type="submit" 
                disabled={!message.trim() || sendMessageMutation.isPending}
                size="sm"
                data-testid="button-send-message"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
