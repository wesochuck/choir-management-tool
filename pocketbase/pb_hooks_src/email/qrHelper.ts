import QRCode from 'qrcode';

/**
 * Generates an SVG string for a QR code encoding the given URL.
 * Uses error correction level H for maximum scan reliability.
 * Compatible with PocketBase's Goja engine (pure JS string output, no canvas/Buffer).
 */
export async function renderQrSvg(url: string): Promise<string> {
    return await QRCode.toString(url, {
        type: 'svg',
        errorCorrectionLevel: 'H',
        margin: 2,
        color: {
            dark: '#0f172a',
            light: '#ffffff'
        }
    });
}
