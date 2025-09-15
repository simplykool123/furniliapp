import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Smartphone, QrCode, CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";

export default function WhatsAppLink() {
  const [qrCode, setQrCode] = useState<string>("");
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("Disconnected");

  useEffect(() => {
    // Check WhatsApp bot status
    checkBotStatus();
  }, []);

  const checkBotStatus = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.error('No authentication token found');
        setConnectionStatus('Authentication required');
        return;
      }

      const response = await fetch('/api/whatsapp/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setIsConnected(data.isConnected);
        setConnectionStatus(data.isConnected ? 'Connected' : 'Disconnected');
        if (!data.isConnected && data.qrCode) {
          setQrCode(data.qrCode);
        } else if (data.isConnected) {
          setQrCode(''); // Clear QR code when connected
        }
      } else if (response.status === 401) {
        setConnectionStatus('Authentication failed');
        console.error('Authentication failed for WhatsApp status');
      } else {
        setConnectionStatus('Error checking status');
      }
    } catch (error) {
      console.error('Failed to check WhatsApp status:', error);
      setConnectionStatus('Connection error');
    }
  };

  const generateQR = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setConnectionStatus('Authentication required');
        return;
      }

      setConnectionStatus("Generating QR code...");
      setQrCode(""); // Clear existing QR
      
      const response = await fetch('/api/whatsapp/generate-qr', { 
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setConnectionStatus("QR code generation initiated...");
          // Poll for QR code since it's generated asynchronously
          pollForQRCode();
        } else {
          setConnectionStatus(data.message || "Failed to generate QR code");
        }
      } else if (response.status === 401) {
        setConnectionStatus('Authentication failed');
      } else {
        setConnectionStatus("Error generating QR code");
      }
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      setConnectionStatus("Error generating QR code");
    }
  };

  const pollForQRCode = async () => {
    let attempts = 0;
    const maxAttempts = 20;
    
    const poll = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) {
          setConnectionStatus('Authentication required');
          return;
        }

        const response = await fetch('/api/whatsapp/status', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Cache-Control': 'no-cache'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.qrCode) {
            setQrCode(data.qrCode);
            setConnectionStatus("Waiting for scan...");
            return;
          } else if (data.isConnected) {
            setIsConnected(true);
            setConnectionStatus("Connected");
            setQrCode(''); // Clear QR code
            return;
          }
        }
        
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 1000); // Poll every second
        } else {
          setConnectionStatus("QR code generation timed out");
        }
      } catch (error) {
        console.error('Polling error:', error);
        setConnectionStatus("Error checking QR status");
      }
    };
    
    poll();
  };

  const disconnectBot = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setConnectionStatus('Authentication required');
        return;
      }

      const response = await fetch('/api/whatsapp/reconnect', { 
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        setIsConnected(false);
        setConnectionStatus("Disconnected");
        setQrCode("");
      }
    } catch (error) {
      console.error('Failed to disconnect WhatsApp bot:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">WhatsApp Bot Connection</h1>
        <p className="text-muted-foreground">Connect your WhatsApp to receive and respond to messages</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-[hsl(28,100%,25%)]" />
                WhatsApp Bot Status
              </CardTitle>
              <CardDescription>
                Manage your WhatsApp bot connection and settings
              </CardDescription>
            </div>
            <Badge variant={isConnected ? "default" : "secondary"} className="flex items-center gap-1">
              {isConnected ? (
                <>
                  <CheckCircle className="w-3 h-3" />
                  Connected
                </>
              ) : (
                <>
                  <Smartphone className="w-3 h-3" />
                  {connectionStatus}
                </>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isConnected ? (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-medium mb-2">Connect WhatsApp</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Scan the QR code with your WhatsApp to connect the bot
                </p>
                
                {qrCode ? (
                  <div className="flex flex-col items-center space-y-4">
                    <div className="bg-white p-4 rounded-lg border-2 border-gray-200 shadow-sm">
                      <img 
                        src={qrCode} 
                        alt="WhatsApp QR Code" 
                        className="w-64 h-64 object-contain"
                        data-testid="qr-code-image"
                        onError={(e) => {
                          console.error('QR code image failed to load');
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                    <div className="text-center space-y-2">
                      <p className="text-sm font-medium text-gray-900">
                        📱 Scan with WhatsApp
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Open WhatsApp → Menu → Linked Devices → Link a Device
                      </p>
                    </div>
                    <Button onClick={generateQR} variant="outline" size="sm">
                      <QrCode className="w-4 h-4 mr-2" />
                      Generate New QR Code
                    </Button>
                  </div>
                ) : (
                  <Button onClick={generateQR} className="bg-[hsl(28,100%,25%)] hover:bg-[hsl(28,100%,20%)]">
                    <QrCode className="w-4 h-4 mr-2" />
                    Generate QR Code
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-medium mb-2">WhatsApp Connected</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Your WhatsApp bot is active and ready to receive messages
                </p>
                <Button 
                  onClick={disconnectBot} 
                  variant="outline" 
                  className="border-red-200 text-red-600 hover:bg-red-50"
                >
                  Disconnect WhatsApp
                </Button>
              </div>
            </div>
          )}

          <div className="border-t pt-4">
            <h4 className="font-medium mb-2">Bot Behavior Settings</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• Bot only responds when directly messaged or mentioned</p>
              <p>• Normal WhatsApp messages will not trigger the bot</p>
              <p>• Type "bot" or mention the bot to start interaction</p>
              <p>• Bot can help with furniture calculations and project quotes</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}