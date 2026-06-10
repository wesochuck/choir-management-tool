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
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[95%] max-w-[650px] bg-[rgb(27_77_62_/_95%)] rounded-lg p-4 shadow-lg border border-[rgb(255_255_255_/_10%)] z-[999] flex items-center gap-4">
            <div className="min-w-0 flex-[1_1_180px] flex-col gap-[2px]">
                <span className="text-[10px] uppercase tracking-[0.05em] text-[rgb(255_255_255_/_70%)]">
                    Playing Learning Track ({part})
                </span>
                <strong className="text-[13px] whitespace-nowrap overflow-hidden text-ellipsis text-white block">
                    {title}
                </strong>
            </div>
            
            <audio 
                src={url} 
                controls 
                autoPlay
                className="h-8 flex-[2_1_240px] max-w-[480px] min-w-[160px] w-full" 
            />
            
            <button 
                type="button" 
                onClick={onClose}
                className="bg-none border-none text-white cursor-pointer text-[18px] p-1 leading-none m-0"
                title="Close Player"
            >
                ×
            </button>
        </div>
    );
};
