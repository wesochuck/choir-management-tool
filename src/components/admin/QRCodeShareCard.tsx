import React, { useEffect, useState, useMemo } from 'react';
import QRCode from 'qrcode';
import { Button } from '../ui';

interface QRCodeShareCardProps {
  title: string;
  subtitle?: string;
  url: string;
  badgeText?: string;
  badgeTone?: 'success' | 'performance' | 'rehearsal' | 'neutral';
}

export const QRCodeShareCard: React.FC<QRCodeShareCardProps> = ({
  title,
  subtitle,
  url,
  badgeText,
  badgeTone = 'neutral',
}) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [generationError, setGenerationError] = useState<boolean>(false);

  // Get absolute URL if relative
  const absoluteUrl = useMemo(() => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
    return `${origin.replace(/\/$/, '')}${url.startsWith('/') ? '' : '/'}${url}`;
  }, [url]);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(
      absoluteUrl,
      {
        width: 512,
        margin: 2,
        color: {
          dark: '#0f172a', // Slate 900
          light: '#ffffff',
        },
      },
      (err, qrUrl) => {
        if (!active) return;
        if (err) {
          console.error('Failed to generate QR code', err);
          setGenerationError(true);
        } else {
          setQrCodeUrl(qrUrl);
          setGenerationError(false);
        }
      }
    );
    return () => {
      active = false;
    };
  }, [absoluteUrl]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(absoluteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  const handleDownloadPNG = () => {
    if (!qrCodeUrl) return;
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    
    // Clean name for the downloaded file
    const safeName = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/(^_+|_+$)/g, '');
    
    link.download = `${safeName}_qr_code.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        
        {/* Left Side: Text Details */}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {badgeText && (
              <span className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${
                badgeTone === 'success' ? 'bg-emerald-50 text-emerald-700' :
                badgeTone === 'performance' ? 'bg-rose-50 text-rose-700' :
                badgeTone === 'rehearsal' ? 'bg-blue-50 text-blue-700' :
                'bg-slate-100 text-slate-700'
              }`}>
                {badgeText}
              </span>
            )}
            {subtitle && (
              <span className="text-xs font-semibold text-slate-400">
                {subtitle}
              </span>
            )}
          </div>
          
          <h4 className="m-0 text-lg font-bold text-slate-800 truncate">
            {title}
          </h4>
          
          <div className="mt-1 flex flex-col gap-2">
            <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              Public Link
            </span>
            <div className="flex max-w-full items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/50 p-2.5">
              <a
                href={absoluteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 flex-1 truncate text-xs font-medium text-primary underline transition-colors hover:text-primary-deep"
              >
                {absoluteUrl}
              </a>
            </div>
          </div>
          
          {/* Actions */}
          <div className="mt-2 flex flex-wrap gap-2.5">
            <Button
              onClick={handleCopyLink}
              variant={copied ? 'secondary' : 'outline'}
              size="small"
              className={`min-w-[100px] font-bold shadow-xs transition-all duration-150 ${
                copied ? '!bg-emerald-50 !text-emerald-700 !border-emerald-200' : ''
              }`}
            >
              {copied ? '✓ Copied' : '🔗 Copy Link'}
            </Button>
            
            <Button
              onClick={handleDownloadPNG}
              disabled={!qrCodeUrl}
              variant="primary"
              size="small"
              className="font-bold shadow-xs transition-all duration-150"
            >
              📥 Download PNG
            </Button>
          </div>
        </div>

        {/* Right Side: QR Code Image Render */}
        <div className="flex shrink-0 flex-col items-center justify-center self-center rounded-2xl border border-slate-100 bg-slate-50/50 p-4 shadow-xs md:self-stretch">
          {generationError ? (
            <div className="flex size-[140px] items-center justify-center text-center text-xs font-semibold text-rose-500">
              Error rendering QR
            </div>
          ) : qrCodeUrl ? (
            <div className="relative group/qr">
              <img
                src={qrCodeUrl}
                alt={`QR Code for ${title}`}
                className="size-[140px] rounded-lg border border-slate-200 bg-white object-contain shadow-xs transition-all duration-200 group-hover/qr:scale-105"
              />
            </div>
          ) : (
            <div className="flex size-[140px] flex-col items-center justify-center gap-2">
              <span className="size-5 animate-spin rounded-full border-2 border-slate-200 border-t-primary" />
              <span className="text-[10px] font-medium text-slate-400">Generating QR...</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
