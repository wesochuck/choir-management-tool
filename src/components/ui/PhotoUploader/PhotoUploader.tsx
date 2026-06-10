import { useState, useRef, useCallback, useEffect } from 'react';
import { updateProfilePhoto, deleteProfilePhoto, type Profile } from '../../../services/profileService';
import { useDialog } from '../../../contexts/DialogContext';
import styles from './PhotoUploader.module.css';

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
        className={styles.avatar}
        style={{ width: px, height: px }} // @allow-inline-style - dynamic sizing px value based on props
      >
        {showImage ? (
          <img
            src={preview || displayUrl}
            alt={profileName}
            className={styles.avatarImg}
          />
        ) : (
          <div
            className={styles.fallback}
            style={{ fontSize: size === 'sm' ? '14px' : size === 'md' ? '36px' : '44px' }} // @allow-inline-style - dynamic font sizing based on props
          >
            {initials}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleAvatarClick}
        className={styles.trigger}
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
            className={styles.avatarImg}
          />
        ) : (
          <div
            className={styles.fallback}
            style={{ fontSize: size === 'sm' ? '14px' : size === 'md' ? '36px' : '44px' }} // @allow-inline-style - dynamic font sizing based on props
          >
            {initials}
          </div>
        )}

        {isUploading && (
          <div className={styles.spinnerOverlay}>
            <div className={styles.photoSpinner} />
          </div>
        )}

        {!isMobile && isDragging && !isUploading && (
          <div className={styles.dragOverlay}>
            <span style={{ fontSize: size === 'sm' ? '8px' : '12px', fontWeight: 700 }}>Drop Photo</span> {/* @allow-inline-style - dynamic text size based on props */}
          </div>
        )}
      </div>

      {!isMobile && size !== 'sm' && (
        <div className={styles.btnPanel}>
          <div className={styles.btnGroup}>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); fileRef.current?.click(); }}
              className={styles.actionBtn}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Choose File
            </button>

            <span className={`${styles.textXs} ${styles.textMuted}`}>|</span>

            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowCamera(true); }}
              className={styles.actionBtn}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              Take Photo
            </button>

            {displayUrl && (
              <>
                <span className={`${styles.textXs} ${styles.textMuted}`}>|</span>
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className={styles.removeBtn}
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
          <span className={`${styles.textXs} ${styles.textMuted}`}>
            or drag & drop photo here
          </span>
        </div>
      )}

      {isMobile && size !== 'sm' && (
        <div className={styles.btnPanelMobile}>
          <span className={`${styles.textXs} ${styles.textMuted}`}>
            Tap photo to change
          </span>
          {displayUrl && (
            <button
              type="button"
              onClick={handleRemovePhoto}
              className={styles.removeBtn}
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
          className={styles.cameraOverlay}
        >
          <div className={styles.cameraContent}>
            <div className={styles.cameraHeader}>
              <h3 className={styles.cameraTitle}>Camera Preview</h3>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCancelCamera(); }}
                className={styles.cameraCloseBtn}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {cameraError ? (
              <div className={styles.cameraErrorAlert}>
                <div>{cameraError}</div>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowCamera(false); fileRef.current?.click(); }}
                  className={styles.cameraErrorBtn}
                >
                  Choose File from Device
                </button>
              </div>
            ) : (
              <div className={styles.viewfinderFrame}>
                {isCameraLoading && (
                  <div className={styles.cameraLoadingContainer}>
                    <div className={`${styles.photoSpinner} ${styles.cameraLoadingSpinner}`} />
                    <span className={styles.cameraLoadingText}>Starting camera...</span>
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
                  className={styles.avatarImg}
                />
              </div>
            )}

            {!cameraError && videoDevices.length > 1 && (
              <div className={styles.deviceSwitchContainer}>
                <span className={styles.deviceLabel}>Switch Camera</span>
                <select
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  className={styles.deviceSelect}
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
              <div className={styles.shutterContainer}>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCapture(); }}
                  className={styles.shutterBtn}
                >
                  <div className={styles.shutterInner} />
                </button>
                <span className={styles.shutterLabel}>Click to capture</span>
              </div>
            )}
          </div>
        </div>
      )}

      {showCrop && preview && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={styles.cropOverlay}
        >
          <div className={styles.cropContent}>
            <img
              src={preview}
              alt="Preview"
              className={styles.cropImg}
            />
            <div className={styles.cropActions}>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSaveOriginal(); }}
                disabled={isUploading}
                className={styles.cropPrimaryBtn}
              >
                {isUploading ? 'Uploading...' : 'Use Photo'}
              </button>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCrop(); }}
                disabled={isUploading}
                className={styles.cropSecondaryBtn}
              >
                Crop to Square
              </button>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCancel(); }}
                disabled={isUploading}
                className={styles.cropGhostBtn}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* @allow-inline-style - hidden canvas for image manipulation */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
