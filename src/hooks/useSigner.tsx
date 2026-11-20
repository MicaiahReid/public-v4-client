import { useSyncExternalStore } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';

const STORAGE_KEY = 'x-signer-pubkey';
const listeners = new Set<() => void>();

function readStoredSigner(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

/** Persists the manual signer pubkey (or clears it when `value` is null) and notifies subscribers. */
export function setManualSigner(value: string | null) {
  if (value) {
    localStorage.setItem(STORAGE_KEY, new PublicKey(value).toBase58());
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
  listeners.forEach((l) => l());
}

/** Returns the manually configured signer pubkey, or null if none is set or the stored value is invalid. */
export function useManualSigner(): PublicKey | null {
  const stored = useSyncExternalStore(subscribe, readStoredSigner, () => null);
  if (!stored) return null;
  try {
    return new PublicKey(stored);
  } catch {
    return null;
  }
}

/**
 * Returns the key that should act as member/fee payer for transactions.
 *
 * A connected wallet always takes precedence. Without one, the manual signer pubkey is used and
 * `isManual` is true, meaning callers should produce an unsigned transaction instead of sending.
 */
export function useSigner(): { publicKey: PublicKey | null; isManual: boolean } {
  const { publicKey: walletKey } = useWallet();
  const manualSigner = useManualSigner();
  if (walletKey) return { publicKey: walletKey, isManual: false };
  return { publicKey: manualSigner, isManual: !!manualSigner };
}
