import React from 'react';
import { Input, Button } from '../ui';

export interface InlineVenueCreatorProps {
  newVenueName: string;
  setNewVenueName: (v: string) => void;
  newVenueRows: string;
  setNewVenueRows: (v: string) => void;
  newVenueAddress: string;
  setNewVenueAddress: (v: string) => void;
  isSavingVenue: boolean;
  onSave: () => Promise<void>;
  onCancel: () => void;
}

export const InlineVenueCreator: React.FC<InlineVenueCreatorProps> = ({
  newVenueName,
  setNewVenueName,
  newVenueRows,
  setNewVenueRows,
  newVenueAddress,
  setNewVenueAddress,
  isSavingVenue,
  onSave,
  onCancel,
}) => {
  return (
    <div className="border-primary/40 bg-primary/5 flex flex-col gap-4 rounded-lg border border-dashed p-4">
      <div className="text-primary-deep text-sm font-semibold">
        ✨ Create New Venue Template Inline
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-label">Venue Name</label>
          <Input
            value={newVenueName}
            onChange={(e) => setNewVenueName(e.target.value)}
            placeholder="e.g. Grace Hall"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-label">Row Capacities (e.g. 10, 12, 14)</label>
          <Input
            value={newVenueRows}
            onChange={(e) => setNewVenueRows(e.target.value)}
            placeholder="e.g. 8, 10, 12"
          />
        </div>
      </div>

      <div className="flex w-full flex-col gap-1.5">
        <label className="text-label">Venue Address (Optional, for Google Maps)</label>
        <Input
          value={newVenueAddress}
          onChange={(e) => setNewVenueAddress(e.target.value)}
          placeholder="e.g. 123 Main St, Anytown, ST 12345"
        />
      </div>

      <div className="flex w-full flex-row justify-end gap-3 pt-2">
        <Button variant="outline" size="small" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="primary"
          size="small"
          onClick={onSave}
          disabled={isSavingVenue || !newVenueName.trim() || !newVenueRows.trim()}
          loading={isSavingVenue}
        >
          Add & Select Venue
        </Button>
      </div>
    </div>
  );
};
