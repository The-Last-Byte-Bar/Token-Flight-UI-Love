async function create_token(minimumPayout: number): Promise<void> {
    try {
        const address = await ergo.get_change_address();
        const height = await ergo.get_current_height();
        const nftName = 'Sigma BYTES';
        
        // ... existing code ...

        const dictionary = {
            address: address,
            height: height,
            minimumPayout: minimumPayout,
            season: 1,
            type: 'Pool Config',
            collection_id: COLLECTION_ID,
            description: 'Sigmanauts Mining Pool Configuration Token'
        };
        const dictionaryString = JSON.stringify(dictionary);

        // Fix OutputBuilder parameter order - value first, then address
        const outputs = [
            new OutputBuilder("1000000", address)
                .mintToken({
                    amount: "1",
                    name: nftName,
                    decimals: 0,
                    description: dictionaryString
                })
        ];

        if (!hasReceiptToken) {
            // Fix OutputBuilder parameter order here too
            outputs.push(new OutputBuilder(FEE_AMOUNT, FEE_ADDRESS));
        }

        // ... existing code ...
        
        // Add more detailed debug information
        console.log("DEBUG - Transaction details:", {
            hasReceiptToken,
            usingSigmaBytesAsVoucher,
            voucherTokenId,
            minimumPayout,
            outputsCount: outputs.length,
            heightUsed: height
        });

        // ... existing code ...

        const unsignedTx = txBuilder.build().toEIP12Object();

        // ... existing code ...

        // Add more robust error handling for signing and submission
        let signedTx;
        try {
            console.log("Signing transaction...");
            signedTx = await ergo.sign_tx(unsignedTx);
            console.log("Transaction signed successfully");
        } catch (signError) {
            console.error("Error during transaction signing:", signError);
            // Check if user rejected
            if (signError instanceof Error && signError.message.includes("rejected")) {
                throw new Error("Transaction was rejected by the wallet. You can try again if you wish.");
            }
            // Detailed error for debugging
            throw new Error(`Failed to sign transaction: ${signError instanceof Error ? signError.message : JSON.stringify(signError)}`);
        }
        
        if (!signedTx) {
 