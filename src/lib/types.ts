
export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

export interface Seat {
  id: string;
  name:string;
}

export interface Assignment {
  id: string;
  date: string; // YYYY-MM-DD
  userId: string;
  seatId: string;
}

export interface ChangeRequest {
  id: string;
  date: string; // YYYY-MM-DD
  proposingUserId: string;
  userToSwapWithId: string;
  originalSeatId: string;
  requestedSeatId: string;
  status: 'pending' | 'approved' | 'rejected';
  approvals: string[]; // list of user IDs who approved
  rejections: string[]; // list of user IDs who rejected
}

    