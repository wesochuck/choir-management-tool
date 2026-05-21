import React from 'react';

export interface FloatingAudioPlayerProps {
    url: string | null;
    title: string;
    part: string;
    onClose: () => void;
}

export const FloatingAudioPlayer: React.FC<FloatingAudioPlayerProps> = ({
    url,
    title,
    part,
    onClose
}) => {
    if (!url) return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: 'var(--space-md)',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '90%',
            maxWidth: '500px',
            backgroundColor: 'rgba(27, 77, 62, 0.95)',
            color: '#ffffff',
            padding: '12px 18px',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-md)'
        }}>
            <div className="flex-col" style={{ minWidth: '0', flex: 1, gap: '2px' }}>
                <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255, 255, 255, 0.7)' }}>
                    Playing Learning Track ({part})
                </span>
                <strong style={{ fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#ffffff', display: 'block' }}>
                    {title}
                </strong>
            </div>
            
            <audio 
                src={url} 
                controls 
                autoPlay
                style={{ height: '30px', maxWidth: '170px' }} 
            />
            
            <button 
                type="button" 
                onClick={onClose}
                style={{
                    background: 'none',
                    border: 'none',
                    color: '#ffffff',
                    cursor: 'pointer',
                    fontSize: '18px',
                    padding: '4px',
                    lineHeight: 1,
                    margin: 0
                }}
                title="Close Player"
            >
                ×
            </button>
        </div>
    );
};
