import { useState, useRef, useCallback, useEffect } from 'react';
import { updateProfilePhoto, deleteProfilePhoto, type Profile } from '../../../services/profileService';
import { useDialog } from '../../../contexts/DialogContext';

export type PhotoSize = 'sm' | 'md' | 'lg';

export interface PhotoUploaderProps {
  profileId: string;
  profileName: string;
  currentPhotoUrl?: string;
  size?: PhotoSize;
  onSuccess?: (updatedRecord: Profile) => void;
  readOnlyOnDesktop?: boolean;
}

const SIZES = { sm: 32, md: 80, lg: 120 };

function getInitials(name: string): string {
  return name.split(/\s+/).filter(Boolean).map((p) => p[0].toUpperCase()).slice(0, 2).join('');
}

function revokeObjectUrl(url: string | null) {
  if (url && url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}

export function PhotoUploader({
  profileId,
  profileName,
  currentPhotoUrl,
  size = 'md',
  onSuccess,
  readOnlyOnDesktop = false,
}: PhotoUploaderProps) {
  const px = SIZES[size];
  const dialog = useDialog();
  const fileRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const previewObjectUrlRef = useRef<string | null>(null);
  const displayObjectUrlRef = useRef<string | null>(null);
  const cropSourceObjectUrlRef = useRef<string | null>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showCrop, setShowCrop] = useState(false);
  const [displayUrl, setDisplayUrl] = useState(currentPhotoUrl || '');

  const [isMobile, setIsMobile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const [showCamera, setShowCamera] = useState(false);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraLoading, setIsCameraLoading] = useState(false);

  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  }, []);

  useEffect(() => {
    revokeObjectUrl(displayObjectUrlRef.current);
    displayObjectUrlRef.current = null;
    setDisplayUrl(currentPhotoUrl || '');
  }, [currentPhotoUrl]);

  useEffect(() => {
    if (!showCamera) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      return;
    }

    let active = true;

    async function startCamera() {
      setIsCameraLoading(true);
      setCameraError(null);
      try {
        let devices = await navigator.mediaDevices.enumerateDevices();
        let videoInputs = devices.filter((d) => d.kind === 'videoinput');

        const hasLabels = videoInputs.some((d) => d.label);
        if (videoInputs.length === 0 || !hasLabels) {
          const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
          devices = await navigator.mediaDevices.enumerateDevices();
          videoInputs = devices.filter((d) => d.kind === 'videoinput');
          tempStream.getTracks().forEach((t) => t.stop());
        }

        if (!active) return;

        setVideoDevices(videoInputs);

        const defaultDev = videoInputs[0]?.deviceId || '';
        const currentDevId = selectedDeviceId || defaultDev;
        if (!selectedDeviceId && defaultDev) {
          setSelectedDeviceId(defaultDev);
        }

        const constraints: MediaStreamConstraints = {
          video: currentDevId
            ? { deviceId: { exact: currentDevId }, width: { ideal: 640 }, height: { ideal: 640 } }
            : { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);

        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err: unknown) {
        console.error('Camera startup failed', err);
        if (active) {
          if (err instanceof DOMException && err.name === 'NotAllowedError') {
            setCameraError('Camera access denied. Please check your browser or system permissions.');
          } else {
            setCameraError('Unable to open the camera. It might be in use by another application.');
          }
        }
      } finally {
        if (active) {
          setIsCameraLoading(false);
        }
      }
    }

    startCamera();

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [showCamera, selectedDeviceId]);

  useEffect(() => {
    return () => {
      revokeObjectUrl(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
      revokeObjectUrl(displayObjectUrlRef.current);
      displayObjectUrlRef.current = null;
      revokeObjectUrl(cropSourceObjectUrlRef.current);
      cropSourceObjectUrlRef.current = null;
    };
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    if (isMobile || readOnlyOnDesktop) return;
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    if (isMobile || readOnlyOnDesktop) return;
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (isMobile || readOnlyOnDesktop) return;
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setRawFile(file);
      revokeObjectUrl(previewObjectUrlRef.current);
      const nextPreviewUrl = URL.createObjectURL(file);
      previewObjectUrlRef.current = nextPreviewUrl;
      setPreview(nextPreviewUrl);
      setShowCrop(true);
    }
  };

  const handleAvatarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    fileRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRawFile(file);
    revokeObjectUrl(previewObjectUrlRef.current);
    const nextPreviewUrl = URL.createObjectURL(file);
    previewObjectUrlRef.current = nextPreviewUrl;
    setPreview(nextPreviewUrl);
    setShowCrop(true);
    e.target.value = '';
  };

  const uploadFile = useCallback(async (file: File) => {
    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append('photo', file);
      const updated = await updateProfilePhoto(profileId, fd);
      revokeObjectUrl(displayObjectUrlRef.current);
      const nextDisplayUrl = URL.createObjectURL(file);
      displayObjectUrlRef.current = nextDisplayUrl;
      setDisplayUrl(nextDisplayUrl);

      revokeObjectUrl(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
      setPreview(null);

      setRawFile(null);
      setShowCrop(false);
      onSuccess?.(updated);
    } catch (err) {
      console.error('Photo upload failed', err);
    } finally {
      setIsUploading(false);
    }
  }, [profileId, onSuccess]);

  const handleSaveOriginal = async () => {
    if (!rawFile) return;
    await uploadFile(rawFile);
  };

  const handleCrop = async () => {
    if (!rawFile || !canvasRef.current) return;

    revokeObjectUrl(cropSourceObjectUrlRef.current);

    const sourceUrl = URL.createObjectURL(rawFile);
    cropSourceObjectUrlRef.current = sourceUrl;

    const img = new Image();

    img.onload = async () => {
      try {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const side = Math.min(img.width, img.height);
        const cropX = (img.width - side) / 2;
        const cropY = (img.height - side) / 2;
        const outputSize = Math.min(side, 512);

        canvas.width = outputSize;
        canvas.height = outputSize;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, cropX, cropY, side, side, 0, 0, outputSize, outputSize);

        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob(resolve, 'image/jpeg', 0.9);
        });

        if (!blob) return;

        const cropped = new File([blob], rawFile.name, { type: 'image/jpeg' });
        await uploadFile(cropped);
      } finally {
        revokeObjectUrl(cropSourceObjectUrlRef.current);
        cropSourceObjectUrlRef.current = null;
      }
    };

    img.onerror = () => {
      revokeObjectUrl(cropSourceObjectUrlRef.current);
      cropSourceObjectUrlRef.current = null;
    };

    img.src = sourceUrl;
  };

  const handleCapture = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const size = Math.min(video.videoWidth, video.videoHeight);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      const sx = (video.videoWidth - size) / 2;
      const sy = (video.videoHeight - size) / 2;

      ctx.translate(size, 0);
      ctx.scale(-1, 1);

      ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);

      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
          setRawFile(file);
          revokeObjectUrl(previewObjectUrlRef.current);
          const nextPreviewUrl = URL.createObjectURL(blob);
          previewObjectUrlRef.current = nextPreviewUrl;
          setPreview(nextPreviewUrl);
          setShowCrop(true);

          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
          }
          setShowCamera(false);
        }
      }, 'image/jpeg', 0.95);
    }
  };

  const handleCancelCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
    setCameraError(null);
  };

  const handleCancel = () => {
    revokeObjectUrl(previewObjectUrlRef.current);
    previewObjectUrlRef.current = null;

    revokeObjectUrl(cropSourceObjectUrlRef.current);
    cropSourceObjectUrlRef.current = null;

    setPreview(null);
    setRawFile(null);
    setShowCrop(false);
  };

  const handleRemovePhoto = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const confirmed = await dialog.confirm({
      title: 'Remove profile photo?',
      message: 'Are you sure you want to remove your profile photo?',
      confirmLabel: 'Remove photo',
      cancelLabel: 'Cancel',
      variant: 'danger',
    });

    if (!confirmed) return;

    setIsUploading(true);
    try {
      const updated = await deleteProfilePhoto(profileId);

      revokeObjectUrl(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;

      revokeObjectUrl(displayObjectUrlRef.current);
      displayObjectUrlRef.current = null;

      revokeObjectUrl(cropSourceObjectUrlRef.current);
      cropSourceObjectUrlRef.current = null;

      setDisplayUrl('');
      setPreview(null);
      setRawFile(null);
      setShowCrop(false);
      onSuccess?.(updated);
    } catch (err: unknown) {
      console.error('Failed to remove photo:', err);

      await dialog.showMessage({
        title: 'Could not remove photo',
        message: 'The profile photo could not be removed. Please try again.',
        variant: 'danger',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const initials = getInitials(profileName);
  const showImage = displayUrl || preview;

  if (readOnlyOnDesktop && !isMobile) {
    return (
      <div
        className="relative shrink-0 overflow-hidden rounded-full border border-border bg-primary-light"
        // @allow-inline-style - dynamic sizing px value based on props
        style={{ width: px, height: px }}
      >
        {showImage ? (
          <img
            src={preview || displayUrl}
            alt={profileName}
            className="block size-full object-cover"
          />
        ) : (
          <div
            className="flex size-full items-center justify-center bg-primary-light font-semibold text-primary-deep"
            // @allow-inline-style - dynamic font sizing based on props
            style={{ fontSize: size === 'sm' ? '14px' : size === 'md' ? '36px' : '44px' }}
          >
            {initials}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex shrink-0 flex-col items-center">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleAvatarClick}
        className="relative flex cursor-pointer items-center justify-center overflow-hidden rounded-full bg-primary-light transition-all duration-200 hover:opacity-90"
        // @allow-inline-style - dynamic sizing px value and dragging borders based on component state
        style={{
          width: px,
          height: px,
          border: isDragging ? '3px dashed var(--primary)' : '2px solid transparent',
          boxShadow: isDragging ? '0 0 0 4px rgba(74, 124, 89, 0.25)' : 'none',
        }}
      >
        {showImage ? (
          <img
            src={preview || displayUrl}
            alt={profileName}
            className="block size-full object-cover"
          />
        ) : (
          <div
            className="flex size-full items-center justify-center bg-primary-light font-semibold text-primary-deep"
            // @allow-inline-style - dynamic font sizing based on props
            style={{ fontSize: size === 'sm' ? '14px' : size === 'md' ? '36px' : '44px' }}
          >
            {initials}
          </div>
        )}

        {isUploading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/45">
            <div className="size-6 animate-[spin_0.7s_linear_infinite] rounded-full border-3 border-white/30 border-t-white" />
          </div>
        )}

        {!isMobile && isDragging && !isUploading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[rgba(74,124,89,0.85)] text-white backdrop-blur-sm">
            <span className={`font-bold ${size === 'sm' ? 'text-[8px]' : 'text-[12px]'}`}>Drop Photo</span>
          </div>
        )}
      </div>

      {!isMobile && size !== 'sm' && (
        <div className="mt-2 flex w-full flex-col items-center gap-[2px]">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); fileRef.current?.click(); }}
              className="inline-flex min-h-auto cursor-pointer items-center gap-1 border-none bg-none p-1 text-[0.8125rem] font-semibold text-primary transition-colors duration-200 hover:text-primary-deep"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Choose File
            </button>

            <span className="text-xs text-text-muted">|</span>

            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowCamera(true); }}
              className="inline-flex min-h-auto cursor-pointer items-center gap-1 border-none bg-none p-1 text-[0.8125rem] font-semibold text-primary transition-colors duration-200 hover:text-primary-deep"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              Take Photo
            </button>

            {displayUrl && (
              <>
                <span className="text-xs text-text-muted">|</span>
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="inline-flex min-h-auto cursor-pointer items-center gap-1 border-none bg-none p-1 text-[0.8125rem] font-semibold text-[#ef4444] transition-colors duration-200 hover:text-[#dc2626]"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  Remove
                </button>
              </>
            )}
          </div>
          <span className="text-xs text-text-muted">
            or drag & drop photo here
          </span>
        </div>
      )}

      {isMobile && size !== 'sm' && (
        <div className="mt-2 flex flex-col items-center gap-1">
          <span className="text-xs text-text-muted">
            Tap photo to change
          </span>
          {displayUrl && (
            <button
              type="button"
              onClick={handleRemovePhoto}
              className="inline-flex min-h-auto cursor-pointer items-center gap-1 border-none bg-none p-1 text-[0.8125rem] font-semibold text-[#ef4444] transition-colors duration-200 hover:text-[#dc2626]"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              Remove Photo
            </button>
          )}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        // @allow-inline-style - hidden file input
        style={{ display: 'none' }}
      />

      {showCamera && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/85 p-4 backdrop-blur-[8px]"
        >
          <div className="flex w-full max-w-[440px] flex-col items-center gap-4 rounded-lg border border-white/10 bg-slate-800 p-6 text-white shadow-2xl">
            <div className="flex w-full items-center justify-between">
              <h3 className="m-0 text-xl font-semibold text-white">Camera Preview</h3>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCancelCamera(); }}
                className="flex min-h-auto cursor-pointer items-center justify-center border-none bg-none p-1 text-slate-400 hover:text-white"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {cameraError ? (
              <div className="flex w-full flex-col gap-2 rounded-md border border-red-500/30 bg-red-500/15 p-4 text-center text-sm text-red-300">
                <div>{cameraError}</div>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowCamera(false); fileRef.current?.click(); }}
                  className="min-h-auto cursor-pointer rounded border border-white/20 bg-white/10 px-3 py-1.5 text-[0.8125rem] text-white transition-colors duration-200 hover:bg-white/20"
                >
                  Choose File from Device
                </button>
              </div>
            ) : (
              <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-full border-[3px] border-primary bg-slate-900 shadow-[0_0_0_4px_rgba(74,124,89,0.2),inset_0_0_20px_rgba(0,0,0,0.8)]">
                {isCameraLoading && (
                  <div className="flex flex-col items-center gap-2">
                    <div className="size-9 animate-[spin_0.7s_linear_infinite] rounded-full border-3 border-white/20 border-t-white" />
                    <span className="text-[0.8125rem] text-slate-400">Starting camera...</span>
                  </div>
                )}

                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  // @allow-inline-style - dynamic display block/none depending on camera loading state
                  style={{
                    display: isCameraLoading ? 'none' : 'block',
                  }}
                  className="size-full -scale-x-100 object-cover"
                />
              </div>
            )}

            {!cameraError && videoDevices.length > 1 && (
              <div className="flex w-full flex-col gap-1.5">
                <span className="text-xs font-semibold text-slate-400">Switch Camera</span>
                <select
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  className="min-h-[38px] w-full cursor-pointer rounded-md border border-white/10 bg-slate-900 bg-[url(data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222.5%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E)] bg-[length:16px] bg-[right_12px_center] bg-no-repeat px-3 py-2 text-sm text-white"
                >
                  {videoDevices.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Camera ${device.deviceId.slice(0, 5)}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {!cameraError && !isCameraLoading && (
              <div className="mt-2 flex flex-col items-center">
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCapture(); }}
                  className="relative flex size-[72px] min-h-auto cursor-pointer items-center justify-center rounded-full border-6 border-white/20 bg-white p-0 transition-transform duration-150 outline-none hover:scale-105 hover:border-white/35"
                >
                  <div className="size-[52px] rounded-full border-2 border-black bg-white" />
                </button>
                <span className="mt-2 text-xs text-slate-400">Click to capture</span>
              </div>
            )}
          </div>
        </div>
      )}

      {showCrop && preview && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4"
        >
          <div className="flex w-full max-w-[400px] flex-col items-center gap-4 rounded-lg border border-border bg-surface p-6">
            <img
              src={preview}
              alt="Preview"
              className="max-h-[300px] w-full rounded-md object-contain"
            />
            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSaveOriginal(); }}
                disabled={isUploading}
                className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-transparent bg-primary px-6 font-sans text-sm font-medium whitespace-nowrap text-surface transition-all duration-200 hover:not-disabled:bg-primary-deep hover:not-disabled:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isUploading ? 'Uploading...' : 'Use Photo'}
              </button>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCrop(); }}
                disabled={isUploading}
                className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-transparent bg-primary-light px-6 font-sans text-sm font-medium whitespace-nowrap text-primary-deep transition-all duration-200 hover:not-disabled:bg-[#d1dfd6] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Crop to Square
              </button>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCancel(); }}
                disabled={isUploading}
                className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-border bg-transparent px-6 font-sans text-sm font-medium whitespace-nowrap text-text-muted transition-all duration-200 hover:not-disabled:bg-primary-light hover:not-disabled:text-primary-deep disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      // @allow-inline-style - hidden canvas for image manipulation
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
