
import { idb } from './db';
import type { User, Seat, Assignment, Group } from './types';
import { format, addDays, isSaturday, isSunday, differenceInDays, parseISO } from 'date-fns';

const HARDCODED_USERS: Omit<User, 'id'>[] = [
  { name: 'Aariz', avatar: 'https://placehold.co/200x200.png', "data-ai-hint": "man smiling" },
  { name: 'Nabil', avatar: 'https://placehold.co/200x200.png', "data-ai-hint": "man portrait" },
  { name: 'Yatharth', avatar: 'https://placehold.co/200x200.png', "data-ai-hint": "man glasses" },
];

const HARDCODED_SEATS: Omit<Seat, 'id' | 'groupId'>[] = [
    { name: "Desk 1" },
    { name: "Desk 2" },
    { name: "Desk 3" },
];

const DEFAULT_GROUP_ID = 'default-group';

// Initializes the database with default users, seats, and a group if it's empty.
export async function initializeData() {
    const userCount = await idb.users.count();
    if (userCount > 0) {
        // Data already initialized
        return;
    }

    console.log("Initializing database with default data...");

    const group: Group = {
        id: DEFAULT_GROUP_ID,
        name: 'The Trio',
        memberIds: [],
        seatIds: [],
    };

    const users: User[] = [];
    for (const userData of HARDCODED_USERS) {
        const user: User = { ...userData, id: `user-${userData.name.toLowerCase()}` };
        users.push(user);
        group.memberIds.push(user.id);
    }

    const seats: Seat[] = [];
    for (const seatData of HARDCODED_SEATS) {
        const seat: Seat = { ...seatData, id: `seat-${seatData.name.replace(' ', '-').toLowerCase()}`, groupId: group.id };
        seats.push(seat);
        group.seatIds.push(seat.id);
    }
    
    await idb.transaction('rw', idb.users, idb.seats, idb.groups, async () => {
        await idb.users.bulkAdd(users);
        await idb.seats.bulkAdd(seats);
        await idb.groups.add(group);
    });

    console.log("Database initialized.");
}

// Gets the seat assignments for today, creating them if they don't exist.
export async function getTodaysAssignments(): Promise<Assignment[]> {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    
    let assignments = await idb.assignments.where({ date: todayStr }).toArray();
    
    if (assignments.length > 0) {
        return assignments;
    }

    // No assignments for today, so we need to create them based on the last working day.
    const lastAssignment = await idb.assignments.orderBy('date').last();
    
    if (!lastAssignment) {
        // This is the first time assignments are being created.
        return createInitialAssignments(todayStr);
    }
    
    return createNextAssignments(lastAssignment.date, todayStr);
}

// Creates the very first set of assignments.
async function createInitialAssignments(dateStr: string): Promise<Assignment[]> {
    const group = await idb.groups.get(DEFAULT_GROUP_ID);
    if (!group) throw new Error("Default group not found");

    const newAssignments: Assignment[] = group.memberIds.map((userId, index) => ({
        id: `${dateStr}-${userId}`,
        date: dateStr,
        userId: userId,
        seatId: group.seatIds[index],
        groupId: group.id,
    }));

    await idb.assignments.bulkAdd(newAssignments);
    return newAssignments;
}

// Creates the next set of assignments based on a previous date.
async function createNextAssignments(lastDateStr: string, newDateStr: string): Promise<Assignment[]> {
    const group = await idb.groups.get(DEFAULT_GROUP_ID);
    if (!group) throw new Error("Default group not found");

    const lastAssignments = await idb.assignments.where({ date: lastDateStr }).toArray();
    
    const workingDaysPassed = countWorkingDays(parseISO(lastDateStr), parseISO(newDateStr));
    
    // Rotate seat IDs based on the last assignment's user order
    const userIds = lastAssignments.map(a => a.userId);
    
    const newAssignments: Assignment[] = userIds.map((userId, index) => {
         // Find the seat this user had last time
         const lastUserAssignment = lastAssignments.find(a => a.userId === userId);
         // Find the index of that seat in the master list
         const lastSeatIndex = group.seatIds.findIndex(sid => sid === lastUserAssignment?.seatId);
         
         if (lastSeatIndex === -1) {
             // Fallback for safety, though this shouldn't happen in normal operation
             return {
                id: `${newDateStr}-${userId}`,
                date: newDateStr,
                userId: userId,
                seatId: group.seatIds[index], 
                groupId: group.id,
             }
         }
         // Calculate the new seat index
         const newSeatIndex = (lastSeatIndex + workingDaysPassed) % group.seatIds.length;

        return {
            id: `${newDateStr}-${userId}`,
            date: newDateStr,
            userId: userId,
            seatId: group.seatIds[newSeatIndex],
            groupId: group.id,
        }
    });

    await idb.assignments.bulkAdd(newAssignments);
    return newAssignments;
}


function countWorkingDays(startDate: Date, endDate: Date): number {
    let count = 0;
    let currentDate = startDate;

    // We start from the day *after* the last assignment date
    currentDate = addDays(currentDate, 1);

    while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // 0 = Sunday, 6 = Saturday
            count++;
        }
        currentDate = addDays(currentDate, 1);
    }
    return count;
}
