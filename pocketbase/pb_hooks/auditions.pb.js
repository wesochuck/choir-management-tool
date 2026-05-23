// Auditions Automation Hooks

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
            const timeSlot = audition.get("timeSlot") || "Any";
            
            let rawContent = template.get("content") || "";
            rawContent = rawContent.replace(/{timeSlot}/g, timeSlot);

            const queueRecord = new Record(queueCollection, {
                recipientId: audition.id, // Using audition ID since they aren't a profile yet
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
        const original = e.originalCopy;
        if (!audition || !original) return;

        const currentStatus = audition.get("status");
        const oldStatus = original.get("status");

        if (currentStatus === "Scheduled" && oldStatus !== "Scheduled") {
            const contact = audition.get("contact") || "";
            const isEmail = contact.includes("@") && contact.includes(".");

            if (isEmail) {
                const template = $app.findFirstRecordByFilter("messageTemplates", "title = 'Audition Scheduled' && isSystemTemplate = true");
                if (!template) return;

                const queueCollection = $app.findCollectionByNameOrId("emailQueue");
                const eventId = audition.get("performance") || "";
                const timeSlot = audition.get("timeSlot") || "Any";
                
                let rawContent = template.get("content") || "";
                rawContent = rawContent.replace(/{timeSlot}/g, timeSlot);

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
