import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Button } from './ui/button';
import { useWallet } from '@solana/wallet-adapter-react';
import '@solana/wallet-adapter-react-ui/styles.css';
import SetSignerInput from './SetSignerInput';

const ConnectWallet = () => {
  const modal = useWalletModal();
  const { publicKey, disconnect } = useWallet();
  return (
    <div className="space-y-2">
      {!publicKey ? (
        <>
          <Button
            onClick={() => {
              modal.setVisible(true);
            }}
            className="h-12 w-full"
          >
            Connect Wallet
          </Button>
          <SetSignerInput compact />
        </>
      ) : (
        <Button onClick={disconnect} className="h-12 w-full">
          {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)} · Disconnect
        </Button>
      )}
    </div>
  );
};

export default ConnectWallet;
