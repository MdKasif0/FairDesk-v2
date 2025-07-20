"use client";

import { useState, useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  add,
  isSameMonth,
  isSameDay,
  isBefore,
  startOfToday,
} from 'date-fns';
import { ChevronLeft, ChevronRight, User, MapPin, ArrowRight, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { Assignment, ChangeRequest, Seat, User as UserType } from '@/lib/types';
import { cn } from '@/lib/utils';

interface CalendarViewProps {
  assignments: Assignment[];
  users: UserType[];
  seats: Seat[];
  changeRequests: ChangeRequest[];
  onSeatChangeRequest: (date: Date, assignment: Assignment) => void;
  currentUser: UserType | null;
}

export default function CalendarView({
  assignments,
  users,
  seats,
  changeRequests,
  onSeatChangeRequest,
  currentUser,
}: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const firstDayOfMonth = startOfMonth(currentMonth);
  const lastDayOfMonth = endOfMonth(currentMonth);

  const daysInMonth = eachDayOfInterval({
    start: firstDayOfMonth,
    end: lastDayOfMonth,
  });

  const startingDayIndex = getDay(firstDayOfMonth);

  const prevMonth = () => setCurrentMonth(add(currentMonth, { months: -1 }));
  const nextMonth = () => setCurrentMonth(add(currentMonth, { months: 1 }));

  const getUser = (userId: string) => users.find((u) => u.id === userId);
  const getSeat = (seatId: string) => seats.find((s) => s.id === seatId);

  const daysWithRequests = useMemo(() => {
    return new Set(changeRequests.filter(r => r.status === 'pending').map(r => r.date));
  }, [changeRequests]);

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <Card className="shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-bold text-2xl text-primary">
          {format(currentMonth, 'MMMM yyyy')}
        </CardTitle>
        <div className="flex space-x-2">
          <Button variant="outline" size="icon" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="grid grid-cols-7 gap-2">
            {weekdays.map((day) => (
              <div key={day} className="text-center font-medium text-muted-foreground">
                {day}
              </div>
            ))}
            {Array.from({ length: startingDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} className="border rounded-lg bg-muted/50" />
            ))}
            {daysInMonth.map((day) => {
              const dayAssignments = assignments.filter((a) => isSameDay(new Date(a.date), day));
              const dayStr = format(day, 'yyyy-MM-dd');
              const hasRequest = daysWithRequests.has(dayStr);
              const isToday = isSameDay(day, new Date());
              const isPast = isBefore(day, startOfToday());

              return (
                <div
                  key={day.toString()}
                  className={cn(
                    'border rounded-lg p-2 min-h-[120px] flex flex-col transition-all duration-300',
                    isToday ? 'border-primary border-2' : '',
                    hasRequest ? 'border-accent-foreground border-2 shadow-lg' : '',
                    isPast ? 'bg-muted/60' : 'bg-card'
                  )}
                >
                  <div className="flex justify-between items-center">
                    <time dateTime={format(day, 'yyyy-MM-dd')} className="font-semibold">
                      {format(day, 'd')}
                    </time>
                    {hasRequest && (
                      <Tooltip>
                        <TooltipTrigger>
                           <Star className="h-5 w-5 text-accent-foreground fill-accent" />
                        </TooltipTrigger>
                        <TooltipContent>
                           <p>Override requested</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                  <div className="flex-grow mt-1 space-y-1 overflow-y-auto">
                    {dayAssignments.map((assignment) => {
                      const user = getUser(assignment.userId);
                      const seat = getSeat(assignment.seatId);
                      const canRequestChange = !isPast && user?.id === currentUser?.id;

                      if (!user || !seat) return null;

                      return (
                        <Tooltip key={assignment.userId + assignment.seatId}>
                           <TooltipTrigger asChild>
                              <div
                                onClick={() => canRequestChange && onSeatChangeRequest(day, assignment)}
                                className={cn(
                                   "text-xs p-1 rounded-md flex items-center space-x-1.5",
                                   canRequestChange ? "cursor-pointer hover:bg-secondary" : "cursor-default"
                                 )}
                              >
                                <Avatar className="h-5 w-5">
                                    <AvatarImage src={user.avatar} alt={user.name} />
                                    <AvatarFallback>{user.name[0]}</AvatarFallback>
                                </Avatar>
                                <span className="font-medium truncate">{user.name}</span>
                                <span className="text-muted-foreground">@</span>
                                <span className="font-semibold">{seat.name}</span>
                              </div>
                           </TooltipTrigger>
                           <TooltipContent>
                             <p>{user.name} is at seat {seat.name}</p>
                             {canRequestChange && <p className="text-xs text-muted-foreground">Click to request a change</p>}
                           </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
