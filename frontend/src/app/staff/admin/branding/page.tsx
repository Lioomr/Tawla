'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useStaffStore } from '@/store/useStaffStore';
import { useAdminToast } from '@/components/admin/AdminToast';
import ShimmerSkeleton from '@/components/admin/ShimmerSkeleton';
import {
  ApiError,
  RestaurantBranding,
  getRestaurantBranding,
  updateRestaurantBranding,
  updateRestaurantBrandingMedia,
  removeRestaurantLogo,
  removeRestaurantBanner,
} from '@/lib/api';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { DEFAULT_BRAND, getReadableTextColor, isValidHex } from '@/lib/branding';
import { IMAGE_ACCEPT_ATTR, validateImageFile } from '@/lib/imageUpload';
import { Loader2, Palette, Upload, ImageIcon, X, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminBrandingPage() {
  const { accessToken } = useStaffStore();
  const token = accessToken || '';

  const { data: branding, isLoading } = useQuery({
    queryKey: ['admin', 'branding'],
    queryFn: () => getRestaurantBranding(token),
    enabled: !!token,
  });

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-stone-900 flex items-center gap-2.5">
          <Palette className="w-7 h-7 text-stone-400" /> Branding
        </h1>
        <p className="text-stone-500 font-medium mt-1 text-sm">
          Customize how your restaurant appears to customers
        </p>
      </div>

      {isLoading || !branding ? (
        <ShimmerSkeleton variant="card" rows={4} />
      ) : (
        // Re-mount (and re-seed initial state) only when the restaurant changes.
        <BrandingForm key={branding.slug} branding={branding} token={token} />
      )}
    </div>
  );
}

function BrandingForm({ branding, token }: { branding: RestaurantBranding; token: string }) {
  const queryClient = useQueryClient();
  const { showToast } = useAdminToast();

  const [tagline, setTagline] = useState(branding.tagline || '');
  const [welcome, setWelcome] = useState(branding.welcome_message || '');
  const [primaryCustom, setPrimaryCustom] = useState(isValidHex(branding.primary_color));
  const [primary, setPrimary] = useState<string>(
    isValidHex(branding.primary_color) ? (branding.primary_color as string) : DEFAULT_BRAND.primaryColor,
  );
  const [secondaryCustom, setSecondaryCustom] = useState(isValidHex(branding.secondary_color));
  const [secondary, setSecondary] = useState<string>(
    isValidHex(branding.secondary_color) ? (branding.secondary_color as string) : DEFAULT_BRAND.secondaryColor,
  );
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [error, setError] = useState('');

  // Object URLs for live preview of newly selected files.
  const logoPreview = useMemo(() => (logoFile ? URL.createObjectURL(logoFile) : null), [logoFile]);
  const bannerPreview = useMemo(() => (bannerFile ? URL.createObjectURL(bannerFile) : null), [bannerFile]);
  useEffect(() => () => { if (logoPreview) URL.revokeObjectURL(logoPreview); }, [logoPreview]);
  useEffect(() => () => { if (bannerPreview) URL.revokeObjectURL(bannerPreview); }, [bannerPreview]);

  const saveMut = useMutation({
    mutationFn: async (): Promise<RestaurantBranding> => {
      if (logoFile || bannerFile) {
        const fd = new FormData();
        fd.append('tagline', tagline);
        fd.append('welcome_message', welcome);
        if (primaryCustom) fd.append('primary_color', primary);
        if (secondaryCustom) fd.append('secondary_color', secondary);
        if (logoFile) fd.append('logo', logoFile);
        if (bannerFile) fd.append('banner_image', bannerFile);
        return updateRestaurantBrandingMedia(token, fd);
      }
      return updateRestaurantBranding(token, {
        tagline,
        welcome_message: welcome,
        primary_color: primaryCustom ? primary : null,
        secondary_color: secondaryCustom ? secondary : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'branding'] });
      setLogoFile(null);
      setBannerFile(null);
      setError('');
      showToast('Branding updated');
    },
    onError: (e: unknown) => setError(e instanceof ApiError ? e.message : 'Failed to update branding'),
  });

  // ─── Image Removal ───
  const [removeTarget, setRemoveTarget] = useState<'logo' | 'banner' | null>(null);

  const removeLogoMut = useMutation({
    mutationFn: () => removeRestaurantLogo(token),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'branding'] }); setRemoveTarget(null); showToast('Logo removed'); },
    onError: (e: unknown) => showToast(e instanceof ApiError ? e.message : 'Failed to remove image', 'error'),
  });

  const removeBannerMut = useMutation({
    mutationFn: () => removeRestaurantBanner(token),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'branding'] }); setRemoveTarget(null); showToast('Banner removed'); },
    onError: (e: unknown) => showToast(e instanceof ApiError ? e.message : 'Failed to remove image', 'error'),
  });

  const confirmRemove = () => {
    if (removeTarget === 'logo') removeLogoMut.mutate();
    else if (removeTarget === 'banner') removeBannerMut.mutate();
  };

  const onLogoChange = (file: File | null) => {
    setError('');
    if (file) {
      const err = validateImageFile(file);
      if (err) { setError(err); return; }
    }
    setLogoFile(file);
  };

  const onBannerChange = (file: File | null) => {
    setError('');
    if (file) {
      const err = validateImageFile(file);
      if (err) { setError(err); return; }
    }
    setBannerFile(file);
  };

  const displayName = branding.name || DEFAULT_BRAND.name;
  const previewPrimary = primaryCustom ? primary : DEFAULT_BRAND.primaryColor;
  const previewBanner = bannerPreview || branding.banner_image || null;
  const previewLogo = logoPreview || branding.logo || null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
      {/* ─── Form ─── */}
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm font-bold p-3 rounded-xl">{error}</div>
        )}

        {/* Identity (read-only) */}
        <section className="bg-white rounded-2xl border border-stone-200/80 shadow-sm p-5">
          <h2 className="text-sm font-black tracking-tight text-stone-800 mb-4">Identity</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold tracking-widest text-stone-400 uppercase mb-1.5">Name</label>
              <div className="w-full bg-stone-100 border border-stone-200 rounded-xl px-4 py-2.5 text-sm font-bold text-stone-600">
                {displayName}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold tracking-widest text-stone-400 uppercase mb-1.5">Slug</label>
              <div className="w-full bg-stone-100 border border-stone-200 rounded-xl px-4 py-2.5 text-sm font-mono text-stone-500">
                {branding.slug}
              </div>
            </div>
          </div>
          <p className="text-xs text-stone-400 font-medium mt-2">Name and slug are fixed and cannot be edited here.</p>
        </section>

        {/* Messaging */}
        <section className="bg-white rounded-2xl border border-stone-200/80 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-black tracking-tight text-stone-800">Messaging</h2>
          <div>
            <label className="block text-xs font-bold tracking-widest text-stone-400 uppercase mb-1.5">Tagline</label>
            <input
              type="text"
              value={tagline}
              maxLength={255}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="A short line shown under your name"
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-stone-300"
            />
          </div>
          <div>
            <label className="block text-xs font-bold tracking-widest text-stone-400 uppercase mb-1.5">Welcome Message</label>
            <textarea
              value={welcome}
              rows={3}
              onChange={(e) => setWelcome(e.target.value)}
              placeholder="Greet guests when they open the menu"
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-stone-300 resize-none"
            />
          </div>
        </section>

        {/* Colors */}
        <section className="bg-white rounded-2xl border border-stone-200/80 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-black tracking-tight text-stone-800">Colors</h2>
          <ColorField
            label="Primary Color"
            custom={primaryCustom}
            value={primary}
            fallback={DEFAULT_BRAND.primaryColor}
            onToggle={setPrimaryCustom}
            onChange={setPrimary}
          />
          <ColorField
            label="Secondary Color"
            custom={secondaryCustom}
            value={secondary}
            fallback={DEFAULT_BRAND.secondaryColor}
            onToggle={setSecondaryCustom}
            onChange={setSecondary}
          />
        </section>

        {/* Media */}
        <section className="bg-white rounded-2xl border border-stone-200/80 shadow-sm p-5 space-y-5">
          <h2 className="text-sm font-black tracking-tight text-stone-800">Logo &amp; Banner</h2>
          <ImageField
            label="Logo"
            currentUrl={branding.logo || null}
            previewUrl={logoPreview}
            file={logoFile}
            onChange={onLogoChange}
            onRemove={() => setRemoveTarget('logo')}
            isRemoving={removeLogoMut.isPending}
          />
          <ImageField
            label="Banner Image"
            currentUrl={branding.banner_image || null}
            previewUrl={bannerPreview}
            file={bannerFile}
            onChange={onBannerChange}
            onRemove={() => setRemoveTarget('banner')}
            isRemoving={removeBannerMut.isPending}
            wide
          />
          <p className="text-xs text-stone-400 font-medium">JPG, PNG, or WebP · max 5MB.</p>
        </section>

        <div className="flex justify-end">
          <button
            onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending}
            className="px-6 py-2.5 bg-stone-900 text-white rounded-xl text-sm font-bold tracking-tight hover:bg-stone-800 flex items-center gap-2 transition-colors disabled:opacity-60"
          >
            {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Save Changes
          </button>
        </div>
      </div>

      {/* ─── Live Preview ─── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="lg:sticky lg:top-6"
      >
        <p className="text-xs font-bold tracking-widest text-stone-400 uppercase mb-2">Customer Preview</p>
        <div className="rounded-2xl border border-stone-200 shadow-sm overflow-hidden bg-zinc-50">
          {previewBanner ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewBanner} alt="Banner preview" className="w-full h-28 object-cover" />
          ) : null}
          <div className="p-5">
            <div className="flex items-center gap-3">
              {previewLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewLogo} alt="Logo preview" className="w-12 h-12 rounded-xl object-contain" />
              ) : null}
              <span className="text-2xl font-extrabold tracking-tight text-zinc-900">{displayName}</span>
            </div>
            <p className="text-zinc-500 mt-2 text-sm font-medium">
              {welcome || tagline || DEFAULT_BRAND.tagline}
            </p>
            <button
              type="button"
              style={{ backgroundColor: previewPrimary, color: getReadableTextColor(previewPrimary) }}
              className="mt-4 w-full rounded-full py-2.5 text-sm font-bold shadow-sm"
            >
              Add to order
            </button>
          </div>
        </div>
      </motion.div>

      {/* ─── Image Removal Confirm ─── */}
      <AnimatePresence>
        {removeTarget && (
          <ConfirmDialog
            title="Remove Image"
            message={`Remove the ${removeTarget === 'logo' ? 'logo' : 'banner image'}? You can upload a new one anytime.`}
            confirmLabel="Remove"
            onConfirm={confirmRemove}
            onCancel={() => setRemoveTarget(null)}
            isPending={removeLogoMut.isPending || removeBannerMut.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ColorField({
  label, custom, value, fallback, onToggle, onChange,
}: {
  label: string;
  custom: boolean;
  value: string;
  fallback: string;
  onToggle: (v: boolean) => void;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <span className="block text-sm font-bold text-stone-700">{label}</span>
        <span className="text-xs font-medium text-stone-400">
          {custom ? value.toUpperCase() : 'Using default'}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={custom ? value : fallback}
          onChange={(e) => { onChange(e.target.value); onToggle(true); }}
          className="w-10 h-10 rounded-lg border border-stone-200 cursor-pointer bg-white p-0.5"
          aria-label={label}
        />
        {custom && (
          <button
            type="button"
            onClick={() => onToggle(false)}
            className="text-xs font-bold text-stone-400 hover:text-stone-700 transition-colors"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}

function ImageField({
  label, currentUrl, previewUrl, file, onChange, onRemove, isRemoving, wide,
}: {
  label: string;
  currentUrl: string | null;
  previewUrl: string | null;
  file: File | null;
  onChange: (file: File | null) => void;
  onRemove?: () => void;
  isRemoving?: boolean;
  wide?: boolean;
}) {
  const shown = previewUrl || currentUrl;
  return (
    <div>
      <label className="block text-xs font-bold tracking-widest text-stone-400 uppercase mb-1.5">{label}</label>
      <div className="flex items-center gap-4">
        <div
          className={`shrink-0 rounded-xl border border-stone-200 bg-stone-50 overflow-hidden flex items-center justify-center ${
            wide ? 'w-40 h-20' : 'w-16 h-16'
          }`}
        >
          {shown ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shown} alt={`${label} preview`} className="w-full h-full object-contain" />
          ) : (
            <ImageIcon className="w-5 h-5 text-stone-300" />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <label className="inline-flex items-center gap-2 px-3 py-2 bg-stone-100 hover:bg-stone-200 rounded-xl text-xs font-bold text-stone-600 cursor-pointer transition-colors w-fit">
            <Upload className="w-3.5 h-3.5" />
            {file ? 'Change' : 'Upload'}
            <input
              type="file"
              accept={IMAGE_ACCEPT_ATTR}
              className="hidden"
              onChange={(e) => onChange(e.target.files?.[0] ?? null)}
            />
          </label>
          {file && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="inline-flex items-center gap-1 text-xs font-bold text-stone-400 hover:text-red-500 transition-colors w-fit"
            >
              <X className="w-3 h-3" /> Remove selection
            </button>
          )}
          {currentUrl && !file && onRemove && (
            <button
              type="button"
              onClick={onRemove}
              disabled={isRemoving}
              className="inline-flex items-center gap-1 text-xs font-bold text-stone-400 hover:text-red-500 transition-colors w-fit disabled:opacity-60"
            >
              {isRemoving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
              Remove image
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
