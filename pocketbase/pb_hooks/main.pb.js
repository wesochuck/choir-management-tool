// PocketBase Backend Hooks - Automated Attendance Reports

cronAdd("post_event_report", "0 * * * *", () => {
    const twelveHoursAgo = new Date();
    twelveHoursAgo.setHours(twelveHoursAgo.getHours() - 12);
    
    const thirteenHoursAgo = new Date();
    thirteenHoursAgo.setHours(thirteenHoursAgo.getHours() - 13);

    const start = thirteenHoursAgo.toISOString().replace('T', ' ').split('.')[0];
    const end = twelveHoursAgo.toISOString().replace('T', ' ').split('.')[0];

    // 1. Find events that occurred between 12 and 13 hours ago
    const events = $app.dao().findRecordsByFilter(
        "events",
        "date >= {:start} && date < {:end}",
        "-date",
        100,
        0,
        { start, end }
    );

    if (!events || events.length === 0) return;

    // 2. Fetch Admin Users
    const admins = $app.dao().findRecordsByFilter("users", "role = 'admin'");
    if (!admins || admins.length === 0) return;

    // 3. Fetch SMTP Config
    let smtpConfig = null;
    try {
        const setting = $app.dao().findFirstRecordByFilter("appSettings", "key = 'communications_config'");
        const value = setting.get("value");
        smtpConfig = (typeof value === 'string' ? JSON.parse(value) : value).smtp;
    } catch (e) {
        return;
    }

    if (!smtpConfig || !smtpConfig.host) return;

    events.forEach(event => {
        // 4. Aggregate Attendance for this event
        const rosters = $app.dao().findRecordsByFilter("eventRosters", "event = {:eventId}", "profile.name", 500, 0, { eventId: event.id });
        if (!rosters || rosters.length === 0) return;

        const total = rosters.length;
        const present = rosters.filter(r => r.get("attendance") === "Present").length;
        const absentees = rosters.filter(r => r.get("attendance") === "Absent").map(r => {
            try {
                const profile = $app.dao().findRecordById("profiles", r.get("profile"));
                return profile.get("name");
            } catch (e) {
                return "Unknown Singer";
            }
        });

        const attendanceRate = total > 0 ? ((present / total) * 100).toFixed(1) : 0;

        // 5. Check Thresholds if it's a rehearsal for a concert
        let thresholdWarnings = [];
        const parentId = event.get("parentPerformanceId");
        if (parentId && event.get("type") === "Rehearsal") {
            // Find all rehearsals for this concert
            const otherRehearsals = $app.dao().findRecordsByFilter("events", "parentPerformanceId = {:parentId} && type = 'Rehearsal'", "date", 100, 0, { parentId });
            const rehearsalIds = otherRehearsals.map(r => r.id);
            
            const absenteeRecords = rosters.filter(r => r.get("attendance") === "Absent");
            absenteeRecords.forEach(r => {
                const profileId = r.get("profile");
                // Count absences across all rehearsals for this concert
                let totalMisses = 0;
                rehearsalIds.forEach(rid => {
                    try {
                        const pastRoster = $app.dao().findFirstRecordByFilter("eventRosters", "profile = {:profileId} && event = {:rid} && attendance = 'Absent'", { profileId, rid });
                        if (pastRoster) totalMisses++;
                    } catch (e) { /* ignore 404 */ }
                });

                if (totalMisses >= 2) {
                    try {
                        const profile = $app.dao().findRecordById("profiles", profileId);
                        thresholdWarnings.push(`${profile.get("name")} (${totalMisses} total misses for this concert series)`);
                    } catch (e) {}
                }
            });
        }

        // 6. Build Email Content
        const eventDateStr = new Date(event.get("date")).toLocaleDateString();
        const subject = `Attendance Report: ${event.get("title")} (${eventDateStr})`;
        const body = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e9f0eb; border-radius: 8px;">
                <h2 style="color: #2c3e50; margin-top: 0;">Attendance Summary</h2>
                <p style="font-size: 16px;"><strong>Event:</strong> ${event.get("title")}</p>
                <p style="font-size: 16px;"><strong>Date:</strong> ${eventDateStr}</p>
                <div style="background-color: #f8faf9; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <p style="margin: 0; font-size: 18px;"><strong>Attendance Rate:</strong> <span style="color: #1b4d3e;">${attendanceRate}%</span></p>
                    <p style="margin: 5px 0 0 0; color: #64748b;">${present} present / ${total} total participants</p>
                </div>
                
                <h3 style="border-bottom: 2px solid #e9f0eb; padding-bottom: 8px;">Absentees</h3>
                <ul style="padding-left: 20px;">
                    ${absentees.length > 0 ? absentees.map(name => `<li style="margin-bottom: 4px;">${name}</li>`).join('') : '<li>None</li>'}
                </ul>

                ${thresholdWarnings.length > 0 ? `
                    <div style="margin-top: 30px; padding: 15px; background-color: #fff1f2; border: 1px solid #fecaca; border-radius: 6px;">
                        <h3 style="color: #991b1b; margin-top: 0;">⚠️ Threshold Warnings (2+ Misses)</h3>
                        <p style="font-size: 14px; color: #7f1d1d;">The following singers have reached or exceeded 2 absences for this concert series:</p>
                        <ul style="padding-left: 20px; color: #991b1b;">
                            ${thresholdWarnings.map(msg => `<li style="margin-bottom: 4px;">${msg}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}

                <hr style="border: 0; border-top: 1px solid #e9f0eb; margin: 30px 0;" />
                <p style="font-size: 12px; color: #94a3b8; text-align: center;">
                    This is an automated report generated 12 hours after the event concluded.
                    <br />
                    Choir Management Tool
                </p>
            </div>
        `;

        // 7. Send to all admins
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
            } catch (e) {
                // Log email failure if needed
            }
        });
    });
});
