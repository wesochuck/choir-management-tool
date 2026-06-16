import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ticketService } from '../../services/ticketService';
import { eventService, type Event } from '../../services/eventService';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { ScanResultCard } from '../../components/admin/ScanResultCard';
import type { ValidationResult } from '../../services/ticketService';
import { Button, Input, Spinner, Select } from '../../components/ui';

const STORAGE_KEY = 'ticket-scan-event-id';
const HISTORY_SIZE = 5;

function extractToken(input: string): string {
  try {
    const url = new URL(input);
    const t = url.searchParams.get('t');
    if (t) return t;
  } catch {
    // not a URL, use raw input
  }
  return input.trim();
}

interface HistoryItem {
  result: ValidationResult;
  timestamp: number;
  token: string;
}

export default function TicketScanView() {
  useDocumentTitle('Ticket Scanner');

  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const urlEventId = searchParams.get('eventId');
    if (urlEventId) {
      localStorage.setItem(STORAGE_KEY, urlEventId);
    }
  }, [searchParams]);

  const [selectedEventId, setSelectedEventId] = useState(() => {
    return searchParams.get('eventId') || localStorage.getItem(STORAGE_KEY) || '';
  });

  const [events, setEvents] = useState<Event[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null);

  const [manualToken, setManualToken] = useState('');
  const [validating, setValidating] = useState(false);
  const [scanResult, setScanResult] = useState<ValidationResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  /* Camera scanning state */
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const validatingRef = useRef(false);

  /* Load events */
  useEffect(() => {
    let cancelled = false;
    setEventsLoading(true);
    setEventsError(null);
    eventService.getPublicEvents()
      .then(data => {
        if (!cancelled) {
          setEvents(data);
          setEventsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : String(err);
          setEventsError(msg);
          setEventsLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  /* Handle event selection - update URL and localStorage */
  const handleEventChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedEventId(value);
    if (value) {
      setSearchParams({ eventId: value }, { replace: true });
      localStorage.setItem(STORAGE_KEY, value);
    } else {
      setSearchParams({}, { replace: true });
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  /* Auto-clear result after 6 seconds */
  useEffect(() => {
    if (!scanResult) return;
    const timer = setTimeout(() => setScanResult(null), 6000);
    return () => clearTimeout(timer);
  }, [scanResult]);

  /* Add result to history */
  const addToHistory = useCallback((result: ValidationResult, token: string) => {
    setHistory(prev => {
      const next = [{ result, timestamp: Date.now(), token }, ...prev];
      return next.slice(0, HISTORY_SIZE);
    });
  }, []);

  /* Validate a token */
  const handleValidateToken = useCallback(async (token: string) => {
    if (!selectedEventId) return;
    if (validatingRef.current) return;
    validatingRef.current = true;
    setValidating(true);
    setScanResult(null);
    try {
      const result = await ticketService.validateScan(token, selectedEventId);
      setScanResult(result);
      addToHistory(result, token);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const errorResult: ValidationResult = { valid: false, reason: msg };
      setScanResult(errorResult);
      addToHistory(errorResult, token);
    } finally {
      setValidating(false);
      validatingRef.current = false;
    }
  }, [selectedEventId, addToHistory]);

  /* Manual submit */
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim() || !selectedEventId) return;
    const token = extractToken(manualToken);
    handleValidateToken(token);
    setManualToken('');
  };

  /* Camera helpers */
  const startFrameCapture = useCallback(async () => {
    scanningRef.current = true;
    let jsQR: ((data: Uint8ClampedArray, width: number, height: number) => { data: string } | null) | null = null;
    try {
      jsQR = (await import('jsqr')).default;
    } catch {
      setCameraError('QR scanner library failed to load');
      return;
    }

    if (!jsQR) return;

    intervalRef.current = setInterval(() => {
      if (!scanningRef.current || !videoRef.current || !canvasRef.current) return;
      if (videoRef.current.readyState < 2) return;

      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(video, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code && code.data && !validatingRef.current) {
        handleValidateToken(code.data);
      }
    }, 150);
  }, [handleValidateToken]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
      startFrameCapture();
    } catch {
      setCameraError('Camera access denied or unavailable. Try manual entry instead.');
    }
  }, [startFrameCapture]);

  const stopCamera = useCallback(() => {
    scanningRef.current = false;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setCameraError(null);
  }, []);

  /* Cleanup on unmount */
  useEffect(() => {
    return () => {
      scanningRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Event selector */}
      <div>
        <label htmlFor="event-select" className="mb-1.5 block text-sm font-medium text-text">
          Event
        </label>
        {eventsLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted">
            <Spinner size="small" />
            Loading events...
          </div>
        ) : eventsError ? (
          <p className="text-sm text-danger-text">{eventsError}</p>
        ) : (
          <Select id="event-select" value={selectedEventId} onChange={handleEventChange}>
            <option value="">Select an event...</option>
            {events.map(event => (
              <option key={event.id} value={event.id}>
                {event.title} — {new Date(event.date).toLocaleDateString()}
              </option>
            ))}
          </Select>
        )}
      </div>

      {!selectedEventId && (
        <div className="rounded-xl border border-border bg-surface p-8 text-center shadow-sm">
          <p className="text-sm text-muted">Select an event to start scanning tickets.</p>
        </div>
      )}

      {selectedEventId && (
        <>
          {/* Camera scanner */}
          <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-text">Camera Scanner</h3>
            {cameraError && (
              <p className="mb-3 text-sm text-danger-text">{cameraError}</p>
            )}
            {cameraActive ? (
              <div className="space-y-3">
                <div className="overflow-hidden rounded-lg border border-border bg-black">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="block w-full"
                  />
                </div>
                {/* @allow-inline-style - hidden canvas for frame capture */}
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                <div className="flex justify-center">
                  <Button variant="outline" size="small" onClick={stopCamera}>
                    Stop Camera
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex justify-center">
                <Button
                  variant="secondary"
                  onClick={startCamera}
                  disabled={eventsLoading || !!eventsError}
                >
                  Start Camera
                </Button>
              </div>
            )}
          </div>

          {/* Manual entry */}
          <form onSubmit={handleManualSubmit} className="rounded-xl border border-border bg-surface p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-text">Manual Entry</h3>
            <div className="flex gap-2">
              <Input
                placeholder="Paste ticket code or URL..."
                value={manualToken}
                onChange={e => setManualToken(e.target.value)}
                className="flex-1"
              />
              <Button
                type="submit"
                variant="primary"
                loading={validating}
                disabled={!manualToken.trim() || validating}
              >
                {validating ? 'Validating...' : 'Validate'}
              </Button>
            </div>
          </form>

          {/* Result panel */}
          {validating && !scanResult && (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted">
              <Spinner size="small" />
              Validating ticket...
            </div>
          )}

          {scanResult && (
            <ScanResultCard result={scanResult} />
          )}

          {/* History strip */}
          {history.length > 0 && (
            <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                Recent Scans
              </h3>
              <div className="flex flex-col gap-2">
                {history.map((item, idx) => (
                  <div
                    key={`${item.timestamp}-${idx}`}
                    className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm ${
                      item.result.valid
                        ? 'border-emerald-200 bg-emerald-50'
                        : 'border-rose-200 bg-rose-50'
                    }`}
                  >
                    <span className={`text-sm font-bold ${item.result.valid ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {item.result.valid ? 'OK' : 'BAD'}
                    </span>
                    <span className="flex-1 truncate text-muted">
                      {item.result.buyerName || `Token: ${item.token.slice(0, 16)}...`}
                    </span>
                    {item.result.eventTitle && (
                      <span className="hidden text-xs text-muted sm:inline">{item.result.eventTitle}</span>
                    )}
                    <span className="shrink-0 text-xs text-muted">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
