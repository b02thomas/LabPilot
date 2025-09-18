import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/dashboard";
import DataUpload from "@/pages/data-upload";
import AnalysisResults from "@/pages/analysis-results";
import TaskManagement from "@/pages/task-management";
import ChemistryExpert from "@/pages/chemistry-expert";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/data-upload" component={DataUpload} />
      <Route path="/analysis-results" component={AnalysisResults} />
      <Route path="/task-management" component={TaskManagement} />
      <Route path="/agent-chat-hub" component={ChemistryExpert} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
