import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MessageCircle, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw,
  Send,
  Users,
  Activity,
  Wifi,
  WifiOff,
  Phone,
  Settings
} from "lucide-react";
import { format } from "date-fns";
import Layout from "@/components/Layout/Layout";
import { apiRequest } from "@/lib/queryClient";

interface WhatsAppMessage {
  id: string;
  from: string;
  body: string;
  timestamp: Date;
  type: 'incoming' | 'outgoing';
  status: 'sent' | 'delivered' | 'read' | 'failed';
}

interface WhatsAppSession {
  id: number;
  whatsappUserId: string;
  whatsappName: string;
  phoneNumber: string;
  systemUserId: number;
  lastInteraction: Date;
  sessionState: string;
}

interface BotStatus {
  isConnected: boolean;
  qrCode?: string; // Data URL format for displaying QR code image
  lastActivity: Date;
  totalSessions: number;
  activeChats: number;
  messagesProcessed: number;
}

export default function WhatsAppConsole() {
  const [selectedSession, setSelectedSession] = useState<string>("");
  const [messageInput, setMessageInput] = useState("");

  const queryClient = useQueryClient();

  const { data: botStatus, isLoading: statusLoading } = useQuery<BotStatus>({
    queryKey: ['/api/whatsapp/status'],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const { data: messages, isLoading: messagesLoading } = useQuery<WhatsAppMessage[]>({
    queryKey: ['/api/whatsapp/messages'],
    refetchInterval: 2000, // Refresh every 2 seconds
  });

  const { data: sessions, isLoading: sessionsLoading } = useQuery<WhatsAppSession[]>({
    queryKey: ['/api/whatsapp/sessions'],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ to, message }: { to: string; message: string }) => {
      return await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({ to, message })
      }).then(res => res.json());
    },
    onSuccess: () => {
      setMessageInput("");
      queryClient.invalidateQueries({ queryKey: ['/api/whatsapp/messages'] });
    }
  });

  const reconnectMutation = useMutation({
    mutationFn: async () => {
      return await fetch('/api/whatsapp/reconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        }
      }).then(res => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/whatsapp/status'] });
    }
  });

  const getStatusColor = (isConnected: boolean) => {
    return isConnected ? "bg-green-500" : "bg-red-500";
  };

  const getMessageStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return <Send className="h-3 w-3" />;
      case 'delivered': return <CheckCircle className="h-3 w-3" />;
      case 'read': return <CheckCircle className="h-3 w-3 text-blue-500" />;
      case 'failed': return <XCircle className="h-3 w-3 text-red-500" />;
      default: return <AlertTriangle className="h-3 w-3" />;
    }
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">WhatsApp Console</h1>
            <p className="text-muted-foreground">
              Monitor WhatsApp bot activity and manage connections
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => queryClient.invalidateQueries()}
              data-testid="button-refresh"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button 
              variant="outline"
              onClick={() => reconnectMutation.mutate()}
              disabled={reconnectMutation.isPending}
              data-testid="button-reconnect"
            >
              <Wifi className="mr-2 h-4 w-4" />
              Reconnect
            </Button>
          </div>
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Connection Status</CardTitle>
              {botStatus?.isConnected ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Badge className={`${getStatusColor(botStatus?.isConnected || false)} text-white`}>
                  {botStatus?.isConnected ? 'Connected' : 'Disconnected'}
                </Badge>
              </div>
              {botStatus?.lastActivity && (
                <p className="text-xs text-muted-foreground mt-1">
                  Last: {format(new Date(botStatus.lastActivity), 'MMM dd, HH:mm')}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-active-sessions">
                {botStatus?.totalSessions || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Chats</CardTitle>
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-active-chats">
                {botStatus?.activeChats || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Messages Processed</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-messages-processed">
                {botStatus?.messagesProcessed || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* QR Code for Connection */}
        {!botStatus?.isConnected && botStatus?.qrCode && (
          <Card className="border-dashed border-2 border-yellow-300 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Scan QR Code to Connect WhatsApp
              </CardTitle>
              <CardDescription>
                Open WhatsApp on your phone and scan this QR code to connect the bot
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-4">
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <img 
                    src={botStatus.qrCode} 
                    alt="WhatsApp QR Code" 
                    className="w-64 h-64 object-contain"
                    data-testid="qr-code-image"
                    onError={(e) => {
                      console.error('QR code image failed to load');
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Scan this QR code with WhatsApp on your phone to connect the bot
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    QR code refreshes automatically every few minutes
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Show loading state when not connected and no QR code yet */}
        {!botStatus?.isConnected && !botStatus?.qrCode && !statusLoading && (
          <Card className="border-dashed border-2 border-blue-300 bg-blue-50 dark:bg-blue-950 dark:border-blue-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 animate-spin" />
                Generating QR Code
              </CardTitle>
              <CardDescription>
                Please wait while we generate a new QR code for WhatsApp connection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  This may take a few moments. The QR code will appear automatically once ready.
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => reconnectMutation.mutate()}
                  disabled={reconnectMutation.isPending}
                  className="mt-4"
                  data-testid="button-generate-qr"
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${reconnectMutation.isPending ? 'animate-spin' : ''}`} />
                  Generate New QR Code
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="messages" className="space-y-4">
          <TabsList>
            <TabsTrigger value="messages">Live Messages</TabsTrigger>
            <TabsTrigger value="sessions">User Sessions</TabsTrigger>
            <TabsTrigger value="settings">Bot Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="messages" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Message History */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Message History</CardTitle>
                  <CardDescription>
                    Real-time WhatsApp message feed
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96 w-full pr-4">
                    <div className="space-y-3">
                      {messages?.map((message) => (
                        <div 
                          key={message.id} 
                          className={`flex ${message.type === 'outgoing' ? 'justify-end' : 'justify-start'}`}
                          data-testid={`message-${message.id}`}
                        >
                          <div className={`max-w-[80%] rounded-lg p-3 ${
                            message.type === 'outgoing' 
                              ? 'bg-blue-500 text-white' 
                              : 'bg-gray-100 text-gray-900'
                          }`}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium">
                                {message.type === 'outgoing' ? 'Bot' : message.from}
                              </span>
                              <span className="text-xs opacity-70">
                                {format(new Date(message.timestamp), 'HH:mm')}
                              </span>
                              {message.type === 'outgoing' && (
                                <span className="text-xs opacity-70">
                                  {getMessageStatusIcon(message.status)}
                                </span>
                              )}
                            </div>
                            <p className="text-sm">{message.body}</p>
                          </div>
                        </div>
                      )) || (
                        <div className="text-center py-8 text-muted-foreground">
                          No messages yet. Start a conversation to see activity here.
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Send Message Panel */}
              <Card>
                <CardHeader>
                  <CardTitle>Send Message</CardTitle>
                  <CardDescription>
                    Send test messages directly from console
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    placeholder="Enter phone number (e.g., 1234567890)"
                    value={selectedSession}
                    onChange={(e) => setSelectedSession(e.target.value)}
                    data-testid="input-phone-number"
                  />
                  <textarea
                    className="w-full p-3 border rounded-md resize-none"
                    placeholder="Type your message..."
                    rows={4}
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    data-testid="textarea-message"
                  />
                  <Button 
                    className="w-full"
                    onClick={() => {
                      if (selectedSession && messageInput) {
                        sendMessageMutation.mutate({
                          to: selectedSession,
                          message: messageInput
                        });
                      }
                    }}
                    disabled={!selectedSession || !messageInput || sendMessageMutation.isPending}
                    data-testid="button-send-message"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Send Message
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="sessions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Active User Sessions</CardTitle>
                <CardDescription>
                  Users who have interacted with the WhatsApp bot
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {sessions?.map((session) => (
                    <div 
                      key={session.id} 
                      className="flex items-center justify-between p-4 border rounded-lg"
                      data-testid={`session-${session.id}`}
                    >
                      <div className="space-y-1">
                        <div className="font-medium">{session.whatsappName}</div>
                        <div className="text-sm text-muted-foreground">
                          {session.phoneNumber}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          State: {session.sessionState} • Last: {format(new Date(session.lastInteraction), 'MMM dd, HH:mm')}
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedSession(session.phoneNumber)}
                        data-testid={`button-select-session-${session.id}`}
                      >
                        Select
                      </Button>
                    </div>
                  )) || (
                    <div className="text-center py-8 text-muted-foreground">
                      No active sessions found.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Bot Configuration</CardTitle>
                <CardDescription>
                  Manage WhatsApp bot settings and preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  Bot configuration settings will be available here.
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}