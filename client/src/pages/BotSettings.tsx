import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Bot, Save } from "lucide-react";
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

export default function BotSettings() {
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
    mutationFn: async (settings: Partial<BotSettings>) => {
      return apiRequest('/api/settings/bot', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Bot settings updated successfully"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/settings/bot'] });
      // Reset dirty flags
      setTelegramTokenDirty(false);
      setWhatsappApiKeyDirty(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update bot settings",
        variant: "destructive"
      });
    }
  });

  // Load settings when data is available
  useEffect(() => {
    if (botSettings) {
      setTelegramEnabled(botSettings.telegramEnabled);
      setWhatsappEnabled(botSettings.whatsappEnabled);
      
      // Only update tokens if they are not dirty (user hasn't been typing)
      if (!telegramTokenDirty) {
        setTelegramToken(botSettings.telegramToken || "");
      }
      if (!whatsappApiKeyDirty) {
        setWhatsappApiKey(botSettings.whatsappApiKey || "");
      }
    }
  }, [botSettings, telegramTokenDirty, whatsappApiKeyDirty]);

  const handleSaveBotSettings = () => {
    const settings: Partial<BotSettings> = {
      telegramEnabled,
      whatsappEnabled,
    };
    
    // Only include tokens if user has actually modified them or they're not masked
    if (telegramTokenDirty || !isMasked(telegramToken)) {
      settings.telegramToken = telegramToken.trim() || null;
    }
    if (whatsappApiKeyDirty || !isMasked(whatsappApiKey)) {
      settings.whatsappApiKey = whatsappApiKey.trim() || null;
    }
    
    updateBotSettingsMutation.mutate(settings);
  };

  const canSaveBotSettings = user?.role === 'admin' && !updateBotSettingsMutation.isPending;

  if (user?.role !== 'admin') {
    return (
      <ResponsiveLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">Bot Settings</h1>
            <p className="text-muted-foreground">Configure Telegram and WhatsApp bot services</p>
          </div>
          
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-muted-foreground">
                Access denied. Only administrators can configure bot settings.
              </p>
            </CardContent>
          </Card>
        </div>
      </ResponsiveLayout>
    );
  }

  if (botSettingsError) {
    return (
      <ResponsiveLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">Bot Settings</h1>
            <p className="text-muted-foreground">Configure Telegram and WhatsApp bot services</p>
          </div>
          
          <Card>
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <p className="text-destructive">Failed to load bot settings. Please try again.</p>
                <Button 
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/settings/bot'] })}
                  data-testid="button-retry"
                >
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </ResponsiveLayout>
    );
  }

  return (
    <ResponsiveLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Bot Settings</h1>
          <p className="text-muted-foreground">Configure Telegram and WhatsApp bot services</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Bot Configuration
            </CardTitle>
            <CardDescription>
              Configure Telegram and WhatsApp bot services
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isBotSettingsLoading ? (
              <div className="space-y-4">
                <div className="h-4 bg-muted rounded animate-pulse"></div>
                <div className="h-4 bg-muted rounded animate-pulse w-3/4"></div>
                <div className="h-4 bg-muted rounded animate-pulse w-1/2"></div>
              </div>
            ) : (
              <>
                {/* Telegram Bot Settings */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="telegram-enabled" className="text-sm font-medium">
                        Telegram Bot
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Enable Telegram bot integration for notifications and commands
                      </p>
                    </div>
                    <Switch
                      id="telegram-enabled"
                      checked={telegramEnabled}
                      onCheckedChange={setTelegramEnabled}
                      data-testid="switch-telegram-enabled"
                    />
                  </div>
                  
                  {telegramEnabled && (
                    <div>
                      <Label htmlFor="telegram-token" className="text-sm font-medium">
                        Telegram Bot Token
                        {isTokenConfigured(botSettings?.telegramToken) && !telegramTokenDirty && (
                          <span className="text-xs text-green-600 ml-2">✓ Configured</span>
                        )}
                      </Label>
                      <Input
                        id="telegram-token"
                        type="password"
                        placeholder="Enter Telegram bot token..."
                        value={telegramToken}
                        onChange={(e) => {
                          setTelegramToken(e.target.value);
                          setTelegramTokenDirty(true);
                        }}
                        className="mt-1"
                        data-testid="input-telegram-token"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Get your bot token from @BotFather on Telegram
                      </p>
                    </div>
                  )}
                </div>

                {/* WhatsApp Bot Settings */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="whatsapp-enabled" className="text-sm font-medium">
                        WhatsApp Bot
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Enable WhatsApp bot integration for notifications and messaging
                      </p>
                    </div>
                    <Switch
                      id="whatsapp-enabled"
                      checked={whatsappEnabled}
                      onCheckedChange={setWhatsappEnabled}
                      data-testid="switch-whatsapp-enabled"
                    />
                  </div>
                  
                  {whatsappEnabled && (
                    <div>
                      <Label htmlFor="whatsapp-api-key" className="text-sm font-medium">
                        WhatsApp API Key
                        {isTokenConfigured(botSettings?.whatsappApiKey) && !whatsappApiKeyDirty && (
                          <span className="text-xs text-green-600 ml-2">✓ Configured</span>
                        )}
                      </Label>
                      <Input
                        id="whatsapp-api-key"
                        type="password"
                        placeholder="Enter WhatsApp API key..."
                        value={whatsappApiKey}
                        onChange={(e) => {
                          setWhatsappApiKey(e.target.value);
                          setWhatsappApiKeyDirty(true);
                        }}
                        className="mt-1"
                        data-testid="input-whatsapp-api-key"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Your WhatsApp Business API key for sending messages
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-4">
                  <Button 
                    onClick={handleSaveBotSettings}
                    disabled={!canSaveBotSettings}
                    className="w-full"
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
      </div>
    </ResponsiveLayout>
  );
}