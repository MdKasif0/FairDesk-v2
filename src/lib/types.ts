
export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  groupId?: string;
}

export interface Seat {
  id: string;
  name:string;
  groupId: string;
}

export interface Assignment {
  id: string;
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
    creatorId: string;
    members: string[]; // list of user IDs
    inviteCode: string;
    isLocked: boolean;
}
