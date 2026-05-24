/// <reference path="../pb_data/types.d.ts" />

// Beta data repair: normalize legacy audition slot labels into UTC ISO strings.
// The fallback date is anchored to the repair date requested by the user.

migrate((app) => {
  const FALLBACK_YEAR = 2026;
  const FALLBACK_MONTH = 5;
  const FALLBACK_DAY = 24;

  function decodeGoBytes(val) {
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

  function parseJsonField(val) {
    if (!val) return null;
    const decoded = decodeGoBytes(val);
    if (!decoded) return null;
    if (typeof decoded === "object") return decoded;
    try {
      return JSON.parse(decoded);
    } catch (err) {
      return null;
    }
  }

  function getTimezone() {
    let timezone = "America/New_York";
    try {
      const record = app.findFirstRecordByFilter("appSettings", "key = 'timezone'");
      const parsed = parseJsonField(record.get("value"));
      if (typeof parsed === "string" && parsed) {
        timezone = parsed;
      } else if (parsed && typeof parsed === "object" && parsed.timezone) {
        timezone = parsed.timezone;
      }
    } catch (err) {}
    return timezone;
  }

  function nthSundayOfMonth(year, monthIndex, occurrence) {
    const first = new Date(Date.UTC(year, monthIndex, 1));
    return 1 + ((7 - first.getUTCDay()) % 7) + ((occurrence - 1) * 7);
  }

  function lastSundayOfMonth(year, monthIndex) {
    const last = new Date(Date.UTC(year, monthIndex + 1, 0));
    return last.getUTCDate() - last.getUTCDay();
  }

  function firstSundayOfMonth(year, monthIndex) {
    return nthSundayOfMonth(year, monthIndex, 1);
  }

  function isUsDstLocal(year, month, day, hour, standardOffsetMinutes, daylightOffsetMinutes) {
    const local = Date.UTC(year, month - 1, day, hour, 0, 0, 0);
    const startDay = nthSundayOfMonth(year, 2, 2);
    const endDay = nthSundayOfMonth(year, 10, 1);
    const start = Date.UTC(year, 2, startDay, 2, 0, 0, 0);
    const end = Date.UTC(year, 10, endDay, 2, 0, 0, 0);
    return local >= start && local < end;
  }

  function isEuropeDstLocal(year, month, day, hour) {
    const local = Date.UTC(year, month - 1, day, hour, 0, 0, 0);
    const start = Date.UTC(year, 2, lastSundayOfMonth(year, 2), 2, 0, 0, 0);
    const end = Date.UTC(year, 9, lastSundayOfMonth(year, 9), 3, 0, 0, 0);
    return local >= start && local < end;
  }

  function isSydneyDstLocal(year, month, day, hour) {
    const local = Date.UTC(year, month - 1, day, hour, 0, 0, 0);
    const start = Date.UTC(year, 9, firstSundayOfMonth(year, 9), 2, 0, 0, 0);
    const end = Date.UTC(year, 3, firstSundayOfMonth(year, 3), 3, 0, 0, 0);
    return local >= start || local < end;
  }

  function offsetMinutesForLocal(year, month, day, hour, timezone) {
    const tz = String(timezone || "").toLowerCase();

    function usZone(standard, daylight) {
      return isUsDstLocal(year, month, day, hour, standard, daylight) ? daylight : standard;
    }

    if (tz.indexOf("new_york") >= 0 || tz.indexOf("eastern") >= 0 || tz.indexOf("detroit") >= 0) return usZone(-300, -240);
    if (tz.indexOf("chicago") >= 0 || tz.indexOf("central") >= 0) return usZone(-360, -300);
    if (tz.indexOf("denver") >= 0 || tz.indexOf("mountain") >= 0) return usZone(-420, -360);
    if (tz.indexOf("anchorage") >= 0 || tz.indexOf("alaska") >= 0) return usZone(-540, -480);
    if (tz.indexOf("phoenix") >= 0 || tz.indexOf("arizona") >= 0) return -420;
    if (tz.indexOf("honolulu") >= 0 || tz.indexOf("hawaii") >= 0) return -600;
    if (tz.indexOf("los_angeles") >= 0 || tz === "pacific" || tz.indexOf("pacific time") >= 0) return usZone(-480, -420);
    if (tz.indexOf("london") >= 0) return isEuropeDstLocal(year, month, day, hour) ? 60 : 0;
    if (tz.indexOf("paris") >= 0 || tz.indexOf("berlin") >= 0 || tz.indexOf("rome") >= 0 || tz.indexOf("madrid") >= 0) {
      return isEuropeDstLocal(year, month, day, hour) ? 120 : 60;
    }
    if (tz.indexOf("tokyo") >= 0) return 540;
    if (tz.indexOf("sydney") >= 0) return isSydneyDstLocal(year, month, day, hour) ? 660 : 600;
    return 0;
  }

  function localToUtcIso(year, month, day, hour, minute, timezone) {
    const offsetMinutes = offsetMinutesForLocal(year, month, day, hour, timezone);
    return new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0) - offsetMinutes * 60 * 1000).toISOString();
  }

  function monthNumber(name) {
    const months = {
      jan: 1, january: 1,
      feb: 2, february: 2,
      mar: 3, march: 3,
      apr: 4, april: 4,
      may: 5,
      jun: 6, june: 6,
      jul: 7, july: 7,
      aug: 8, august: 8,
      sep: 9, sept: 9, september: 9,
      oct: 10, october: 10,
      nov: 11, november: 11,
      dec: 12, december: 12
    };
    return months[String(name || "").toLowerCase()] || 0;
  }

  function parseTimeParts(value) {
    const text = String(value || "");
    let match = text.match(/\b(\d{1,2}):(\d{2})\s*(AM|PM)?\b/i);
    if (!match) {
      match = text.match(/\b(\d{1,2})\s*(AM|PM)\b/i);
    }
    if (!match) return null;

    let hour = Number(match[1]);
    const minute = match[2] && /^\d{2}$/.test(match[2]) ? Number(match[2]) : 0;
    const meridiem = match[3] ? match[3].toUpperCase() : (match[2] && !/^\d{2}$/.test(match[2]) ? match[2].toUpperCase() : "");
    if (meridiem === "PM" && hour < 12) hour += 12;
    if (meridiem === "AM" && hour === 12) hour = 0;
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
    return { hour, minute };
  }

  function normalizeSlot(value, timezone) {
    if (value == null) return value;
    const raw = String(value).trim();
    if (!raw || raw.toLowerCase() === "any") return value;

    if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) {
      if (raw.endsWith("Z") || /[+-]\d{2}:?\d{2}$/.test(raw)) {
        const parsed = new Date(raw);
        return isNaN(parsed.getTime()) ? value : parsed.toISOString();
      }

      const localIso = raw.replace(" ", "T");
      const match = localIso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{1,2}):(\d{2})/);
      if (match) {
        return localToUtcIso(Number(match[1]), Number(match[2]), Number(match[3]), Number(match[4]), Number(match[5]), timezone);
      }
    }

    let year = FALLBACK_YEAR;
    let month = FALLBACK_MONTH;
    let day = FALLBACK_DAY;
    let hour = 0;
    let minute = 0;
    let hasDate = false;
    let hasTime = false;

    const wordDate = raw.match(/\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t|tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?/i);
    if (wordDate) {
      const parsedMonth = monthNumber(wordDate[1]);
      if (parsedMonth) {
        month = parsedMonth;
        day = Number(wordDate[2]);
        if (wordDate[3]) year = Number(wordDate[3]);
        hasDate = true;
      }
    } else {
      const numericDate = raw.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
      if (numericDate) {
        month = Number(numericDate[1]);
        day = Number(numericDate[2]);
        if (numericDate[3]) {
          const parsedYear = Number(numericDate[3]);
          year = parsedYear < 100 ? 2000 + parsedYear : parsedYear;
        }
        hasDate = true;
      }
    }

    const timeParts = parseTimeParts(raw.replace(/\b\d{4}\b/g, ""));
    if (timeParts) {
      hour = timeParts.hour;
      minute = timeParts.minute;
      hasTime = true;
    }

    if (!hasDate && !hasTime) return value;
    if (!hasDate) {
      year = FALLBACK_YEAR;
      month = FALLBACK_MONTH;
      day = FALLBACK_DAY;
    }

    return localToUtcIso(year, month, day, hour, minute, timezone);
  }

  function normalizeSlotArray(value, timezone) {
    if (!Array.isArray(value)) return value;
    const normalized = [];
    for (let i = 0; i < value.length; i++) {
      const slot = normalizeSlot(value[i], timezone);
      if (slot && normalized.indexOf(slot) === -1) {
        normalized.push(slot);
      }
    }
    normalized.sort();
    return normalized;
  }

  const timezone = getTimezone();

  function ensureScheduledTimeSlotDateField() {
    let collection = app.findCollectionByNameOrId("pbc_auditions_001");
    const existingDateField = collection.fields.getByName("scheduledTimeSlot");
    if (existingDateField && existingDateField.type === "date") {
      return;
    }

    const legacyField = existingDateField || collection.fields.getByName("timeSlot");
    if (legacyField) {
      legacyField.name = "scheduledTimeSlotLegacy";
      legacyField.required = false;
      app.save(collection);
      collection = app.findCollectionByNameOrId("pbc_auditions_001");
    }

    if (!collection.fields.getByName("scheduledTimeSlot")) {
      collection.fields.push(new DateField({
        name: "scheduledTimeSlot",
        required: false,
        presentable: false
      }));
      app.save(collection);
    }
  }

  ensureScheduledTimeSlotDateField();

  try {
    const settings = app.findFirstRecordByFilter("appSettings", "key = 'auditions'");
    const value = parseJsonField(settings.get("value"));
    if (value && typeof value === "object" && Array.isArray(value.slots)) {
      value.slots = normalizeSlotArray(value.slots, timezone);
      settings.set("value", value);
      app.saveNoValidate(settings);
    }
  } catch (err) {}

  const auditions = app.findRecordsByFilter("auditions", "", "", 1000, 0);
  auditions.forEach((audition) => {
    let changed = false;

    const scheduled = audition.get("scheduledTimeSlot") || audition.get("scheduledTimeSlotLegacy") || audition.get("timeSlot") || "";
    const normalizedScheduled = normalizeSlot(scheduled, timezone);
    if (scheduled && normalizedScheduled && normalizedScheduled !== scheduled) {
      audition.set("scheduledTimeSlot", normalizedScheduled);
      changed = true;
    }

    const requestedSlots = parseJsonField(audition.get("requestedSlots"));
    const normalizedRequestedSlots = normalizeSlotArray(requestedSlots, timezone);
    if (Array.isArray(requestedSlots) && JSON.stringify(requestedSlots) !== JSON.stringify(normalizedRequestedSlots)) {
      audition.set("requestedSlots", normalizedRequestedSlots);
      changed = true;
    }

    if (changed) {
      app.saveNoValidate(audition);
    }
  });

  try {
    const collection = app.findCollectionByNameOrId("pbc_auditions_001");
    const legacyField = collection.fields.getByName("scheduledTimeSlotLegacy");
    if (legacyField) {
      collection.fields.removeById(legacyField.id);
      app.save(collection);
    }
  } catch (err) {}
}, (app) => {
  // One-way beta data repair. Ambiguous display labels cannot be reconstructed after normalization.
});
