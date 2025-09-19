import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/contexts/ThemeContext";
import { Moon, Sun } from "lucide-react";
import ResponsiveLayout from "@/components/Layout/ResponsiveLayout";

export default function DisplaySettings() {
  const { theme, toggleTheme } = useTheme();

  return (
    <ResponsiveLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Settings</h1>
          <p className="text-muted-foreground">Configure theme, bot services, and application preferences</p>
        </div>

        {/* Theme Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Theme Preferences</CardTitle>
            <CardDescription>
              Customize how the application looks and feels
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="dark-mode" className="text-sm font-medium">Dark Mode</Label>
                <p className="text-xs text-muted-foreground">Switch between light and dark themes</p>
              </div>
              <Switch
                id="dark-mode"
                checked={theme === 'dark'}
                onCheckedChange={toggleTheme}
                data-testid="switch-dark-mode"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                theme === 'light' ? 'border-primary bg-primary/5' : 'border-muted'
              }`} onClick={() => theme === 'dark' && toggleTheme()}>
                <div className="flex items-center gap-2 mb-2">
                  <Sun className="h-4 w-4" />
                  <span className="font-medium">Light Theme</span>
                </div>
                <div className="h-16 bg-white border rounded-sm"></div>
              </div>

              <div className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                theme === 'dark' ? 'border-primary bg-primary/5' : 'border-muted'
              }`} onClick={() => theme === 'light' && toggleTheme()}>
                <div className="flex items-center gap-2 mb-2">
                  <Moon className="h-4 w-4" />
                  <span className="font-medium">Dark Theme</span>
                </div>
                <div className="h-16 bg-gray-900 border rounded-sm"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ResponsiveLayout>
  );
}