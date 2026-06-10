'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { IMAGE_ACCEPT_ATTR, validateImageFile } from '@/lib/imageUpload';

interface AdminImageUploadProps {
  currentImage: string | null;
  alt: string;
  isUploading: boolean;
  onSelect: (file: File) => void;
  /** When provided, a remove badge is shown while an image exists. */
  onRemove?: () => void;
  isRemoving?: boolean;
  /** Square thumbnail edge length in px. Defaults to 56. */
  size?: number;
  rounded?: string;
  className?: string;
}

// Compact click-to-upload thumbnail used across admin category/menu-item lists.
// Validates type (JPG/PNG/WebP) and size (<=5MB) before invoking onSelect, and
// renders loading + inline client-validation error states. When onRemove is
// supplied, a remove badge appears while an image exists (parent confirms).
export function AdminImageUpload({
  currentImage,
  alt,
  isUploading,
  onSelect,
  onRemove,
  isRemoving = false,
  size = 56,
  rounded = 'rounded-xl',
  className,
}: AdminImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState('');

  const handleFile = (file: File | undefined) => {
    setLocalError('');
    if (!file) return;
    const err = validateImageFile(file);
    if (err) {
      setLocalError(err);
      return;
    }
    onSelect(file);
  };

  const busy = isUploading || isRemoving;
  const showRemove = !!onRemove && !!currentImage && !busy;

  return (
    <div className={`flex flex-col gap-1 ${className ?? ''}`}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          title={currentImage ? 'Replace image' : 'Upload image'}
          style={{ width: size, height: size }}
          className={`group relative w-full h-full overflow-hidden border border-stone-200 bg-stone-50 ${rounded} flex items-center justify-center transition-colors hover:border-stone-300 disabled:cursor-not-allowed`}
        >
          {currentImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={currentImage} alt={alt} className="w-full h-full object-cover" />
          ) : (
            <ImagePlus className="w-4 h-4 text-stone-300 group-hover:text-stone-400 transition-colors" />
          )}

          {/* Hover hint when idle and an image already exists */}
          {!busy && currentImage && (
            <span className="absolute inset-0 flex items-center justify-center bg-stone-900/0 group-hover:bg-stone-900/40 transition-colors">
              <ImagePlus className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </span>
          )}

          {/* Busy overlay (upload or remove) + indeterminate bar */}
          {busy && (
            <span className="absolute inset-0 flex items-center justify-center bg-white/70">
              <Loader2 className="w-4 h-4 animate-spin text-stone-600" />
              <span className="absolute bottom-0 left-0 h-0.5 w-full bg-stone-400 animate-pulse" />
            </span>
          )}
        </button>

        {/* Remove badge (parent shows a confirmation before clearing) */}
        {showRemove && (
          <button
            type="button"
            onClick={onRemove}
            title="Remove image"
            aria-label="Remove image"
            className="absolute -top-1.5 -end-1.5 w-5 h-5 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-sm ring-2 ring-white transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_ACCEPT_ATTR}
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          // Allow re-selecting the same file after an error/replace.
          e.target.value = '';
        }}
      />

      {localError && (
        <span className="text-[10px] font-bold text-red-500 leading-tight max-w-[120px]">{localError}</span>
      )}
    </div>
  );
}
