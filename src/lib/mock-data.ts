import type { User, Seat, Assignment, ChangeRequest } from './types';
import { subDays, format } from 'date-fns';

export const users: User[] = [
  { id: 'user-1', name: 'Alex', avatar: 'https://i.pravatar.cc/150?u=alex' },
  { id: 'user-2', name: 'Maria', avatar: 'https://i.pravatar.cc/150?u=maria' },
  { id: 'user-3', name: 'David', avatar: 'https://i.pravatar.cc/150?u=david' },
  { id: 'user-4', name: 'Sophia', avatar: 'https://i.pravatar.cc/150?u=sophia' },
  { id: 'user-5', name: 'Kenji', avatar: 'https://i.pravatar.cc/150?u=kenji' },
  { id: 'user-6', name: 'Fatima', avatar: 'https://i.pravatar.cc/150?u=fatima' },
];

export const seats: Seat[] = [
  { id: 'seat-a1', name: 'A1' },
  { id: 'seat-a2', name: 'A2' },
  { id: 'seat-b1', name: 'B1' },
  { id: 'seat-b2', name: 'B2' },
  { id: 'seat-c1', name: 'C1' },
  { id: 'seat-c2', name: 'C2' },
];

export const initialAssignments: Assignment[] = [
  { date: format(new Date(), 'yyyy-MM-dd'), userId: 'user-1', seatId: 'seat-a1' },
  { date: format(new Date(), 'yyyy-MM-dd'), userId: 'user-2', seatId: 'seat-a2' },
  { date: format(new Date(), 'yyyy-MM-dd'), userId: 'user-3', seatId: 'seat-b1' },
  { date: format(new Date(), 'yyyy-MM-dd'), userId: 'user-4', seatId: 'seat-b2' },
  { date: format(new Date(), 'yyyy-MM-dd'), userId: 'user-5', seatId: 'seat-c1' },
  { date: format(new Date(), 'yyyy-MM-dd'), userId: 'user-6', seatId: 'seat-c2' },

  { date: format(subDays(new Date(), 1), 'yyyy-MM-dd'), userId: 'user-3', seatId: 'seat-a1' },
  { date: format(subDays(new Date(), 1), 'yyyy-MM-dd'), userId: 'user-4', seatId: 'seat-a2' },
  { date: format(subDays(new Date(), 1), 'yyyy-MM-dd'), userId: 'user-5', seatId: 'seat-b1' },
];


export const initialChangeRequests: ChangeRequest[] = [
  {
    id: 'req-1',
    date: format(new Date(), 'yyyy-MM-dd'),
    proposingUserId: 'user-1',
    currentAssignment: { userId: 'user-1', seatId: 'seat-a1' },
    requestedSeatId: 'seat-c2',
    status: 'pending',
    approvals: ['user-3'],
    rejections: [],
  },
];
