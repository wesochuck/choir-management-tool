# Plan: QR Code Logo Overlay

## Goal
Add a centered logo image on top of generated QR codes in `QRCodeShareCard`.

## Changes

### 1. `src/components/admin/QRCodeShareCard.tsx`

- **New optional props**: `logoUrl?: string`, `logoSize?: number` (fraction of QR width, default `0.22` — well within H-level error correction tolerance)

- **Error correction**: Add `errorCorrectionLevel: 'H'` to `QRCode.toDataURL()` options. This gives ~30% data recovery, essential since logo obscures the center.

- **Canvas compositing** (when `logoUrl` is provided):
  1. Load the QR data URL into an `Image`
  2. Load the logo into an `Image`
  3. Create a `<canvas>` at QR dimensions
  4. Draw QR at full size
  5. Draw a white circle/squircle background in the center (radius = logoSize * QR width) so the logo is readable on top of the QR pattern
  6. Draw the logo centered, scaled to fit within the background
  7. Export canvas via `canvas.toDataURL()` as the final `qrCodeUrl`

- **Fallback**: If the logo image fails to load, fall back to the plain QR code (no logo). Call `setGenerationError(false)` — the QR is still valid.

- **Keep existing behavior**: When `logoUrl` is not provided, behave exactly as today.

### 2. `src/views/admin/TicketingView.tsx`

- Define a constant `LOGO_URL = '/choir-logo.png'` (public asset path)
- Pass `logoUrl={LOGO_URL}` to all 3 `<QRCodeShareCard>` instances

### 3. Logo file

- User manually places `public/choir-logo.png` (not committed by agent — PNG should be kept out of git or added intentionally)

## Files Modified
- `src/components/admin/QRCodeShareCard.tsx` — add logo compositing logic + new props
- `src/views/admin/TicketingView.tsx` — pass logoUrl to all QR cards

## Verification
- `rtk npm run lint` — confirm no type/lint errors
- `rtk npx tsc --noEmit` — typecheck

## Risks
- Very large logos (>30% of QR size) can break scannability even with H correction. Default `0.22` is safe; `logoSize` prop allows tuning.
- Logo must be a PNG (or image format the browser can decode). No server-side processing needed.
- CORS is not a concern since the logo is served from the same origin (`public/`).
