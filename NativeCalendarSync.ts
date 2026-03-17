// Simple global paywall visibility state.
// Used to prevent accidental paywall loops where multiple screens
// try to open Paywall repeatedly.

let paywallVisible = false;

export function setPaywallVisible(next: boolean): void {
  paywallVisible = !!next;
}

export function isPaywallVisible(): boolean {
  return paywallVisible;
}
