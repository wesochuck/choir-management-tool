/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_auditions_001");
  
  // 1. Rename timeSlot to scheduledTimeSlot and make it optional
  const timeSlotField = collection.fields.getByName("timeSlot");
  if (timeSlotField) {
    timeSlotField.name = "scheduledTimeSlot";
    timeSlotField.required = false;
  }

  // 2. Add requestedSlots JSONField
  const requestedSlotsField = collection.fields.getByName("requestedSlots");
  if (!requestedSlotsField) {
    collection.fields.push(new JSONField({
      name: "requestedSlots",
      required: false,
      presentable: false
    }));
  }

  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_auditions_001");
  
  // 1. Remove requestedSlots JSONField
  const requestedSlotsField = collection.fields.getByName("requestedSlots");
  if (requestedSlotsField) {
    collection.fields.removeById(requestedSlotsField.id);
  }

  // 2. Rename scheduledTimeSlot back to timeSlot and make it required
  const scheduledTimeSlotField = collection.fields.getByName("scheduledTimeSlot");
  if (scheduledTimeSlotField) {
    scheduledTimeSlotField.name = "timeSlot";
    scheduledTimeSlotField.required = true;
  }

  app.save(collection);
});
