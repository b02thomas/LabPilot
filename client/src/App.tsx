import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProtectedRoute, StaffRoute, ManagerRoute, AdminRoute } from "@/components/auth";
import Dashboard from "@/pages/dashboard";
import DataUpload from "@/pages/data-upload";
import AnalysisResults from "@/pages/analysis-results";
import TaskManagement from "@/pages/task-management";
import ChemistryExpert from "@/pages/chemistry-expert";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <ProtectedRoute>
      <Switch>
        <Route path="/" component={() => (
          <StaffRoute>
            <Dashboard />
          </StaffRoute>
        )} />
        <Route path="/data-upload" component={() => (
          <StaffRoute>
            <DataUpload />
          </StaffRoute>
        )} />
        <Route path="/analysis-results" component={() => (
          <StaffRoute>
            <AnalysisResults />
          </StaffRoute>
        )} />
        <Route path="/task-management" component={() => (
          <ManagerRoute>
            <TaskManagement />
          </ManagerRoute>
        )} />
        <Route path="/agent-chat-hub" component={() => (
          <StaffRoute>
            <ChemistryExpert />
          </StaffRoute>
        )} />
        <Route component={NotFound} />
      </Switch>
    </ProtectedRoute>
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
