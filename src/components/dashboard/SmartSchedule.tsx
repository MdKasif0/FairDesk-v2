
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
import { Bot, Loader2, User, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { User as UserType, Seat } from '@/lib/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { idb } from '@/lib/db';


interface SmartScheduleProps {
  onScheduleGenerated: (newAssignments: Record<string, string>) => void;
  users: UserType[];
  seats: Seat[];
}

export default function SmartSchedule({ onScheduleGenerated, users, seats }: SmartScheduleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<SuggestSeatArrangementsOutput | null>(null);
  const { toast } = useToast();

  const changeRequests = useLiveQuery(() => idb.changeRequests.toArray(), []);

  const handleGenerate = async () => {
    setIsLoading(true);
    setSuggestion(null);
    try {
      
      const employeeNames = users.map(u => u.name);
      const seatNames = seats.map(s => s.name);
      
      const pastOverrideRequests: Record<string, string[]> = {};
      if (changeRequests) {
        for (const req of changeRequests) {
           if (req.status === 'approved') {
               const proposer = users.find(u => u.id === req.proposingUserId);
               const requestedSeat = seats.find(s => s.id === req.requestedSeatId);
               if (proposer && requestedSeat) {
                   if (!pastOverrideRequests[proposer.name]) {
                       pastOverrideRequests[proposer.name] = [];
                   }
                   pastOverrideRequests[proposer.name].push(requestedSeat.name);
               }
           }
        }
      }

      const result = await suggestSeatArrangements({
        employees: employeeNames,
        seats: seatNames,
        pastOverrideRequests: pastOverrideRequests,
        fairnessMetric: "equal time in preferred seats, considering past approved requests as preferences",
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
    }
  }

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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Smart Schedule</DialogTitle>
            <DialogDescription>
              This will generate a new seat arrangement for the next working day based on fairness and past requests.
            </DialogDescription>
          </DialogHeader>
          
          {!suggestion && !isLoading && (
             <div className="flex justify-center items-center h-40">
                <Button onClick={handleGenerate}>Generate Suggestion</Button>
             </div>
          )}

          {isLoading && (
            <div className="flex flex-col items-center justify-center h-40 space-y-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">AI is thinking...</p>
            </div>
          )}

          {suggestion && (
            <div className="my-4 space-y-2">
                <h3 className="font-semibold text-center">Suggested Arrangement for Tomorrow</h3>
                <div className="grid grid-cols-2 gap-2 p-2 rounded-md border">
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
            {suggestion && <Button variant="secondary" onClick={handleGenerate}>Regenerate</Button>}
            <Button onClick={handleApply} disabled={!suggestion || isLoading}>
              Apply Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

    