/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_music_library_001");

  // 1. Add new arranger field
  collection.fields.add(
    new TextField({
      name: "arranger",
      required: false,
    })
  );
  app.save(collection);

  // 2. Backfill helper for intelligent split
  function trimStr(s) {
    if (!s) return "";
    return s.replace(/^[\s,;./()]+|[\s,;./()]+$/g, '').trim();
  }

  function parseComposerArranger(combined) {
    if (!combined) return { composer: "", arranger: "" };

    // Pattern 1: Check if there's a parentheses with an arranger inside, like "Traditional (arr. Moses Hogan)"
    const parenArrMatch = combined.match(/\((?:arr|arranged)(?:\.|by)?\s*([^)]+)\)/i);
    if (parenArrMatch) {
      const arranger = trimStr(parenArrMatch[1]);
      const composer = trimStr(combined.replace(parenArrMatch[0], ''));
      if (composer && arranger) {
        return { composer, arranger };
      }
    }

    // Pattern 2: Check standard parentheses like "(arr.)" or "(arr)" at the end, e.g. "Moses Hogan (arr.)"
    const parenArrSuffixMatch = combined.match(/\((?:arr|arranged)\.?\)/i);
    if (parenArrSuffixMatch) {
      const composer = trimStr(combined.replace(parenArrSuffixMatch[0], ''));
      return { composer, arranger: "" };
    }

    // Pattern 3: Split by common delimiters like "/ arr. ", ", arr. ", " arr. ", "arranged by", "/ arr"
    const splitRegex = /(?:\/|,|\b)\s*(?:arr(?:anged)?\b\.?\s*(?:by)?)\s+/i;
    const match = combined.match(splitRegex);
    if (match && match.index !== undefined) {
      const composer = trimStr(combined.slice(0, match.index));
      const arranger = trimStr(combined.slice(match.index + match[0].length));
      if (composer && arranger) {
        return { composer, arranger };
      }
    }

    // Pattern 4: Fallback to simple split by "/" if the word "arr" or "arrange" appears in the second half
    if (combined.indexOf('/') !== -1) {
      const parts = combined.split('/');
      if (parts.length === 2) {
        const left = trimStr(parts[0]);
        const right = trimStr(parts[1]);
        if (/arr|arrange/i.test(right)) {
          const arrangerVal = right.replace(/^(?:arr(?:anged)?\b\.?\s*(?:by)?\s*)/i, '').trim();
          return {
            composer: left,
            arranger: trimStr(arrangerVal)
          };
        }
      }
    }

    return { composer: trimStr(combined), arranger: "" };
  }

  // 3. Scan and backfill existing entries
  let offset = 0;
  while (true) {
    const records = app.findRecordsByFilter("musicLibrary", "", "", 100, offset);
    if (!records || records.length === 0) {
      break;
    }

    records.forEach((record) => {
      const currentComposer = record.get("composer");
      if (currentComposer) {
        const { composer, arranger } = parseComposerArranger(currentComposer);
        if (arranger) {
          record.set("composer", composer);
          record.set("arranger", arranger);
          app.saveNoValidate(record);
        }
      }
    });

    offset += records.length;
  }

}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_music_library_001");
  try {
    collection.fields.removeByName("arranger");
    app.save(collection);
  } catch (e) {}
});
