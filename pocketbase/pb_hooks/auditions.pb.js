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
        var d = new Date(date);
        if (isNaN(d.getTime())) return "";

        try {
            var formatter = new Intl.DateTimeFormat("en-US", {
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
            var offsetHours = 0;
            var tz = String(timezone || "").toLowerCase();
            var year = d.getUTCFullYear();
            
            var march1 = new Date(Date.UTC(year, 2, 1));
            var dstStartDay = ((7 - march1.getUTCDay()) % 7 + 1) + 7;
            
            var nov1 = new Date(Date.UTC(year, 10, 1));
            var dstEndDay = (7 - nov1.getUTCDay()) % 7 + 1;
            
            var dstStart = Date.UTC(year, 2, dstStartDay, 7, 0, 0, 0);
            var dstEnd = Date.UTC(year, 10, dstEndDay, 6, 0, 0, 0);
            
            var isDst = d.getTime() >= dstStart && d.getTime() < dstEnd;

            if (tz.indexOf("chicago") >= 0 || tz.indexOf("central") >= 0) {
                offsetHours = isDst ? -5 : -6;
            } else if (tz.indexOf("denver") >= 0 || tz.indexOf("mountain") >= 0) {
                offsetHours = isDst ? -6 : -7;
            } else if (tz.indexOf("los_angeles") >= 0 || tz.indexOf("pacific") >= 0) {
                offsetHours = isDst ? -7 : -8;
            } else if (tz.indexOf("phoenix") >= 0 || tz.indexOf("arizona") >= 0) {
                offsetHours = -7;
            } else {
                offsetHours = isDst ? -4 : -5;
            }

            var localTimeMs = d.getTime() + (offsetHours * 60 * 60 * 1000);
            var localDate = new Date(localTimeMs);

            var weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
            var weekdaysFull = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            var monthsFull = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

            var wday = weekdays[localDate.getUTCDay()];
            var wdayFull = weekdaysFull[localDate.getUTCDay()];
            var mon = months[localDate.getUTCMonth()];
            var monFull = monthsFull[localDate.getUTCMonth()];
            var day = localDate.getUTCDate();
            var yr = localDate.getUTCFullYear();
            
            var hr = localDate.getUTCHours();
            var ampm = hr >= 12 ? "PM" : "AM";
            hr = hr % 12;
            if (hr === 0) hr = 12;
            
            var minVal = localDate.getUTCMinutes();
            var min = minVal < 10 ? "0" + minVal : String(minVal);

            if (options.hour && !options.day) {
                return hr + ":" + min + " " + ampm;
            }
            if (options.weekday === "long" && options.year) {
                return wdayFull + ", " + monFull + " " + day + ", " + yr;
            }
            if (options.weekday === "short" && options.hour) {
                return wday + ", " + mon + " " + day + ", " + hr + ":" + min + " " + ampm;
            }
            if (options.weekday === "short" && !options.hour) {
                return wday + ", " + mon + " " + day;
            }

            var doubleDigitMonth = (localDate.getUTCMonth() + 1 < 10) ? "0" + (localDate.getUTCMonth() + 1) : String(localDate.getUTCMonth() + 1);
            var doubleDigitDay = (day < 10) ? "0" + day : String(day);
            return doubleDigitMonth + "/" + doubleDigitDay + "/" + yr + ", " + hr + ":" + min + " " + ampm;
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
        var d = new Date(date);
        if (isNaN(d.getTime())) return "";

        try {
            var formatter = new Intl.DateTimeFormat("en-US", {
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
            var offsetHours = 0;
            var tz = String(timezone || "").toLowerCase();
            var year = d.getUTCFullYear();
            
            var march1 = new Date(Date.UTC(year, 2, 1));
            var dstStartDay = ((7 - march1.getUTCDay()) % 7 + 1) + 7;
            
            var nov1 = new Date(Date.UTC(year, 10, 1));
            var dstEndDay = (7 - nov1.getUTCDay()) % 7 + 1;
            
            var dstStart = Date.UTC(year, 2, dstStartDay, 7, 0, 0, 0);
            var dstEnd = Date.UTC(year, 10, dstEndDay, 6, 0, 0, 0);
            
            var isDst = d.getTime() >= dstStart && d.getTime() < dstEnd;

            if (tz.indexOf("chicago") >= 0 || tz.indexOf("central") >= 0) {
                offsetHours = isDst ? -5 : -6;
            } else if (tz.indexOf("denver") >= 0 || tz.indexOf("mountain") >= 0) {
                offsetHours = isDst ? -6 : -7;
            } else if (tz.indexOf("los_angeles") >= 0 || tz.indexOf("pacific") >= 0) {
                offsetHours = isDst ? -7 : -8;
            } else if (tz.indexOf("phoenix") >= 0 || tz.indexOf("arizona") >= 0) {
                offsetHours = -7;
            } else {
                offsetHours = isDst ? -4 : -5;
            }

            var localTimeMs = d.getTime() + (offsetHours * 60 * 60 * 1000);
            var localDate = new Date(localTimeMs);

            var weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
            var weekdaysFull = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            var monthsFull = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

            var wday = weekdays[localDate.getUTCDay()];
            var wdayFull = weekdaysFull[localDate.getUTCDay()];
            var mon = months[localDate.getUTCMonth()];
            var monFull = monthsFull[localDate.getUTCMonth()];
            var day = localDate.getUTCDate();
            var yr = localDate.getUTCFullYear();
            
            var hr = localDate.getUTCHours();
            var ampm = hr >= 12 ? "PM" : "AM";
            hr = hr % 12;
            if (hr === 0) hr = 12;
            
            var minVal = localDate.getUTCMinutes();
            var min = minVal < 10 ? "0" + minVal : String(minVal);

            if (options.hour && !options.day) {
                return hr + ":" + min + " " + ampm;
            }
            if (options.weekday === "long" && options.year) {
                return wdayFull + ", " + monFull + " " + day + ", " + yr;
            }
            if (options.weekday === "short" && options.hour) {
                return wday + ", " + mon + " " + day + ", " + hr + ":" + min + " " + ampm;
            }
            if (options.weekday === "short" && !options.hour) {
                return wday + ", " + mon + " " + day;
            }

            var doubleDigitMonth = (localDate.getUTCMonth() + 1 < 10) ? "0" + (localDate.getUTCMonth() + 1) : String(localDate.getUTCMonth() + 1);
            var doubleDigitDay = (day < 10) ? "0" + day : String(day);
            return doubleDigitMonth + "/" + doubleDigitDay + "/" + yr + ", " + hr + ":" + min + " " + ampm;
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
