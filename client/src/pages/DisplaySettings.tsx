import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/contexts/ThemeContext";
import { Moon, Sun } from "lucide-react";
import ResponsiveLayout from "@/components/Layout/ResponsiveLayout";

export default function DisplaySettings() {
  const { theme, toggleTheme } = useTheme();

  return (
    <ResponsiveLayout
      title="Theme & Layout"
      subtitle="Customize how the application looks and feels"
    >
        <div className="max-w-4xl mx-auto">

      <Card className="bg-white dark:bg-gray-800 shadow-md border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-gray-800 dark:text-white">Theme Preferences</CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            Customize how the application looks and feels
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium text-gray-800 dark:text-white flex items-center gap-2">
                {theme === 'light' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                Dark Mode
              </Label>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Switch between light and dark themes
              </p>
            </div>
            <Switch
              checked={theme === 'dark'}
              onCheckedChange={toggleTheme}
              className="data-[state=checked]:bg-[#D4B896]"
            />
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Light Mode Preview */}
              <div className={`p-4 border-2 rounded-lg ${theme === 'light' ? 'border-[#D4B896]' : 'border-gray-200 dark:border-gray-600'}`}>
                <div className="mb-2">
                  <Sun className="h-5 w-5 text-yellow-500" />
                </div>
                <h3 className="font-medium text-gray-800 dark:text-white mb-1">Light Theme</h3>
                <div className="space-y-2">
                  <div className="h-2 bg-[#F5F0E8] rounded"></div>
                  <div className="h-2 bg-white rounded shadow-sm"></div>
                  <div className="h-1 bg-[#D4B896] rounded w-1/2"></div>
                </div>
              </div>

              {/* Dark Mode Preview */}
              <div className={`p-4 border-2 rounded-lg ${theme === 'dark' ? 'border-[#D4B896]' : 'border-gray-200 dark:border-gray-600'}`}>
                <div className="mb-2">
                  <Moon className="h-5 w-5 text-blue-400" />
                </div>
                <h3 className="font-medium text-gray-800 dark:text-white mb-1">Dark Theme</h3>
                <div className="space-y-2">
                  <div className="h-2 bg-gray-900 rounded"></div>
                  <div className="h-2 bg-gray-800 rounded"></div>
                  <div className="h-1 bg-[#D4B896] rounded w-1/2"></div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </ResponsiveLayout>
  );
}