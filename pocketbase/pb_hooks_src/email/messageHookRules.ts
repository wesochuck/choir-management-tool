import type { MessageRecord } from './emailTypes';

/**
 * Logic to determine if a message should be dispatched on create.
 */
export function shouldDispatchOnCreate(record: Partial<MessageRecord>): boolean {
    if (!record) return false;

    const status = record.status || "Sent";
    if (status === "Draft") return false;

    const type = record.type;
    if (type !== "Email" && type !== "Both") return false;

    const filters = record.filters || {};
    if (filters.alreadySent === true) return false;

    return true;
}

/**
 * Logic to determine if a message should be dispatched on update.
 */
export function shouldDispatchOnUpdate(record: Partial<MessageRecord>, oldStatus: string): boolean {
    if (!record) return false;

    const status = record.status;
    if (status === "Sent" && oldStatus === "Draft") {
        const type = record.type;
        if (type !== "Email" && type !== "Both") return false;
        return true;
    }

    return false;
}
