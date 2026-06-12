import React, { useState, useRef, useCallback, useEffect } from 'react';
import { updateProfilePhoto, deleteProfilePhoto, type Profile } from '../../services/profileService';
import { useDialog } from '../../contexts/DialogContext';
import { Button } from '../ui';


interface PhotoUploaderProps {
  profileId: string;
  profileName: string;
  currentPhotoUrl?: string;
  size?: 'sm' | 'md' | 'lg';
  onSuccess?: (updatedRecord: Profile) => void;
  readOnlyOnDesktop?: boolean;
}

const SIZES = {
  sm: 32,
  md: 80,
  lg: 120,
};

function revokeObjectUrl(url: string | null) {
  if (url && url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  profileId,
  profileName,
  currentPhotoUrl,
  size = 'md',
  onSuccess,
  readOnlyOnDesktop = false,
}) => {
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

  // Environment and user interaction states
  const [isMobile, setIsMobile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Webcam-specific states
  const [showCamera, setShowCamera] = useState(false);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraLoading, setIsCameraLoading] = useState(false);

  // Detect mobile user agent on mount
  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  }, []);

  // Keep displayUrl in sync if the parent passes a new photo URL
  useEffect(() => {
    revokeObjectUrl(displayObjectUrlRef.current);
    displayObjectUrlRef.current = null;

    setDisplayUrl(currentPhotoUrl || '');
  }, [currentPhotoUrl]);

  // Camera stream management
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
        // Enumerate devices to check permissions and available webcams
        let devices = await navigator.mediaDevices.enumerateDevices();
        let videoInputs = devices.filter((d) => d.kind === 'videoinput');

        // Trigger a temporary permission prompt to obtain webcam labels if empty
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

  // Unmount cleanup for object URLs
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

  // Drag and Drop event handlers
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

  // Click handler (avatar direct tap/click launches file picker)
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
    e.target.value = ''; // Reset input to allow re-selection
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
      
      // Mirror horizontal translation for captured snapshots
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


  const initials = profileName.charAt(0).toUpperCase();
  const showImage = displayUrl || preview;

  // Render a completely passive avatar if on desktop and in read-only context (e.g. Roster table)
  if (readOnlyOnDesktop && !isMobile) {
    return (
      <div
        className="relative flex items-center justify-center rounded-full overflow-hidden bg-slate-100 border border-slate-200 shrink-0"
        // @allow-inline-style - dynamic sizing px value based on props
        style={{ width: px, height: px }}
      >
        {showImage ? (
          <img
            src={preview || displayUrl}
            alt={profileName}
            className="size-full object-cover"
          />
        ) : (
          <div
            className="flex items-center justify-center font-bold text-slate-500 uppercase select-none"
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
    <div className="flex flex-col items-center gap-3 w-full">
      {/* Upload trigger circle zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleAvatarClick}
        className="relative flex items-center justify-center rounded-full overflow-hidden bg-slate-100 border-2 border-slate-200 shrink-0 cursor-pointer group hover:border-primary transition-all shadow-sm"
        // @allow-inline-style - dynamic sizing px value and dragging borders based on component state
        style={{
          width: px,
          height: px,
          borderStyle: isDragging ? 'dashed' : 'solid',
          borderColor: isDragging ? 'var(--color-primary)' : '',
          boxShadow: isDragging ? '0 0 0 4px rgba(74, 124, 89, 0.25)' : 'none',
        }}
      >
        {showImage ? (
          <img
            src={preview || displayUrl}
            alt={profileName}
            className="size-full object-cover transition-transform group-hover:scale-105 duration-200"
          />
        ) : (
          <div
            className="flex items-center justify-center font-bold text-slate-500 uppercase select-none"
            // @allow-inline-style - dynamic font sizing based on props
            style={{ fontSize: size === 'sm' ? '14px' : size === 'md' ? '36px' : '44px' }}
          >
            {initials}
          </div>
        )}

        {/* Hover overlay indicator */}
        {!readOnlyOnDesktop && !isUploading && (
          <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-semibold tracking-wide uppercase">
            Change
          </div>
        )}

        {/* Upload spinner overlay */}
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
            <div className="size-6 animate-spin rounded-full border-[3px] border-white/30 border-t-white" />
          </div>
        )}

        {/* Drag and Drop Over Overlay */}
        {!isMobile && isDragging && !isUploading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-primary-light/90 text-primary-deep text-center z-10 p-2">
            <span className={`font-bold ${size === 'sm' ? 'text-[8px]' : 'text-[12px]'}`}>Drop Photo</span>
          </div>
        )}
      </div>

      {/* Desktop instructions and buttons panel below the photo */}
      {!isMobile && size !== 'sm' && (
        <div className="flex flex-col items-center gap-1.5 w-full">
          <div className="flex items-center justify-center gap-2.5 text-xs">
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); fileRef.current?.click(); }}
              className="flex items-center gap-1 font-medium text-primary hover:text-primary-deep cursor-pointer transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Choose File
            </button>
            
            <span className="text-slate-300">|</span>

            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowCamera(true); }}
              className="flex items-center gap-1 font-medium text-primary hover:text-primary-deep cursor-pointer transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              Take Photo
            </button>

            {displayUrl && (
              <>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="flex items-center gap-1 font-medium text-red-600 hover:text-red-700 cursor-pointer transition-colors"
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
          <span className="text-[10px] text-slate-400">
            or drag & drop photo here
          </span>
        </div>
      )}

      {/* Mobile-only clean footer instruction */}
      {isMobile && size !== 'sm' && (
        <div className="flex flex-col items-center gap-1.5 w-full">
          <span className="text-xs text-slate-500">
            Tap photo to change
          </span>
          {displayUrl && (
            <button
              type="button"
              onClick={handleRemovePhoto}
              className="flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 cursor-pointer transition-colors"
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

      {/* In-app Webcam Modal (Desktop/Laptop webcam capture) */}
      {showCamera && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800">Camera Preview</h3>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCancelCamera(); }}
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Error messaging */}
            {cameraError ? (
              <div className="p-6 flex flex-col items-center gap-4 text-center">
                <div className="text-sm text-red-600 font-medium">{cameraError}</div>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowCamera(false); fileRef.current?.click(); }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 transition-colors text-slate-700 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Choose File from Device
                </button>
              </div>
            ) : (
              /* Viewfinder frame */
              <div className="relative aspect-square w-full bg-slate-950 flex items-center justify-center overflow-hidden">
                {isCameraLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-900 text-white text-xs">
                    <div className="size-6 animate-spin rounded-full border-[3px] border-white/30 border-t-white" />
                    <span>Starting camera...</span>
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
                  className="size-full object-cover scale-x-[-1]"
                />
              </div>
            )}

            {/* Switching devices dropdown */}
            {!cameraError && videoDevices.length > 1 && (
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-500">Switch Camera</span>
                <select
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  className="bg-white border border-slate-200 rounded px-2 py-1 outline-none text-slate-700"
                >
                  {videoDevices.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Camera ${device.deviceId.slice(0, 5)}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Shutter capture button */}
            {!cameraError && !isCameraLoading && (
              <div className="p-6 flex flex-col items-center justify-center gap-2 bg-slate-50">
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCapture(); }}
                  className="size-14 rounded-full border-4 border-white bg-red-500 flex items-center justify-center hover:bg-red-600 transition-all hover:scale-105 active:scale-95 shadow-md"
                >
                  <div className="size-5 rounded-full bg-white/40" />
                </button>
                <span className="text-[10px] text-slate-400 font-medium">Click to capture</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Crop / confirm dialog */}
      {showCrop && preview && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 flex flex-col gap-6 items-center">
            <img
              src={preview}
              alt="Preview"
              className="w-full max-w-[240px] aspect-square object-cover rounded-full border-4 border-white shadow-md bg-slate-100"
            />
            <div className="flex flex-col sm:flex-row gap-2 w-full justify-center">
              <Button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSaveOriginal(); }}
                disabled={isUploading}
                variant="primary"
                className="px-5"
                loading={isUploading}
              >
                Use Photo
              </Button>
              <Button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCrop(); }}
                disabled={isUploading}
                variant="secondary"
                className="px-5"
              >
                Crop to Square
              </Button>
              <Button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCancel(); }}
                disabled={isUploading}
                variant="outline"
                className="px-5"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      // @allow-inline-style - hidden canvas for image manipulation
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};
