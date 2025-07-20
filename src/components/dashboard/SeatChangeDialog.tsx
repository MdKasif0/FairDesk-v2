"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Assignment, Seat, User } from '@/lib/types';
import { format } from 'date-fns';

interface SeatChangeDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date | null;
  assignment: Assignment | null;
  user: User | null;
  seats: Seat[];
  currentAssignmentsForDay: Assignment[];
  onSubmit: (requestedSeatId: string) => void;
}

export default function SeatChangeDialog({
  isOpen,
  onOpenChange,
  date,
  assignment,
  user,
  seats,
  currentAssignmentsForDay,
  onSubmit,
}: SeatChangeDialogProps) {
  const [requestedSeatId, setRequestedSeatId] = useState('');

  if (!isOpen || !date || !assignment || !user) {
    return null;
  }
  
  const currentSeat = seats.find(s => s.id === assignment.seatId);
  const assignedSeatIds = new Set(currentAssignmentsForDay.map(a => a.id !== assignment.id ? a.seatId : ''));
  const availableSeats = seats.filter(s => !assignedSeatIds.has(s.id));
  
  const handleSubmit = () => {
    if (requestedSeatId) {
      onSubmit(requestedSeatId);
      onOpenChange(false);
      setRequestedSeatId('');
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Seat Change</DialogTitle>
          <DialogDescription>
            Propose a new seat for {format(date, 'MMMM do, yyyy')}. This will require approval.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label>Your Current Seat</Label>
                    <p className="font-semibold text-lg">{currentSeat?.name}</p>
                </div>
            </div>
          <div className="space-y-2">
            <Label htmlFor="seat-select">New Seat</Label>
            <Select onValueChange={setRequestedSeatId} value={requestedSeatId}>
              <SelectTrigger id="seat-select">
                <SelectValue placeholder="Select a new seat" />
              </SelectTrigger>
              <SelectContent>
                {availableSeats.map((seat) => (
                  <SelectItem key={seat.id} value={seat.id}>
                    {seat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!requestedSeatId}>
            Submit Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
