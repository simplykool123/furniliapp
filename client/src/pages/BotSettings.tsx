import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Plus, Settings, Bot, MessageSquare, Phone, Trash2, Edit, MoreVertical, Power, PowerOff, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import ResponsiveLayout from "@/components/Layout/ResponsiveLayout";
import type { BotSettings, InsertBotSettings } from "@shared/schema";
import { insertBotSettingsSchema } from "@shared/schema";

// Environment detection utility
const getCurrentEnvironment = (): string => {
  // Auto-detect environment based on URL or environment variables
  if (typeof window !== 'undefined') {
    if (window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1')) {
      return 'development';
    }
    if (window.location.hostname.includes('test') || window.location.hostname.includes('staging')) {
      return 'testing';
    }
  }
  return 'production';
};

const BOT_TYPES = [
  { value: 'telegram', label: 'Telegram Bot', icon: MessageSquare },
  { value: 'whatsapp', label: 'WhatsApp Bot', icon: Phone },
  { value: 'other', label: 'Other Bot', icon: Bot }
];

const ENVIRONMENTS = [
  { value: 'development', label: 'Development', color: 'bg-blue-100 text-blue-800' },
  { value: 'testing', label: 'Testing', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'production', label: 'Production', color: 'bg-green-100 text-green-800' }
];

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  error: 'bg-red-100 text-red-800'
};

export default function BotSettings() {
  const [selectedTab, setSelectedTab] = useState(getCurrentEnvironment());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedBot, setSelectedBot] = useState<BotSettings | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch bot settings
  const { data: botSettings = [], isLoading: botSettingsLoading } = useQuery<BotSettings[]>({
    queryKey: ["/api/bot-settings", selectedTab],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedTab !== "all") {
        params.append("environment", selectedTab);
      }
      return apiRequest(`/api/bot-settings?${params}`);
    },
    staleTime: 1000 * 60 * 2, // Cache for 2 minutes
    refetchOnWindowFocus: false,
  });

  // Create bot settings mutation
  const createBotMutation = useMutation({
    mutationFn: async (data: InsertBotSettings) => {
      return apiRequest("/api/bot-settings", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bot-settings"] });
      setShowCreateModal(false);
      toast({
        title: "Success",
        description: "Bot settings created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create bot settings",
        variant: "destructive",
      });
    },
  });

  // Update bot settings mutation
  const updateBotMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertBotSettings> }) => {
      return apiRequest(`/api/bot-settings/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bot-settings"] });
      setShowEditModal(false);
      setSelectedBot(null);
      toast({
        title: "Success",
        description: "Bot settings updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update bot settings",
        variant: "destructive",
      });
    },
  });

  // Delete bot settings mutation
  const deleteBotMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/bot-settings/${id}`, {
        method: "DELETE"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bot-settings"] });
      setShowDeleteDialog(false);
      setSelectedBot(null);
      toast({
        title: "Success",
        description: "Bot settings deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete bot settings",
        variant: "destructive",
      });
    },
  });

  // Quick toggle bot enabled/disabled
  const toggleBotStatus = async (bot: BotSettings) => {
    try {
      await updateBotMutation.mutateAsync({
        id: bot.id,
        data: { isEnabled: !bot.isEnabled }
      });
    } catch (error) {
      // Error handled by mutation
    }
  };

  // Form schema for bot settings
  const botSettingsFormSchema = insertBotSettingsSchema.extend({
    settings: z.record(z.string(), z.any()).default({})
  });

  // Create form
  const createForm = useForm<z.infer<typeof botSettingsFormSchema>>({
    resolver: zodResolver(botSettingsFormSchema),
    defaultValues: {
      environment: selectedTab === 'all' ? getCurrentEnvironment() : selectedTab,
      botType: 'telegram',
      botName: '',
      isEnabled: false,
      apiKey: '',
      apiSecret: '',
      webhookUrl: '',
      allowedUsers: [],
      settings: {},
      status: 'inactive',
      statusMessage: '',
    },
  });

  // Edit form
  const editForm = useForm<z.infer<typeof botSettingsFormSchema>>({
    resolver: zodResolver(botSettingsFormSchema),
  });

  // Set edit form values when selectedBot changes
  useEffect(() => {
    if (selectedBot && showEditModal) {
      editForm.reset({
        environment: selectedBot.environment,
        botType: selectedBot.botType,
        botName: selectedBot.botName,
        isEnabled: selectedBot.isEnabled,
        apiKey: selectedBot.apiKey || '',
        apiSecret: selectedBot.apiSecret || '',
        webhookUrl: selectedBot.webhookUrl || '',
        allowedUsers: selectedBot.allowedUsers || [],
        settings: selectedBot.settings || {},
        status: selectedBot.status || 'inactive',
        statusMessage: selectedBot.statusMessage || '',
      });
    }
  }, [selectedBot, showEditModal, editForm]);

  const onCreateSubmit = (data: z.infer<typeof botSettingsFormSchema>) => {
    createBotMutation.mutate(data);
  };

  const onEditSubmit = (data: z.infer<typeof botSettingsFormSchema>) => {
    if (!selectedBot) return;
    updateBotMutation.mutate({
      id: selectedBot.id,
      data
    });
  };

  const getBotIcon = (botType: string) => {
    const botConfig = BOT_TYPES.find(bt => bt.value === botType);
    return botConfig?.icon || Bot;
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'active': return CheckCircle;
      case 'error': return XCircle;
      default: return AlertTriangle;
    }
  };

  if (botSettingsLoading) {
    return (
      <ResponsiveLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </ResponsiveLayout>
    );
  }

  return (
    <ResponsiveLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bot Settings</h1>
            <p className="text-gray-500">Manage bot configurations for different environments</p>
          </div>
          <Button 
            onClick={() => setShowCreateModal(true)}
            data-testid="button-create-bot"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Bot
          </Button>
        </div>

        {/* Environment Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all" data-testid="tab-all-environments">All Environments</TabsTrigger>
            <TabsTrigger value="development" data-testid="tab-development">Development</TabsTrigger>
            <TabsTrigger value="testing" data-testid="tab-testing">Testing</TabsTrigger>
            <TabsTrigger value="production" data-testid="tab-production">Production</TabsTrigger>
          </TabsList>

          <TabsContent value={selectedTab} className="space-y-4 mt-6">
            {/* Current Environment Indicator */}
            <div className="flex items-center space-x-2 p-4 bg-blue-50 rounded-lg">
              <Settings className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium text-blue-900">Current Environment: {getCurrentEnvironment()}</p>
                <p className="text-sm text-blue-700">This is the environment where your application is currently running</p>
              </div>
            </div>

            {/* Bot Settings Grid */}
            {botSettings.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Bot className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Bot Settings Found</h3>
                  <p className="text-gray-500 mb-4">
                    {selectedTab === 'all' 
                      ? 'No bot configurations have been created yet.' 
                      : `No bot configurations found for ${selectedTab} environment.`
                    }
                  </p>
                  <Button onClick={() => setShowCreateModal(true)} data-testid="button-create-first-bot">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Bot
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {botSettings.map((bot) => {
                  const BotIcon = getBotIcon(bot.botType);
                  const StatusIcon = getStatusIcon(bot.status);
                  
                  return (
                    <Card key={bot.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-gray-100 rounded-lg">
                              <BotIcon className="h-5 w-5 text-gray-600" />
                            </div>
                            <div>
                              <CardTitle className="text-lg">{bot.botName}</CardTitle>
                              <div className="flex items-center space-x-2 mt-1">
                                <Badge 
                                  variant="secondary"
                                  className={ENVIRONMENTS.find(env => env.value === bot.environment)?.color}
                                >
                                  {bot.environment}
                                </Badge>
                                <Badge variant="outline">{bot.botType}</Badge>
                              </div>
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0" data-testid={`button-menu-${bot.id}`}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedBot(bot);
                                  setShowEditModal(true);
                                }}
                                data-testid={`menu-edit-${bot.id}`}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Settings
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => toggleBotStatus(bot)}
                                data-testid={`menu-toggle-${bot.id}`}
                              >
                                {bot.isEnabled ? (
                                  <>
                                    <PowerOff className="h-4 w-4 mr-2" />
                                    Disable Bot
                                  </>
                                ) : (
                                  <>
                                    <Power className="h-4 w-4 mr-2" />
                                    Enable Bot
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedBot(bot);
                                  setShowDeleteDialog(true);
                                }}
                                className="text-red-600"
                                data-testid={`menu-delete-${bot.id}`}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Bot
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {/* Status */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <StatusIcon className="h-4 w-4" />
                            <span className="text-sm font-medium">Status</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch 
                              checked={bot.isEnabled}
                              onCheckedChange={() => toggleBotStatus(bot)}
                              data-testid={`switch-enabled-${bot.id}`}
                            />
                            <Badge 
                              variant="secondary" 
                              className={STATUS_COLORS[bot.status || 'inactive']}
                            >
                              {bot.status || 'inactive'}
                            </Badge>
                          </div>
                        </div>

                        {/* Last Activity */}
                        {bot.lastActivity && (
                          <div className="text-sm text-gray-500">
                            Last active: {new Date(bot.lastActivity).toLocaleDateString()}
                          </div>
                        )}

                        {/* Status Message */}
                        {bot.statusMessage && (
                          <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                            {bot.statusMessage}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Create Bot Modal */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Bot Settings</DialogTitle>
              <DialogDescription>
                Configure a new bot for your application environment
              </DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="environment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Environment</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-create-environment">
                              <SelectValue placeholder="Select environment" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {ENVIRONMENTS.map((env) => (
                              <SelectItem key={env.value} value={env.value} data-testid={`select-env-${env.value}`}>
                                {env.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="botType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bot Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-create-bot-type">
                              <SelectValue placeholder="Select bot type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {BOT_TYPES.map((bot) => (
                              <SelectItem key={bot.value} value={bot.value} data-testid={`select-bot-type-${bot.value}`}>
                                {bot.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={createForm.control}
                  name="botName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bot Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., Furnili Telegram Bot" 
                          {...field} 
                          data-testid="input-bot-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="apiKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>API Key/Token</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="Bot API key or token" 
                            {...field} 
                            data-testid="input-api-key"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="apiSecret"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>API Secret (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="Bot API secret" 
                            {...field} 
                            data-testid="input-api-secret"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={createForm.control}
                  name="webhookUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Webhook URL (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://your-app.com/webhook" 
                          {...field} 
                          data-testid="input-webhook-url"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="statusMessage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status Message (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Bot status or configuration notes" 
                          {...field} 
                          data-testid="input-status-message"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="isEnabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Enable Bot</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Start the bot immediately after creation
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-enable-bot"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowCreateModal(false)}
                    data-testid="button-cancel-create"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createBotMutation.isPending}
                    data-testid="button-submit-create"
                  >
                    {createBotMutation.isPending ? "Creating..." : "Create Bot"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Edit Bot Modal */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Bot Settings</DialogTitle>
              <DialogDescription>
                Update bot configuration for {selectedBot?.botName}
              </DialogDescription>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                {/* Same form fields as create, but with edit form */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="environment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Environment</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {ENVIRONMENTS.map((env) => (
                              <SelectItem key={env.value} value={env.value}>
                                {env.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="botType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bot Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {BOT_TYPES.map((bot) => (
                              <SelectItem key={bot.value} value={bot.value}>
                                {bot.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={editForm.control}
                  name="botName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bot Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-edit-bot-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="apiKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>API Key/Token</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            {...field} 
                            data-testid="input-edit-api-key"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="apiSecret"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>API Secret (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            {...field} 
                            data-testid="input-edit-api-secret"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={editForm.control}
                  name="webhookUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Webhook URL (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-edit-webhook-url" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="statusMessage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status Message (Optional)</FormLabel>
                      <FormControl>
                        <Textarea {...field} data-testid="input-edit-status-message" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="isEnabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Enable Bot</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Bot will be active in this environment
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-edit-enable-bot"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowEditModal(false)}
                    data-testid="button-cancel-edit"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={updateBotMutation.isPending}
                    data-testid="button-submit-edit"
                  >
                    {updateBotMutation.isPending ? "Updating..." : "Update Bot"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Bot Settings</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{selectedBot?.botName}"? This action cannot be undone and will permanently remove the bot configuration from {selectedBot?.environment} environment.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => selectedBot && deleteBotMutation.mutate(selectedBot.id)}
                className="bg-red-600 hover:bg-red-700"
                disabled={deleteBotMutation.isPending}
                data-testid="button-confirm-delete"
              >
                {deleteBotMutation.isPending ? "Deleting..." : "Delete Bot"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ResponsiveLayout>
  );
}