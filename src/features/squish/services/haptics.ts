// Plays a short vibration on supported devices when the avatar is squeezed.
export function playSquishHaptic() {
  if (typeof navigator !== "undefined") {
    navigator.vibrate?.(9);
  }
}
