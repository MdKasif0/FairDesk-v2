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
      users: 'id',
      seats: 'id, groupId',
      assignments: 'id, date',
      changeRequests: 'id, date',
      groups: 'id',
    });
  }
}

export const idb = new FairDeskDB();
