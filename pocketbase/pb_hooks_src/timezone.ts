import { getTimezoneOffsetInfo } from './email/hookText';

/**
 * Converts a YYYY-MM-DDTHH:MM datetime-local value (representing the local time in the
 * target timezone) back into a UTC ISO string ("2023-10-15T23:00:00.000Z") to store in the database.
 * 
 * Mirror of src/lib/timezone.ts logic but safe for Goja VM (PocketBase hooks).
 */
export function zonedInputValueToUtcLocal(localString: string, timeZone: string): string {
    if (!localString) return "";

    const parts = localString.split("T");
    if (parts.length !== 2) return new Date(localString).toISOString();

    const [datePart, timePart] = parts;
    const [year, month, day] = datePart.split("-").map(Number);
    const [hours, minutes] = timePart.split(":").map(Number);

    // 1. Construct standard UTC Date using the target numbers as a baseline guess
    let utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes));

    // 2. We do up to 3 iterative passes to converge to the exact correct offset
    // This handles DST transitions correctly.
    for (let iter = 0; iter < 3; iter++) {
        const offsetInfo = getTimezoneOffsetInfo(utcDate, timeZone);
        const offsetMs = offsetInfo.offsetMinutes * 60 * 1000;

        // The local representation of this candidate UTC date is:
        const localRepTime = utcDate.getTime() + offsetMs;
        const localRepDate = new Date(localRepTime);

        // Candidate "local representation" parts
        const formattedYear = localRepDate.getUTCFullYear();
        const formattedMonth = localRepDate.getUTCMonth() + 1;
        const formattedDay = localRepDate.getUTCDate();
        let formattedHour = localRepDate.getUTCHours();
        const formattedMinute = localRepDate.getUTCMinutes();
        const formattedSecond = localRepDate.getUTCSeconds();

        if (formattedHour === 24) {
            formattedHour = 0;
        }

        // Compute target zoned timestamp representation for the current candidate UTC date
        const zonedTimestamp = Date.UTC(
            formattedYear,
            formattedMonth - 1,
            formattedDay,
            formattedHour,
            formattedMinute,
            formattedSecond
        );

        // Offset difference is: candidate UTC - candidate zoned local representation
        const diffMs = utcDate.getTime() - zonedTimestamp;

        // Adjust target UTC by the calculated offset
        const targetZonedTimestamp = Date.UTC(year, month - 1, day, hours, minutes);
        const candidateUtcTime = targetZonedTimestamp + diffMs;

        if (utcDate.getTime() === candidateUtcTime) {
            break; // Converged!
        }
        utcDate = new Date(candidateUtcTime);
    }

    return utcDate.toISOString();
}
