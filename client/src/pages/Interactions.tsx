import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, MessageCircle, User, Calendar, FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import ResponsiveLayout from "@/components/Layout/ResponsiveLayout";

const interactionFormSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  content: z.string().min(1, "Content is required"),
  type: z.enum(["note", "call", "email", "meeting", "whatsapp"]).default("note"),
  clientId: z.number().optional(),
});

type InteractionFormData = z.infer<typeof interactionFormSchema>;

interface Interaction {
  id: number;
  type: string;
  subject: string;
  content: string;
  createdAt: string;
  user?: {
    id: number;
    name: string;
  };
  client?: {
    id: number;
    name: string;
  };
}

interface Client {
  id: number;
  name: string;
  email: string;
}

export default function Interactions() {
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch all interactions
  const { data: interactions = [], isLoading } = useQuery<Interaction[]>({
    queryKey: ["/api/crm/interactions/all"],
  });

  // Fetch clients for dropdown
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  // Form setup
  const form = useForm<InteractionFormData>({
    resolver: zodResolver(interactionFormSchema),
    defaultValues: {
      subject: "",
      content: "",
      type: "note",
      clientId: undefined,
    },
  });

  // Create interaction mutation
  const createInteractionMutation = useMutation({
    mutationFn: async (data: InteractionFormData) => {
      return apiRequest("/api/crm/interactions", { 
        method: "POST", 
        body: JSON.stringify({
          ...data,
          entityType: "general",
          entityId: 0, // General interactions
        })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/interactions/all"] });
      setIsNoteDialogOpen(false);
      form.reset();
      toast({ title: "Customer interaction added successfully!" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add interaction. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete interaction mutation
  const deleteInteractionMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/crm/interactions/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/interactions/all"] });
      toast({ title: "Interaction deleted successfully!" });
    },
  });

  const onSubmit = (data: InteractionFormData) => {
    createInteractionMutation.mutate(data);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "call": return "📞";
      case "email": return "📧";
      case "meeting": return "🤝";
      case "whatsapp": return "💬";
      default: return "📝";
    }
  };

  return (
    <ResponsiveLayout
      title="Customer Interactions"
      subtitle="Track all customer communications and notes"
      showAddButton={true}
      onAddClick={() => setIsNoteDialogOpen(true)}
    >
      {/* Add Interaction Dialog */}
      <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
        <DialogTrigger asChild>
          <Button 
            className="mb-6"
            data-testid="button-add-interaction"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Customer Interaction
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Customer Interaction</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-interaction-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="note">📝 Note</SelectItem>
                          <SelectItem value="call">📞 Call</SelectItem>
                          <SelectItem value="email">📧 Email</SelectItem>
                          <SelectItem value="meeting">🤝 Meeting</SelectItem>
                          <SelectItem value="whatsapp">💬 WhatsApp</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client (Optional)</FormLabel>
                      <Select onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}>
                        <FormControl>
                          <SelectTrigger data-testid="select-client">
                            <SelectValue placeholder="Select client" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clients.map((client) => (
                            <SelectItem key={client.id} value={client.id.toString()}>
                              {client.name}
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
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter subject" data-testid="input-subject" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content *</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Enter interaction details..."
                        className="min-h-[100px]"
                        data-testid="textarea-content"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  variant="outline" 
                  type="button"
                  onClick={() => setIsNoteDialogOpen(false)}
                  disabled={createInteractionMutation.isPending}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createInteractionMutation.isPending}
                  data-testid="button-save-interaction"
                >
                  {createInteractionMutation.isPending ? "Saving..." : "Save Interaction"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Interactions List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : interactions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <MessageCircle className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No interactions yet</h3>
              <p className="text-gray-600 text-center mb-4">
                Start tracking customer communications by adding your first interaction.
              </p>
              <Button 
                onClick={() => setIsNoteDialogOpen(true)}
                data-testid="button-add-first-interaction"
              >
                Add First Interaction
              </Button>
            </CardContent>
          </Card>
        ) : (
          interactions.map((interaction) => (
            <Card key={interaction.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-lg">{getTypeIcon(interaction.type)}</span>
                      <h3 className="font-medium text-gray-900" data-testid={`interaction-subject-${interaction.id}`}>
                        {interaction.subject}
                      </h3>
                    </div>
                    
                    <p className="text-gray-700 mb-3 whitespace-pre-wrap" data-testid={`interaction-content-${interaction.id}`}>
                      {interaction.content}
                    </p>
                    
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <div className="flex items-center space-x-1">
                        <User className="h-3 w-3" />
                        <span>{interaction.user?.name || "Unknown"}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>{format(new Date(interaction.createdAt), "MMM d, yyyy 'at' h:mm a")}</span>
                      </div>
                      {interaction.client && (
                        <div className="flex items-center space-x-1">
                          <span>Client: {interaction.client.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteInteractionMutation.mutate(interaction.id)}
                    disabled={deleteInteractionMutation.isPending}
                    className="text-red-600 hover:text-red-800"
                    data-testid={`button-delete-${interaction.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </ResponsiveLayout>
  );
}