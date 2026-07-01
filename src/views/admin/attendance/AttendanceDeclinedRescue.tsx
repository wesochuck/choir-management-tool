import { Select, Button } from '../../../components/ui';

interface AttendanceItemDef {
  profileId: string;
  name: string;
  voicePart: string;
}

interface AttendanceDeclinedRescueProps {
  declinedSingers: AttendanceItemDef[];
  selectedDeclinedProfileId: string;
  setSelectedDeclinedProfileId: (id: string) => void;
  handleRescueDeclined: (profileId: string) => Promise<void>;
}

export function AttendanceDeclinedRescue({
  declinedSingers,
  selectedDeclinedProfileId,
  setSelectedDeclinedProfileId,
  handleRescueDeclined,
}: AttendanceDeclinedRescueProps) {
  if (declinedSingers.length === 0) return null;

  return (
    <div className="border-t border-red-100 bg-red-50/50 p-4">
      <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-xs font-bold text-red-800">Rescue Declined RSVP</h3>
          <p className="m-0 text-[11px] font-medium text-red-600/80">
            Did someone show up anyway? Change RSVP to attending.
          </p>
        </div>

        <div className="flex w-full min-w-[280px] flex-row items-center gap-2 md:w-auto">
          <Select
            value={selectedDeclinedProfileId}
            onChange={(e) => setSelectedDeclinedProfileId(e.target.value)}
            className="h-8 py-0 text-xs"
          >
            <option value="">-- Select Declined Performer --</option>
            {declinedSingers.map((s) => (
              <option key={s.profileId} value={s.profileId}>
                {s.name} ({s.voicePart})
              </option>
            ))}
          </Select>
          <Button
            disabled={!selectedDeclinedProfileId}
            onClick={() => handleRescueDeclined(selectedDeclinedProfileId)}
            variant="danger"
            size="small"
          >
            + Add Back
          </Button>
        </div>
      </div>
    </div>
  );
}
