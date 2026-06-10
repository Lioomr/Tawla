// Shared client-side image upload rules. Mirrors the backend validators in
// apps/core/upload_validators.py so we can reject bad files before the request.

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

// Value for an <input type="file" accept="..."> attribute.
export const IMAGE_ACCEPT_ATTR = ACCEPTED_IMAGE_TYPES.join(',');

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB

// Returns a human-readable error string if the file is invalid, otherwise null.
export function validateImageFile(file: File): string | null {
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return 'Use a JPG, PNG, or WebP image.';
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return 'Image must be 5MB or smaller.';
  }
  return null;
}
