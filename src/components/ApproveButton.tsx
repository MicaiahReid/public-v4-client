import { PublicKey, Transaction } from '@solana/web3.js';
import { Button } from './ui/button';
import * as multisig from '@sqds/multisig';
import { useRef, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { toast } from 'sonner';
import { useMultisigData } from '@/hooks/useMultisigData';
import { useQueryClient } from '@tanstack/react-query';
import { waitForConfirmation } from '../lib/transactionConfirmation';
import { formatTransactionError } from '@/lib/utils';
import { useSigner } from '@/hooks/useSigner';
import { useUnsignedTransaction } from './UnsignedTransactionDialog';
import { serializeUnsigned } from '@/lib/serializeUnsigned';
import { useApproveButtonState } from '@/hooks/useProposalActions';

type ApproveButtonProps = {
  multisigPda: string;
  transactionIndex: number;
  proposalStatus: string;
  programId: string;
  isStale: boolean;
  approvedMembers: PublicKey[];
  isAccountClosed: boolean;
};

const ApproveButton = ({
  multisigPda,
  transactionIndex,
  proposalStatus,
  programId,
  isStale,
  approvedMembers,
  isAccountClosed,
}: ApproveButtonProps) => {
  const wallet = useWallet();
  const signer = useSigner();
  const { showUnsigned } = useUnsignedTransaction();
  const walletModal = useWalletModal();
  const { isDisabled } = useApproveButtonState({ proposalStatus, isStale, isAccountClosed, approvedMembers });
  const { connection } = useMultisigData();
  const queryClient = useQueryClient();
  const signatureRef = useRef<string>('');
  const [isPending, setIsPending] = useState(false);

  const approveProposal = async () => {
    const member = signer.publicKey;
    if (!member) {
      walletModal.setVisible(true);
      throw 'Wallet not connected';
    }
    let bigIntTransactionIndex = BigInt(transactionIndex);
    const transaction = new Transaction();
    if (proposalStatus === 'None') {
      const createProposalInstruction = multisig.instructions.proposalCreate({
        multisigPda: new PublicKey(multisigPda),
        creator: member,
        isDraft: false,
        transactionIndex: bigIntTransactionIndex,
        rentPayer: member,
        programId: programId ? new PublicKey(programId) : multisig.PROGRAM_ID,
      });
      transaction.add(createProposalInstruction);
    }
    if (proposalStatus == 'Draft') {
      const activateProposalInstruction = multisig.instructions.proposalActivate({
        multisigPda: new PublicKey(multisigPda),
        member: member,
        transactionIndex: bigIntTransactionIndex,
        programId: programId ? new PublicKey(programId) : multisig.PROGRAM_ID,
      });
      transaction.add(activateProposalInstruction);
    }
    const approveProposalInstruction = multisig.instructions.proposalApprove({
      multisigPda: new PublicKey(multisigPda),
      member: member,
      transactionIndex: bigIntTransactionIndex,
      programId: programId ? new PublicKey(programId) : multisig.PROGRAM_ID,
    });
    transaction.add(approveProposalInstruction);
    if (signer.isManual) {
      await showUnsigned({
        title: 'Approve proposal',
        build: async () => [await serializeUnsigned(transaction, member, connection)],
      });
      return;
    }

    toast.loading('Waiting for wallet approval...', { id: 'transaction', duration: Infinity });

    const signature = await wallet.sendTransaction(transaction, connection, {
      skipPreflight: true,
    });
    signatureRef.current = signature;

    const shortSig = `${signature.slice(0, 8)}...${signature.slice(-4)}`;
    toast.info(`Sent: ${signature}`, { duration: 6000 });
    toast.info(`Confirming: ${shortSig}`, { id: 'transaction', duration: Infinity });

    const [confirmed] = await waitForConfirmation(connection, [signature]);
    if (!confirmed) {
      throw `Transaction failed or timed out. Check ${signature}`;
    }
    toast.success('Approval submitted.', { id: 'transaction' });
    await queryClient.invalidateQueries({ queryKey: ['transactions'] });
  };
  return (
    <Button
      disabled={isDisabled || isPending}
      onClick={async () => {
        setIsPending(true);
        try {
          await approveProposal();
        } catch (e) {
          toast.error(
            `Failed to approve: ${formatTransactionError(e)}${signatureRef.current ? ` (${signatureRef.current})` : ''}`,
            { id: 'transaction' }
          );
        } finally {
          setIsPending(false);
        }
      }}
      size="sm"
      className="w-full sm:w-auto"
    >
      Approve
    </Button>
  );
};

export default ApproveButton;
