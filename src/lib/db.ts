import Dexie, { type Table } from 'dexie';
import type { User, Seat, Assignment, ChangeRequest, Group } from './types';

export class FairDeskDB extends Dexie {
  users!: Table<User, string>;
  seats!: Table<Seat, string>;
  assignments!: Table<Assignment, string>;
  changeRequests!: Table<ChangeRequest, string>;
  groups!: Table<Group, string>;

  constructor() {
    super('fairdeskAppDB'); 
    this.version(2).stores({
      users: 'id',
      seats: 'id',
      assignments: 'id, date, groupId', // Added indexes for querying
      changeRequests: 'id, date, groupId',
      groups: 'id',
    });
  }
}

export const idb = new FairDeskDB();
