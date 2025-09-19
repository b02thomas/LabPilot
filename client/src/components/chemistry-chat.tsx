import { useState, useEffect, useRef } from "react";
import { Send, Bot, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useChatMessages, useSendChatMessage } from "@/hooks/useQueries";
import { ChatErrorBoundary } from "@/components/error-boundary";
import type { ChatMessageWithUser } from "@shared/types/api";

interface ChemistryChatProps {
  projectId?: string | null;
  agentType?: 'chemistry_expert' | 'data_agent' | 'lab_assistant' | 'quality_control';
}

export function ChemistryChat({ 
  projectId, 
  agentType = 'chemistry_expert' 
}: ChemistryChatProps = {}) {
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading } = useChatMessages(projectId, agentType);
  const sendMessageMutation = useSendChatMessage();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !sendMessageMutation.isPending) {
      sendMessageMutation.mutate({
        message: message.trim(),
        userId: 'user-1',
        projectId: projectId || undefined,
        agentType,
      });
      setMessage("");
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getAgentTitle = () => {
    switch (agentType) {
      case 'chemistry_expert':
        return 'Chemistry Expert';
      case 'data_agent':
        return 'Data Agent';
      case 'lab_assistant':
        return 'Lab Assistant';
      case 'quality_control':
        return 'Quality Control';
      default:
        return 'AI Assistant';
    }
  };

  return (
    <ChatErrorBoundary>
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Bot className="h-5 w-5 text-primary mr-2" />
            {getAgentTitle()}
          </h3>
          
          <div className="space-y-4">
            {/* Chat Messages */}
            <div className="h-64 overflow-y-auto space-y-3 p-3 bg-muted rounded-lg" data-testid="chat-messages">
              {isLoading ? (
                <div className="text-sm text-muted-foreground">Loading messages...</div>
              ) : messages.length === 0 ? (
                <div className="flex space-x-2">
                  <div className="w-6 h-6 bg-primary rounded-full flex-shrink-0 flex items-center justify-center">
                    <Bot className="h-3 w-3 text-primary-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm bg-card rounded-lg p-2 shadow-sm">
                      Welcome! I can help you interpret your chromatography results and answer chemistry questions. What would you like to know?
                    </p>
                  </div>
                </div>
              ) : (
                messages.map((msg: ChatMessageWithUser) => (
                  <div key={msg.id} className="space-y-2">
                    {/* User Message */}
                    <div className="flex space-x-2 justify-end">
                      <div className="flex-1 max-w-xs">
                        <p className="text-sm bg-primary text-primary-foreground rounded-lg p-2">
                          {msg.message}
                        </p>
                      </div>
                      <div className="w-6 h-6 bg-secondary rounded-full flex-shrink-0 flex items-center justify-center">
                        <User className="h-3 w-3" />
                      </div>
                    </div>
                    
                    {/* Bot Response */}
                    {msg.response && (
                      <div className="flex space-x-2">
                        <div className="w-6 h-6 bg-primary rounded-full flex-shrink-0 flex items-center justify-center">
                          <Bot className="h-3 w-3 text-primary-foreground" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm bg-card rounded-lg p-2 shadow-sm">
                            {msg.response}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSubmit} className="flex space-x-2">
              <Input
                type="text"
                placeholder="Ask about chemistry, analysis results..."
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
        </CardContent>
      </Card>
    </ChatErrorBoundary>
  );
}