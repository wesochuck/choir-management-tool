export interface EmailRecipient {
    id: string;
    email: string;
    name?: string;
}

export interface EmailFilters {
    eventId?: string;
    alreadySent?: boolean;
}

export interface AppSettingsCommunications {
    frontendUrl?: string;
    mailingAddress?: string;
    reportSubjectTemplate?: string;
    reportBodyTemplate?: string;
}

export interface AppSettingsHmac {
    secret: string;
}

export type MessageType = "Email" | "SMS" | "Both";
export type MessageStatus = "Draft" | "Sent" | "Failed";

export interface MessageRecord {
    id: string;
    subject: string;
    content: string;
    type: MessageType;
    status: MessageStatus;
    recipients: EmailRecipient[];
    filters: EmailFilters;
}
