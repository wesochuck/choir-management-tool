import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ticketService } from '../../services/ticketService';
import { eventService } from '../../services/eventService';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { ScanResultCard } from '../../components/admin/ScanResultCard';
import type { ValidationResult } from '../../services/ticketService';
import { Button, Input, Spinner, Select, Modal } from '../../components/ui';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';

const STORAGE_KEY = 'ticket-scan-event-id';
const HISTORY_SIZE = 50;
const RECENT_PREVIEW_SIZE = 3;

function extractToken(input: string): string {
  try {
    const url = new URL(input);
    const token = url.searchParams.get('token');
    if (token) return token;
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

function ScanHistoryRow({ item }: { item: HistoryItem }) {
  const valid = item.result.valid;

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
        valid
          ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
          : 'border-rose-300 bg-rose-50 text-rose-950'
      }`}
    >
      <span className="shrink-0 text-xs font-black uppercase">{valid ? 'OK' : 'Bad'}</span>

      <span className="min-w-0 flex-1 truncate font-medium">
        {item.result.buyerName || `Token ${item.token.slice(0, 12)}...`}
      </span>

      {item.result.quantity ? (
        <span className="shrink-0 text-xs">x{item.result.quantity}</span>
      ) : null}

      <span className="shrink-0 text-xs opacity-70">
        {new Date(item.timestamp).toLocaleTimeString([], {
          hour: 'numeric',
          minute: '2-digit',
        })}
      </span>
    </div>
  );
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

  const {
    data: events = [],
    isLoading: eventsLoading,
    error: eventsError,
  } = useQuery({
    queryKey: queryKeys.events.publicList,
    queryFn: () => eventService.getPublicEvents(),
  });
  const eventsErrorMsg = eventsError?.message ?? null;

  const didInitRef = useRef(false);

  useEffect(() => {
    if (eventsLoading) return;
    if (didInitRef.current) return;

    didInitRef.current = true;

    const urlEventId = searchParams.get('eventId');
    const storedEventId = localStorage.getItem(STORAGE_KEY);

    const isUrlValid = urlEventId && events.some((e) => e.id === urlEventId);
    const isStoredValid = storedEventId && events.some((e) => e.id === storedEventId);

    if (isUrlValid) {
      setSelectedEventId(urlEventId);
    } else if (isStoredValid) {
      setSelectedEventId(storedEventId);
      setSearchParams({ eventId: storedEventId }, { replace: true });
    } else {
      const performanceEvents = events.filter((e) => e.type === 'Performance');
      if (performanceEvents.length > 0) {
        const defaultEvent = performanceEvents[0];
        setSelectedEventId(defaultEvent.id);
        setSearchParams({ eventId: defaultEvent.id }, { replace: true });
        localStorage.setItem(STORAGE_KEY, defaultEvent.id);
      } else {
        setSelectedEventId('');
        setSearchParams({}, { replace: true });
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, [events, eventsLoading, searchParams, setSearchParams]);

  const [manualToken, setManualToken] = useState('');
  const [validating, setValidating] = useState(false);
  const [scanResult, setScanResult] = useState<ValidationResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showScanHistory, setShowScanHistory] = useState(false);

  /* Camera scanning state */
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanPaused, setScanPaused] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const validatingRef = useRef(false);
  const lastScannedTokenRef = useRef<string | null>(null);

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

  /* Add result to history */
  const addToHistory = useCallback((result: ValidationResult, token: string) => {
    setHistory((prev) => {
      const next = [{ result, timestamp: Date.now(), token }, ...prev];
      return next.slice(0, HISTORY_SIZE);
    });
  }, []);

  /* Validate a token */
  const handleValidateToken = useCallback(
    async (token: string) => {
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
    },
    [selectedEventId, addToHistory]
  );

  /* Manual submit */
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim() || !selectedEventId) return;
    const token = extractToken(manualToken);
    handleValidateToken(token);
    setManualToken('');
  };

  /* Camera helpers */
  const pauseScanning = useCallback(() => {
    scanningRef.current = false;
    setScanPaused(true);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startFrameCapture = useCallback(async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    scanningRef.current = true;
    let jsQR:
      | ((data: Uint8ClampedArray, width: number, height: number) => { data: string } | null)
      | null = null;
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

      if (!video.videoWidth || !video.videoHeight) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(video, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code && code.data && !validatingRef.current) {
        const token = extractToken(code.data);

        if (token === lastScannedTokenRef.current) {
          return;
        }

        lastScannedTokenRef.current = token;
        pauseScanning();
        void handleValidateToken(token);
      }
    }, 150);
  }, [handleValidateToken, pauseScanning]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      setCameraActive(true);
    } catch {
      setCameraError('Camera access denied or unavailable. Try manual entry instead.');
    }
  }, []);

  useEffect(() => {
    if (!cameraActive || !streamRef.current || !videoRef.current) return;

    let cancelled = false;
    const video = videoRef.current;

    async function attachAndPlay() {
      try {
        video.srcObject = streamRef.current;
        video.muted = true;
        video.playsInline = true;

        await video.play();

        if (!cancelled) {
          startFrameCapture();
        }
      } catch {
        if (!cancelled) {
          setCameraError(
            'Camera started, but the preview could not play. Try another camera or use manual entry.'
          );
        }
      }
    }

    void attachAndPlay();

    return () => {
      cancelled = true;
    };
  }, [cameraActive, startFrameCapture]);

  const stopCamera = useCallback(() => {
    scanningRef.current = false;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    lastScannedTokenRef.current = null;
    setScanPaused(false);
    setCameraActive(false);
    setCameraError(null);
  }, []);

  const handleScanNextTicket = useCallback(() => {
    setScanResult(null);
    setScanPaused(false);
    lastScannedTokenRef.current = null;

    if (cameraActive) {
      startFrameCapture();
    }
  }, [cameraActive, startFrameCapture]);

  /* Cleanup on unmount */
  useEffect(() => {
    return () => {
      scanningRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      lastScannedTokenRef.current = null;
    };
  }, []);

  return (
    <div className="mx-auto flex min-h-dvh flex-col md:max-w-4xl">
      {/* Top bar */}
      <header className="border-border bg-surface sticky top-0 z-40 flex items-center gap-3 border-b px-4 py-3">
        <div className="flex-1">
          {eventsLoading ? (
            <div className="text-muted flex items-center gap-2 text-sm">
              <Spinner size="small" />
              Loading events...
            </div>
          ) : eventsError ? (
            <p className="text-danger-text text-sm">{eventsErrorMsg}</p>
          ) : (
            <Select id="event-select" value={selectedEventId} onChange={handleEventChange}>
              <option value="">Select an event...</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title} — {new Date(event.date).toLocaleDateString()}
                </option>
              ))}
            </Select>
          )}
        </div>
        {cameraActive && (
          <Button variant="outline" size="small" onClick={stopCamera}>
            Stop
          </Button>
        )}
      </header>

      {!selectedEventId && (
        <div className="flex flex-1 items-center justify-center p-8 text-center">
          {!eventsLoading &&
          !eventsError &&
          events.filter((e) => e.type === 'Performance').length === 0 ? (
            <p className="text-danger-text text-sm font-semibold">No upcoming concerts to scan.</p>
          ) : (
            <p className="text-muted text-sm">Select an event to start scanning tickets.</p>
          )}
        </div>
      )}

      {selectedEventId && (
        <div className="flex flex-1 flex-col md:grid md:grid-cols-2 md:gap-6 md:p-6">
          {/* Left column - Camera */}
          <div className="flex flex-col">
            {!cameraActive && (
              <div className="p-4 md:p-0">
                <div className="flex justify-center">
                  <Button
                    variant="secondary"
                    onClick={startCamera}
                    disabled={eventsLoading || !!eventsError}
                    className="min-h-12 w-full md:w-auto"
                  >
                    Start Camera
                  </Button>
                </div>
              </div>
            )}

            {cameraError && (
              <p className="text-danger-text px-4 pt-2 text-sm md:px-0">{cameraError}</p>
            )}

            {cameraActive && (
              <>
                <div className="relative aspect-[4/3] max-h-[42vh] overflow-hidden bg-black">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="h-full w-full object-contain"
                  />
                </div>
                <canvas ref={canvasRef} className="hidden" />

                <div className="px-4 py-2 md:px-0">
                  {scanPaused && (
                    <p className="text-success-text text-center text-sm font-semibold">
                      Scan paused. Review the result, then tap Scan Next Ticket.
                    </p>
                  )}
                  {!scanPaused && !validating && (
                    <p className="text-text-muted text-center text-sm">
                      Point the camera at one ticket QR code.
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Validating spinner */}
            {validating && !scanResult && (
              <div className="text-muted flex items-center justify-center gap-2 py-4 text-sm">
                <Spinner size="small" />
                Validating ticket...
              </div>
            )}

            {/* Current result */}
            {scanResult && (
              <div className="px-4 pb-4 md:px-0">
                <ScanResultCard result={scanResult} />
              </div>
            )}
          </div>

          {/* Right column - Recent scans + Manual entry (desktop) / Below on mobile */}
          <div className="flex flex-col gap-4 px-4 pb-28 md:px-0 md:pb-0">
            {/* Recent scans */}
            {history.length > 0 && (
              <section className="border-border bg-surface rounded-xl border p-3 shadow-sm">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="m-0 text-xs font-semibold tracking-wide text-slate-400 uppercase">
                    Recent Scans
                  </h3>

                  {history.length > RECENT_PREVIEW_SIZE && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="small"
                      onClick={() => setShowScanHistory(true)}
                    >
                      View All
                    </Button>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  {history.slice(0, RECENT_PREVIEW_SIZE).map((item, idx) => (
                    <ScanHistoryRow key={`${item.timestamp}-${idx}`} item={item} />
                  ))}
                </div>
              </section>
            )}

            {/* Manual entry */}
            <form
              onSubmit={handleManualSubmit}
              className="border-border bg-surface rounded-xl border p-3 shadow-sm"
            >
              <h3 className="text-text mb-2 text-xs font-semibold">Manual Entry</h3>
              <div className="flex gap-2">
                <Input
                  placeholder="Paste ticket code or URL..."
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="submit"
                  variant="primary"
                  loading={validating}
                  disabled={!manualToken.trim() || validating}
                >
                  {validating ? '...' : 'Go'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sticky mobile Scan Next Ticket */}
      {cameraActive && scanPaused && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-slate-950/95 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur md:relative md:border-t-0 md:bg-transparent md:p-4 md:backdrop-blur-none">
          <Button
            variant="primary"
            className="min-h-14 w-full text-lg font-bold"
            onClick={handleScanNextTicket}
          >
            Scan Next Ticket
          </Button>
        </div>
      )}

      {/* Scan history modal */}
      <Modal
        isOpen={showScanHistory}
        onClose={() => setShowScanHistory(false)}
        title="Scan History"
      >
        <div className="max-h-[70vh] overflow-y-auto">
          {history.length === 0 ? (
            <p className="text-text-muted text-sm">No scans yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {history.map((item, idx) => (
                <ScanHistoryRow key={`${item.timestamp}-${idx}`} item={item} />
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
