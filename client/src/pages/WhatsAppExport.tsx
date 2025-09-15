import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useIsMobile, MobileCard, MobileHeading, MobileText } from "@/components/Mobile/MobileOptimizer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { authenticatedApiRequest } from "@/lib/auth";
import { Plus, MessageCircle, Send, Phone, Download, Copy } from "lucide-react";
import ResponsiveLayout from "@/components/Layout/ResponsiveLayout";

export default function WhatsAppExport() {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [selectedItems, setSelectedItems] = useState<number[]>([]);

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["/api/products"],
  });

  const { data: materialRequests, isLoading: requestsLoading } = useQuery({
    queryKey: ["/api/material-requests"],
  });

  const { data: priceComparisons, isLoading: comparisonsLoading } = useQuery({
    queryKey: ["/api/price-comparisons"],
  });

  const generateMessageMutation = useMutation({
    mutationFn: async (data: any) => {
      return authenticatedApiRequest("POST", "/api/whatsapp/generate-message", data);
    },
    onSuccess: (data) => {
      setCustomMessage(data.message);
      toast({
        title: "Message generated",
        description: "WhatsApp message has been generated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to generate message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sendWhatsAppMutation = useMutation({
    mutationFn: async (data: any) => {
      return authenticatedApiRequest("POST", "/api/whatsapp/send", data);
    },
    onSuccess: () => {
      toast({
        title: "Message sent",
        description: "WhatsApp message has been sent successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const templates = {
    "low-stock": "Low Stock Alert",
    "material-request": "Material Request",
    "price-comparison": "Price Comparison",
    "inventory-report": "Inventory Report",
    "custom": "Custom Message"
  };

  const handleGenerateMessage = () => {
    if (!selectedTemplate) {
      toast({
        title: "Template required",
        description: "Please select a message template first.",
        variant: "destructive",
      });
      return;
    }

    // Get selected product data instead of just IDs
    const availableItems = getItemsForTemplate();
    const selectedItemsData = availableItems.filter((item: any) => selectedItems.includes(item.id));
    
    const data = {
      template: selectedTemplate,
      items: selectedItemsData,
      phoneNumber,
    };

    generateMessageMutation.mutate(data);
  };

  const handleSendMessage = () => {
    if (!phoneNumber || !customMessage) {
      toast({
        title: "Missing information",
        description: "Please enter phone number and message.",
        variant: "destructive",
      });
      return;
    }

    const data = {
      phoneNumber,
      message: customMessage,
    };

    sendWhatsAppMutation.mutate(data);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(customMessage);
    toast({
      title: "Copied",
      description: "Message copied to clipboard.",
    });
  };

  const openWhatsApp = () => {
    if (!phoneNumber || !customMessage) {
      toast({
        title: "Missing information",
        description: "Please enter phone number and message.",
        variant: "destructive",
      });
      return;
    }

    const encodedMessage = encodeURIComponent(customMessage);
    const whatsappUrl = `https://wa.me/${phoneNumber.replace(/\D/g, "")}?text=${encodedMessage}`;
    window.open(whatsappUrl, "_blank");
  };

  const handleItemSelection = (itemId: number, checked: boolean) => {
    if (checked) {
      setSelectedItems(prev => [...prev, itemId]);
    } else {
      setSelectedItems(prev => prev.filter(id => id !== itemId));
    }
  };

  const isLoading = productsLoading || requestsLoading || comparisonsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  const getItemsForTemplate = () => {
    switch (selectedTemplate) {
      case "low-stock":
        return (Array.isArray(products) ? products : []).filter((p: any) => p.currentStock <= p.minStock);
      case "material-request":
        return (Array.isArray(materialRequests) ? materialRequests : []).filter((r: any) => r.status === "pending");
      case "price-comparison":
        return Array.isArray(priceComparisons) ? priceComparisons : [];
      case "inventory-report":
        return Array.isArray(products) ? products : [];
      default:
        return [];
    }
  };

  const renderItemsTable = () => {
    const items = getItemsForTemplate();
    if (!items.length) return null;

    return (
      <Card className="mt-6 hover:shadow-lg transition-all duration-300">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">Select Items to Include</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-muted/50">
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedItems(items.map((item: any) => item.id));
                      } else {
                        setSelectedItems([]);
                      }
                    }}
                    className="rounded"
                  />
                </TableHead>
                <TableHead className="font-semibold">Name</TableHead>
                <TableHead className="font-semibold">Details</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={(e) => handleItemSelection(item.id, e.target.checked)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {item.name || item.clientName || item.productName}
                  </TableCell>
                  <TableCell>
                    {selectedTemplate === "low-stock" && (
                      `Stock: ${item.currentStock}/${item.minStock} ${item.unit}`
                    )}
                    {selectedTemplate === "material-request" && (
                      `Order: ${item.orderNumber}`
                    )}
                    {selectedTemplate === "price-comparison" && (
                      `Suppliers: ${item.suppliers?.length || 0}`
                    )}
                    {selectedTemplate === "inventory-report" && (
                      `Stock: ${item.currentStock} ${item.unit}`
                    )}
                  </TableCell>
                  <TableCell>
                    {selectedTemplate === "low-stock" && (
                      <Badge variant="destructive">Low Stock</Badge>
                    )}
                    {selectedTemplate === "material-request" && (
                      <Badge variant="secondary">{item.status}</Badge>
                    )}
                    {selectedTemplate === "price-comparison" && (
                      <Badge variant="default">Compared</Badge>
                    )}
                    {selectedTemplate === "inventory-report" && (
                      <Badge variant={item.currentStock > item.minStock ? "default" : "destructive"}>
                        {item.currentStock > item.minStock ? "In Stock" : "Low Stock"}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };

  return (
    <ResponsiveLayout
      title="WhatsApp Business Export"
      subtitle="Generate and share professional business messages with clients and suppliers"
    >
      <div className="space-y-8 animate-fade-in max-w-7xl mx-auto">

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Message Composer */}
        <Card className="hover:shadow-lg transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center text-foreground">
              <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center mr-3">
                <MessageCircle className="h-5 w-5 text-green-600" />
              </div>
              Message Composer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="template" className="text-sm font-semibold text-foreground">Message Template</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select message template" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(templates).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="phoneNumber" className="text-sm font-semibold text-foreground">Phone Number</Label>
              <Input
                id="phoneNumber"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+91 9876543210"
                className="mt-2"
              />
            </div>

            {selectedTemplate && selectedTemplate !== "custom" && (
              <Button
                onClick={handleGenerateMessage}
                disabled={generateMessageMutation.isPending}
                className="w-full furnili-gradient hover:opacity-90 text-white font-medium shadow-md hover:shadow-lg transition-all duration-200"
              >
                {generateMessageMutation.isPending ? "Generating..." : "Generate Message"}
              </Button>
            )}

            <div>
              <Label htmlFor="message" className="text-sm font-semibold text-foreground">Message</Label>
              <Textarea
                id="message"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Enter your message here..."
                rows={8}
                className="resize-none mt-2"
              />
            </div>

            <div className="flex space-x-3">
              <Button
                onClick={copyToClipboard}
                variant="outline"
                disabled={!customMessage}
                className="flex-1 hover:bg-muted/50 transition-colors"
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </Button>
              <Button
                onClick={openWhatsApp}
                disabled={!phoneNumber || !customMessage}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium shadow-md hover:shadow-lg transition-all duration-200"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Open WhatsApp
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="hover:shadow-lg transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center text-foreground">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center mr-3">
                <Send className="h-5 w-5 text-blue-600" />
              </div>
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedTemplate("low-stock");
                  handleGenerateMessage();
                }}
                className="justify-start hover:bg-red-50 border-red-200 transition-colors"
              >
                <Badge className="mr-2 bg-red-100 text-red-800 text-xs font-semibold">Alert</Badge>
                Send Low Stock Alert
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  setSelectedTemplate("material-request");
                  handleGenerateMessage();
                }}
                className="justify-start hover:bg-blue-50 border-blue-200 transition-colors"
              >
                <Badge className="mr-2 bg-blue-100 text-blue-800 text-xs font-semibold">Request</Badge>
                Share Material Requests
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  setSelectedTemplate("inventory-report");
                  handleGenerateMessage();
                }}
                className="justify-start hover:bg-green-50 border-green-200 transition-colors"
              >
                <Badge className="mr-2 bg-green-100 text-green-800 text-xs font-semibold">Report</Badge>
                Send Inventory Report
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  setSelectedTemplate("price-comparison");
                  handleGenerateMessage();
                }}
                className="justify-start hover:bg-purple-50 border-purple-200 transition-colors"
              >
                <Badge className="mr-2 bg-purple-100 text-purple-800 text-xs font-semibold">Price</Badge>
                Share Price Comparisons
              </Button>
            </div>

            <div className="pt-4 border-t border-border">
              <h3 className="font-semibold text-foreground mb-3">Message Templates</h3>
              <div className="text-sm text-muted-foreground space-y-3">
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <div><strong className="text-foreground">Low Stock:</strong> Alerts for items below minimum stock</div>
                </div>
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <div><strong className="text-foreground">Material Request:</strong> Pending material requests summary</div>
                </div>
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <div><strong className="text-foreground">Price Comparison:</strong> Supplier price comparisons</div>
                </div>
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <div><strong className="text-foreground">Inventory Report:</strong> Current inventory status</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Items Selection */}
      {selectedTemplate && selectedTemplate !== "custom" && renderItemsTable()}

      {/* Recent Messages */}
      <Card>
        <CardHeader>
          <CardTitle>Message Preview Examples</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-800">Low Stock Alert Template</h4>
              <p className="text-sm text-green-700 mt-1">
                🚨 Low Stock Alert 🚨<br/>
                The following items need restocking:<br/>
                • Steel Rods: 5/20 units<br/>
                • Cement Bags: 8/50 units<br/>
                Please arrange for procurement immediately.
              </p>
            </div>

            <div className="p-3 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-800">Material Request Template</h4>
              <p className="text-sm text-blue-700 mt-1">
                📋 Material Request Update<br/>
                Order #MR001 - Building Project<br/>
                Status: Pending Approval<br/>
                Items: 15 (Total Value: ₹1,25,000)<br/>
                Please review and approve.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </ResponsiveLayout>
  );
}