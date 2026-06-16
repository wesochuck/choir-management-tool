/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const templates = [
    { title: "Ticket Confirmation", qrBlock: "\n\n{{TICKET_QR}}\n\nShow this QR at the door for verification.\n" },
    { title: "Bundle Ticket Confirmation", qrBlock: "\n\n{{TICKET_QR}}\n\nValid for any of the included performances.\n" },
    { title: "Ticket Concert Reminder", qrBlock: "\n\n{{TICKET_QR}}\n\nDon't have your QR? It's in your original confirmation email.\n" },
  ];
  for (const tpl of templates) {
    try {
      const template = app.findFirstRecordByFilter("messageTemplates", "title = {:title} && isSystemTemplate = true", { title: tpl.title });
      const content = template.get("content") || "";
      template.set("content", content + tpl.qrBlock);
      app.save(template);
    } catch (e) {
      console.log(`Migration: template '${tpl.title}' not found, skipping`);
    }
  }
}, (app) => {
  const titles = ["Ticket Confirmation", "Bundle Ticket Confirmation", "Ticket Concert Reminder"];
  for (const title of titles) {
    try {
      const template = app.findFirstRecordByFilter("messageTemplates", "title = {:title} && isSystemTemplate = true", { title });
      let content = template.get("content") || "";
      content = content.replace(/\n\n\{\{TICKET_QR\}\}\n\n.*?\n/g, "\n");
      template.set("content", content);
      app.save(template);
    } catch (e) { /* ignore */ }
  }
});
