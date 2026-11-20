import { Connection, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';

/**
 * Serializes a transaction to base64 without any signatures, for signing outside this app.
 *
 * Legacy transactions get `feePayer` and a fresh `recentBlockhash` filled in; versioned
 * transactions are serialized as-is, so their message must already carry a blockhash.
 */
export async function serializeUnsigned(
  tx: Transaction | VersionedTransaction,
  feePayer: PublicKey,
  connection: Connection
): Promise<string> {
  if (tx instanceof VersionedTransaction) {
    return Buffer.from(tx.serialize()).toString('base64');
  }
  tx.feePayer = feePayer;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  return tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64');
}
