import type { Event } from '../../services/eventService';
import type { SetListDisplayRow } from '../../lib/setList/setListItems';
import { Modal, Button } from '../../components/ui';
import { SetListPrintContent } from './SetListPrintContent';

interface SetListPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedEvent: Event | null | undefined;
  itemsWithDetails: SetListDisplayRow[];
  timezone: string;
  onCopy: () => void;
  onPrint: () => void;
  copied: boolean;
}

export function SetListPrintModal({
  isOpen,
  onClose,
  selectedEvent,
  itemsWithDetails,
  timezone,
  onCopy,
  onPrint,
  copied,
}: SetListPrintModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Printable Set List"
      maxWidth="600px"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <div className="flex flex-col-reverse gap-2 sm:mr-auto sm:w-auto sm:flex-row sm:items-center">
            <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
              Close
            </Button>
            <Button
              variant="outline"
              onClick={onCopy}
              className="w-full sm:w-auto"
              icon={copied ? <span aria-hidden="true">✓</span> : <span aria-hidden="true">📋</span>}
            >
              {copied ? 'Copied!' : 'Copy Plain Text'}
            </Button>
          </div>
          <Button variant="primary" className="w-full sm:w-auto" onClick={onPrint}>
            <span aria-hidden="true">🖨️</span>
            <span>Print List</span>
          </Button>
        </div>
      }
    >
      <div className="border-border rounded-md border bg-white p-6 font-[Georgia,serif] text-gray-800 shadow-[inset_0_2px_4px_rgb(0_0_0_/_6%)]">
        <SetListPrintContent
          selectedEvent={selectedEvent}
          itemsWithDetails={itemsWithDetails}
          timezone={timezone}
        />
      </div>
    </Modal>
  );
}
