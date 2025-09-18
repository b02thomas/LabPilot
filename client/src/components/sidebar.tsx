import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  ChartLine,
  Upload,
  TestTubeDiagonal,
  ClipboardList,
  Bot,
  Settings,
  FlaskConical,
  LogOut,
  ChevronDown,
  Building2
} from "lucide-react";
import logoImage from "@assets/Gemini_Generated_Image_cbisuycbisuycbis_1758200138344.png";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const navigation = [
  { name: "Dashboard", href: "/", icon: ChartLine },
  { name: "Data Upload", href: "/data-upload", icon: Upload },
  { name: "Analysis Results", href: "/analysis-results", icon: TestTubeDiagonal },
  { name: "Task Management", href: "/task-management", icon: ClipboardList },
  { name: "Agent Chat Hub", href: "/agent-chat-hub", icon: Bot },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const [location] = useLocation();
  const [selectedProject, setSelectedProject] = useState("main-lab");

  return (
    <aside className="w-64 bg-card border-r border-border flex-shrink-0 flex flex-col h-screen">
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg overflow-hidden">
            <img 
              src={logoImage} 
              alt="LabPilot Logo" 
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h1 className="text-lg font-semibold">LabPilot</h1>
            <p className="text-xs text-muted-foreground">Lab Analysis Platform</p>
          </div>
        </div>
      </div>

      {/* Context Switcher */}
      <div className="p-4 border-b border-border">
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Project Context
          </label>
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-full" data-testid="context-switcher">
              <div className="flex items-center space-x-2">
                <Building2 className="h-4 w-4" />
                <SelectValue placeholder="Select project" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="main-lab">Main Laboratory</SelectItem>
              <SelectItem value="research-dept">Research Department</SelectItem>
              <SelectItem value="quality-control">Quality Control</SelectItem>
              <SelectItem value="development">Development Lab</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navigation.map((item) => {
            const isActive = location === item.href;
            return (
              <li key={item.name}>
                <Link href={item.href}>
                  <a
                    className={cn(
                      "flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                    data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </a>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      
      <div className="p-4">
        <div className="bg-secondary rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
              <span className="text-xs font-medium text-primary-foreground">DR</span>
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium">Dr. Sarah Chen</p>
              <p className="text-xs text-muted-foreground">Lab Administrator</p>
            </div>
            <button 
              className="text-muted-foreground hover:text-foreground"
              data-testid="button-logout"
            >
              <LogOut className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
