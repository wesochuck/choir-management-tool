import React, { useState, useRef, useCallback, useEffect } from 'react';
import { updateProfilePhoto } from '../../services/profileService';

interface PhotoUploaderProps {
  profileId: string;
  profileName: string;
  currentPhotoUrl?: string;
  size?: 'sm' | 'md' | 'lg';
  onSuccess?: (updatedRecord: any) => void;
  readOnlyOnDesktop?: boolean;
}

const SIZES = {
  sm: 32,
  md: 96,
  lg: 120,
};

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  profileId,
  profileName,
  currentPhotoUrl,
  size = 'md',
  onSuccess,
  readOnlyOnDesktop = false,
}) => {
  const px = SIZES[size];
  const fileRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showCrop, setShowCrop] = useState(false);
  const [displayUrl, setDisplayUrl] = useState(currentPhotoUrl || '');

  // Environment and user interaction states
  const [isMobile, setIsMobile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

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
      } catch (err: any) {
        console.error('Camera startup failed', err);
        if (active) {
          if (err.name === 'NotAllowedError') {
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
      const url = URL.createObjectURL(file);
      setPreview(url);
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
    const url = URL.createObjectURL(file);
    setPreview(url);
    setShowCrop(true);
    e.target.value = ''; // Reset input to allow re-selection
  };

  const uploadFile = useCallback(async (file: File) => {
    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append('photo', file);
      const updated = await updateProfilePhoto(profileId, fd);
      setDisplayUrl(URL.createObjectURL(file));
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
    const img = new Image();
    img.onload = async () => {
      const canvas = canvasRef.current!;
      const side = Math.min(img.width, img.height);
      const cropX = (img.width - side) / 2;
      const cropY = (img.height - side) / 2;
      const outputSize = Math.min(side, 512);
      canvas.width = outputSize;
      canvas.height = outputSize;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, cropX, cropY, side, side, 0, 0, outputSize, outputSize);
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const cropped = new File([blob], rawFile!.name, { type: 'image/jpeg' });
        await uploadFile(cropped);
      }, 'image/jpeg', 0.9);
    };
    img.src = URL.createObjectURL(rawFile);
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
          setPreview(URL.createObjectURL(blob));
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
    setPreview(null);
    setRawFile(null);
    setShowCrop(false);
  };

  const initials = profileName.charAt(0).toUpperCase();
  const showImage = displayUrl || preview;

  // Render a completely passive avatar if on desktop and in read-only context (e.g. Roster table)
  if (readOnlyOnDesktop && !isMobile) {
    return (
      <div
        style={{
          position: 'relative',
          width: px,
          height: px,
          borderRadius: '50%',
          overflow: 'hidden',
          flexShrink: 0,
          backgroundColor: 'var(--primary-light)',
          border: '1px solid var(--border)',
        }}
      >
        {showImage ? (
          <img
            src={preview || displayUrl}
            alt={profileName}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            backgroundColor: 'var(--primary-light)',
            color: 'var(--primary-deep)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: size === 'sm' ? '14px' : size === 'md' ? '36px' : '44px',
            fontWeight: 600,
          }}>
            {initials}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
      {/* Upload trigger circle zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onMouseEnter={() => !isMobile && setIsHovered(true)}
        onMouseLeave={() => !isMobile && setIsHovered(false)}
        onClick={handleAvatarClick}
        style={{
          position: 'relative',
          width: px,
          height: px,
          borderRadius: '50%',
          overflow: 'hidden',
          cursor: 'pointer',
          border: isDragging ? '3px dashed var(--primary)' : '2px solid transparent',
          boxShadow: isDragging ? '0 0 0 4px rgba(74, 124, 89, 0.25)' : 'none',
          transition: 'all 0.2s ease',
          backgroundColor: 'var(--primary-light)',
        }}
      >
        {showImage ? (
          <img
            src={preview || displayUrl}
            alt={profileName}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            backgroundColor: 'var(--primary-light)',
            color: 'var(--primary-deep)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: size === 'sm' ? '14px' : size === 'md' ? '36px' : '44px',
            fontWeight: 600,
          }}>
            {initials}
          </div>
        )}

        {/* Upload spinner overlay */}
        {isUploading && (
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 20,
          }}>
            <div className="photo-spinner" />
          </div>
        )}

        {/* Drag and Drop Over Overlay (active during active drag overlays) */}
        {!isMobile && isDragging && !isUploading && (
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(74, 124, 89, 0.85)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            zIndex: 10,
          }}>
            <span style={{ fontSize: size === 'sm' ? '8px' : '12px', fontWeight: 700 }}>Drop Photo</span>
          </div>
        )}

        {/* Subtle hover overlay to denote clickability on desktop */}
        {!isMobile && isHovered && !isDragging && !isUploading && (
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            transition: 'background-color 0.2s',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.9 }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
        )}

        {/* Lightweight Mobile Hover Indicator (or passive overlay) */}
        {isMobile && !isUploading && (
          <div style={{
            position: 'absolute',
            bottom: 0,
            insetInline: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: size === 'sm' ? '12px' : '26px',
            zIndex: 10,
          }}>
            <svg
              width={size === 'sm' ? 8 : 12}
              height={size === 'sm' ? 8 : 12}
              viewBox="0 0 24 24" fill="none" stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round"
            >
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </div>
        )}
      </div>

      {/* Desktop instructions and buttons panel below the photo */}
      {!isMobile && size !== 'sm' && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px',
          marginTop: 'var(--space-sm)',
          width: '100%',
        }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); fileRef.current?.click(); }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary)',
                cursor: 'pointer',
                fontSize: '0.8125rem',
                fontWeight: 600,
                padding: '4px 6px',
                minHeight: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary-deep)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--primary)'}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Choose File
            </button>
            
            <span style={{ color: 'var(--border)', fontSize: '0.75rem' }}>|</span>

            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowCamera(true); }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary)',
                cursor: 'pointer',
                fontSize: '0.8125rem',
                fontWeight: 600,
                padding: '4px 6px',
                minHeight: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary-deep)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--primary)'}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              Take Photo
            </button>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            or drag & drop photo here
          </span>
        </div>
      )}

      {/* Mobile-only clean footer instruction */}
      {isMobile && size !== 'sm' && (
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 'var(--space-sm)' }}>
          Tap photo to change
        </span>
      )}

      {/* Hidden File input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {/* In-app Webcam Modal (Desktop/Laptop webcam capture) */}
      {showCamera && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-md)',
          }}
        >
          <div
            style={{
              maxWidth: 440,
              width: '100%',
              backgroundColor: '#1e293b',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-lg)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-md)',
              alignItems: 'center',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)',
              color: '#fff',
            }}
          >
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#fff' }}>Camera Preview</h3>
              <button
                onClick={handleCancelCamera}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 'auto',
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Error messaging */}
            {cameraError ? (
              <div style={{
                width: '100%',
                padding: 'var(--space-md)',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
                color: '#fca5a5',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-sm)',
              }}>
                <div>{cameraError}</div>
                <button
                  onClick={() => { setShowCamera(false); fileRef.current?.click(); }}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 'var(--radius-sm)',
                    color: '#fff',
                    padding: '6px 12px',
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                    minHeight: 'auto',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                >
                  Choose File from Device
                </button>
              </div>
            ) : (
              /* Viewfinder frame */
              <div style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '1 / 1',
                borderRadius: '50%',
                overflow: 'hidden',
                border: '3px solid var(--primary)',
                boxShadow: '0 0 0 4px rgba(74, 124, 89, 0.2), inset 0 0 20px rgba(0,0,0,0.8)',
                backgroundColor: '#0f172a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {isCameraLoading && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <div className="photo-spinner" style={{ borderColor: 'rgba(255,255,255,0.2)', borderTopColor: '#fff', width: 36, height: 36 }} />
                    <span style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>Starting camera...</span>
                  </div>
                )}
                
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: 'scaleX(-1)', // Mirrored feed
                    display: isCameraLoading ? 'none' : 'block',
                  }}
                />
              </div>
            )}

            {/* Switching devices dropdown */}
            {!cameraError && videoDevices.length > 1 && (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>Switch Camera</span>
                <select
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: '#0f172a',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 'var(--radius-md)',
                    color: '#fff',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    minHeight: 38,
                    backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%2394a3b8\' stroke-width=\'2.5\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E")',
                  }}
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
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 'var(--space-sm)' }}>
                <button
                  onClick={handleCapture}
                  style={{
                    position: 'relative',
                    width: 72,
                    height: 72,
                    borderRadius: '50%',
                    backgroundColor: '#fff',
                    border: '6px solid rgba(255, 255, 255, 0.2)',
                    outline: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'transform 0.15s, border-color 0.15s',
                    padding: 0,
                    minHeight: 'auto',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.35)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                  }}
                >
                  <div style={{
                    width: 52,
                    height: 52,
                    borderRadius: '50%',
                    backgroundColor: '#fff',
                    border: '2px solid #000',
                  }} />
                </button>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 8 }}>Click to capture</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Crop / confirm dialog */}
      {showCrop && preview && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-md)',
          }}
        >
          <div className="card" style={{
            maxWidth: 400,
            width: '100%',
            padding: 'var(--space-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-md)',
            alignItems: 'center',
          }}>
            <img
              src={preview}
              alt="Preview"
              style={{
                width: '100%',
                maxHeight: 300,
                objectFit: 'contain',
                borderRadius: 'var(--radius-md)',
              }}
            />
            <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                onClick={handleSaveOriginal}
                disabled={isUploading}
                className="btn btn-primary"
              >
                {isUploading ? 'Uploading...' : 'Use Photo'}
              </button>
              <button
                onClick={handleCrop}
                disabled={isUploading}
                className="btn btn-secondary"
              >
                Crop to Square
              </button>
              <button
                onClick={handleCancel}
                disabled={isUploading}
                className="btn btn-ghost"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};
