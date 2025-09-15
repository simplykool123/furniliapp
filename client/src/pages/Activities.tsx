import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, CheckCircle, AlertCircle, User, FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

interface Activity {
  id: number;
  type: 'project_log' | 'task' | 'crm_activity';
  title: string;
  description: string;
  date: string;
  dueDate?: string;
  status?: string;
  priority?: string;
  projectName?: string;
  projectId?: number;
  createdBy?: string;
  assignedTo?: string;
  logType?: string;
  isImportant?: boolean;
}

const ActivityIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'project_log':
      return <FileText className="h-4 w-4 text-blue-600" />;
    case 'task':
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'crm_activity':
      return <User className="h-4 w-4 text-purple-600" />;
    default:
      return <Clock className="h-4 w-4 text-gray-600" />;
  }
};

const ActivityCard = ({ activity }: { activity: Activity }) => {
  const isOverdue = activity.dueDate && new Date(activity.dueDate) < new Date() && activity.status !== 'completed';

  return (
    <Card className="mb-3 hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-1">
            <ActivityIcon type={activity.type} />
          </div>
          <div className="flex-grow min-w-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-900 truncate">{activity.title}</h3>
              <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
                {activity.priority && (
                  <Badge variant={activity.priority === 'high' ? 'destructive' : 
                                 activity.priority === 'medium' ? 'default' : 'secondary'} 
                         className="text-xs">
                    {activity.priority}
                  </Badge>
                )}
                {activity.status && (
                  <Badge variant={activity.status === 'completed' ? 'default' : 'outline'} 
                         className="text-xs">
                    {activity.status}
                  </Badge>
                )}
                {isOverdue && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertCircle className="w-2 h-2 mr-1" />
                    Overdue
                  </Badge>
                )}
              </div>
            </div>
            
            {activity.description && (
              <p className="text-xs text-gray-600 mb-2 line-clamp-2">{activity.description}</p>
            )}
            
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center space-x-3">
                {activity.projectName && (
                  <span className="truncate">Project: {activity.projectName}</span>
                )}
                {activity.createdBy && (
                  <span className="truncate">By: {activity.createdBy}</span>
                )}
                {activity.assignedTo && (
                  <span className="truncate">Assigned: {activity.assignedTo}</span>
                )}
              </div>
              <div className="flex items-center space-x-2 flex-shrink-0">
                <span>{format(new Date(activity.date), 'MMM dd')}</span>
                {activity.dueDate && (
                  <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                    Due: {format(new Date(activity.dueDate), 'MMM dd')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function Activities() {
  const { data: activities = [], isLoading, error } = useQuery({
    queryKey: ['/api/activities/combined'],
    enabled: true
  });

  const { data: stats } = useQuery({
    queryKey: ['/api/activities/stats'],
    enabled: true
  });

  const filterActivities = (type?: string) => {
    if (!type) return activities;
    return activities.filter((activity: Activity) => activity.type === type);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading activities</h3>
            <p className="text-gray-500">There was a problem loading the activities data</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Activities</h1>
        <p className="text-gray-600">Track all project activities, tasks, and updates</p>
      </div>

      {/* Quick Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-500">Total Activities</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
              <div className="text-sm text-gray-500">Overdue</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.dueToday}</div>
              <div className="text-sm text-gray-500">Due Today</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.thisWeek}</div>
              <div className="text-sm text-gray-500">This Week</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="w-full md:w-auto">
          <TabsTrigger value="all">All Activities ({activities.length})</TabsTrigger>
          <TabsTrigger value="project_log">
            Project Logs ({filterActivities('project_log').length})
          </TabsTrigger>
          <TabsTrigger value="task">
            Tasks ({filterActivities('task').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-3">
          {activities.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No activities found</h3>
                <p className="text-gray-500">Start creating tasks and project logs to see activities here</p>
              </CardContent>
            </Card>
          ) : (
            activities.map((activity: Activity) => (
              <ActivityCard key={`${activity.type}-${activity.id}`} activity={activity} />
            ))
          )}
        </TabsContent>

        <TabsContent value="project_log" className="space-y-3">
          {filterActivities('project_log').length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No project logs found</h3>
                <p className="text-gray-500">Project logs will appear here when created</p>
              </CardContent>
            </Card>
          ) : (
            filterActivities('project_log').map((activity: Activity) => (
              <ActivityCard key={`${activity.type}-${activity.id}`} activity={activity} />
            ))
          )}
        </TabsContent>

        <TabsContent value="task" className="space-y-3">
          {filterActivities('task').length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
                <p className="text-gray-500">Tasks will appear here when created</p>
              </CardContent>
            </Card>
          ) : (
            filterActivities('task').map((activity: Activity) => (
              <ActivityCard key={`${activity.type}-${activity.id}`} activity={activity} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}