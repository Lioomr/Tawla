import { useMutation } from '@tanstack/react-query';
import { updateGuestDisplayName, GuestUpdateResponse } from '@/lib/api';
import { useCustomerStore } from '@/store/useCustomerStore';
import { useLobbyStore } from '@/store/useLobbyStore';

// Updates the current guest's display name. A blank value resets to the backend
// default ("Guest N"). On success the authoritative name/colour from the server
// are written into the lobby store (never guessed). Validation failures surface
// as ApiError(code="invalid_request") for the UI to display.
export function useUpdateGuestName() {
  const sessionToken = useCustomerStore((s) => s.sessionToken);
  const guestToken = useCustomerStore((s) => s.guestToken);
  const isValid = useCustomerStore((s) => s.isValid);
  const setSelfIdentity = useLobbyStore((s) => s.setSelfIdentity);

  return useMutation<GuestUpdateResponse, unknown, string>({
    mutationFn: async (displayName: string) => {
      if (!sessionToken || !guestToken || !isValid()) {
        throw new Error('No valid session');
      }
      return updateGuestDisplayName(sessionToken, guestToken, displayName);
    },
    onSuccess: (data) => {
      setSelfIdentity({
        displayName: data.display_name,
        avatarColor: data.avatar_color,
        mode: data.mode,
        guestCount: data.guest_count,
      });
    },
  });
}
