export interface User {
  id: string;
  name: string;
  avatar: string;
}

export interface Seat {
  id: string;
  name: string;
}

export interface Assignment {
  date: string; // YYYY-MM-DD
  userId: string;
  seatId: string;
}

export interface ChangeRequest {
  id: string;
  date: string; // YYYY-MM-DD
  proposingUserId: string;
  currentAssignment: { userId: string; seatId: string };
  requestedSeatId: string;
  status: 'pending' | 'approved' | 'rejected';
  approvals: string[]; // list of user IDs who approved
  rejections: string[]; // list of user IDs who rejected
}
