import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { ChemistryChat } from "@/components/chemistry-chat";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, TrendingUp, AlertTriangle, Lightbulb } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function ChemistryExpert() {
  const { data: insights } = useQuery({
    queryKey: ["/api/analysis/insights"],
    staleTime: 300000, // 5 minutes
  });

  const quickQuestions = [
    "What does a pH flag in my sample mean?",
    "How do I interpret chromatography peaks?",
    "What causes baseline drift in spectroscopy?",
    "How can I improve my sample preparation?",
    "What are normal concentration ranges?",
    "How do I troubleshoot contamination issues?",
  ];

  const handleQuickQuestion = (question: string) => {
    // This would trigger the chat input - for now just scroll to chat
    const chatInput = document.querySelector('[data-testid="input-chat-message"]') as HTMLInputElement;
    if (chatInput) {
      chatInput.value = question;
      chatInput.focus();
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        <Header
          title="Chemistry Expert"
          description="Get AI-powered insights and answers to your chemistry questions"
        />

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chemistry Chat - takes up 2 columns */}
            <div className="lg:col-span-2">
              <div className="h-[600px]">
                <ChemistryChat />
              </div>
            </div>

            {/* Sidebar with insights and quick questions */}
            <div className="space-y-6">
              {/* Analysis Insights */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <TrendingUp className="h-5 w-5 mr-2 text-primary" />
                    Recent Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {insights?.insights ? (
                    <div className="text-sm text-muted-foreground">
                      {insights.insights}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Upload more analysis data to get AI-generated insights about trends and patterns.
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Questions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <Lightbulb className="h-5 w-5 mr-2 text-primary" />
                    Quick Questions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {quickQuestions.map((question, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      size="sm"
                      className="w-full text-left justify-start h-auto p-2 text-xs"
                      onClick={() => handleQuickQuestion(question)}
                      data-testid={`button-quick-question-${index}`}
                    >
                      {question}
                    </Button>
                  ))}
                </CardContent>
              </Card>

              {/* Help & Tips */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <Bot className="h-5 w-5 mr-2 text-primary" />
                    Tips for Better Results
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                    <p>Be specific about your sample type and experimental conditions for more accurate advice.</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Lightbulb className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <p>Reference specific data points or analysis results when asking questions.</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Bot className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <p>The AI has knowledge of chromatography, spectroscopy, and general analytical chemistry.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
