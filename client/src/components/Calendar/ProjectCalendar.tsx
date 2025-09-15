import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, ChevronLeft, ChevronRight, Clock, MapPin, User, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: 'project' | 'task' | 'milestone' | 'meeting';
  projectId?: number;
  projectName?: string;
  status: string;
  assignedTo?: string;
  description?: string;
  location?: string;
}

interface ProjectCalendarProps {
  projectId?: number;
  showAllProjects?: boolean;
}

export default function ProjectCalendar({ projectId, showAllProjects = false }: ProjectCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showEventDialog, setShowEventDialog] = useState(false);

  // Get calendar data
  const { data: events = [] } = useQuery<CalendarEvent[]>({
    queryKey: ["/api/calendar/events", projectId, showAllProjects],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (projectId) params.append("projectId", projectId.toString());
      if (showAllProjects) params.append("allProjects", "true");
      return [];
    }
  });

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => 
      event.date.toDateString() === date.toDateString()
    );
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'project': return 'bg-blue-500';
      case 'task': return 'bg-green-500';
      case 'milestone': return 'bg-purple-500';
      case 'meeting': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getEventTypeBadge = (type: string) => {
    switch (type) {
      case 'project': return 'default';
      case 'task': return 'secondary';
      case 'milestone': return 'outline';
      case 'meeting': return 'destructive';
      default: return 'default';
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDayOfMonth = getFirstDayOfMonth(currentDate);
  const today = new Date();

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center space-x-2">
          <Calendar className="h-5 w-5" />
          <span>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</span>
        </h3>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigateMonth('prev')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setCurrentDate(new Date())}
          >
            Today
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigateMonth('next')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="ml-2">
                <Plus className="h-4 w-4 mr-1" />
                Add Event
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Calendar Event</DialogTitle>
              </DialogHeader>
              <div className="text-sm text-gray-600">
                Calendar event creation feature coming soon...
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-4">
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map(day => (
              <div key={day} className="p-2 text-center text-xs font-medium text-gray-600 bg-gray-50 rounded">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for days before month starts */}
            {Array.from({ length: firstDayOfMonth }, (_, i) => (
              <div key={`empty-${i}`} className="p-2 h-24"></div>
            ))}

            {/* Days of the month */}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i + 1);
              const dayEvents = getEventsForDate(date);
              const isToday = date.toDateString() === today.toDateString();
              const isSelected = selectedDate?.toDateString() === date.toDateString();

              return (
                <div 
                  key={i + 1}
                  className={`
                    p-2 h-24 border rounded cursor-pointer transition-colors
                    ${isToday ? 'bg-blue-50 border-blue-200' : 'border-gray-200'}
                    ${isSelected ? 'bg-furnili-brown bg-opacity-10 border-furnili-brown' : ''}
                    hover:bg-gray-50
                  `}
                  onClick={() => setSelectedDate(date)}
                >
                  <div className={`text-sm font-medium mb-1 ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                    {i + 1}
                  </div>
                  
                  {/* Event indicators */}
                  <div className="space-y-1">
                    {dayEvents.slice(0, 2).map((event, idx) => (
                      <div 
                        key={`${event.id}-${idx}`}
                        className={`text-xs p-1 rounded truncate text-white ${getEventTypeColor(event.type)}`}
                        title={event.title}
                      >
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-xs text-gray-500 text-center">
                        +{dayEvents.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected Date Events */}
      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Events for {selectedDate.toLocaleDateString('en-US', { 
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {getEventsForDate(selectedDate).length === 0 ? (
              <p className="text-gray-600 text-sm">No events scheduled for this date.</p>
            ) : (
              <div className="space-y-3">
                {getEventsForDate(selectedDate).map((event, idx) => (
                  <div key={`${event.id}-detail-${idx}`} className="border rounded p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium">{event.title}</h4>
                          <Badge variant={getEventTypeBadge(event.type)}>
                            {event.type}
                          </Badge>
                        </div>
                        
                        {event.description && (
                          <p className="text-sm text-gray-600 mb-2">{event.description}</p>
                        )}
                        
                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                          {event.projectName && (
                            <span className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3" />
                              <span>{event.projectName}</span>
                            </span>
                          )}
                          {event.assignedTo && (
                            <span className="flex items-center space-x-1">
                              <User className="h-3 w-3" />
                              <span>{event.assignedTo}</span>
                            </span>
                          )}
                          {event.location && (
                            <span className="flex items-center space-x-1">
                              <MapPin className="h-3 w-3" />
                              <span>{event.location}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Event Types</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span>Project Milestones</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>Task Deadlines</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-purple-500 rounded"></div>
              <span>Key Milestones</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-orange-500 rounded"></div>
              <span>Meetings</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}