import React, { useEffect, useState, useMemo } from 'react';
import QRCode from 'qrcode';
import { Button, CopyButton } from '../ui';

interface QRCodeShareCardProps {
  title: string;
  subtitle?: string;
  url: string;
  badgeText?: string;
  badgeTone?: 'success' | 'performance' | 'rehearsal' | 'neutral';
  logoUrl?: string;
  logoSize?: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export const QRCodeShareCard: React.FC<QRCodeShareCardProps> = ({
  title,
  subtitle,
  url,
  badgeText,
  badgeTone = 'neutral',
  logoUrl,
  logoSize,
}) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [generationError, setGenerationError] = useState<boolean>(false);

  // Get absolute URL if relative
  const absoluteUrl = useMemo(() => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
    return `${origin.replace(/\/$/, '')}${url.startsWith('/') ? '' : '/'}${url}`;
  }, [url]);

  const effectiveLogoSize = useMemo(() => {
    const raw = logoSize ?? 0.2;
    return Math.min(0.45, Math.max(0.05, raw));
  }, [logoSize]);

  useEffect(() => {
    let active = true;
    const qrOptions: QRCode.QRCodeToDataURLOptions = {
      width: 512,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    };

    (async () => {
      try {
        const qrDataUrl = await QRCode.toDataURL(absoluteUrl, qrOptions);
        if (!active) return;

        let finalUrl = qrDataUrl;

        if (logoUrl) {
          try {
            const qrImage = await loadImage(qrDataUrl);
            const logoImage = await loadImage(logoUrl);
            if (!active) return;

            const qrWidth = qrImage.width;
            const qrHeight = qrImage.height;
            const canvas = document.createElement('canvas');
            canvas.width = qrWidth;
            canvas.height = qrHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Canvas 2D context unavailable');

            ctx.drawImage(qrImage, 0, 0);

            const logoPx = qrWidth * effectiveLogoSize;
            const bgRadius = (logoPx * 1.4) / 2;
            const cx = qrWidth / 2;
            const cy = qrHeight / 2;

            ctx.beginPath();
            ctx.arc(cx, cy, bgRadius, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();

            ctx.drawImage(logoImage, cx - logoPx / 2, cy - logoPx / 2, logoPx, logoPx);

            finalUrl = canvas.toDataURL();
          } catch (logoErr) {
            console.error('Failed to composite logo onto QR code', logoErr);
          }
        }

        if (!active) return;
        setQrCodeUrl(finalUrl);
        setGenerationError(false);
      } catch (err) {
        if (!active) return;
        console.error('Failed to generate QR code', err);
        setGenerationError(true);
      }
    })();

    return () => {
      active = false;
    };
  }, [absoluteUrl, logoUrl, effectiveLogoSize]);

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
              <span
                className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${
                  badgeTone === 'success'
                    ? 'bg-emerald-50 text-emerald-700'
                    : badgeTone === 'performance'
                      ? 'bg-rose-50 text-rose-700'
                      : badgeTone === 'rehearsal'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-slate-100 text-slate-700'
                }`}
              >
                {badgeText}
              </span>
            )}
            {subtitle && <span className="text-xs font-semibold text-slate-400">{subtitle}</span>}
          </div>

          <h4 className="m-0 truncate text-lg font-bold text-slate-800">{title}</h4>

          <div className="mt-1 flex flex-col gap-2">
            <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              Public Link
            </span>
            <div className="flex max-w-full items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/50 p-2.5">
              <a
                href={absoluteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary-deep min-w-0 flex-1 truncate text-xs font-medium underline transition-colors"
              >
                {absoluteUrl}
              </a>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-2 flex flex-wrap gap-2.5">
            <CopyButton
              value={absoluteUrl}
              className="min-w-[100px] font-bold shadow-xs transition-all duration-150"
            >
              🔗 Copy Link
            </CopyButton>

            <Button
              onClick={handleDownloadPNG}
              disabled={!qrCodeUrl}
              variant="primary"
              size="small"
              className="shadow-xs transition-all duration-150"
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
            <div className="group/qr relative">
              <img
                src={qrCodeUrl}
                alt={`QR Code for ${title}`}
                className="size-[140px] rounded-lg border border-slate-200 bg-white object-contain shadow-xs transition-all duration-200 group-hover/qr:scale-105"
              />
            </div>
          ) : (
            <div className="flex size-[140px] flex-col items-center justify-center gap-2">
              <span className="border-t-primary size-5 animate-spin rounded-full border-2 border-slate-200" />
              <span className="text-[10px] font-medium text-slate-400">Generating QR...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
