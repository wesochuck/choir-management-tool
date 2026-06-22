interface RsvpNoteSectionProps {
  eventType?: string;
  selectedRsvp: 'Yes' | 'No';
  rsvpNote: string;
  onNoteChange: (v: string) => void;
  textareaClass?: string;
}

export function RsvpNoteSection({
  eventType,
  selectedRsvp,
  rsvpNote,
  onNoteChange,
  textareaClass,
}: RsvpNoteSectionProps) {
  if (eventType !== 'Rehearsal' || selectedRsvp !== 'No') return null;

  return (
    <div className="mb-2 flex flex-col gap-2 text-left">
      <label className="text-text-muted text-sm font-bold">Why are you unable to attend?</label>
      <textarea
        value={rsvpNote}
        onChange={(e) => onNoteChange(e.target.value)}
        placeholder="Briefly let the admins know why you cannot make this rehearsal."
        className={`border-border box-border min-h-[100px] w-full resize-y rounded-lg border p-3 font-[inherit] text-sm ${textareaClass?.replace('rsvp-textarea--short', 'min-h-[80px]') || ''}`}
        maxLength={1000}
      />
      <p className="text-text-muted m-0 text-xs">This note is visible to choir admins.</p>
    </div>
  );
}
