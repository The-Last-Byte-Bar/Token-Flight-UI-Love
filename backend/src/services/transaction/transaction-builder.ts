import { TransactionBuilder, OutputBuilder } from '@fleet-sdk/core';
import { Amount } from '@fleet-sdk/common';

/**
 * Build a simple token transfer transaction
 * @param senderAddress Sender address
 * @param recipientAddress Recipient address
 * @param tokenId Token ID to transfer
 * @param amount Amount to transfer
 * @param inputs Input boxes from the sender's wallet
 * @param changeAddress Change address (defaults to sender)
 * @returns Unsigned transaction
 */
export function buildTokenTransferTx(
  senderAddress: string,
  recipientAddress: string,
  tokenId: string,
  amount: Amount,
  inputs: any[],
  changeAddress?: string
) {
  // Create transaction builder with creation height (assuming first input has this info)
  const creationHeight = inputs[0]?.creationHeight || 0;
  const txBuilder = new TransactionBuilder(creationHeight)
    .from(inputs)
    .to(
      new OutputBuilder(1000000n, recipientAddress)
        .addTokens({ tokenId, amount })
    )
    .sendChangeTo(changeAddress || senderAddress)
    .payMinFee();

  // Build the transaction
  return txBuilder.build();
}

/**
 * Build a batch token distribution transaction
 * @param senderAddress Sender address
 * @param recipients Array of recipient addresses
 * @param tokenId Token ID to distribute
 * @param amountPerRecipient Amount to send to each recipient
 * @param inputs Input boxes from the sender's wallet
 * @param changeAddress Change address (defaults to sender)
 * @returns Unsigned transaction
 */
export function buildBatchDistributionTx(
  senderAddress: string,
  recipients: string[],
  tokenId: string,
  amountPerRecipient: Amount,
  inputs: any[],
  changeAddress?: string
) {
  // Create transaction builder with creation height (assuming first input has this info)
  const creationHeight = inputs[0]?.creationHeight || 0;
  
  // Create outputs for each recipient
  const outputs = recipients.map(recipientAddress => 
    new OutputBuilder(1000000n, recipientAddress)
      .addTokens({ tokenId, amount: amountPerRecipient })
  );

  // Build the transaction
  const txBuilder = new TransactionBuilder(creationHeight)
    .from(inputs)
    .to(outputs)
    .sendChangeTo(changeAddress || senderAddress)
    .payMinFee();

  return txBuilder.build();
}

/**
 * Build a custom distribution transaction with different amounts per recipient
 * @param senderAddress Sender address
 * @param distributions Array of recipient addresses and amounts
 * @param tokenId Token ID to distribute
 * @param inputs Input boxes from the sender's wallet
 * @param changeAddress Change address (defaults to sender)
 * @returns Unsigned transaction
 */
export function buildCustomDistributionTx(
  senderAddress: string,
  distributions: { address: string; amount: Amount }[],
  tokenId: string,
  inputs: any[],
  changeAddress?: string
) {
  // Create transaction builder with creation height (assuming first input has this info)
  const creationHeight = inputs[0]?.creationHeight || 0;
  
  // Create outputs for each recipient with their specific amount
  const outputs = distributions.map(({ address, amount }) => 
    new OutputBuilder(1000000n, address)
      .addTokens({ tokenId, amount })
  );

  // Build the transaction
  const txBuilder = new TransactionBuilder(creationHeight)
    .from(inputs)
    .to(outputs)
    .sendChangeTo(changeAddress || senderAddress)
    .payMinFee();

  return txBuilder.build();
} 