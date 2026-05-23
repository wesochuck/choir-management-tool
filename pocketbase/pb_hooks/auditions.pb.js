// Auditions Automation Hooks

function decodeGoBytesLocal(val) {
    if (!val) return "";
    if (typeof val === "string") return val;
    try {
        if (typeof val === "object") {
            if (Array.isArray(val) && val.length > 0 && typeof val[0] === "number") {
                let str = "";
                for (let i = 0; i < val.length; i++) {
                    str += String.fromCharCode(val[i]);
                }
                return str;
            }
            return val;
        }
    } catch (err) {}
    return "";
}

function parseJsonFieldLocal(val) {
    if (!val) return null;
    const decoded = decodeGoBytesLocal(val);
    if (!decoded) return null;
    if (typeof decoded === "object") return decoded;
    try {
        return JSON.parse(decoded);
    } catch (err) {
        return null;
    }
}

function formatSlotFriendly(slot) {
    if (!slot) return "";
    try {
        const parts = slot.split('T');
        if (parts.length === 2) {
            const datePart = parts[0]; // "2026-10-15"
            const timePart = parts[1].substring(0, 5); // "18:00"
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const dateParts = datePart.split('-');
            if (dateParts.length === 3) {
                const y = dateParts[0];
                const m = months[parseInt(dateParts[1]) - 1] || dateParts[1];
                const d = parseInt(dateParts[2]);
                
                let timeStr = timePart;
                const timeParts = timePart.split(':');
                if (timeParts.length === 2) {
                    let hour = parseInt(timeParts[0]);
                    const min = timeParts[1];
                    const ampm = hour >= 12 ? 'PM' : 'AM';
                    hour = hour % 12;
                    hour = hour ? hour : 12;
                    timeStr = hour + ":" + min + " " + ampm;
                }
                
                return m + " " + d + ", " + y + " at " + timeStr;
            }
        }
    } catch (e) {}
    return slot;
}

onRecordAfterCreateSuccess((e) => {
    try {
        const audition = e.record;
        if (!audition) return;

        const contact = audition.get("contact") || "";
        const isEmail = contact.includes("@") && contact.includes(".");

        if (isEmail) {
            const template = $app.findFirstRecordByFilter("messageTemplates", "title = 'Audition Confirmation' && isSystemTemplate = true");
            if (!template) return;

            const queueCollection = $app.findCollectionByNameOrId("emailQueue");
            const eventId = audition.get("performance") || "";
            
            // Format multiple requested slots if they exist
            const requestedSlotsRaw = audition.get("requestedSlots");
            const requestedSlots = parseJsonFieldLocal(requestedSlotsRaw);
            
            let formattedTimeSlots = "Any";
            if (Array.isArray(requestedSlots) && requestedSlots.length > 0) {
                const formattedList = requestedSlots.map(function(slot) {
                    return "- " + formatSlotFriendly(slot);
                });
                formattedTimeSlots = "\n" + formattedList.join("\n");
            } else {
                const legacySlot = audition.get("scheduledTimeSlot") || audition.get("timeSlot") || "";
                if (legacySlot) {
                    formattedTimeSlots = formatSlotFriendly(legacySlot);
                }
            }

            let rawContent = template.get("content") || "";
            rawContent = rawContent.replace(/{timeSlot}/g, formattedTimeSlots);

            const queueRecord = new Record(queueCollection, {
                recipientId: audition.id,
                recipientEmail: contact.trim(),
                recipientName: audition.get("name") || "Singer",
                subject: template.get("subject") || "",
                rawContent: rawContent,
                status: "Pending",
                attempts: 0,
                filters: JSON.stringify({ 
                    eventId: eventId, 
                    type: "Automated Confirmation" 
                })
            });

            $app.save(queueRecord);
        }
    } catch (err) {
        console.log("[Audition Confirmation Error] Failed to enqueue email: " + err);
    }
}, "auditions");

onRecordAfterUpdateSuccess((e) => {
    try {
        const audition = e.record;
        if (!audition) return;

        const currentStatus = audition.get("status");

        if (currentStatus === "Scheduled") {
            const contact = audition.get("contact") || "";
            const isEmail = contact.includes("@") && contact.includes(".");

            if (isEmail) {
                const template = $app.findFirstRecordByFilter("messageTemplates", "title = 'Audition Scheduled' && isSystemTemplate = true");
                if (!template) return;

                const eventId = audition.get("performance") || "";
                const timeSlotVal = audition.get("scheduledTimeSlot") || audition.get("timeSlot") || "";
                const formattedTimeSlot = timeSlotVal ? formatSlotFriendly(timeSlotVal) : "Any";
                
                let rawContent = template.get("content") || "";
                rawContent = rawContent.replace(/{timeSlot}/g, formattedTimeSlot);

                // Check if we already enqueued this scheduled email for this audition to prevent duplicates
                const existing = $app.findRecordsByFilter(
                    "emailQueue",
                    "recipientId = {:auditionId} && subject = {:subject} && rawContent = {:rawContent}",
                    "",
                    1,
                    0,
                    { auditionId: audition.id, subject: template.get("subject") || "", rawContent: rawContent }
                );

                if (existing && existing.length > 0) {
                    return; // Email already enqueued
                }

                const queueCollection = $app.findCollectionByNameOrId("emailQueue");
                const queueRecord = new Record(queueCollection, {
                    recipientId: audition.id,
                    recipientEmail: contact.trim(),
                    recipientName: audition.get("name") || "Singer",
                    subject: template.get("subject") || "",
                    rawContent: rawContent,
                    status: "Pending",
                    attempts: 0,
                    filters: JSON.stringify({ 
                        eventId: eventId, 
                        auditionId: audition.id,
                        type: "Automated Confirmation" 
                    })
                });

                $app.save(queueRecord);
            }
        }
    } catch (err) {
        console.log("[Audition Scheduled Error] Failed to enqueue email: " + err);
    }
}, "auditions");
