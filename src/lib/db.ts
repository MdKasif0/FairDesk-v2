import Dexie, { type Table } from 'dexie';
import type { User, Seat, Assignment, ChangeRequest } from './types';

export class FairDeskDB extends Dexie {
  users!: Table<User>;
  seats!: Table<Seat>;
  assignments!: Table<Assignment>;
  changeRequests!: Table<ChangeRequest>;

  constructor() {
    super('fairdeskDB');
    this.version(1).stores({
      users: '++id, name',
      seats: '++id, name',
      assignments: '++id, date, userId, seatId',
      changeRequests: '++id, date, proposingUserId, status',
    });
  }
}

export const idb = new FairDeskDB();
