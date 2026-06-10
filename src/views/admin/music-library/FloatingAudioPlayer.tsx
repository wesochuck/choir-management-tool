import React from 'react';
import './FloatingAudioPlayer.css';

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
        <div className="floating-audio-player">
            <div className="flex-col floating-audio-track-info">
                <span className="floating-audio-part-label">
                    Playing Learning Track ({part})
                </span>
                <strong className="floating-audio-track-title">
                    {title}
                </strong>
            </div>
            
            <audio 
                src={url} 
                controls 
                autoPlay
                className="floating-audio-seek-bar" 
            />
            
            <button 
                type="button" 
                onClick={onClose}
                className="floating-audio-play-btn"
                title="Close Player"
            >
                ×
            </button>
        </div>
    );
};
