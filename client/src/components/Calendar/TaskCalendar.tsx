import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar, Clock, User } from "lucide-react";
import { useLocation } from "wouter";

interface Task {
  id: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  assignedUser?: { name: string };
  project?: { code: string; name: string };
}

interface TaskCalendarProps {
  tasks: Task[];
}

export default function TaskCalendar({ tasks }: TaskCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [, setLocation] = useLocation();

  const today = new Date();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const firstDayOfWeek = firstDayOfMonth.getDay();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const navigateMonth = (direction: number) => {
    setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + direction)));
  };

  const getTasksForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return tasks.filter(task => {
      if (!task.dueDate) return false;
      const taskDate = new Date(task.dueDate).toISOString().split('T')[0];
      return taskDate === dateString;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "in_progress": return "bg-blue-100 text-blue-800 border-blue-300";
      case "done": return "bg-green-100 text-green-800 border-green-300";
      default: return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "high": return "🔴";
      case "medium": return "🟡";
      case "low": return "🟢";
      default: return "⚪";
    }
  };

  const renderCalendarDays = () => {
    const days = [];
    const totalDays = lastDayOfMonth.getDate();

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(
        <div key={`empty-${i}`} className="min-h-[120px] border border-gray-200 bg-gray-50"></div>
      );
    }

    // Days of the month
    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const isToday = date.toDateString() === today.toDateString();
      const tasksForDay = getTasksForDate(date);

      days.push(
        <div
          key={day}
          className={`min-h-[120px] border border-gray-200 p-2 ${
            isToday ? 'bg-blue-50 border-blue-300' : 'bg-white'
          } hover:bg-gray-50 transition-colors`}
        >
          <div className={`text-sm font-medium mb-2 ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
            {day}
            {isToday && <span className="ml-1 text-xs text-blue-500">(Today)</span>}
          </div>
          
          <div className="space-y-1">
            {tasksForDay.slice(0, 3).map((task, index) => (
              <div
                key={task.id}
                onClick={() => setLocation(`/tasks/${task.id}`)}
                className="cursor-pointer p-1 text-xs rounded border hover:shadow-sm transition-shadow"
                style={{ fontSize: '10px' }}
              >
                <div className="flex items-center gap-1 mb-1">
                  <span>{getPriorityIcon(task.priority)}</span>
                  <Badge className={`${getStatusColor(task.status)} text-[8px] px-1 py-0`}>
                    {task.status === 'in_progress' ? 'Progress' : task.status}
                  </Badge>
                </div>
                <div className="font-medium truncate" title={task.title}>
                  {task.title}
                </div>
                {task.project && (
                  <div className="text-gray-500 truncate" title={task.project.code}>
                    {task.project.code}
                  </div>
                )}
                <div className="text-gray-500 truncate">
                  👤 {task.assignedUser?.name || 'Unassigned'}
                </div>
              </div>
            ))}
            
            {tasksForDay.length > 3 && (
              <div className="text-xs text-gray-500 text-center">
                +{tasksForDay.length - 3} more
              </div>
            )}
          </div>
        </div>
      );
    }

    return days;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Task Calendar
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigateMonth(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-medium min-w-[150px] text-center">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
            <Button variant="outline" size="sm" onClick={() => navigateMonth(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Calendar Header */}
        <div className="grid grid-cols-7 mb-2">
          {dayNames.map((day) => (
            <div key={day} className="p-2 text-center font-medium text-gray-600 bg-gray-100">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Body */}
        <div className="grid grid-cols-7 border-t border-gray-200">
          {renderCalendarDays()}
        </div>

        {/* Legend */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <span>🔴</span>
                <span>High Priority</span>
              </div>
              <div className="flex items-center gap-1">
                <span>🟡</span>
                <span>Medium Priority</span>
              </div>
              <div className="flex items-center gap-1">
                <span>🟢</span>
                <span>Low Priority</span>
              </div>
            </div>
            <div className="text-gray-500">
              Click on any task to view details
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}