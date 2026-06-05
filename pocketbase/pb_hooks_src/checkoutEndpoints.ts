import { parseJsonField } from './email/hookJson';
import { formatInTimezone } from './email/hookText';
import { createCheckoutSession, refundPaymentIntent } from './stripeService';
import type { PocketBaseApp, PocketBaseRequestEvent, PocketBaseRecord } from './email/emailTypes';

declare const $app: PocketBaseApp;
declare const $security: {
    hs256(payload: string, secret: string): string;
    equal(a: string, b: string): boolean;
};

declare function readerToString(reader: unknown, maxBytes?: number): string;

declare class Record implements PocketBaseRecord {
    id: string;
    constructor(collection: unknown, data?: Record<string, unknown>);
    get(field: string): unknown;
    set(field: string, value: unknown): void;
}

interface GoHttpRequest {
    header: {
        get(key: string): string;
    };
    body: unknown;
}

interface TicketingRequestEvent extends PocketBaseRequestEvent {
    request: GoHttpRequest;
}

export function handleCreateTicketsSession(e: PocketBaseRequestEvent): unknown {
    const body = e.requestInfo().body;
    const eventId = body.eventId as string;
    const quantity = body.quantity;
    const email = body.email as string;
    const name = body.name as string;

    if (!eventId || !quantity || !email || !name) {
        return e.json(400, { error: "Missing required fields" });
    }

    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0 || qty > 10) {
        return e.json(400, { error: "Invalid ticket quantity" });
    }

    let event: PocketBaseRecord;
    try {
        event = $app.findRecordById("events", eventId);
    } catch {
        return e.json(404, { error: "Event not found" });
    }

    if (!event.get("isTicketingEnabled")) {
        return e.json(400, { error: "Ticketing is not enabled for this event" });
    }

    // Derive sold count from paid ticketPurchases
    let soldCount = 0;
    try {
        const paidPurchases = $app.findRecordsByFilter(
            "ticketPurchases",
            "event = {:eventId} && status = 'paid'",
            "",
            10000,
            0,
            { eventId }
        );
        paidPurchases.forEach(p => {
            const q = p.get("quantity");
            soldCount += typeof q === 'number' ? q : 0;
        });
    } catch (err: unknown) {
        console.log("Error querying paid purchases: " + (err instanceof Error ? err.message : String(err)));
    }

    const capacity = event.get("ticketCapacity");
    const capacityNum = typeof capacity === 'number' ? capacity : 0;
    if (capacityNum > 0 && soldCount + qty > capacityNum) {
        return e.json(400, { error: "Requested quantity exceeds remaining ticket capacity" });
    }

    // Select price based on day-of rules in event timezone
    let timezone = "America/New_York";
    try {
        const settingsRecord = $app.findFirstRecordByFilter("appSettings", "key = 'timezone'");
        const val = settingsRecord.get("value");
        const parsed = parseJsonField<{ timezone?: string }>(val);
        if (parsed && parsed.timezone) {
            timezone = parsed.timezone;
        }
    } catch {
        // use default timezone
    }

    const nowFormatted = formatInTimezone(new Date(), timezone, {});
    const eventDateRaw = event.get("date");
    const eventFormatted = formatInTimezone(new Date(typeof eventDateRaw === 'string' ? eventDateRaw : ""), timezone, {});
    const nowStr = nowFormatted.split(",")[0];
    const eventDateStr = eventFormatted.split(",")[0];

    const isShowDay = nowStr === eventDateStr;
    const advancePriceCents = event.get("advancePriceCents");
    const dayOfPriceCents = event.get("dayOfPriceCents");

    const unitPriceCents = isShowDay
        ? (typeof dayOfPriceCents === 'number' ? dayOfPriceCents : 0)
        : (typeof advancePriceCents === 'number' ? advancePriceCents : 0);

    if (unitPriceCents < 0) {
        return e.json(400, { error: "Invalid ticket price configuration" });
    }

    // Calculate net Stripe fees
    const grossCents = unitPriceCents > 0 ? Math.round((unitPriceCents + 30) / (1 - 0.029)) : 0;
    const feeCents = grossCents - unitPriceCents;

    const appUrl = process.env.APP_URL || "http://localhost:5173";
    const successUrl = `${appUrl}/tickets/order/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${appUrl}/tickets/${eventId}`;

    const lineItems = [
        {
            price_data: {
                currency: "usd",
                product_data: { name: `Ticket: ${String(event.get("title") || "Event")}` },
                unit_amount: unitPriceCents
            },
            quantity: qty
        }
    ];

    if (feeCents > 0) {
        lineItems.push({
            price_data: {
                currency: "usd",
                product_data: { name: "Processing Fee" },
                unit_amount: feeCents
            },
            quantity: qty
        });
    }

    const metadata: Record<string, string> = {
        paymentType: "ticket",
        eventId,
        quantity: String(qty),
        unitPriceCents: String(unitPriceCents),
        feeCents: String(feeCents),
        buyerName: name,
        buyerEmail: email
    };

    try {
        const session = createCheckoutSession(lineItems, metadata, email, successUrl, cancelUrl);
        return e.json(200, { url: session.url, sessionId: session.id });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return e.json(500, { error: "Failed to create Stripe Checkout session", details: message });
    }
}

export function handleStripeWebhook(e: TicketingRequestEvent): unknown {
    let rawBody = "";
    try {
        rawBody = readerToString(e.request.body);
    } catch (err: unknown) {
        return e.json(400, { error: "Failed to read request body" });
    }

    const sig = e.request.header.get("Stripe-Signature") || "";
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

    if (!sig || !webhookSecret) {
        return e.json(400, { error: "Missing signature or webhook config" });
    }

    // Parse Stripe-Signature components: t=123,v1=abc
    let timestamp = "";
    let signature = "";
    sig.split(",").forEach((part: string) => {
        const pair = part.split("=");
        if (pair.length === 2) {
            const k = pair[0].trim();
            const v = pair[1].trim();
            if (k === "t") timestamp = v;
            if (k === "v1") signature = v;
        }
    });

    if (!timestamp || !signature) {
        return e.json(400, { error: "Invalid signature format" });
    }

    // Validate replay attacks
    const nowSecs = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSecs - Number(timestamp)) > 300) {
        return e.json(400, { error: "Expired timestamp" });
    }

    // Compute local signature
    const signedPayload = timestamp + "." + rawBody;
    const localSig = $security.hs256(signedPayload, webhookSecret);

    if (!$security.equal(localSig, signature)) {
        return e.json(400, { error: "Signature verification failed" });
    }

    let eventObj: {
        type?: string;
        data?: {
            object?: {
                id?: string;
                payment_intent?: string;
                customer?: string;
                currency?: string;
                amount_total?: number;
                metadata?: Record<string, string>;
            };
        };
    } = {};

    try {
        eventObj = JSON.parse(rawBody);
    } catch {
        return e.json(400, { error: "Invalid JSON body" });
    }

    if (eventObj.type === "checkout.session.completed") {
        const session = eventObj.data?.object;
        if (!session) {
            return e.json(400, { error: "Missing session object" });
        }

        const metadata = session.metadata || {};
        const paymentType = metadata.paymentType;

        if (paymentType === "ticket") {
            const eventId = metadata.eventId;
            const stripeSessionId = session.id || "";
            const quantity = Number(metadata.quantity || 0);

            if (!eventId || !stripeSessionId || isNaN(quantity) || quantity <= 0) {
                return e.json(400, { error: "Invalid session metadata" });
            }

            // Idempotency: Check if record exists
            try {
                const existing = $app.findFirstRecordByFilter("ticketPurchases", "stripeSessionId = {:stripeSessionId}", { stripeSessionId });
                if (existing) {
                    return e.json(200, { success: true, message: "Duplicate event ignored" });
                }
            } catch {
                // Record not found, continue
            }

            // Re-verify capacity before saving
            let targetEvent: PocketBaseRecord;
            try {
                targetEvent = $app.findRecordById("events", eventId);
            } catch {
                return e.json(400, { error: "Event not found during webhook processing" });
            }

            let currentSold = 0;
            try {
                const paidPurchases = $app.findRecordsByFilter("ticketPurchases", "event = {:eventId} && status = 'paid'", "", 10000, 0, { eventId });
                paidPurchases.forEach(p => {
                    const q = p.get("quantity");
                    currentSold += typeof q === 'number' ? q : 0;
                });
            } catch {
                // Ignore query error
            }

            const capacity = targetEvent.get("ticketCapacity");
            const capacityNum = typeof capacity === 'number' ? capacity : 0;
            if (capacityNum > 0 && currentSold + quantity > capacityNum) {
                // Auto-Refund since capacity exceeded
                const pi = session.payment_intent;
                if (pi) {
                    try {
                        refundPaymentIntent(pi);
                    } catch (refundErr: unknown) {
                        console.log("Failed to process auto-refund: " + (refundErr instanceof Error ? refundErr.message : String(refundErr)));
                    }
                }
                return e.json(200, { success: true, message: "Capacity exceeded, refund processed" });
            }

            // Create purchase record
            const collection = $app.findCollectionByNameOrId("pbc_ticketPurchases_001");
            const record = new Record(collection, {
                event: eventId,
                buyerName: metadata.buyerName || "",
                buyerEmail: metadata.buyerEmail || "",
                quantity: quantity,
                unitPriceCents: Number(metadata.unitPriceCents || 0),
                feeCents: Number(metadata.feeCents || 0),
                amountPaidCents: session.amount_total || 0,
                currency: session.currency || "usd",
                stripeSessionId: stripeSessionId,
                stripePaymentIntentId: session.payment_intent || "",
                stripeCustomerId: session.customer || "",
                status: "paid",
                marketingOptIn: metadata.marketingOptIn === "true" || metadata.marketingOptIn === true,
                fulfilledAt: new Date().toISOString()
            });

            $app.save(record);

            // Enqueue Ticket Confirmation email
            try {
                const template = $app.findFirstRecordByFilter("messageTemplates", "title = 'Ticket Confirmation' && isSystemTemplate = true");
                let content = template.get("content") as string || "";
                let subject = template.get("subject") as string || "";

                let timezone = "America/New_York";
                try {
                    const tzSetting = $app.findFirstRecordByFilter("appSettings", "key = 'timezone'");
                    const valueStr = tzSetting.get("value");
                    const tzP = parseJsonField<{ timezone?: string }>(valueStr);
                    if (tzP?.timezone) {
                        timezone = tzP.timezone;
                    }
                } catch {
                    // default
                }

                let choirName = "Choir Management Tool";
                try {
                    const choirRecord = $app.findFirstRecordByFilter("appSettings", "key = 'choir_name'");
                    const val = parseJsonField<string>(choirRecord.get("value"));
                    if (val) choirName = val;
                } catch {
                    // default
                }

                content = content
                    .replace(/{buyerName}/g, metadata.buyerName || "")
                    .replace(/{doorsOpenTime}/g, String(targetEvent.get("doorsOpenTime") || "N/A"))
                    .replace(/{quantity}/g, String(quantity))
                    .replace(/{amountPaid}/g, (Number(session.amount_total || 0) / 100).toFixed(2))
                    .replace(/{choirName}/g, choirName);

                const emailQueueCollection = $app.findCollectionByNameOrId("emailQueue");
                const mailRecord = new Record(emailQueueCollection, {
                    recipientId: "buyer_" + stripeSessionId,
                    recipientEmail: metadata.buyerEmail || "",
                    recipientName: metadata.buyerName || "Buyer",
                    subject: subject,
                    rawContent: content,
                    status: "Pending",
                    attempts: 0,
                    filters: JSON.stringify({
                        eventId: eventId,
                        type: "Automated Confirmation"
                    })
                });

                $app.save(mailRecord);
            } catch (mailErr: unknown) {
                console.log("Failed to enqueue confirmation email: " + (mailErr instanceof Error ? mailErr.message : String(mailErr)));
            }
        } else if (paymentType === "dues") {
            const profileId = metadata.profileId;
            const season = metadata.season;

            if (profileId && season) {
                try {
                    let duesRecord: PocketBaseRecord;
                    try {
                        duesRecord = $app.findFirstRecordByFilter("seasonalDues", "profile = {:profileId} && season = {:season}", { profileId, season });
                        duesRecord.set("paid", true);
                    } catch {
                        const duesColl = $app.findCollectionByNameOrId("pbc_seasonalDues_001");
                        duesRecord = new Record(duesColl, {
                            profile: profileId,
                            season: season,
                            paid: true
                        });
                    }
                    $app.save(duesRecord);
                } catch (err: unknown) {
                    console.log("Failed to fulfill dues payment: " + (err instanceof Error ? err.message : String(err)));
                }
            }
        }
    } else if (eventObj.type === "charge.refunded") {
        const charge = eventObj.data?.object;
        const paymentIntentId = charge?.payment_intent;
        if (paymentIntentId) {
            try {
                const purchase = $app.findFirstRecordByFilter("ticketPurchases", "stripePaymentIntentId = {:paymentIntentId}", { paymentIntentId });
                purchase.set("status", "refunded");
                $app.save(purchase);
            } catch {
                console.log("Refunded purchase record not found for Payment Intent ID: " + paymentIntentId);
            }
        }
    }

    return e.json(200, { success: true });
}

export function handleAdminRefundTicket(e: PocketBaseRequestEvent): unknown {
    const authRecord = e.auth;
    if (!authRecord || authRecord.get("role") !== "admin") {
        return e.json(403, { error: "Forbidden" });
    }

    const body = e.requestInfo().body;
    const purchaseId = body.purchaseId as string;
    if (!purchaseId) {
        return e.json(400, { error: "Missing purchaseId" });
    }

    let purchase: PocketBaseRecord;
    try {
        purchase = $app.findRecordById("ticketPurchases", purchaseId);
    } catch {
        return e.json(404, { error: "Purchase record not found" });
    }

    const pi = purchase.get("stripePaymentIntentId") as string;
    if (!pi) {
        return e.json(400, { error: "Stripe payment intent missing on record" });
    }

    try {
        refundPaymentIntent(pi);
        purchase.set("status", "refunded");
        $app.save(purchase);
        return e.json(200, { success: true });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return e.json(500, { error: "Failed to issue Stripe refund", details: message });
    }
}
