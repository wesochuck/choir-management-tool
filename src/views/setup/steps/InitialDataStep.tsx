import { useState } from 'react';
import { useSetup } from '../../../contexts/SetupContext';
import { Button } from '../../../components/ui';
import { RosterImportModal } from '../../../components/admin/RosterImportModal';
import { MusicImportModal } from '../../../components/admin/MusicImportModal';

interface InitialDataStepProps {
  onSuccess: () => void;
}

export function InitialDataStep({ onSuccess }: InitialDataStepProps) {
  const { enabledModules } = useSetup();
  const [isRosterOpen, setIsRosterOpen] = useState(false);
  const [isMusicOpen, setIsMusicOpen] = useState(false);

  const handleDownloadTemplate = (type: 'roster' | 'music') => {
    const headers =
      type === 'roster'
        ? 'Name,Email,Phone,Voice Part,Notes'
        : 'Title,Composer,Arranger,Copies,Catalog ID,Duration,Notes';
    const sample =
      type === 'roster'
        ? 'John Doe,john@example.com,555-123-4567,Soprano,Volunteer soloist'
        : 'Messiah,George Frideric Handel,,120,M-101,150,Choral classic';
    const filename = type === 'roster' ? 'roster_template.csv' : 'music_library_template.csv';

    const blob = new Blob([[headers, sample].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const isRosterEnabled = enabledModules.has('roster');
  const isMusicEnabled = enabledModules.has('musicLibrary');

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-slate-100">Add Initial Data</h3>
        <p className="mt-1 text-sm text-slate-400">
          Import your existing rosters or music catalog library to get started immediately, or skip
          this step to add them later.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Roster Card */}
        {isRosterEnabled && (
          <div className="flex flex-col justify-between space-y-4 rounded-xl border border-slate-800 bg-slate-900/40 p-6">
            <div className="space-y-2">
              <span className="text-3xl" role="img" aria-label="singers">
                👥
              </span>
              <h4 className="text-base font-semibold text-slate-200">Import Performers Roster</h4>
              <p className="text-xs leading-relaxed text-slate-400">
                Upload a CSV file containing your members' names, voice parts, and emails.
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <Button type="button" onClick={() => setIsRosterOpen(true)}>
                Import Roster CSV
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="small"
                onClick={() => handleDownloadTemplate('roster')}
              >
                Download CSV Template
              </Button>
            </div>
          </div>
        )}

        {/* Music Library Card */}
        {isMusicEnabled && (
          <div className="flex flex-col justify-between space-y-4 rounded-xl border border-slate-800 bg-slate-900/40 p-6">
            <div className="space-y-2">
              <span className="text-3xl" role="img" aria-label="music">
                🎶
              </span>
              <h4 className="text-base font-semibold text-slate-200">Import Music Library</h4>
              <p className="text-xs leading-relaxed text-slate-400">
                Import your music catalog pieces, arranger, composer, and catalog details.
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <Button type="button" onClick={() => setIsMusicOpen(true)}>
                Import Music CSV
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="small"
                onClick={() => handleDownloadTemplate('music')}
              >
                Download CSV Template
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 border-t border-slate-800/80 pt-4">
        <Button onClick={onSuccess}>Skip & Continue</Button>
      </div>

      {isRosterOpen && (
        <RosterImportModal
          isOpen={isRosterOpen}
          onClose={() => setIsRosterOpen(false)}
          onSuccess={async () => {
            setIsRosterOpen(false);
          }}
        />
      )}

      {isMusicOpen && (
        <MusicImportModal
          isOpen={isMusicOpen}
          onClose={() => setIsMusicOpen(false)}
          onSuccess={async () => {
            setIsMusicOpen(false);
          }}
        />
      )}
    </div>
  );
}
