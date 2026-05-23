// Auditions Automation Hooks

onRecordAfterCreateSuccess((e) => {
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

    function getChoirTimezone() {
        let timezone = "America/New_York";
        try {
            const tzSetting = $app.findFirstRecordByFilter("appSettings", "key = 'timezone'");
            if (tzSetting) {
                const tzP = parseJsonFieldLocal(tzSetting.get("value"));
                if (typeof tzP === "string") {
                    timezone = tzP;
                } else if (typeof tzP === "object" && tzP && tzP.timezone) {
                    timezone = tzP.timezone;
                } else if (typeof tzP === "object" && tzP && tzP.value) {
                    timezone = tzP.value;
                }
            }
        } catch (err) {}
        return timezone;
    }

    function formatInTimezoneLocal(date, timezone, options) {
        if (!date) return "";
        try {
            const d = typeof date === "string" ? new Date(date) : date;
            if (isNaN(d.getTime())) return "";
            
            const formatter = new Intl.DateTimeFormat("en-US", {
                weekday: options.weekday || undefined,
                year: options.year || undefined,
                month: options.month || undefined,
                day: options.day || undefined,
                hour: options.hour || undefined,
                minute: options.minute || undefined,
                hour12: options.hour12 !== undefined ? options.hour12 : true,
                timeZone: timezone
            });
            return formatter.format(d);
        } catch (err) {
            return String(date);
        }
    }

    function formatSlotFriendly(slot) {
        if (!slot) return "";
        try {
            const d = new Date(slot);
            if (isNaN(d.getTime())) return slot;

            const timezone = getChoirTimezone();
            const dateStr = formatInTimezoneLocal(d, timezone, { month: 'short', day: 'numeric', year: 'numeric' });
            const timeStr = formatInTimezoneLocal(d, timezone, { hour: 'numeric', minute: '2-digit' });
            
            if (dateStr && timeStr) {
                return dateStr + " at " + timeStr;
            }
        } catch (err) {}
        return slot;
    }

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

    function getChoirTimezone() {
        let timezone = "America/New_York";
        try {
            const tzSetting = $app.findFirstRecordByFilter("appSettings", "key = 'timezone'");
            if (tzSetting) {
                const tzP = parseJsonFieldLocal(tzSetting.get("value"));
                if (typeof tzP === "string") {
                    timezone = tzP;
                } else if (typeof tzP === "object" && tzP && tzP.timezone) {
                    timezone = tzP.timezone;
                } else if (typeof tzP === "object" && tzP && tzP.value) {
                    timezone = tzP.value;
                }
            }
        } catch (err) {}
        return timezone;
    }

    function formatInTimezoneLocal(date, timezone, options) {
        if (!date) return "";
        try {
            const d = typeof date === "string" ? new Date(date) : date;
            if (isNaN(d.getTime())) return "";
            
            const formatter = new Intl.DateTimeFormat("en-US", {
                weekday: options.weekday || undefined,
                year: options.year || undefined,
                month: options.month || undefined,
                day: options.day || undefined,
                hour: options.hour || undefined,
                minute: options.minute || undefined,
                hour12: options.hour12 !== undefined ? options.hour12 : true,
                timeZone: timezone
            });
            return formatter.format(d);
        } catch (err) {
            return String(date);
        }
    }

    function formatSlotFriendly(slot) {
        if (!slot) return "";
        try {
            const d = new Date(slot);
            if (isNaN(d.getTime())) return slot;

            const timezone = getChoirTimezone();
            const dateStr = formatInTimezoneLocal(d, timezone, { month: 'short', day: 'numeric', year: 'numeric' });
            const timeStr = formatInTimezoneLocal(d, timezone, { hour: 'numeric', minute: '2-digit' });
            
            if (dateStr && timeStr) {
                return dateStr + " at " + timeStr;
            }
        } catch (err) {}
        return slot;
    }

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
