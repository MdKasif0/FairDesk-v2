
import { idb } from './db';
import type { User, Seat, Assignment, Group } from './types';
import { format, addDays, isSaturday, isSunday, parseISO, startOfDay, eachDayOfInterval, endOfMonth, startOfMonth } from 'date-fns';

const HARDCODED_USERS: Omit<User, 'id'>[] = [
  { name: 'Aariz', avatar: '/aariz.png', "data-ai-hint": "man smiling" },
  { name: 'Nabil', avatar: '/nabil.png', "data-ai-hint": "man portrait" },
  { name: 'Yatharth', avatar: '/yatharth.png', "data-ai-hint": "man glasses" },
];

const HARDCODED_SEATS: Omit<Seat, 'id' | 'groupId'>[] = [
    { name: "Desk 1" },
    { name: "Desk 2" },
    { name: "Desk 3" },
];

const DEFAULT_GROUP_ID = 'default-group';

export async function initializeData() {
    const userCount = await idb.users.count();
    if (userCount > 0) {
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

export async function getTodaysAssignments(): Promise<Assignment[]> {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    
    // Check if today is a weekend and handle it
    const today = startOfDay(new Date());
    if (isSaturday(today) || isSunday(today)) {
        // On weekends, try to show the last working day's assignments if they exist
        const lastAssignment = await idb.assignments.orderBy('date').last();
        if (lastAssignment) {
            return idb.assignments.where({ date: lastAssignment.date }).toArray();
        }
        // If no assignments exist at all, return empty
        return [];
    }
    
    let assignments = await idb.assignments.where({ date: todayStr }).toArray();
    
    if (assignments.length > 0) {
        return assignments;
    }

    const lastAssignment = await idb.assignments.orderBy('date').last();
    
    if (!lastAssignment) {
        return createInitialAssignments(todayStr);
    }
    
    return createNextAssignments(lastAssignment.date, todayStr);
}


async function createInitialAssignments(dateStr: string): Promise<Assignment[]> {
    const group = await idb.groups.get(DEFAULT_GROUP_ID);
    if (!group) throw new Error("Default group not found");

    const newAssignments: Assignment[] = group.memberIds.map((userId, index) => ({
        id: `${dateStr}-${userId}`,
        date: dateStr,
        userId: userId,
        seatId: group.seatIds[index],
        groupId: group.id,
        isLocked: false,
    }));

    await idb.assignments.bulkAdd(newAssignments);
    return newAssignments;
}

async function createNextAssignments(lastDateStr: string, newDateStr: string): Promise<Assignment[]> {
    const group = await idb.groups.get(DEFAULT_GROUP_ID);
    if (!group) throw new Error("Default group not found");

    const lastAssignments = await idb.assignments.where({ date: lastDateStr }).toArray();
    
    const workingDaysPassed = countWorkingDays(parseISO(lastDateStr), parseISO(newDateStr));

    // Identify locked users and seats for the new day (though there shouldn't be any yet)
    const lockedUsers = new Map<string, string>(); // userId -> seatId

    const remainingUserIds = group.memberIds.filter(uid => !lockedUsers.has(uid));
    const remainingSeatIds = group.seatIds.filter(sid => ![...lockedUsers.values()].includes(sid));

    const newAssignments: Assignment[] = [];

    // Assign locked users first
    lockedUsers.forEach((seatId, userId) => {
        newAssignments.push({
            id: `${newDateStr}-${userId}`,
            date: newDateStr,
            userId,
            seatId,
            groupId: group.id,
            isLocked: true,
        });
    });

    const lastUserToSeatMap = new Map(lastAssignments.map(a => [a.userId, a.seatId]));

    remainingUserIds.forEach((userId) => {
        const lastSeatId = lastUserToSeatMap.get(userId);
        if (!lastSeatId) {
             // Fallback for new user added
             const availableSeat = remainingSeatIds.shift();
             if (availableSeat) {
                 newAssignments.push({
                     id: `${newDateStr}-${userId}`,
                     date: newDateStr,
                     userId: userId,
                     seatId: availableSeat,
                     groupId: group.id,
                     isLocked: false,
                 });
             }
             return;
        }

        const lastSeatIndex = remainingSeatIds.indexOf(lastSeatId);
        if (lastSeatIndex === -1) {
             // Fallback for safety (e.g., seat was removed)
             const availableSeat = remainingSeatIds.shift();
             if (availableSeat) {
                  newAssignments.push({
                     id: `${newDateStr}-${userId}`,
                     date: newDateStr,
                     userId: userId,
                     seatId: availableSeat,
                     groupId: group.id,
                     isLocked: false,
                  });
             }
             return;
        }

        const newSeatIndex = (lastSeatIndex + workingDaysPassed) % remainingSeatIds.length;
        const newSeatId = remainingSeatIds[newSeatIndex];
        
        newAssignments.push({
            id: `${newDateStr}-${userId}`,
            date: newDateStr,
            userId,
            seatId: newSeatId,
            groupId: group.id,
            isLocked: false,
        });
    });

    await idb.assignments.bulkAdd(newAssignments);
    // Re-fetch to ensure order is correct from DB
    return idb.assignments.where({ date: newDateStr }).toArray();
}


function countWorkingDays(startDate: Date, endDate: Date): number {
    let count = 0;
    let currentDate = startDate;

    while (currentDate < endDate) {
        currentDate = addDays(currentDate, 1);
        const dayOfWeek = currentDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { 
            count++;
        }
    }
    return count;
}

export async function getAssignmentsForMonth(monthDate: Date): Promise<Assignment[]> {
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);

    const dateRange = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const dateStrings = dateRange.map(d => format(d, 'yyyy-MM-dd'));

    let assignments = await idb.assignments.where('date').inAnyOf(dateStrings).toArray();
    const existingDates = new Set(assignments.map(a => a.date));

    const missingDates = dateStrings.filter(d => !existingDates.has(d));

    if (missingDates.length > 0) {
        const lastAssignmentBeforeMonth = await idb.assignments
            .where('date').below(format(monthStart, 'yyyy-MM-dd'))
            .last();
        
        let lastKnownDateStr = lastAssignmentBeforeMonth?.date;
        
        if (!lastKnownDateStr) {
            const firstDate = missingDates.find(d => ![0, 6].includes(parseISO(d).getDay()));
            if (firstDate) {
              const initialAssignments = await createInitialAssignments(firstDate);
              assignments.push(...initialAssignments);
              existingDates.add(firstDate);
              lastKnownDateStr = firstDate;
            }
        }

        if (!lastKnownDateStr) {
          return assignments;
        }

        for (const dateStr of missingDates) {
            if (existingDates.has(dateStr)) continue;

            const dayOfWeek = parseISO(dateStr).getDay();
            if (dayOfWeek === 0 || dayOfWeek === 6) { 
                continue;
            }

            const newAssignments = await createNextAssignments(lastKnownDateStr, dateStr);
            assignments.push(...newAssignments);
            existingDates.add(dateStr);
            lastKnownDateStr = dateStr;
        }
    }
    
    return assignments.sort((a, b) => a.date.localeCompare(b.date));
}

export async function randomizeTodaysAssignments(): Promise<Assignment[]> {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const group = await idb.groups.get(DEFAULT_GROUP_ID);
    if (!group) throw new Error("Default group not found");

    // Get existing assignments for today to respect locks
    const existingAssignments = await idb.assignments.where({ date: todayStr }).toArray();
    const lockedAssignments = existingAssignments.filter(a => a.isLocked);
    const lockedUserIds = new Set(lockedAssignments.map(a => a.userId));
    const lockedSeatIds = new Set(lockedAssignments.map(a => a.seatId));

    // Get users and seats that are not locked
    const availableUsers = group.memberIds.filter(uid => !lockedUserIds.has(uid));
    const availableSeats = group.seatIds.filter(sid => !lockedSeatIds.has(sid));

    // Fisher-Yates shuffle algorithm for available seats
    for (let i = availableSeats.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableSeats[i], availableSeats[j]] = [availableSeats[j], availableSeats[i]];
    }

    const newAssignments: Assignment[] = [...lockedAssignments];
    
    availableUsers.forEach((userId, index) => {
        newAssignments.push({
            id: `${todayStr}-${userId}`,
            date: todayStr,
            userId,
            seatId: availableSeats[index],
            groupId: group.id,
            isLocked: false,
        });
    });

    // Use a transaction to delete old assignments and add new ones
    await idb.transaction('rw', idb.assignments, async () => {
        await idb.assignments.where({ date: todayStr }).delete();
        await idb.assignments.bulkPut(newAssignments);
    });
    
    return idb.assignments.where({ date: todayStr }).toArray();
}

export async function toggleSeatLock(assignmentId: string): Promise<void> {
    const assignment = await idb.assignments.get(assignmentId);
    if (!assignment) {
        throw new Error("Assignment not found");
    }
    await idb.assignments.update(assignmentId, { isLocked: !assignment.isLocked });
}

export async function swapSeatsForDay(date: string, assignment1Id: string, assignment2Id: string) {
    await idb.transaction('rw', idb.assignments, async () => {
        const assignment1 = await idb.assignments.get(assignment1Id);
        const assignment2 = await idb.assignments.get(assignment2Id);

        if (!assignment1 || !assignment2) {
            throw new Error("One or both assignments not found for swap.");
        }

        const seat1Id = assignment1.seatId;
        const seat2Id = assignment2.seatId;

        await idb.assignments.update(assignment1Id, { seatId: seat2Id });
        await idb.assignments.update(assignment2Id, { seatId: seat1Id });
    });
}
