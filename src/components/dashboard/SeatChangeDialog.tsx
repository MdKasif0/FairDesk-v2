
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
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { ArrowRight } from 'lucide-react';

interface SeatChangeDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date | null;
  assignment: Assignment | null;
  user: User | null;
  seats: Seat[];
  users: User[];
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
  users,
  currentAssignmentsForDay,
  onSubmit,
}: SeatChangeDialogProps) {
  const [requestedSeatId, setRequestedSeatId] = useState('');

  if (!isOpen || !date || !assignment || !user) {
    return null;
  }
  
  const currentSeat = seats.find(s => s.id === assignment.seatId);
  // Exclude the current user's seat from the list of available seats to swap with
  const swappableAssignments = currentAssignmentsForDay.filter(a => a.userId !== user.id);
  const userToSwapWith = users.find(u => u.id === swappableAssignments.find(a => a.seatId === requestedSeatId)?.userId);
  
  const handleSubmit = () => {
    if (requestedSeatId) {
      onSubmit(requestedSeatId);
      onOpenChange(false);
      setRequestedSeatId('');
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setRequestedSeatId(''); // Reset on close
    }
    onOpenChange(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request a Seat Swap</DialogTitle>
          <DialogDescription>
            Propose a seat swap for {format(date, 'MMMM do, yyyy')}. This will require approval from your teammates.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
            <div className="grid grid-cols-3 items-center gap-2 text-center">
                <div className="flex flex-col items-center gap-1">
                    <Avatar>
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback>{user.name[0]}</AvatarFallback>
                    </Avatar>
                    <Label>Your Current Seat</Label>
                    <p className="font-semibold text-lg">{currentSeat?.name}</p>
                </div>
                 <ArrowRight className="h-6 w-6 text-muted-foreground mx-auto" />
                <div className="flex flex-col items-center gap-1">
                     <Avatar>
                        {userToSwapWith ? (
                            <>
                                <AvatarImage src={userToSwapWith.avatar} />
                                <AvatarFallback>{userToSwapWith.name[0]}</AvatarFallback>
                            </>
                        ) : (
                             <AvatarFallback>?</AvatarFallback>
                        )}
                    </Avatar>
                    <Label>Swap with</Label>
                    <p className="font-semibold text-lg h-7">{userToSwapWith?.name || '...'}</p>
                </div>
            </div>
          <div className="space-y-2">
            <Label htmlFor="seat-select">Choose a seat to propose a swap:</Label>
            <Select onValueChange={setRequestedSeatId} value={requestedSeatId}>
              <SelectTrigger id="seat-select">
                <SelectValue placeholder="Select a teammate's seat" />
              </SelectTrigger>
              <SelectContent>
                {swappableAssignments.map((a) => {
                  const seat = seats.find(s => s.id === a.seatId);
                  const userOnSeat = users.find(u => u.id === a.userId);
                  if (!seat || !userOnSeat) return null;
                  return (
                    <SelectItem key={seat.id} value={seat.id}>
                      Seat: {seat.name} (Occupied by {userOnSeat.name})
                    </SelectItem>
                  )
                })}
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

    