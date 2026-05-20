import React, { useState, useRef, useCallback, useEffect } from 'react';
import { updateProfilePhoto } from '../../services/profileService';

interface PhotoUploaderProps {
  profileId: string;
  profileName: string;
  currentPhotoUrl?: string;
  size?: 'sm' | 'md' | 'lg';
  onSuccess?: (updatedRecord: any) => void;
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
}) => {
  const px = SIZES[size];
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showCrop, setShowCrop] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [displayUrl, setDisplayUrl] = useState(currentPhotoUrl || '');

  // Webcam-specific states
  const [showCamera, setShowCamera] = useState(false);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraLoading, setIsCameraLoading] = useState(false);

  // Keep displayUrl in sync if the parent passes a new photo URL
  useEffect(() => {
    setDisplayUrl(currentPhotoUrl || '');
  }, [currentPhotoUrl]);

  // Close menu on outside click
  useEffect(() => {
    if (!showMenu) return;
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [showMenu]);

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
        // Enumerate devices to see if we have permissions and device info
        let devices = await navigator.mediaDevices.enumerateDevices();
        let videoInputs = devices.filter((d) => d.kind === 'videoinput');

        // If no devices or labels are empty, trigger a quick permission prompt to get full info
        const hasLabels = videoInputs.some((d) => d.label);
        if (videoInputs.length === 0 || !hasLabels) {
          const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
          devices = await navigator.mediaDevices.enumerateDevices();
          videoInputs = devices.filter((d) => d.kind === 'videoinput');
          // Stop temp stream
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

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowMenu((prev) => !prev);
  };

  const handleChooseFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    fileRef.current?.click();
  };

  const handleTakePhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);

    // Detect mobile environment to delegate to native OS camera prompt
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      cameraRef.current?.click();
    } else {
      setShowCamera(true);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRawFile(file);
    const url = URL.createObjectURL(file);
    setPreview(url);
    setShowCrop(true);
    // Reset input so the same file can be re-selected
    e.target.value = '';
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
      
      // Mirror the photo snapshot to match the viewer mirror
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

  return (
    <>
      <div style={{ position: 'relative', flexShrink: 0 }} ref={menuRef}>
        <div
          onClick={handleClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(e as any); }}
          title="Change photo"
          style={{
            position: 'relative',
            width: px,
            height: px,
            borderRadius: '50%',
            overflow: 'hidden',
            cursor: 'pointer',
            transition: 'box-shadow 0.2s',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 3px var(--primary-light)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
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
            }}>
              <div className="photo-spinner" />
            </div>
          )}

          {/* Camera icon overlay on hover */}
          {!isUploading && (
            <div style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0,
              transition: 'opacity 0.2s',
            }}
              className="photo-overlay"
            >
              <svg
                width={size === 'sm' ? 14 : px * 0.3}
                height={size === 'sm' ? 14 : px * 0.3}
                viewBox="0 0 24 24" fill="none" stroke="white"
                strokeWidth={size === 'sm' ? 2.5 : 2}
                strokeLinecap="round" strokeLinejoin="round"
              >
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>
          )}
        </div>

        {/* Action menu */}
        {showMenu && (
          <div
            style={{
              position: 'absolute',
              top: px + 6,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 100,
              minWidth: 180,
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-md)',
              overflow: 'hidden',
              animation: 'slideUp 0.15s ease-out',
            }}
          >
            <button
              onClick={handleTakePhoto}
              style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-sm)',
                width: '100%', padding: '10px 14px',
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '0.875rem', fontWeight: 500,
                color: 'var(--text)', textAlign: 'left',
                borderBottom: '1px solid var(--border)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--primary-light)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              Take Photo
            </button>
            <button
              onClick={handleChooseFile}
              style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-sm)',
                width: '100%', padding: '10px 14px',
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '0.875rem', fontWeight: 500,
                color: 'var(--text)', textAlign: 'left',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--primary-light)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              Choose from Library
            </button>
          </div>
        )}
      </div>

      {/* File picker (gallery/files) */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {/* Mobile-only native Camera capture */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {/* In-app Webcam Modal (Desktop/Laptop & Fallback) */}
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

            {/* Error Message */}
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
                  onClick={handleChooseFile}
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
              /* Camera view frame */
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
                    transform: 'scaleX(-1)', // Mirror image for natural looking preview
                    display: isCameraLoading ? 'none' : 'block',
                  }}
                />
              </div>
            )}

            {/* Camera list dropdown (if multiple input devices are available) */}
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

            {/* Shutter capture controls */}
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
    </>
  );
};
