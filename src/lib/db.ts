import Dexie, { type Table } from 'dexie';
import type { User, Seat, Assignment, ChangeRequest, Group } from './types';

export class FairDeskDB extends Dexie {
  users!: Table<User, string>;
  seats!: Table<Seat, string>;
  assignments!: Table<Assignment, string>;
  changeRequests!: Table<ChangeRequest, string>;
  groups!: Table<Group, string>;

  constructor() {
    super('fairdeskDB');
    this.version(1).stores({
      users: 'id, name',
      seats: 'id, name, groupId',
      assignments: 'id, date, userId, seatId, groupId',
      changeRequests: 'id, date, proposingUserId, status, groupId',
      groups: 'id, name',
    });
  }
}

export const idb = new FairDeskDB();
