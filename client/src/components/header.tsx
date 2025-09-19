import { Bell, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserProfile } from "@/components/user-profile";

interface HeaderProps {
  title: string;
  description: string;
  actionButton?: {
    text: string;
    onClick: () => void;
  };
}

export function Header({ title, description, actionButton }: HeaderProps) {
  return (
    <header className="bg-card border-b border-border p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">{title}</h2>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center space-x-4">
          <button 
            className="relative p-2 rounded-md hover:bg-accent"
            data-testid="button-notifications"
          >
            <Bell className="h-4 w-4 text-muted-foreground" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full"></span>
          </button>
          {actionButton && (
            <Button 
              onClick={actionButton.onClick}
              className="text-sm font-medium"
              data-testid="button-header-action"
            >
              <Plus className="h-4 w-4 mr-2" />
              {actionButton.text}
            </Button>
          )}
          <UserProfile />
        </div>
      </div>
    </header>
  );
}
