import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, MessageSquare, User, Calendar, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import ResponsiveLayout from "@/components/Layout/ResponsiveLayout";
import { authService } from "@/lib/auth";

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

export default function Interactions() {
  const [newNote, setNewNote] = useState("");
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const user = authService.getUser();

  // Fetch all interactions
  const { data: interactions = [], isLoading } = useQuery<Interaction[]>({
    queryKey: ["/api/crm/interactions/all"],
  });

  // Create interaction mutation
  const createInteractionMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("/api/crm/interactions", "POST", {
        subject: "Note",
        content,
        type: "note",
        entityType: "general",
        entityId: 0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/interactions/all"] });
      setNewNote("");
      toast({ title: "Note added successfully!" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add note. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete interaction mutation
  const deleteInteractionMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/crm/interactions/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/interactions/all"] });
      toast({ title: "Note deleted successfully!" });
    },
  });

  const handleAddNote = () => {
    if (!newNote.trim()) {
      toast({
        title: "Please enter a note",
        variant: "destructive",
      });
      return;
    }
    createInteractionMutation.mutate(newNote);
  };

  const handleDeleteNote = (id: number) => {
    if (window.confirm("Are you sure you want to delete this note?")) {
      deleteInteractionMutation.mutate(id);
    }
  };

  return (
    <ResponsiveLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Customer Interactions</h1>
          <p className="text-gray-600">Simple notes for customer interactions</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Add Note Form */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Plus className="h-5 w-5" />
                  <span>Add Note</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Enter your note here..."
                  className="min-h-[100px]"
                  data-testid="input-note-content"
                />
                <Button
                  onClick={handleAddNote}
                  disabled={createInteractionMutation.isPending}
                  className="bg-brown-600 hover:bg-brown-700 text-white w-full"
                  data-testid="button-add-note"
                >
                  {createInteractionMutation.isPending ? "Adding..." : "Add Note"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - All Notes */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">All Notes</h3>

            <div className="max-h-[calc(100vh-200px)] overflow-y-auto space-y-4">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="mt-2 text-gray-500">Loading notes...</p>
                </div>
              ) : interactions.length > 0 ? (
                <div className="space-y-4">
                  {interactions.map((interaction) => (
                    <Card key={interaction.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <MessageSquare className="h-4 w-4 text-gray-500" />
                              <span className="text-sm text-gray-500">
                                📝 Note
                              </span>
                              <span className="text-sm text-gray-500">•</span>
                              <span className="text-sm text-gray-500">
                                {format(new Date(interaction.createdAt), "MMM d, yyyy 'at' h:mm a")}
                              </span>
                            </div>
                            <p className="text-gray-900 whitespace-pre-wrap">{interaction.content}</p>
                            {interaction.user && (
                              <div className="flex items-center space-x-1 mt-2 text-sm text-gray-500">
                                <User className="h-3 w-3" />
                                <span>by {interaction.user.name}</span>
                              </div>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteNote(interaction.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            data-testid={`button-delete-note-${interaction.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium mb-2">No notes yet</p>
                  <p className="text-sm text-gray-500">Add your first note using the form</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ResponsiveLayout>
  );
}