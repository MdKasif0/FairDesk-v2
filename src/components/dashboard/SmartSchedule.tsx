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

interface SmartScheduleProps {
  onScheduleGenerated: (newAssignments: Record<string, string>) => void;
}

export default function SmartSchedule({ onScheduleGenerated }: SmartScheduleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<SuggestSeatArrangementsOutput | null>(null);
  const { toast } = useToast();

  const handleGenerate = async () => {
    setIsLoading(true);
    setSuggestion(null);
    try {
      // In a real app, you'd fetch this data from your backend.
      const employees = ["Alex", "Maria", "David", "Sophia", "Kenji", "Fatima"];
      const seats = ["A1", "A2", "B1", "B2", "C1", "C2"];
      const pastOverrideRequests = { "Alex": ["C2"] };

      const result = await suggestSeatArrangements({
        employees,
        seats,
        pastOverrideRequests,
        fairnessMetric: "equal time in preferred seats",
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
      toast({
        title: "Success",
        description: "New smart schedule has been applied for tomorrow.",
      });
    }
  };

  return (
    <>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>AI Scheduling</CardTitle>
          <CardDescription>
            Let AI suggest a fair seating arrangement.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" onClick={() => setIsOpen(true)}>
            <Bot className="mr-2 h-4 w-4" />
            Generate Smart Schedule
          </Button>
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
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
                <h3 className="font-semibold text-center">Suggested Arrangement</h3>
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
            <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button onClick={handleApply} disabled={!suggestion || isLoading}>
              Apply Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
