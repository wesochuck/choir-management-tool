import { parseJsonField } from '../email/hookJson';
import { renderQrSvg } from '../email/qrHelper';
import { parseSignedToken, generateSignedTicketToken } from '../hmacTokens';
import type { PocketBaseApp, PocketBaseRequestEvent, PocketBaseRecord } from '../email/emailTypes';

declare const $app: PocketBaseApp;
declare const $security: {
    hs256(payload: string, secret: string): string;
    equal(a: string, b: string): boolean;
};

const REASON_MESSAGES = {
    malformed: 'QR code is not valid',
    bad_signature: 'QR code is not valid',
    not_found: 'Ticket not found',
    not_paid: 'Ticket has been refunded',
    wrong_event: 'This ticket is for a different concert',
};

function getHmacSecretFromApp(app: PocketBaseApp): string {
    try {
        const record = app.findFirstRecordByFilter("appSettings", "key = 'HMAC_SECRET'");
        const parsed = parseJsonField<{ secret?: string }>(record.get("value"));
        return parsed && parsed.secret ? parsed.secret : "";
    } catch {
        return "";
    }
}

function getBaseUrl(app: PocketBaseApp): string {
    try {
        const record = app.findFirstRecordByFilter("appSettings", "key = 'communications'");
        const comms = parseJsonField<Record<string, string>>(record.get("value"));
        if (comms?.frontendUrl) return comms.frontendUrl.replace(/\/+$/, "");
    } catch {
        /* use default */
    }
    try {
        const url = app.settings()?.meta?.appUrl || app.settings()?.meta?.appURL || "";
        if (url) return url.replace(/\/+$/, "");
    } catch {
        /* use default */
    }
    return "http://localhost:5173";
}

export function handleValidateScan(e: PocketBaseRequestEvent): unknown {
    const body = e.requestInfo().body;
    const token = typeof body?.token === 'string' ? body.token : '';
    const eventId = typeof body?.eventId === 'string' ? body.eventId : '';

    if (!token || !eventId) {
        return e.json(400, { error: "Missing token or eventId" });
    }

    const authRecord = e.auth;
    if (!authRecord || authRecord.get("role") !== "admin") {
        return e.json(403, { error: "Admin access required" });
    }

    const parsed = parseSignedToken(token, ["t", "s"]);
    if (!parsed) {
        return e.json(200, { valid: false, reason: "malformed", message: REASON_MESSAGES.malformed });
    }

    const secret = getHmacSecretFromApp($app);
    if (!secret) {
        return e.json(500, { error: "Server configuration error" });
    }

    const payload = `t=${parsed.t}`;
    const expectedSig = $security.hs256(payload, secret);
    if (!$security.equal(parsed.s, expectedSig)) {
        return e.json(200, { valid: false, reason: "bad_signature", message: REASON_MESSAGES.bad_signature });
    }

    let purchase: PocketBaseRecord;
    try {
        purchase = $app.findRecordById("ticketPurchases", parsed.t);
    } catch {
        return e.json(200, { valid: false, reason: "not_found", message: REASON_MESSAGES.not_found });
    }

    if (purchase.get("status") !== "paid") {
        return e.json(200, { valid: false, reason: "not_paid", message: REASON_MESSAGES.not_paid });
    }

    const buyerName = String(purchase.get("buyerName") || "");
    const quantity = Number(purchase.get("quantity") || 0);
    const purchaseEventId = purchase.get("event");

    if (purchaseEventId === eventId) {
        let eventTitle = "";
        let eventDate = "";
        try {
            const event = $app.findRecordById("events", eventId);
            eventTitle = String(event.get("title") || "");
            eventDate = String(event.get("date") || "");
        } catch {
            // keep empty values
        }
        return e.json(200, {
            valid: true,
            buyerName,
            quantity,
            eventId,
            eventTitle,
            eventDate,
            isBundlePass: false,
        });
    }

    const bundleId = purchase.get("bundle");
    if (bundleId && typeof bundleId === 'string') {
        try {
            const bundle = $app.findRecordById("ticketBundles", bundleId);
            const bundleEvents = bundle.get("events");
            const eventIds = Array.isArray(bundleEvents) ? (bundleEvents as string[]) : [];

            if (eventIds.includes(eventId)) {
                let eventTitle = "";
                let eventDate = "";
                try {
                    const scannedEvent = $app.findRecordById("events", eventId);
                    eventTitle = String(scannedEvent.get("title") || "");
                    eventDate = String(scannedEvent.get("date") || "");
                } catch {
                    // keep empty values
                }
                return e.json(200, {
                    valid: true,
                    buyerName,
                    quantity,
                    eventId,
                    eventTitle,
                    eventDate,
                    isBundlePass: true,
                    bundleTitle: String(bundle.get("title") || ""),
                });
            }
        } catch {
            // bundle not found — fall through to wrong_event
        }
    }

    return e.json(200, { valid: false, reason: "wrong_event", message: REASON_MESSAGES.wrong_event });
}

export async function handleGetScanContext(e: PocketBaseRequestEvent): Promise<unknown> {
    const query = e.requestInfo().query;
    const sessionId = typeof query["session_id"] === 'string' ? query["session_id"] : '';
    const purchaseId = typeof query["purchase_id"] === 'string' ? query["purchase_id"] : '';

    if (!sessionId || !purchaseId) {
        return e.json(400, { error: "Missing session_id or purchase_id" });
    }

    let purchase: PocketBaseRecord;
    try {
        purchase = $app.findFirstRecordByFilter(
            "ticketPurchases",
            "id = {:purchaseId} && stripeSessionId = {:sessionId}",
            { purchaseId, sessionId }
        );
    } catch {
        return e.json(404, { error: "Purchase not found" });
    }

    if (purchase.get("status") !== "paid") {
        return e.json(409, { error: "Purchase is not yet paid" });
    }

    const secret = getHmacSecretFromApp($app);
    if (!secret) {
        return e.json(500, { error: "Server configuration error" });
    }

    const token = generateSignedTicketToken($app, purchase.id, secret);
    const baseUrl = getBaseUrl($app);
    const scanUrl = `${baseUrl}/admin/tickets/scan?token=${encodeURIComponent(token)}`;

    const qrSvg = await renderQrSvg(scanUrl);
    const qrDataUri = `data:image/svg+xml,${encodeURIComponent(qrSvg)}`;

    const buyerName = String(purchase.get("buyerName") || "");
    const bundleId = purchase.get("bundle");
    const isBundlePass = !!bundleId;

    let eventTitle = "";
    let eventDate = "";
    let bundleTitle: string | undefined;

    if (isBundlePass && typeof bundleId === 'string') {
        try {
            const bundle = $app.findRecordById("ticketBundles", bundleId);
            bundleTitle = String(bundle.get("title") || "");
        } catch {
            // bundle not found
        }
    } else {
        try {
            const event = $app.findRecordById("events", String(purchase.get("event") || ""));
            eventTitle = String(event.get("title") || "");
            eventDate = String(event.get("date") || "");
        } catch {
            // event not found
        }
    }

    return e.json(200, {
        token,
        qrDataUri,
        buyerName,
        eventTitle,
        eventDate,
        isBundlePass,
        bundleTitle,
    });
}
