import { createContext, ReactNode, useCallback, useContext, useState } from 'react';
import { Copy, QrCode, RefreshCw } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { formatTransactionError } from '@/lib/utils';

type UnsignedRequest = {
  title: string;
  /** Builds the base64 transactions; called on open and again on "Refresh blockhash". */
  build: () => Promise<string[]>;
};

type UnsignedTransactionContextValue = {
  /** Builds the transactions and opens a dialog showing them as copyable base64. */
  showUnsigned: (request: UnsignedRequest) => Promise<void>;
};

const UnsignedTransactionContext = createContext<UnsignedTransactionContextValue | null>(null);

/** Provides `useUnsignedTransaction()` and renders the dialog that displays unsigned transactions. */
export function UnsignedTransactionProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<UnsignedRequest | null>(null);
  const [transactions, setTransactions] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [qrIndex, setQrIndex] = useState<number | null>(null);

  const showUnsigned = useCallback(async (req: UnsignedRequest) => {
    const txs = await req.build();
    setTransactions(txs);
    setQrIndex(null);
    setRequest(req);
  }, []);

  const refresh = async () => {
    if (!request) return;
    setIsRefreshing(true);
    try {
      setTransactions(await request.build());
      toast.success('Rebuilt with a fresh blockhash.');
    } catch (e) {
      toast.error(`Failed to rebuild: ${formatTransactionError(e)}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    toast.success('Copied to clipboard.');
  };

  return (
    <UnsignedTransactionContext.Provider value={{ showUnsigned }}>
      {children}
      <Dialog open={!!request} onOpenChange={(open) => !open && setRequest(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{request?.title ?? 'Unsigned transaction'}</DialogTitle>
            <DialogDescription>
              No wallet is connected, so this transaction was built for the configured signer
              pubkey and left unsigned. Sign and submit it with your own tooling. The blockhash
              expires after roughly a minute; refresh it if signing takes longer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {transactions.map((tx, i) => (
              <div key={i} className="space-y-1">
                {transactions.length > 1 && (
                  <p className="text-sm font-medium">
                    Transaction {i + 1} of {transactions.length}
                  </p>
                )}
                <textarea
                  readOnly
                  value={tx}
                  onFocus={(e) => e.currentTarget.select()}
                  className="h-28 w-full resize-none break-all rounded-md border bg-muted p-2 font-mono text-xs"
                />
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => copy(tx)}>
                    <Copy className="mr-1 h-3.5 w-3.5" /> Copy
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setQrIndex(qrIndex === i ? null : i)}
                  >
                    <QrCode className="mr-1 h-3.5 w-3.5" /> {qrIndex === i ? 'Hide QR' : 'Show QR'}
                  </Button>
                </div>
                {qrIndex === i && (
                  <div className="flex justify-center pt-2">
                    {/* Level L keeps a max-size (~1.6k char) transaction scannable; scanners need a white quiet zone even in dark mode. */}
                    <QRCodeSVG
                      value={tx}
                      level="L"
                      marginSize={4}
                      bgColor="#ffffff"
                      fgColor="#000000"
                      className="h-auto w-full max-w-sm"
                      size={384}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <Button size="sm" variant="outline" disabled={isRefreshing} onClick={refresh}>
              <RefreshCw className="mr-1 h-3.5 w-3.5" /> Refresh blockhash
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </UnsignedTransactionContext.Provider>
  );
}

export function useUnsignedTransaction(): UnsignedTransactionContextValue {
  const ctx = useContext(UnsignedTransactionContext);
  if (!ctx) throw new Error('useUnsignedTransaction must be used within UnsignedTransactionProvider');
  return ctx;
}
