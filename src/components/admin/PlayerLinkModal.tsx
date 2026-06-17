import React from 'react';
import { Button, CopyButton, Modal } from '../ui';

interface PlayerLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  eventTitle: string;
}

export const PlayerLinkModal: React.FC<PlayerLinkModalProps> = ({
  isOpen,
  onClose,
  url,
  eventTitle,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <span aria-hidden>🎵</span>
          <span>Practice Link Generated</span>
        </span>
      }
      maxWidth="520px"
    >
      <div className="flex flex-col gap-2">
        <p className="text-text-muted m-0 text-sm leading-snug">
          A standalone practice link has been generated for{' '}
          <strong className="text-text font-semibold">"{eventTitle}"</strong>. Share it with singers
          so they can listen to the audio tracks offline.
        </p>

        <div className="bg-bg border-border flex items-center gap-1 rounded-md border p-1.5">
          <div className="text-text-muted flex-1 overflow-x-auto px-1.5 py-0.5 font-mono text-[0.8rem] whitespace-nowrap select-all">
            {url}
          </div>
          <CopyButton value={url}>Copy</CopyButton>
        </div>

        <p className="text-text-muted m-0 text-xs">
          Links do not require an account and can be sent via email or text.
        </p>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button variant="primary" onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}>
          Open Practice Player
        </Button>
      </div>
    </Modal>
  );
};
