import React, { useState, useRef, useCallback } from 'react';
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
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showCrop, setShowCrop] = useState(false);
  const [displayUrl, setDisplayUrl] = useState(currentPhotoUrl || '');

  // Keep displayUrl in sync if the parent passes a new photo URL
  React.useEffect(() => {
    setDisplayUrl(currentPhotoUrl || '');
  }, [currentPhotoUrl]);

  const handleClick = (e: React.MouseEvent) => {
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
      // Output a reasonably sized square
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

  const handleCancel = () => {
    setPreview(null);
    setRawFile(null);
    setShowCrop(false);
  };

  const initials = profileName.charAt(0).toUpperCase();
  const showImage = displayUrl || preview;

  return (
    <>
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
          flexShrink: 0,
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

        {/* Camera icon overlay — only visible on hover/touch for md/lg */}
        {!isUploading && size !== 'sm' && (
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
            <svg width={px * 0.3} height={px * 0.3} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </div>
        )}

        {/* Small camera badge for sm size */}
        {!isUploading && size === 'sm' && (
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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </div>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

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
