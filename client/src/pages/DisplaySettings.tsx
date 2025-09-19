import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { Moon, Sun, MessageCircle, Bot, Save } from "lucide-react";
import ResponsiveLayout from "@/components/Layout/ResponsiveLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/lib/auth";

interface BotSettings {
  telegramEnabled: boolean;
  whatsappEnabled: boolean;
  telegramToken: string | null;
  whatsappApiKey: string | null;
}

export default function DisplaySettings() {
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = authService.getUser();
  
  // Bot settings state
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [telegramToken, setTelegramToken] = useState("");
  const [whatsappApiKey, setWhatsappApiKey] = useState("");
  
  // Track if user has modified token fields (dirty state)
  const [telegramTokenDirty, setTelegramTokenDirty] = useState(false);
  const [whatsappApiKeyDirty, setWhatsappApiKeyDirty] = useState(false);

  // Helper function to detect any potentially masked values (contains asterisks)
  const isMasked = (value?: string | null): boolean => {
    return !!value && value.includes('*');
  };
  
  // Helper function to check if a token is configured (exists and not null/empty)
  const isTokenConfigured = (value?: string | null): boolean => {
    return !!value && value.trim().length > 0;
  };

  // Fetch bot settings
  const { data: botSettings, isLoading: isBotSettingsLoading, error: botSettingsError } = useQuery<BotSettings>({
    queryKey: ['/api/settings/bot'],
    enabled: user?.role === 'admin'
  });

  // Update bot settings mutation
  const updateBotSettingsMutation = useMutation({
    mutationFn: (updates: Partial<BotSettings>) => 
      apiRequest('/api/settings/bot', {
        method: 'PUT',
        body: JSON.stringify(updates),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings/bot'] });
      // Clear secrets from UI state after successful save
      setTelegramToken("");
      setWhatsappApiKey("");
      setTelegramTokenDirty(false);
      setWhatsappApiKeyDirty(false);
      toast({
        title: "Settings updated",
        description: "Bot settings have been saved successfully.",
      });
    },
    onError: (error: any) => {
      console.error("Failed to update bot settings:", error);
      toast({
        title: "Error",
        description: "Failed to update bot settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Initialize form state when data loads
  useEffect(() => {
    if (botSettings) {
      setTelegramEnabled(botSettings.telegramEnabled || false);
      setWhatsappEnabled(botSettings.whatsappEnabled || false);
      // NEVER prefill token fields for security - always start empty
      // User will see placeholders indicating if tokens are configured
    }
  }, [botSettings]);

  const handleSaveBotSettings = () => {
    const updates: Partial<BotSettings> = {
      telegramEnabled,
      whatsappEnabled,
    };

    // Only include tokens if user has explicitly modified them
    if (telegramTokenDirty) {
      const trimmedTelegramToken = telegramToken.trim();
      if (trimmedTelegramToken && !isMasked(trimmedTelegramToken)) {
        updates.telegramToken = trimmedTelegramToken;
      }
    }
    
    if (whatsappApiKeyDirty) {
      const trimmedWhatsappKey = whatsappApiKey.trim();
      if (trimmedWhatsappKey && !isMasked(trimmedWhatsappKey)) {
        updates.whatsappApiKey = trimmedWhatsappKey;
      }
    }

    updateBotSettingsMutation.mutate(updates);
  };

  return (
    <ResponsiveLayout
      title="Settings"
      subtitle="Configure theme, bot services, and application preferences"
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

      {/* Bot Settings Card - Admin Only */}
      {user?.role === 'admin' && (
        <Card className="bg-white dark:bg-gray-800 shadow-md border-gray-200 dark:border-gray-700 mt-6">
          <CardHeader>
            <CardTitle className="text-gray-800 dark:text-white flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Bot Settings
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Configure Telegram and WhatsApp bot services
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isBotSettingsLoading ? (
              <div className="text-center py-4" data-testid="loading-bot-settings">
                <div className="text-sm text-gray-600 dark:text-gray-400">Loading bot settings...</div>
              </div>
            ) : botSettingsError ? (
              <div className="text-center py-4" data-testid="error-bot-settings">
                <div className="text-sm text-red-600 dark:text-red-400 mb-2">
                  Failed to load bot settings. Please try again.
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/settings/bot'] })}
                  data-testid="button-retry-bot-settings"
                >
                  Retry
                </Button>
              </div>
            ) : (
              <>
                {/* Telegram Bot Settings */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-base font-medium text-gray-800 dark:text-white flex items-center gap-2">
                        <MessageCircle className="h-4 w-4" />
                        Telegram Bot
                      </Label>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Enable Telegram bot notifications and commands
                      </p>
                      {telegramEnabled && !isTokenConfigured(botSettings?.telegramToken) && !telegramTokenDirty && (
                        <p className="text-xs text-orange-600 dark:text-orange-400">
                          ⚠️ Configure a token below to activate the bot
                        </p>
                      )}
                    </div>
                    <Switch
                      checked={telegramEnabled}
                      onCheckedChange={setTelegramEnabled}
                      className="data-[state=checked]:bg-[#D4B896]"
                      data-testid="toggle-telegram"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="telegram-token" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Telegram Bot Token
                    </Label>
                    <Input
                      id="telegram-token"
                      type="password"
                      placeholder={isTokenConfigured(botSettings?.telegramToken) ? "Token configured (enter new token to update)" : "Enter Telegram Bot Token"}
                      value={telegramToken}
                      onChange={(e) => {
                        setTelegramToken(e.target.value);
                        setTelegramTokenDirty(true);
                      }}
                      className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                      data-testid="input-telegram-token"
                    />
                  </div>
                </div>

                {/* WhatsApp Bot Settings */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-base font-medium text-gray-800 dark:text-white flex items-center gap-2">
                        <MessageCircle className="h-4 w-4 text-green-600" />
                        WhatsApp Bot
                      </Label>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Enable WhatsApp bot notifications and commands
                      </p>
                      {whatsappEnabled && !isTokenConfigured(botSettings?.whatsappApiKey) && !whatsappApiKeyDirty && (
                        <p className="text-xs text-orange-600 dark:text-orange-400">
                          ⚠️ Configure an API key below to activate the bot
                        </p>
                      )}
                    </div>
                    <Switch
                      checked={whatsappEnabled}
                      onCheckedChange={setWhatsappEnabled}
                      className="data-[state=checked]:bg-[#D4B896]"
                      data-testid="toggle-whatsapp"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp-key" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      WhatsApp API Key
                    </Label>
                    <Input
                      id="whatsapp-key"
                      type="password"
                      placeholder={isTokenConfigured(botSettings?.whatsappApiKey) ? "API key configured (enter new key to update)" : "Enter WhatsApp API Key"}
                      value={whatsappApiKey}
                      onChange={(e) => {
                        setWhatsappApiKey(e.target.value);
                        setWhatsappApiKeyDirty(true);
                      }}
                      className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                      data-testid="input-whatsapp-key"
                    />
                  </div>
                </div>

                {/* Save Button */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    onClick={handleSaveBotSettings}
                    disabled={updateBotSettingsMutation.isPending}
                    className="bg-[#8B4513] hover:bg-[#A0522D] text-white"
                    data-testid="button-save-bot-settings"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {updateBotSettingsMutation.isPending ? "Saving..." : "Save Bot Settings"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      </div>
    </ResponsiveLayout>
  );
}