import { useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { setManualSigner, useManualSigner } from '@/hooks/useSigner';

function isValidPubkey(value: string) {
  try {
    new PublicKey(value);
    return true;
  } catch {
    return false;
  }
}

/** Lets the user set or clear the pubkey used to build unsigned transactions when no wallet is connected. */
const SetSignerInput = ({ compact = false }: { compact?: boolean }) => {
  const { publicKey: walletKey } = useWallet();
  const signer = useManualSigner();
  const [value, setValue] = useState('');
  const invalid = !!value && !isValidPubkey(value);

  if (signer) {
    const b58 = signer.toBase58();
    return (
      <div className="space-y-2">
        <p className={compact ? 'text-xs text-slate-400' : 'text-sm text-muted-foreground'}>
          Signer: <span className="font-mono">{compact ? `${b58.slice(0, 4)}...${b58.slice(-4)}` : b58}</span>
          {walletKey && ' (inactive while a wallet is connected)'}
        </p>
        <Button
          variant="outline"
          className={compact ? 'w-full' : undefined}
          onClick={() => setManualSigner(null)}
        >
          Clear signer
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Input
        placeholder="Signer pubkey (no wallet)"
        value={value}
        onChange={(e) => setValue(e.target.value.trim())}
      />
      {invalid && <p className="text-xs text-red-500">Invalid public key.</p>}
      <Button
        variant="outline"
        className={compact ? 'w-full' : undefined}
        disabled={!value || invalid}
        onClick={() => {
          setManualSigner(value);
          setValue('');
        }}
      >
        Use signer
      </Button>
    </div>
  );
};

export default SetSignerInput;
