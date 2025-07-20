
"use client";

import { useState } from 'react';
import { suggestSeatArrangements, SuggestSeatArrangementsOutput } from '@/ai/flows/suggest-seat-arrangements';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, Loader2, User, ArrowRight, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { User as UserType, Seat, Assignment } from '@/lib/types';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { getDocs, collection, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';

interface SmartScheduleProps {
  onScheduleGenerated: (newAssignments: Record<string, string>) => void;
  users: UserType[];
  seats: Seat[];
  assignments: Assignment[];
}

export default function SmartSchedule({ onScheduleGenerated, users, seats, assignments }: SmartScheduleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<SuggestSeatArrangementsOutput | null>(null);
  const { toast } = useToast();
  const [lockedSeats, setLockedSeats] = useState<Record<string, string>>({});

  const handleLockToggle = (userId: string, currentSeatId: string) => {
    setLockedSeats(prev => {
      const newLocked = { ...prev };
      if (newLocked[userId]) {
        delete newLocked[userId];
      } else {
        newLocked[userId] = currentSeatId;
      }
      return newLocked;
    });
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    setSuggestion(null);
    try {
      const employeeNames = users.map(u => u.name);
      const seatNames = seats.map(s => s.name);
      
      const approvedRequestsSnapshot = await getDocs(query(collection(db, "changeRequests"), where("status", "==", "approved")));
      const approvedRequests = approvedRequestsSnapshot.docs.map(doc => doc.data());

      const pastOverrideRequests: Record<string, string[]> = {};
      for (const req of approvedRequests) {
           const proposer = users.find(u => u.id === req.proposingUserId);
           const requestedSeat = seats.find(s => s.id === req.requestedSeatId);
           if (proposer && requestedSeat) {
               if (!pastOverrideRequests[proposer.name]) {
                   pastOverrideRequests[proposer.name] = [];
               }
               pastOverrideRequests[proposer.name].push(requestedSeat.name);
           }
      }

      const lockedSeatsForApi: Record<string, string> = {};
      Object.entries(lockedSeats).forEach(([userId, seatId]) => {
        const user = users.find(u => u.id === userId);
        const seat = seats.find(s => s.id === seatId);
        if (user && seat) {
          lockedSeatsForApi[user.name] = seat.name;
        }
      });

      const result = await suggestSeatArrangements({
        employees: employeeNames,
        seats: seatNames,
        pastOverrideRequests: pastOverrideRequests,
        fairnessMetric: "equal time in preferred seats, considering past approved requests as preferences and respecting locked seats",
        lockedSeats: lockedSeatsForApi,
      });
      setSuggestion(result);
    } catch (error) {
      console.error("Failed to generate schedule:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not generate a new schedule. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (suggestion) {
      onScheduleGenerated(suggestion);
      setIsOpen(false);
      setSuggestion(null);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setSuggestion(null);
      setLockedSeats({});
    }
  }
  
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todaysAssignments = assignments.filter(a => a.date === todayStr);

  return (
    <>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>AI Scheduling</CardTitle>
          <CardDescription>
            Let AI suggest a fair seating arrangement for tomorrow.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" onClick={() => setIsOpen(true)}>
            <Bot className="mr-2 h-4 w-4" />
            Generate Smart Schedule
          </Button>
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Smart Schedule</DialogTitle>
            <DialogDescription>
              This will generate a new seat arrangement for the next working day. You can lock seats to prevent certain users from being moved.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <h4 className="text-sm font-medium mb-2">Seat Locking</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
              {todaysAssignments.map(assignment => {
                 const user = users.find(u => u.id === assignment.userId);
                 const seat = seats.find(s => s.id === assignment.seatId);
                 if (!user || !seat) return null;
                 
                 return (
                    <div key={user.id} className="flex items-center justify-between p-2 rounded-md bg-secondary">
                        <Label htmlFor={`lock-${user.id}`} className="flex items-center gap-2">
                           <Lock className="h-4 w-4" />
                           <span>{user.name} at {seat.name}</span>
                        </Label>
                        <Switch 
                            id={`lock-${user.id}`}
                            checked={!!lockedSeats[user.id]}
                            onCheckedChange={() => handleLockToggle(user.id, seat.id)}
                        />
                    </div>
                 );
              })}
            </div>
          </div>
          
          {!suggestion && (
             <div className="flex justify-center items-center h-24">
                <Button onClick={handleGenerate} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Generating...
                    </>
                  ) : "Generate Suggestion" }
                </Button>
             </div>
          )}

          {suggestion && (
            <div className="my-4 space-y-2">
                <h3 className="font-semibold text-center">Suggested Arrangement for Tomorrow</h3>
                <div className="grid grid-cols-2 gap-2 p-2 rounded-md border max-h-48 overflow-y-auto">
                {Object.entries(suggestion).map(([employee, seat]) => (
                    <div key={employee} className="flex items-center justify-center space-x-2 text-sm p-1 bg-secondary rounded">
                        <User className="h-4 w-4"/>
                        <span>{employee}</span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground"/>
                        <span className="font-bold">{seat}</span>
                    </div>
                ))}
                </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => handleOpenChange(false)}>Cancel</Button>
            {suggestion && <Button variant="secondary" onClick={handleGenerate} disabled={isLoading}>Regenerate</Button>}
            <Button onClick={handleApply} disabled={!suggestion || isLoading}>
              Apply Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
