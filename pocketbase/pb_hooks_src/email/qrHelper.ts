import QRCode from 'qrcode';

/**
 * Generates an SVG string for a QR code encoding the given URL.
 * Uses error correction level H for maximum scan reliability.
 * Compatible with PocketBase's Goja engine (pure JS string output, no canvas/Buffer).
 */
export function renderQrSvg(url: string): string {
    return QRCode.toString(url, {
        type: 'svg',
        errorCorrectionLevel: 'H',
        margin: 2,
        color: {
            dark: '#0f172a',
            light: '#ffffff'
        }
    });
}
