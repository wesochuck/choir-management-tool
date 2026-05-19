// PocketBase Backend Hooks - Automated Attendance Reports

cronAdd("post_event_report", "0 * * * *", () => {
    // 1. Fetch SMTP Config
    let smtpConfig = null;
    try {
        const setting = $app.findFirstRecordByFilter("appSettings", "key = 'communications_config'");
        const value = setting.get("value");
        smtpConfig = (typeof value === 'string' ? JSON.parse(value) : value).smtp;
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
        const value = setting.get("value");
        const parsed = typeof value === 'string' ? JSON.parse(value) : value;
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
            .replace(/{eventTitle}/g, event.get("title"))
            .replace(/{eventDate}/g, eventDateStr);

        let templateBody = commSettings.reportBodyTemplate
            .replace(/{eventTitle}/g, event.get("title"))
            .replace(/{eventDate}/g, eventDateStr)
            .replace(/{attendanceRate}/g, attendanceRate)
            .replace(/{presentCount}/g, present)
            .replace(/{totalCount}/g, total)
            .replace(/{absenteesList}/g, absentees.length > 0 ? absentees.map(name => `<li style="margin-bottom: 4px;">${name}</li>`).join('') : '<li>None</li>')
            .replace(/{thresholdWarningsSection}/g, thresholdWarnings.length > 0 ? `
                <div style="margin-top: 30px; padding: 15px; background-color: #fff1f2; border: 1px solid #fecaca; border-radius: 6px;">
                    <h3 style="color: #991b1b; margin-top: 0;">⚠️ Threshold Warnings (2+ Misses)</h3>
                    <p style="font-size: 14px; color: #7f1d1d;">The following singers have reached or exceeded 2 absences for this concert series:</p>
                    <ul style="padding-left: 20px; color: #991b1b;">
                        ${thresholdWarnings.map(msg => `<li style="margin-bottom: 4px;">${msg}</li>`).join('')}
                    </ul>
                </div>
            ` : '');

        const body = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e9f0eb; border-radius: 8px;">
                ${templateBody}
                <hr style="border: 0; border-top: 1px solid #e9f0eb; margin: 30px 0;" />
                <p style="font-size: 12px; color: #94a3b8; text-align: center;">
                    This is an automated report generated ${hoursAfter} hours after the event concluded.
                    <br />
                    Choir Management Tool
                </p>
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
    });
});

cronAdd("automated_event_reminders", "30 * * * *", () => {
    // 1. Fetch SMTP Config
    let smtpConfig = null;
    try {
        const setting = $app.findFirstRecordByFilter("appSettings", "key = 'communications_config'");
        const value = setting.get("value");
        smtpConfig = (typeof value === 'string' ? JSON.parse(value) : value).smtp;
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
        const value = setting.get("value");
        const parsed = typeof value === 'string' ? JSON.parse(value) : value;
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
        secret = record.get("value").secret;
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
            if (secret) {
                const payload = `e=${event.id}&p=${profile.id}`;
                const signature = $security.hs256(payload, secret);
                const token = `${payload}&s=${signature}`;
                
                const baseUrl = "http://localhost:5173"; // Default dev frontend URL
                const yesLink = `${baseUrl}/rsvp?token=${token}&rsvp=Yes`;
                const noLink = `${baseUrl}/rsvp?token=${token}&rsvp=No`;
                rsvpLinksText = `Yes: ${yesLink}\nNo: ${noLink}`;
            }

            // Render subject and body templates
            const subject = commSettings.reminderSubjectTemplate
                .replace(/{eventTitle}/g, event.get("title"));

            const bodyHtml = commSettings.reminderBodyTemplate
                .replace(/{singerName}/g, profile.get("name"))
                .replace(/{eventTitle}/g, event.get("title"))
                .replace(/{eventType}/g, event.get("type"))
                .replace(/{eventDate}/g, eventDateStr)
                .replace(/{eventLocation}/g, venueName)
                .replace(/{eventDetails}/g, event.get("details") || "")
                .replace(/{rsvpLinks}/g, rsvpLinksText)
                .replace(/\n/g, "<br>");

            const finalBody = `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e9f0eb; border-radius: 8px;">
                    ${bodyHtml}
                    <hr style="border: 0; border-top: 1px solid #e9f0eb; margin: 30px 0;" />
                    <p style="font-size: 12px; color: #94a3b8; text-align: center;">
                        This is an automated reminder generated before the event.
                        <br />
                        Choir Management Tool
                    </p>
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
            } catch (e) {}
        });
    });
});

// Automated Server-Side Email Delivery on Message Creation
onRecordAfterCreateSuccess((e) => {
    const record = e.record;
    const type = record.get("type");
    if (type !== "Email" && type !== "Both") {
        return;
    }

    const subject = record.get("subject") || "Message from Choir Management";
    const content = record.get("content") || "";

    const recipientsRaw = record.get("recipients");
    let recipients = [];
    if (typeof recipientsRaw === 'string') {
        try {
            recipients = JSON.parse(recipientsRaw);
        } catch (err) {}
    } else {
        recipients = recipientsRaw;
    }

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return;
    }

    let smtpConfig = null;
    try {
        const setting = $app.findFirstRecordByFilter("appSettings", "key = 'communications_config'");
        const value = setting.get("value");
        smtpConfig = (typeof value === 'string' ? JSON.parse(value) : value).smtp;
    } catch (err) {}

    const fromAddress = (smtpConfig && (smtpConfig.from || smtpConfig.user)) || "no-reply@choir.management";

    recipients.forEach(r => {
        const email = r.email;
        if (!email) return;

        try {
            const message = new MailerMessage({
                from: {
                    address: fromAddress,
                    name:    "Choir Management Tool",
                },
                to:      [{ address: email }],
                subject: subject,
                html:    content.replace(/\n/g, "<br>"),
            });

            $app.newMailClient().send(message);
        } catch (err) {
            // Log or ignore sending error
        }
    });
}, "messages");
