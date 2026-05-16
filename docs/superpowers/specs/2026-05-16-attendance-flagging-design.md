# Phase 04: Attendance Flagging & Filtering Design Spec

**Goal:** Implement a "Performance Cycle" attendance tracking system to flag singers who miss rehearsals and facilitate communication with them.

## 1. Logic: The "Performance Cycle"
- **Cycle Start:** The date of the most recent `Performance` event. If no past performance exists, the beginning of time.
- **Relevant Events:** All events of type `Rehearsal` where `date > LastPerformanceDate` and `date <= Now`.
- **Miss Definition:** An `eventRoster` entry for a Relevant Event where `attendance === 'Absent'`.
- **Calculation:** Misses are calculated client-side by fetching the active roster and filtering based on the cycle.

## 2. Configuration (Settings View)
- **Attendance Policy Section:**
    - `attendanceThreshold` (number, default: 3): Number of misses that triggers "Danger" status.
    - `attendanceWarning` (number, default: 2): Number of misses that triggers "Warning" status.
- **Communication Templates:**
    - `attendanceWarningTemplate`: "Hi {singerName}, we missed you! You've missed {missCount} rehearsals this cycle. Hope to see you soon!"
    - `attendanceDangerTemplate`: "Hi {singerName}, you've missed {missCount} rehearsals. Please contact the director regarding your status for the upcoming performance."

## 3. Global Roster UI Enhancements
- **New Column: "Misses"**
    - Displays the count of misses in the current cycle.
    - Color-coded:
        - 0: Muted text
        - < Warning: Normal text
        - >= Warning and < Threshold: Warning Badge (Yellow)
        - >= Threshold: Danger Badge (Red)
- **Filtering:**
    - Add "Attendance" dropdown: `All`, `Flagged (Danger)`, `Warning`.
- **Action: "Alert Singer"**
    - A button/icon for flagged singers.
    - Opens the device's default mailto or SMS app with the pre-filled template based on their current miss level.

## 4. Technical Implementation
- **New Service Method:** `rosterService.getAttendanceStats(cycleStartDate)`
- **New Hook:** `useAttendanceStats`
    - Manages the logic of finding the cycle start and aggregating misses per profile.
- **Settings Update:** Update `CommunicationSettings` interface and `settingsService` to include the new templates and thresholds.

## 5. Success Criteria
- [ ] Admin can see the number of missed rehearsals for each singer in the roster.
- [ ] Singers are automatically highlighted when they cross the warning or danger threshold.
- [ ] Admin can filter the roster to see only flagged singers.
- [ ] Admin can trigger a pre-filled message to a flagged singer with one click.
