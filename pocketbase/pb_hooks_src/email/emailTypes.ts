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

export interface PocketBaseSmtpConfig {
    enabled: boolean;
}

export interface PocketBaseMetaConfig {
    senderAddress?: string;
    senderName?: string;
    appURL?: string;
}

export interface PocketBaseSettings {
    smtp: PocketBaseSmtpConfig;
    meta: PocketBaseMetaConfig;
}

export interface PocketBaseMailClient {
    send(message: unknown): void;
}

export interface PocketBaseQuery {
    bind(params: Record<string, unknown>): PocketBaseQuery;
    execute(): void;
}

export interface PocketBaseDb {
    newQuery(sql: string): PocketBaseQuery;
}

// Strong type helpers to avoid using explicit 'any' in hook files
export interface PocketBaseRecord {
    id: string;
    get(field: string): unknown;
    set(field: string, value: unknown): void;
}

export interface PocketBaseApp {
    findCollectionByNameOrId(nameOrId: string): unknown;
    findFirstRecordByFilter(collection: string, filter: string, params?: unknown): PocketBaseRecord;
    findRecordsByFilter(collection: string, filter: string, sort?: string, limit?: number, offset?: number, params?: unknown): PocketBaseRecord[];
    findRecordById(collection: string, id: string): PocketBaseRecord;
    save(record: PocketBaseRecord): void;
    saveNoValidate(record: PocketBaseRecord): void;
    delete(record: PocketBaseRecord): void;
    settings(): PocketBaseSettings;
    newMailClient(): PocketBaseMailClient;
    db(): PocketBaseDb;
}

export interface PocketBaseResponseHeader {
    set(key: string, value: string): void;
}

export interface PocketBaseResponse {
    header(): PocketBaseResponseHeader;
}

export interface PocketBaseRequestInfo {
    query: Record<string, unknown>;
    body: Record<string, unknown>;
    headers?: Record<string, string>;
}

export interface PocketBaseRequestEvent {
    auth?: PocketBaseRecord;
    requestInfo(): PocketBaseRequestInfo;
    response: PocketBaseResponse;
    json(code: number, data: unknown): unknown;
    string(code: number, content: string): unknown;
}
