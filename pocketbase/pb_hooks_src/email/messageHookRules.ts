import { parseJsonField } from './hookJson';
import type { EmailRecipient, PocketBaseRecord, PocketBaseApp } from './emailTypes';

declare class Collection {}
declare class Record implements PocketBaseRecord {
    id: string;
    get(field: string): unknown;
    set(field: string, value: unknown): void;
    constructor(collection: Collection | undefined, data: { [key: string]: unknown });
}

/**
 * Validates if a created or updated message record qualifies for enqueueing.
 */
export function shouldQueueMessage(record: PocketBaseRecord | null | undefined, oldStatus?: string): boolean {
    if (!record) return false;

    const status = record.get("status") as string || "Sent";
    if (status !== "Sent") return false;

    const type = record.get("type") as string;
    if (type !== "Email" && type !== "Both") return false;

    // If update, check status transition to prevent duplicate enqueues
    if (oldStatus !== undefined) {
        return oldStatus !== "Sent";
    }

    return true;
}

/**
 * Explodes a bulk message into individual pending rows in the emailQueue collection.
 */
export function enqueueBulkMessage(app: PocketBaseApp, record: PocketBaseRecord): void {
    const queueCollection = app.findCollectionByNameOrId("emailQueue") as Collection;
    const recipients = parseJsonField<EmailRecipient[]>(record.get("recipients")) || [];
    const subject = record.get("subject") as string || "";
    const content = record.get("content") as string || "";
    const filters = parseJsonField<unknown>(record.get("filters")) || {};

    recipients.forEach(recipient => {
        if (!recipient.email) return;

        const queueRecord = new Record(queueCollection, {
            messageRef: record.id,
            recipientId: recipient.id,
            recipientEmail: recipient.email,
            recipientName: recipient.name || "Singer",
            subject: subject,
            rawContent: content, // Stored to allow compilation during dispatch
            status: "Pending",
            attempts: 0,
            filters: JSON.stringify(filters)
        });

        app.save(queueRecord);
    });
}
