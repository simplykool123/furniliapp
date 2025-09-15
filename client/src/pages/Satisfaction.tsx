import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Star, User, Calendar, TrendingUp, MessageCircle, Eye, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import ResponsiveLayout from "@/components/Layout/ResponsiveLayout";
import { authService } from "@/lib/auth";

const satisfactionSurveySchema = z.object({
  clientId: z.number().min(1, "Client is required"),
  projectId: z.number().optional(),
  surveyType: z.enum(["project_completion", "service_quality", "overall"]).default("project_completion"),
  rating: z.number().min(1).max(5),
  feedback: z.string().optional(),
  improvements: z.string().optional(),
  recommend: z.boolean().default(true),
});

type SatisfactionSurveyFormData = z.infer<typeof satisfactionSurveySchema>;

interface SatisfactionSurvey {
  id: number;
  clientId: number;
  projectId?: number;
  surveyType: string;
  rating: number;
  feedback?: string;
  improvements?: string;
  recommend: boolean;
  createdAt: string;
  client?: {
    id: number;
    name: string;
    email: string;
  };
  project?: {
    id: number;
    name: string;
    code: string;
  };
  createdBy?: {
    id: number;
    name: string;
  };
}

interface Client {
  id: number;
  name: string;
  email: string;
}

interface Project {
  id: number;
  name: string;
  code: string;
  clientId: number;
}

export default function Satisfaction() {
  const [isNewSurveyOpen, setIsNewSurveyOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [ratingFilter, setRatingFilter] = useState<string>("all");

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const user = authService.getUser();

  // Fetch satisfaction surveys
  const { data: surveys = [], isLoading: surveysLoading } = useQuery<SatisfactionSurvey[]>({
    queryKey: ["/api/crm/satisfaction-surveys"],
  });

  // Fetch clients for form
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  // Fetch projects for form
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  // Form setup
  const form = useForm<SatisfactionSurveyFormData>({
    resolver: zodResolver(satisfactionSurveySchema),
    defaultValues: {
      surveyType: "project_completion",
      rating: 5,
      recommend: true,
    },
  });

  const selectedClientId = form.watch("clientId");
  const clientProjects = projects.filter(p => p.clientId === selectedClientId);

  // Create satisfaction survey mutation
  const createSurveyMutation = useMutation({
    mutationFn: (data: SatisfactionSurveyFormData) => 
      apiRequest("/api/crm/satisfaction-surveys", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/satisfaction-surveys"] });
      setIsNewSurveyOpen(false);
      form.reset();
      toast({ title: "Success", description: "Satisfaction survey recorded successfully!" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record satisfaction survey",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SatisfactionSurveyFormData) => {
    createSurveyMutation.mutate(data);
  };

  // Filter surveys
  const filteredSurveys = surveys.filter(survey => {
    const matchesSearch = 
      survey.client?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      survey.project?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (survey.feedback && survey.feedback.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = typeFilter === "all" || survey.surveyType === typeFilter;
    const matchesRating = ratingFilter === "all" || survey.rating.toString() === ratingFilter;
    
    return matchesSearch && matchesType && matchesRating;
  });

  // Calculate metrics
  const averageRating = surveys.length > 0 
    ? (surveys.reduce((sum, survey) => sum + survey.rating, 0) / surveys.length).toFixed(1)
    : "0";

  const recommendationRate = surveys.length > 0
    ? ((surveys.filter(s => s.recommend).length / surveys.length) * 100).toFixed(1)
    : "0";

  const ratingDistribution = [5, 4, 3, 2, 1].map(rating => ({
    rating,
    count: surveys.filter(s => s.rating === rating).length,
    percentage: surveys.length > 0 
      ? ((surveys.filter(s => s.rating === rating).length / surveys.length) * 100).toFixed(1)
      : "0"
  }));

  const getRatingStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
      />
    ));
  };

  const getSurveyTypeColor = (type: string) => {
    switch (type) {
      case "project_completion": return "bg-green-50 border-green-200 text-green-800";
      case "service_quality": return "bg-blue-50 border-blue-200 text-blue-800";
      case "overall": return "bg-purple-50 border-purple-200 text-purple-800";
      default: return "bg-gray-50 border-gray-200 text-gray-800";
    }
  };

  const getSurveyTypeLabel = (type: string) => {
    switch (type) {
      case "project_completion": return "Project Completion";
      case "service_quality": return "Service Quality";
      case "overall": return "Overall Experience";
      default: return type;
    }
  };

  return (
    <ResponsiveLayout
      title="Customer Satisfaction"
      subtitle="Track and analyze customer feedback and satisfaction scores"
      showAddButton={true}
      onAddClick={() => setIsNewSurveyOpen(true)}
    >
      {/* Satisfaction Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Surveys</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-blue-600" data-testid="text-total-surveys">{surveys.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Average Rating</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold text-yellow-600" data-testid="text-average-rating">{averageRating}</div>
              <div className="flex">{getRatingStars(Math.round(parseFloat(averageRating)))}</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Recommendation Rate</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-green-600" data-testid="text-recommendation-rate">{recommendationRate}%</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">5-Star Reviews</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-purple-600" data-testid="text-five-star">
              {surveys.filter(s => s.rating === 5).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search surveys..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search-surveys"
          />
        </div>
        
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48" data-testid="select-type-filter">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="project_completion">Project Completion</SelectItem>
            <SelectItem value="service_quality">Service Quality</SelectItem>
            <SelectItem value="overall">Overall Experience</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={ratingFilter} onValueChange={setRatingFilter}>
          <SelectTrigger className="w-48" data-testid="select-rating-filter">
            <SelectValue placeholder="Filter by rating" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Ratings</SelectItem>
            <SelectItem value="5">5 Stars</SelectItem>
            <SelectItem value="4">4 Stars</SelectItem>
            <SelectItem value="3">3 Stars</SelectItem>
            <SelectItem value="2">2 Stars</SelectItem>
            <SelectItem value="1">1 Star</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Rating Distribution */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Rating Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {ratingDistribution.map(({ rating, count, percentage }) => (
              <div key={rating} className="flex items-center gap-4">
                <div className="flex items-center gap-1 w-16">
                  <span className="text-sm font-medium">{rating}</span>
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                </div>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-yellow-400 rounded-full h-2" 
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
                <div className="text-sm text-gray-600 w-16 text-right">
                  {count} ({percentage}%)
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Surveys List */}
      {surveysLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded mb-4"></div>
                <div className="h-2 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredSurveys.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <MessageCircle className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No surveys found</h3>
            <p className="text-gray-600 text-center">
              {searchTerm || typeFilter !== "all" || ratingFilter !== "all" 
                ? "Try adjusting your search or filters" 
                : "Start collecting customer feedback by creating your first survey"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredSurveys.map((survey) => (
            <Card key={survey.id} className="hover:shadow-md transition-shadow" data-testid={`card-survey-${survey.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900" data-testid={`text-client-${survey.id}`}>
                        {survey.client?.name}
                      </h3>
                      <Badge 
                        variant="outline" 
                        className={getSurveyTypeColor(survey.surveyType)}
                      >
                        {getSurveyTypeLabel(survey.surveyType)}
                      </Badge>
                    </div>
                    
                    {survey.project && (
                      <div className="text-sm text-gray-600 mb-2">
                        Project: {survey.project.code} - {survey.project.name}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>{format(new Date(survey.createdAt), "MMM dd, yyyy")}</span>
                      {survey.createdBy && <span>by {survey.createdBy.name}</span>}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center gap-1 mb-1">
                      {getRatingStars(survey.rating)}
                    </div>
                    <div className="text-sm text-gray-600">
                      {survey.recommend ? (
                        <span className="text-green-600">✓ Would recommend</span>
                      ) : (
                        <span className="text-red-600">✗ Would not recommend</span>
                      )}
                    </div>
                  </div>
                </div>
                
                {survey.feedback && (
                  <div className="bg-gray-50 rounded-lg p-3 mb-2">
                    <div className="text-sm font-medium text-gray-700 mb-1">Feedback:</div>
                    <div className="text-sm text-gray-600">{survey.feedback}</div>
                  </div>
                )}
                
                {survey.improvements && (
                  <div className="bg-orange-50 rounded-lg p-3">
                    <div className="text-sm font-medium text-orange-700 mb-1">Improvements:</div>
                    <div className="text-sm text-orange-600">{survey.improvements}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Survey Dialog */}
      <Dialog open={isNewSurveyOpen} onOpenChange={setIsNewSurveyOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Customer Satisfaction Survey</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client *</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
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
                
                <FormField
                  control={form.control}
                  name="projectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project (Optional)</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)} 
                        value={field.value?.toString()}
                        disabled={!selectedClientId}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-project">
                            <SelectValue placeholder="Select project" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No Project</SelectItem>
                          {clientProjects.map((project) => (
                            <SelectItem key={project.id} value={project.id.toString()}>
                              {project.code} - {project.name}
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
                name="surveyType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Survey Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-survey-type">
                          <SelectValue placeholder="Select survey type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="project_completion">Project Completion</SelectItem>
                        <SelectItem value="service_quality">Service Quality</SelectItem>
                        <SelectItem value="overall">Overall Experience</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="rating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rating *</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value?.toString()}
                        className="flex items-center gap-4"
                        data-testid="radio-rating"
                      >
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <div key={rating} className="flex items-center space-x-2">
                            <RadioGroupItem value={rating.toString()} id={`rating-${rating}`} />
                            <Label htmlFor={`rating-${rating}`} className="flex items-center gap-1">
                              <span>{rating}</span>
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="feedback"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Feedback</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={4} placeholder="What did the customer say about our service?" data-testid="textarea-feedback" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="improvements"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Suggested Improvements</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} placeholder="What could we improve?" data-testid="textarea-improvements" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="recommend"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-recommend"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Would recommend our services to others</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsNewSurveyOpen(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createSurveyMutation.isPending}
                  className="bg-amber-600 hover:bg-amber-700"
                  data-testid="button-create-survey"
                >
                  {createSurveyMutation.isPending ? "Recording..." : "Record Survey"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </ResponsiveLayout>
  );
}