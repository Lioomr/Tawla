import { guestInitials } from "@/lib/lobby";
import { getReadableTextColor, isValidHex } from "@/lib/branding";

interface GuestAvatarProps {
  name: string;
  color: string;
  /** Diameter in px. */
  size?: number;
  /** Highlights the current device's own avatar with a brand-coloured ring. */
  isSelf?: boolean;
  /** Surface colour behind the avatar, used as the separating ring in stacks. */
  ringColor?: string;
  className?: string;
}

// Small, deterministic guest avatar: a coloured disc with initials. Colour comes
// from the backend (or the mirrored palette for self); text colour is chosen for
// contrast. Purely presentational and decorative — labels live alongside it.
export function GuestAvatar({
  name,
  color,
  size = 36,
  isSelf = false,
  ringColor = "#ffffff",
  className = "",
}: GuestAvatarProps) {
  const bg = isValidHex(color) ? color : "#52525b";
  const fg = getReadableTextColor(bg);

  return (
    <div
      className={`flex items-center justify-center rounded-full font-bold leading-none select-none ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: bg,
        color: fg,
        fontSize: Math.round(size * 0.36),
        boxShadow: isSelf
          ? `0 0 0 2px ${ringColor}, 0 0 0 4px var(--brand-primary)`
          : `0 0 0 2px ${ringColor}`,
      }}
      aria-hidden="true"
    >
      {guestInitials(name)}
    </div>
  );
}
