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
        <div className="fixed bottom-4 left-1/2 z-[999] flex w-[95%] max-w-[650px] -translate-x-1/2 items-center gap-4 rounded-lg border border-[rgb(255_255_255_/_10%)] bg-[rgb(27_77_62_/_95%)] p-4 shadow-lg">
            <div className="min-w-0 flex-[1_1_180px] flex-col gap-[2px]">
                <span className="text-[10px] tracking-[0.05em] text-[rgb(255_255_255_/_70%)] uppercase">
                    Playing Learning Track ({part})
                </span>
                <strong className="block truncate text-[13px] text-white">
                    {title}
                </strong>
            </div>
            
            <audio 
                src={url} 
                controls 
                autoPlay
                className="h-8 w-full max-w-[480px] min-w-[160px] flex-[2_1_240px]" 
            />
            
            <button 
                type="button" 
                onClick={onClose}
                className="m-0 cursor-pointer border-none bg-none p-1 text-[18px] leading-none text-white"
                title="Close Player"
            >
                ×
            </button>
        </div>
    );
};
