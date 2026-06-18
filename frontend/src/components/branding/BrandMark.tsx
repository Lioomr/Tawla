import { RestaurantBranding } from '@/lib/api';
import { brandName, getTextDir } from '@/lib/branding';

interface BrandMarkProps {
  branding?: RestaurantBranding | null;
  /** Logo size in pixels (square). Defaults to 40. */
  size?: number;
  /** Show the restaurant name next to/instead of the logo. */
  showName?: boolean;
  displayName?: string;
  className?: string;
}

// Renders the restaurant logo when available, otherwise falls back to the
// restaurant name. Used in customer-facing headers in place of generic branding.
export function BrandMark({ branding, size = 40, showName = true, displayName, className }: BrandMarkProps) {
  const name = displayName || brandName(branding);
  const logo = branding?.logo;

  return (
    <div className={`flex items-center gap-3 ${className ?? ''}`}>
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logo}
          alt={`${name} logo`}
          width={size}
          height={size}
          className="rounded-xl object-contain shrink-0"
          style={{ width: size, height: size }}
        />
      ) : null}
      {(showName || !logo) && (
        <span
          dir={getTextDir(name)}
          className="text-xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 truncate"
        >
          {name}
        </span>
      )}
    </div>
  );
}
