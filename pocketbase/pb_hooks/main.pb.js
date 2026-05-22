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

    // 1. Fetch SMTP Config
    let smtpConfig = null;
    try {
        const setting = $app.findFirstRecordByFilter("appSettings", "key = 'communications_config'");
        const parsed = parseJsonField(setting.get("value"));
        smtpConfig = parsed ? parsed.smtp : null;
    } catch (e) {
        return;
    }

    if (!smtpConfig || !smtpConfig.host) return;

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

    const startWindow = new Date();
    startWindow.setHours(startWindow.getHours() - startHour);
    
    const endWindow = new Date();
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
                        thresholdWarnings.push(`${profile.get("name")} (${totalMisses} total misses for this concert series)`);
                    } catch (e) {}
                }
            });
        }

        // Build Email Content
        const eventDateStr = new Date(event.get("date")).toLocaleDateString();
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
                        ${thresholdWarnings.map(msg => `<li style="margin-bottom: 4px;">${escapeHtml(msg)}</li>`).join('')}
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
                        address: smtpConfig.from || smtpConfig.user,
                        name:    "Choir Management Tool",
                    },
                    to:      [{ address: admin.get("email") }],
                    subject: subject,
                    html:    body,
                });

                $app.newMailClient().send(message);
            } catch (e) {}
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

cronAdd("automated_event_reminders", "30 * * * *", () => {
    // Disabled: Automated background reminders are disabled.
    // The admin now proactively drafts and sends RSVP invites directly from the Communications pane on save.
    return;

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

    // 1. Fetch SMTP Config
    let smtpConfig = null;
    try {
        const setting = $app.findFirstRecordByFilter("appSettings", "key = 'communications_config'");
        const parsed = parseJsonField(setting.get("value"));
        smtpConfig = parsed ? parsed.smtp : null;
    } catch (e) {
        return;
    }

    if (!smtpConfig || !smtpConfig.host) return;

    // 2. Fetch Communication Settings
    let commSettings = {
        reminderEnabled: false,
        reminderHoursBefore: 24,
        reminderSubjectTemplate: 'Choir Event Reminder: {eventTitle}',
        reminderBodyTemplate: 'Hello {singerName},\n\nThis is an automatic reminder for the upcoming choir event:\n**{eventTitle}** ({eventType})\n\n**When:** {eventDate}\n**Where:** {eventLocation}\n\nDetails: {eventDetails}\n\nPlease make sure your RSVP is up to date: {rsvpLinks}\n\nSee you there!\nChoir Management'
    };
    try {
        const setting = $app.findFirstRecordByFilter("appSettings", "key = 'communications'");
        const parsed = parseJsonField(setting.get("value"));
        if (parsed) {
            if (typeof parsed.reminderEnabled !== 'undefined') commSettings.reminderEnabled = parsed.reminderEnabled;
            if (typeof parsed.reminderHoursBefore !== 'undefined') commSettings.reminderHoursBefore = Number(parsed.reminderHoursBefore);
            if (parsed.reminderSubjectTemplate) commSettings.reminderSubjectTemplate = parsed.reminderSubjectTemplate;
            if (parsed.reminderBodyTemplate) commSettings.reminderBodyTemplate = parsed.reminderBodyTemplate;
        }
    } catch (e) {
        // Fallback to default
    }

    if (!commSettings.reminderEnabled) return;

    // 3. Find events starting in the configured window (e.g. between N and N+1 hours from now)
    const hoursBefore = commSettings.reminderHoursBefore;
    const now = new Date();
    
    const windowStart = new Date(now.getTime() + hoursBefore * 60 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + (hoursBefore + 1) * 60 * 60 * 1000);

    const start = windowStart.toISOString().replace('T', ' ').split('.')[0];
    const end = windowEnd.toISOString().replace('T', ' ').split('.')[0];

    const events = $app.findRecordsByFilter(
        "events",
        "date >= {:start} && date < {:end}",
        "-date",
        100,
        0,
        { start, end }
    );

    if (!events || events.length === 0) return;

    // 4. Fetch HMAC_SECRET for RSVP tokens
    let secret = "";
    try {
        const record = $app.findFirstRecordByFilter("appSettings", "key = 'HMAC_SECRET'");
        const parsed = parseJsonField(record.get("value"));
        secret = parsed ? parsed.secret : "";
    } catch (err) {}

    // Find active singers
    const activeProfiles = $app.findRecordsByFilter("profiles", "globalStatus != 'Inactive'");
    if (!activeProfiles || activeProfiles.length === 0) return;

    events.forEach(event => {
        // Fetch rosters to check RSVP status
        const rosters = $app.findRecordsByFilter("eventRosters", "event = {:eventId}", "profile.name", 500, 0, { eventId: event.id });
        const rsvpMap = {};
        rosters.forEach(r => {
            rsvpMap[r.get("profile")] = r.get("rsvp");
        });

        // Resolve venue if present
        let venueName = "TBD";
        try {
            const venueId = event.get("venue");
            if (venueId) {
                const venueRecord = $app.findRecordById("venues", venueId);
                venueName = venueRecord.get("name") || "TBD";
            }
        } catch (e) {}

        const eventDateStr = new Date(event.get("date")).toLocaleString();
        const subject = commSettings.reminderSubjectTemplate.replace(/{eventTitle}/g, event.get("title"));
        const sentRecipients = [];
        let bodyHtmlGeneric = "";

        activeProfiles.forEach(profile => {
            const rsvp = rsvpMap[profile.id] || "Pending";
            // If they RSVP'd 'No', or have doNotEmail, don't email them
            if (rsvp === "No" || profile.get("doNotEmail") === true) return;

            // Fetch singer's email
            let email = "";
            try {
                const user = $app.findRecordById("users", profile.get("user"));
                email = user.get("email");
            } catch (e) {
                return; // skip if no email
            }
            if (!email) return;

            // Generate RSVP links if needed
            let rsvpLinksText = "[RSVP Links will appear here]";
            let unsubscribeLink = "{{UNSUBSCRIBE_LINK}}";
            let baseUrl = "http://localhost:5173";
            let mailingAddress = "123 Choir St, Harmony City, HC 12345";
            try {
                const setting = $app.findFirstRecordByFilter("appSettings", "key = 'communications'");
                const p = parseJsonField(setting.get("value"));
                if (p && p.frontendUrl) baseUrl = p.frontendUrl;
                if (p && p.mailingAddress) mailingAddress = p.mailingAddress;
            } catch (e) {}

            if (secret) {
                const payload = `e=${event.id}&p=${profile.id}`;
                const signature = $security.hs256(payload, secret);
                const token = `${payload}&s=${signature}`;

                const yesLink = `${baseUrl}/rsvp?token=${encodeURIComponent(token)}&rsvp=Yes`;
                const noLink = `${baseUrl}/rsvp?token=${encodeURIComponent(token)}&rsvp=No`;
                rsvpLinksText = `Yes: ${yesLink}\nNo: ${noLink}`;

                const unsubscribeToken = `p=${profile.id}&s=${$security.hs256(`p=${profile.id}`, secret)}`;
                unsubscribeLink = `${baseUrl}/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;
            }

            const bodyHtml = commSettings.reminderBodyTemplate
                .replace(/{singerName}/g, escapeHtml(profile.get("name")))
                .replace(/{eventTitle}/g, escapeHtml(event.get("title")))
                .replace(/{eventType}/g, escapeHtml(event.get("type")))
                .replace(/{eventDate}/g, escapeHtml(eventDateStr))
                .replace(/{eventLocation}/g, escapeHtml(venueName))
                .replace(/{eventDetails}/g, escapeHtml(event.get("details") || ""))
                .replace(/{rsvpLinks}/g, escapeHtml(rsvpLinksText))
                .replace(/\n/g, "<br>");

            // Generate a generic body template for logging (only once)
            if (!bodyHtmlGeneric) {
                bodyHtmlGeneric = commSettings.reminderBodyTemplate
                    .replace(/{singerName}/g, "Singer")
                    .replace(/{eventTitle}/g, escapeHtml(event.get("title")))
                    .replace(/{eventType}/g, escapeHtml(event.get("type")))
                    .replace(/{eventDate}/g, escapeHtml(eventDateStr))
                    .replace(/{eventLocation}/g, escapeHtml(venueName))
                    .replace(/{eventDetails}/g, escapeHtml(event.get("details") || ""))
                    .replace(/{rsvpLinks}/g, escapeHtml(rsvpLinksText))
                    .replace(/\n/g, "<br>");

                bodyHtmlGeneric += `
                    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e9f0eb; font-size: 12px; color: #94a3b8; text-align: center;">
                        <p style="margin: 0 0 10px 0;">${mailingAddress}</p>
                        <p style="margin: 0;">
                            You are receiving this because you are an active member of the choir. 
                            <br>
                            <a href="{{UNSUBSCRIBE_LINK}}" style="color: #4a7c59; text-decoration: underline;">Unsubscribe from these emails</a>
                        </p>
                    </div>
                `;
            }

            const finalBody = `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e9f0eb; border-radius: 8px;">
                    ${bodyHtml}
                    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e9f0eb; font-size: 12px; color: #94a3b8; text-align: center;">
                        <p style="margin: 0 0 10px 0;">${mailingAddress}</p>
                        <p style="margin: 0;">
                            You are receiving this because you are an active member of the choir. 
                            <br>
                            <a href="${unsubscribeLink}" style="color: #4a7c59; text-decoration: underline;">Unsubscribe from these emails</a>
                        </p>
                    </div>
                </div>
            `;

            try {
                const message = new MailerMessage({
                    from: {
                        address: smtpConfig.from || smtpConfig.user,
                        name:    "Choir Management Tool",
                    },
                    to:      [{ address: email }],
                    subject: subject,
                    html:    finalBody,
                });

                $app.newMailClient().send(message);

                sentRecipients.push({
                    id: profile.id,
                    name: profile.get("name"),
                    email: email,
                    phone: profile.get("phone") || "",
                    voicePart: profile.get("voicePart") || "",
                    globalStatus: profile.get("globalStatus") || ""
                });
            } catch (e) {}
        });

        if (sentRecipients.length > 0) {
            try {
                const messageCollection = $app.findCollectionByNameOrId("messages");
                const finalBodyGeneric = `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e9f0eb; border-radius: 8px;">
                        ${bodyHtmlGeneric}
                    </div>
                `;
                const record = new Record(messageCollection, {
                    subject: commSettings.reminderSubjectTemplate.replace(/{eventTitle}/g, event.get("title")),
                    content: finalBodyGeneric,
                    type: "Email",
                    recipients: sentRecipients,
                    filters: { alreadySent: true, type: "Automated Reminder", eventId: event.id }
                });
                $app.save(record);
            } catch (e) {
                console.log("Failed to save automated reminder message log: " + e);
            }
        }
    });
});

// Automated Server-Side Email Delivery on Message Creation
onRecordAfterCreateSuccess((e) => {
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

    const record = e.record;
    const type = record.get("type");
    if (type !== "Email" && type !== "Both") {
        return;
    }

    const filtersRaw = record.get("filters");
    const filters = parseJsonField(filtersRaw) || {};

    if (filters && filters.alreadySent === true) {
        return;
    }

    const subject = record.get("subject") || "Message from Choir Management";
    let content = record.get("content") || "";

    // Sanitize user-provided content to prevent HTML injection / XSS
    content = escapeHtml(content);

    const recipientsRaw = record.get("recipients");
    const recipients = parseJsonField(recipientsRaw) || [];

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return;
    }

    let smtpConfig = null;
    try {
        const setting = $app.findFirstRecordByFilter("appSettings", "key = 'communications_config'");
        const parsed = parseJsonField(setting.get("value"));
        smtpConfig = parsed ? parsed.smtp : null;
    } catch (err) {}

    const fromAddress = (smtpConfig && (smtpConfig.from || smtpConfig.user)) || "no-reply@choir.management";

    // Fetch Secret for HMAC
    let secret = "";
    try {
        const record = $app.findFirstRecordByFilter("appSettings", "key = 'HMAC_SECRET'");
        const parsed = parseJsonField(record.get("value"));
        secret = parsed ? parsed.secret : "";
    } catch (err) {}

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
            
            // Resolve Base URL from settings
            let baseUrl = "http://localhost:5173";
            try {
                const setting = $app.findFirstRecordByFilter("appSettings", "key = 'communications'");
                const p = parseJsonField(setting.get("value"));
                if (p && p.frontendUrl) baseUrl = p.frontendUrl;
            } catch (e) {}

            const link = `${baseUrl}/unsubscribe?token=${encodeURIComponent(token)}`;
            finalContent = finalContent.replace(/{{UNSUBSCRIBE_LINK}}/g, link);
        }

        try {
            const message = new MailerMessage({
                from: {
                    address: fromAddress,
                    name:    "Choir Management Tool",
                },
                to:      [{ address: email }],
                subject: subject,
                html:    finalContent.replace(/\n/g, "<br>"),
            });

            $app.newMailClient().send(message);
        } catch (err) {
            // Log or ignore sending error
        }
    });
}, "messages");
