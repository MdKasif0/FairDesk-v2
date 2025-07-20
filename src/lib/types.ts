
export interface User {
  id: string;
  name: string;
  avatar: string;
  "data-ai-hint"?: string;
}

export interface Seat {
  id: string;
  name:string;
  groupId: string;
}

export interface Assignment {
  id: string; // Combination of date and userId for uniqueness
  date: string; // YYYY-MM-DD
  userId: string;
  seatId: string;
  groupId: string;
  isLocked?: boolean;
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
  groupId: string;
}

export interface Group {
    id: string;
    name: string;
    memberIds: string[]; // list of user IDs
    seatIds: string[]; // list of seat IDs
}
