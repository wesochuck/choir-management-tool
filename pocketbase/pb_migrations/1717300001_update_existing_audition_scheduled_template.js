/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  try {
    const sRecord = app.findFirstRecordByFilter("messageTemplates", "title = 'Audition Scheduled'");
    sRecord.set("content", "Hello {singerName},\n\nWe are pleased to confirm your audition for **{eventTitle}**.\n\n**Confirmed Time Slot:** {timeSlot}\n\n{eventCalendarLink}\n\nPlease arrive 10 minutes early to warm up. If you need to cancel or reschedule, please let us know as soon as possible.\n\nBest regards,\nChoir Management");
    app.save(sRecord);
  } catch (e) {}
}, (app) => {
});
