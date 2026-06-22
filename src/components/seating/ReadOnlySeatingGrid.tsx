import type { ReadOnlySeatingGridProps } from './types';
import {
  buildSelectedSeatInfo,
  getProfileSeatColor,
  getSingerInitials,
} from './seatingDisplayUtils';

export function ReadOnlySeatingGrid({
  rowCounts,
  assignments,
  profilesById,
  sections,
  voiceParts,
  perspective,
  selectedSeat,
  highlightedProfileId,
  showVoicePartColors = true,
  showNamesOnSeats = false,
  onSeatSelect,
}: ReadOnlySeatingGridProps) {
  return (
    <div className="border-border bg-surface relative flex flex-col items-center overflow-visible rounded-lg border p-4 px-3 shadow-sm sm:p-8 sm:px-6">
      <div className="mb-8 flex w-full scrollbar-thin flex-col-reverse items-stretch gap-3 overflow-x-auto overflow-y-visible py-[40px] pb-[10px]">
        {rowCounts.map((count, rIdx) => (
          <div
            key={rIdx}
            className="mx-auto grid w-max min-w-max grid-cols-[64px_max-content_64px] items-center justify-center gap-x-2 sm:grid-cols-[72px_max-content_72px] sm:gap-x-3"
          >
            <span className="text-text min-w-16 text-right text-xs font-bold tracking-wider whitespace-nowrap uppercase select-none sm:text-sm">
              Row {rIdx + 1}
            </span>

            <div
              className="flex min-w-max items-center justify-center gap-[8px] sm:gap-[10px]"
              // @allow-inline-style - dynamic flex direction for perspective toggle
              style={{
                flexDirection: perspective === 'director' ? 'row-reverse' : 'row',
              }}
            >
              {Array.from({ length: count }).map((_, sIdx) => {
                const singerId = assignments[`${rIdx}-${sIdx}`];
                const profile = singerId ? (profilesById.get(singerId) ?? null) : null;
                const isHighlighted = !!singerId && singerId === highlightedProfileId;
                const isSelected = selectedSeat?.row === rIdx && selectedSeat?.seat === sIdx;

                const initials = profile ? getSingerInitials(profile.name) : singerId ? '•' : '';

                const seatColor =
                  showVoicePartColors && profile
                    ? getProfileSeatColor(profile, sections, voiceParts)
                    : singerId
                      ? 'var(--color-primary)'
                      : 'var(--color-border)';

                const handleClick = () => {
                  const nextSelected = buildSelectedSeatInfo({
                    row: rIdx,
                    seat: sIdx,
                    singerId,
                    highlightedProfileId,
                    profilesById,
                  });

                  onSeatSelect?.({
                    row: nextSelected.row,
                    seat: nextSelected.seat,
                    profileId: nextSelected.profileId,
                    name: nextSelected.name,
                    voicePart: nextSelected.voicePart,
                    status: nextSelected.status,
                  });
                };

                return (
                  <button
                    key={sIdx}
                    type="button"
                    className={[
                      'group relative flex aspect-square h-8 min-h-8 w-8 min-w-8 shrink-0 cursor-pointer appearance-none items-center justify-center rounded-full p-0 text-[0.7rem] font-bold shadow-[0_1px_3px_rgb(0_0_0_/_5%)] transition-all duration-200 hover:z-10 hover:scale-120 hover:shadow-[0_4px_10px_rgb(0_0_0_/_10%)]',
                      isHighlighted
                        ? '!border-primary-deep z-[5] shadow-[0_0_0_4px_rgba(74,124,89,0.3)]'
                        : '',
                      isSelected ? 'outline-primary-deep outline-[3px] outline-offset-[3px]' : '',
                    ].join(' ')}
                    // @allow-inline-style - dynamic singer seat color from voice part mapping
                    style={{
                      borderColor: seatColor,
                      borderWidth: isHighlighted ? '2px' : '2px',
                      color: singerId ? 'white' : 'var(--color-muted)',
                      backgroundColor: singerId ? seatColor : 'white',
                      borderStyle: 'solid',
                    }}
                    onClick={handleClick}
                    aria-label={
                      profile
                        ? `Row ${rIdx + 1}, seat ${sIdx + 1}, ${profile.name}, ${profile.voicePart}`
                        : singerId
                          ? `Row ${rIdx + 1}, seat ${sIdx + 1}, assigned singer`
                          : `Row ${rIdx + 1}, seat ${sIdx + 1}, empty`
                    }
                  >
                    {showNamesOnSeats && profile ? profile.name : initials}

                    {showNamesOnSeats ? null : profile ? (
                      <div className="bg-text text-surface after:border-text after:border-t-text pointer-events-none invisible absolute bottom-[130%] left-1/2 z-[100] -translate-x-1/2 translate-y-1 rounded px-[10px] py-1.5 text-xs font-semibold whitespace-nowrap opacity-0 shadow-[0_10px_15px_-3px_rgb(0_0_0_/_20%)] transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-5 after:border-solid after:border-transparent after:border-x-transparent after:border-b-transparent after:content-['']">
                        {profile.name} ({profile.voicePart})
                      </div>
                    ) : singerId ? (
                      <div className="bg-text text-surface after:border-text after:border-t-text pointer-events-none invisible absolute bottom-[130%] left-1/2 z-[100] -translate-x-1/2 translate-y-1 rounded px-[10px] py-1.5 text-xs font-semibold whitespace-nowrap opacity-0 shadow-[0_10px_15px_-3px_rgb(0_0_0_/_20%)] transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-5 after:border-solid after:border-transparent after:border-x-transparent after:border-b-transparent after:content-['']">
                        Assigned Singer
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <span className="text-text min-w-16 text-left text-xs font-bold tracking-wider whitespace-nowrap uppercase select-none sm:text-sm">
              Row {rIdx + 1}
            </span>
          </div>
        ))}
      </div>

      <div className="border-border relative flex w-full flex-col items-center gap-2 border-t border-dashed pt-4">
        <div className="border-primary-deep mb-1 h-2 w-60 rounded-[50%] border-b-2 opacity-30" />
        <div className="flex items-center justify-center gap-8">
          <span className="bg-primary-light text-primary-deep flex items-center gap-1.5 rounded-full border border-[rgba(74,124,89,0.2)] px-3 py-1.5 text-xs font-bold tracking-wider uppercase shadow-sm select-none">
            🎼 Director & Audience
          </span>
        </div>
      </div>
    </div>
  );
}
