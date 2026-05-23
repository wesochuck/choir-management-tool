// PocketBase Backend Hooks - Automated Attendance Reports

/**
 * Escapes HTML characters in a string to prevent XSS.
 * @param {string} str The string to escape.
 * @returns {string} The escaped string.
 */
function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

cronAdd("post_event_report", "0 * * * *", () => {
    // Helper to safely convert Go byte slices to JS strings
    function decodeGoBytes(val) {
        if (!val) return "";
        if (typeof val === 'string') return val;
        try {
            if (typeof val === 'object') {
                let str = "";
                const len = val.length;
                if (typeof len === 'number') {
                    for (let i = 0; i < len; i++) {
                        str += String.fromCharCode(val[i]);
                    }
                    return str;
                }
            }
        } catch (err) {}
        return JSON.stringify(val);
    }

    function parseJsonField(val) {
        if (!val) return null;
        const str = decodeGoBytes(val);
        if (!str) return null;
        try {
            return JSON.parse(str);
        } catch (err) {
            return null;
        }
    }

    const settings = $app.settings();
    if (!settings.smtp.enabled) return;

    // 2. Fetch Communication Settings for templates & configuration
    let commSettings = {
        reportEnabled: true,
        reportHoursAfter: 12,
        reportSubjectTemplate: 'Attendance Report: {eventTitle} ({eventDate})',
        reportBodyTemplate: '<h2>Attendance Summary</h2><p><strong>Event:</strong> {eventTitle}</p><p><strong>Date:</strong> {eventDate}</p><div style="background-color: #f8faf9; padding: 15px; border-radius: 6px; margin: 20px 0;"><p><strong>Attendance Rate:</strong> <span style="color: #1b4d3e;">{attendanceRate}%</span></p><p style="margin: 5px 0 0 0; color: #64748b;">{presentCount} present / {totalCount} total participants</p></div><h3 style="border-bottom: 2px solid #e9f0eb; padding-bottom: 8px;">Absentees</h3><ul style="padding-left: 20px;">{absenteesList}</ul>{thresholdWarningsSection}'
    };
    try {
        const setting = $app.findFirstRecordByFilter("appSettings", "key = 'communications'");
        const parsed = parseJsonField(setting.get("value"));
        if (parsed) {
            if (typeof parsed.reportEnabled !== 'undefined') commSettings.reportEnabled = parsed.reportEnabled;
            if (typeof parsed.reportHoursAfter !== 'undefined') commSettings.reportHoursAfter = Number(parsed.reportHoursAfter);
            if (parsed.reportSubjectTemplate) commSettings.reportSubjectTemplate = parsed.reportSubjectTemplate;
            if (parsed.reportBodyTemplate) commSettings.reportBodyTemplate = parsed.reportBodyTemplate;
        }
    } catch (e) {
        // Fallback to default
    }

    if (!commSettings.reportEnabled) return;

    const hoursAfter = commSettings.reportHoursAfter;
    const startHour = hoursAfter + 1;
    const endHour = hoursAfter;

    const now = new Date();
    const startWindow = new Date(now.getTime());
    startWindow.setHours(startWindow.getHours() - startHour);
    
    const endWindow = new Date(now.getTime());
    endWindow.setHours(endWindow.getHours() - endHour);

    const start = startWindow.toISOString().replace('T', ' ').split('.')[0];
    const end = endWindow.toISOString().replace('T', ' ').split('.')[0];

    // Find events that occurred between configured hours ago
    const events = $app.findRecordsByFilter(
        "events",
        "date >= {:start} && date < {:end}",
        "-date",
        100,
        0,
        { start, end }
    );

    if (!events || events.length === 0) return;

    // Fetch Admin Users
    const admins = $app.findRecordsByFilter("users", "role = 'admin'");
    if (!admins || admins.length === 0) return;

    events.forEach(event => {
        // Aggregate Attendance for this event
        const rosters = $app.findRecordsByFilter("eventRosters", "event = {:eventId}", "profile.name", 500, 0, { eventId: event.id });
        if (!rosters || rosters.length === 0) return;

        const total = rosters.length;
        const present = rosters.filter(r => r.get("attendance") === "Present").length;
        const absentees = rosters.filter(r => r.get("attendance") === "Absent").map(r => {
            try {
                const profile = $app.findRecordById("profiles", r.get("profile"));
                return profile.get("name");
            } catch (e) {
                return "Unknown Singer";
            }
        });

        const attendanceRate = total > 0 ? ((present / total) * 100).toFixed(1) : 0;

        // Check Thresholds if it's a rehearsal for a concert
        let thresholdWarnings = [];
        const parentId = event.get("parentPerformanceId");
        if (parentId && event.get("type") === "Rehearsal") {
            const otherRehearsals = $app.findRecordsByFilter("events", "parentPerformanceId = {:parentId} && type = 'Rehearsal'", "date", 100, 0, { parentId });
            const rehearsalIds = otherRehearsals.map(r => r.id);
            
            const absenteeRecords = rosters.filter(r => r.get("attendance") === "Absent");
            absenteeRecords.forEach(r => {
                const profileId = r.get("profile");
                let totalMisses = 0;
                rehearsalIds.forEach(rid => {
                    try {
                        const pastRoster = $app.findFirstRecordByFilter("eventRosters", "profile = {:profileId} && event = {:rid} && attendance = 'Absent'", { profileId, rid });
                        if (pastRoster) totalMisses++;
                    } catch (e) {}
                });

                if (totalMisses >= 2) {
                    try {
                        const profile = $app.findRecordById("profiles", profileId);
                        thresholdWarnings.push(`${escapeHtml(profile.get("name"))} (${totalMisses} total misses for this concert series)`);
                    } catch (e) {}
                }
            });
        }

        // Build Email Content
        const eventDateObj = new Date(event.get("date"));
        const eventDateStr = (eventDateObj.getMonth() + 1) + "/" + eventDateObj.getDate() + "/" + eventDateObj.getFullYear();
        const subject = commSettings.reportSubjectTemplate
            .replace(/{eventTitle}/g, event.get("title")) // Subject is plain text, doesn't strictly need HTML escaping
            .replace(/{eventDate}/g, eventDateStr);

        let templateBody = commSettings.reportBodyTemplate
            .replace(/{eventTitle}/g, escapeHtml(event.get("title")))
            .replace(/{eventDate}/g, escapeHtml(eventDateStr))
            .replace(/{attendanceRate}/g, attendanceRate)
            .replace(/{presentCount}/g, present)
            .replace(/{totalCount}/g, total)
            .replace(/{absenteesList}/g, absentees.length > 0 ? absentees.map(name => `<li style="margin-bottom: 4px;">${escapeHtml(name)}</li>`).join('') : '<li>None</li>')
            .replace(/{thresholdWarningsSection}/g, thresholdWarnings.length > 0 ? `
                <div style="margin-top: 30px; padding: 15px; background-color: #fff1f2; border: 1px solid #fecaca; border-radius: 6px;">
                    <h3 style="color: #991b1b; margin-top: 0;">⚠️ Threshold Warnings (2+ Misses)</h3>
                    <p style="font-size: 14px; color: #7f1d1d;">The following singers have reached or exceeded 2 absences for this concert series:</p>
                    <ul style="padding-left: 20px; color: #991b1b;">
                        ${thresholdWarnings.map(msg => `<li style="margin-bottom: 4px;">${msg}</li>`).join('')}
                    </ul>
                </div>
            ` : '');

        // Resolve mailing address for report
        let mailingAddress = "123 Choir St, Harmony City, HC 12345";
        try {
            const commSetting = $app.findFirstRecordByFilter("appSettings", "key = 'communications'");
            const parsed = parseJsonField(commSetting.get("value"));
            if (parsed && parsed.mailingAddress) mailingAddress = parsed.mailingAddress;
        } catch (e) {}

        const body = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e9f0eb; border-radius: 8px;">
                ${templateBody}
                <hr style="border: 0; border-top: 1px solid #e9f0eb; margin: 30px 0;" />
                <div style="font-size: 12px; color: #94a3b8; text-align: center;">
                    <p style="margin: 0 0 10px 0;">${mailingAddress}</p>
                    <p style="margin: 0;">
                        This is an automated report generated ${hoursAfter} hours after the event concluded.
                        <br />
                        Choir Management Tool
                    </p>
                </div>
            </div>
        `;

        // Send to all admins
        admins.forEach(admin => {
            try {
                const message = new MailerMessage({
                    from: {
                        address: settings.meta.senderAddress || "no-reply@choir.management",
                        name:    settings.meta.senderName || "Choir Management Tool",
                    },
                    to:      [{ address: admin.get("email") }],
                    subject: subject,
                    html:    body,
                });

                $app.newMailClient().send(message);
            } catch (e) {
                console.log("[SMTP Error] Failed to send post-event report to " + admin.get("email") + ": " + e);
            }
        });

        // Save to communication history
        try {
            const messageCollection = $app.findCollectionByNameOrId("messages");
            const recipients = admins.map(admin => ({
                id: admin.id,
                name: admin.get("name") || admin.get("email") || "Admin",
                email: admin.get("email"),
                phone: "",
                voicePart: "",
                globalStatus: "Admin"
            }));
            const record = new Record(messageCollection, {
                subject: subject,
                content: body,
                type: "Email",
                recipients: recipients,
                filters: { alreadySent: true, type: "Automated Report", eventId: event.id }
            });
            $app.save(record);
        } catch (e) {
            console.log("Failed to save post-event report message log: " + e);
        }
    });
});

// Automated background reminders are disabled.
// The admin now proactively drafts and sends RSVP invites directly from the Communications pane on save.

// Automated Server-Side Email Delivery on Message Creation
onRecordAfterCreateSuccess((e) => {
    try {
        const record = e?.record;
        if (!record) return;

        // Helper to safely convert Go byte slices to JS strings
        function decodeGoBytes(val) {
            if (!val) return "";
            if (typeof val === 'string') return val;
            try {
                if (typeof val === 'object') {
                    let str = "";
                    const len = val.length;
                    if (typeof len === 'number') {
                        for (let i = 0; i < len; i++) {
                            str += String.fromCharCode(val[i]);
                        }
                        return str;
                    }
                }
            } catch (err) {}
            return JSON.stringify(val);
        }

        function parseJsonField(val) {
            if (!val) return null;
            const str = decodeGoBytes(val);
            if (!str) return null;
            try {
                return JSON.parse(str);
            } catch (err) {
                return null;
            }
        }

        /**
         * Dispatches emails to recipients using system SMTP or custom override.
         */
        function dispatchEmails(subject, content, recipients, recordId) {
            console.log("[Email] Attempting to dispatch message " + recordId + " to " + recipients.length + " recipients");
            
            // 1. Resolve 'From' Address
            let fromAddress = "no-reply@choir.management";
            let fromName = "Choir Management Tool";
            try {
                const settings = $app.settings();
                fromAddress = settings.meta.senderAddress || fromAddress;
                fromName = settings.meta.senderName || fromName;
            } catch (err) {}

            // 2. Fetch Secret for HMAC
            let secret = "";
            try {
                const secretRecord = $app.findFirstRecordByFilter("appSettings", "key = 'HMAC_SECRET'");
                const parsed = parseJsonField(secretRecord.get("value"));
                secret = parsed ? parsed.secret : "";
            } catch (err) {}

            // 3. Resolve Base URL
            let baseUrl = "http://localhost:5173";
            try {
                const setting = $app.findFirstRecordByFilter("appSettings", "key = 'communications'");
                const p = parseJsonField(setting.get("value"));
                if (p && p.frontendUrl) baseUrl = p.frontendUrl;
            } catch (e) {}

            let successCount = 0;
            let errorCount = 0;

            recipients.forEach(r => {
                const email = r.email;
                if (!email) return;

                let finalContent = content;

                // Resolve Mailing Address
                if (finalContent.includes("{{MAILING_ADDRESS}}")) {
                    let mailingAddress = "123 Choir St, Harmony City, HC 12345";
                    try {
                        const setting = $app.findFirstRecordByFilter("appSettings", "key = 'communications'");
                        const p = parseJsonField(setting.get("value"));
                        if (p && p.mailingAddress) mailingAddress = p.mailingAddress;
                    } catch (e) {}
                    finalContent = finalContent.replace(/{{MAILING_ADDRESS}}/g, mailingAddress);
                }
                
                // Personalized Unsubscribe Link
                if (finalContent.includes("{{UNSUBSCRIBE_LINK}}") && secret) {
                    const payload = `p=${r.id}`;
                    const signature = $security.hs256(payload, secret);
                    const token = `${payload}&s=${signature}`;
                    const link = `${baseUrl}/unsubscribe?token=${encodeURIComponent(token)}`;
                    finalContent = finalContent.replace(/{{UNSUBSCRIBE_LINK}}/g, link);
                }

                try {
                    const message = new MailerMessage({
                        from: {
                            address: fromAddress,
                            name:    fromName,
                        },
                        to:      [{ address: email }],
                        subject: subject,
                        html:    finalContent.replace(/\n/g, "<br>"),
                    });

                    $app.newMailClient().send(message);
                    successCount++;
                } catch (err) {
                    console.log("[Email Error] Failed to send to " + email + ": " + err);
                    errorCount++;
                }
            });

            console.log("[Email] Dispatch complete for " + recordId + ". Success: " + successCount + ", Fail: " + errorCount);
        }

        // 1. Check status. If it's a Draft, DO NOT send.
        const status = record.get("status") || "Sent";
        if (status === "Draft") return;

        const type = record.get("type");
        if (type !== "Email" && type !== "Both") return;

        const filtersRaw = record.get("filters");
        const filters = parseJsonField(filtersRaw) || {};
        if (filters && filters.alreadySent === true) return;

        const subject = record.get("subject") || "Message from Choir Management";
        const content = record.get("content") || "";
        const recipientsRaw = record.get("recipients");
        const recipients = parseJsonField(recipientsRaw) || [];

        if (!recipients || !Array.isArray(recipients) || recipients.length === 0) return;

        dispatchEmails(subject, content, recipients, record.id);
    } catch (hookErr) {
        console.log("[Hook Error] onRecordAfterCreateSuccess failed: " + hookErr);
    }
}, "messages");

// Handle status transitions (Draft -> Sent)
onRecordAfterUpdateSuccess((e) => {
    try {
        const record = e?.record;
        if (!record) return;

        // Helper to safely convert Go byte slices to JS strings
        function decodeGoBytes(val) {
            if (!val) return "";
            if (typeof val === 'string') return val;
            try {
                if (typeof val === 'object') {
                    let str = "";
                    const len = val.length;
                    if (typeof len === 'number') {
                        for (let i = 0; i < len; i++) {
                            str += String.fromCharCode(val[i]);
                        }
                        return str;
                    }
                }
            } catch (err) {}
            return JSON.stringify(val);
        }

        function parseJsonField(val) {
            if (!val) return null;
            const str = decodeGoBytes(val);
            if (!str) return null;
            try {
                return JSON.parse(str);
            } catch (err) {
                return null;
            }
        }

        /**
         * Dispatches emails to recipients using system SMTP or custom override.
         */
        function dispatchEmails(subject, content, recipients, recordId) {
            console.log("[Email] Attempting to dispatch message " + recordId + " to " + recipients.length + " recipients");
            
            // 1. Resolve 'From' Address
            let fromAddress = "no-reply@choir.management";
            let fromName = "Choir Management Tool";
            try {
                const settings = $app.settings();
                fromAddress = settings.meta.senderAddress || fromAddress;
                fromName = settings.meta.senderName || fromName;
            } catch (err) {}

            // 2. Fetch Secret for HMAC
            let secret = "";
            try {
                const secretRecord = $app.findFirstRecordByFilter("appSettings", "key = 'HMAC_SECRET'");
                const parsed = parseJsonField(secretRecord.get("value"));
                secret = parsed ? parsed.secret : "";
            } catch (err) {}

            // 3. Resolve Base URL
            let baseUrl = "http://localhost:5173";
            try {
                const setting = $app.findFirstRecordByFilter("appSettings", "key = 'communications'");
                const p = parseJsonField(setting.get("value"));
                if (p && p.frontendUrl) baseUrl = p.frontendUrl;
            } catch (e) {}

            let successCount = 0;
            let errorCount = 0;

            recipients.forEach(r => {
                const email = r.email;
                if (!email) return;

                let finalContent = content;

                // Resolve Mailing Address
                if (finalContent.includes("{{MAILING_ADDRESS}}")) {
                    let mailingAddress = "123 Choir St, Harmony City, HC 12345";
                    try {
                        const setting = $app.findFirstRecordByFilter("appSettings", "key = 'communications'");
                        const p = parseJsonField(setting.get("value"));
                        if (p && p.mailingAddress) mailingAddress = p.mailingAddress;
                    } catch (e) {}
                    finalContent = finalContent.replace(/{{MAILING_ADDRESS}}/g, mailingAddress);
                }
                
                // Personalized Unsubscribe Link
                if (finalContent.includes("{{UNSUBSCRIBE_LINK}}") && secret) {
                    const payload = `p=${r.id}`;
                    const signature = $security.hs256(payload, secret);
                    const token = `${payload}&s=${signature}`;
                    const link = `${baseUrl}/unsubscribe?token=${encodeURIComponent(token)}`;
                    finalContent = finalContent.replace(/{{UNSUBSCRIBE_LINK}}/g, link);
                }

                try {
                    const message = new MailerMessage({
                        from: {
                            address: fromAddress,
                            name:    fromName,
                        },
                        to:      [{ address: email }],
                        subject: subject,
                        html:    finalContent.replace(/\n/g, "<br>"),
                    });

                    $app.newMailClient().send(message);
                    successCount++;
                } catch (err) {
                    console.log("[Email Error] Failed to send to " + email + ": " + err);
                    errorCount++;
                }
            });

            console.log("[Email] Dispatch complete for " + recordId + ". Success: " + successCount + ", Fail: " + errorCount);
        }

        const status = record.get("status");
        const original = e.originalCopy;
        const oldStatus = original ? original.get("status") : "";

        // Trigger delivery ONLY if status transitioned to "Sent"
        if (status === "Sent" && oldStatus === "Draft") {
            const type = record.get("type");
            if (type !== "Email" && type !== "Both") return;

            const subject = record.get("subject") || "Message from Choir Management";
            const content = record.get("content") || "";
            const recipientsRaw = record.get("recipients");
            const recipients = parseJsonField(recipientsRaw) || [];

            if (!recipients || !Array.isArray(recipients) || recipients.length === 0) return;

            dispatchEmails(subject, content, recipients, record.id);
        }
    } catch (hookErr) {
        console.log("[Hook Error] onRecordAfterUpdateSuccess failed: " + hookErr);
    }
}, "messages");

// SMTP Connection Test Custom Endpoint
routerAdd("POST", "/api/test-smtp", (e) => {
    try {
        const authRecord = e.auth;
        if (!authRecord || authRecord.get("role") !== "admin") {
            return e.json(403, { error: "Forbidden: Admins only" });
        }

        const data = e.requestInfo().body;
        const testEmail = data.email;

        if (!testEmail) {
            return e.json(400, { error: "Missing destination email address." });
        }

        const settings = $app.settings();
        const fromAddress = settings.meta.senderAddress || "no-reply@choir.management";
        const fromName = settings.meta.senderName || "Choir Management Tool";

        if (!settings.smtp.enabled) {
            return e.json(400, { error: "SMTP is not enabled on the PocketBase server. Please enable SMTP in PocketBase Admin UI first." });
        }

        // Try sending test email using PocketBase system mailer
        try {
            const message = new MailerMessage({
                from: {
                    address: fromAddress,
                    name:    fromName,
                },
                to:      [{ address: testEmail }],
                subject: "SMTP Connection Test Successful!",
                html:    "<p>Hello!</p><p>This is a test email sent from the Choir Management Tool to verify your server's SMTP setup.</p><p>Your server SMTP configuration is working perfectly!</p>",
            });

            $app.newMailClient().send(message);
        } catch (sendErr) {
            return e.json(500, { error: "SMTP Connection failed: " + sendErr.message });
        }

        return e.json(200, { success: true });
    } catch (err) {
        return e.json(500, { error: "Internal Server Error: " + err.message });
    }
});
