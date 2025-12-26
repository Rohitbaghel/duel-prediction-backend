import { createAccountFromPrivateKey, MODULE_ADDRESS, ADMIN_ADDRESS, USER2_ADDRESS } from "./config.js";
import { 
    initializePredictionMarket, 
    createMarket, 
    bet, 
    resolveMarket, 
    claimRewards,
    getMarketStats,
    getUserShares,
    getUserAllShares,
    getPotentialReward,
    checkPredictionMarketStoreExists,
    OUTCOME_PLAYER1,
    OUTCOME_PLAYER2,
    OUTCOME_DRAW
} from "./prediction-market.js";

/**
 * Example script demonstrating prediction market contract interactions
 * 
 * Usage:
 * PRIVATE_KEY=admin_key PRIVATE_KEY2=user2_key tsx example-prediction-market.ts
 */

async function main() {
    const PRIVATE_KEY = process.env.PRIVATE_KEY;
    const PRIVATE_KEY2 = process.env.PRIVATE_KEY2;
    
    if (!PRIVATE_KEY) {
        console.error("Please set PRIVATE_KEY environment variable");
        process.exit(1);
    }
    
    if (!PRIVATE_KEY2) {
        console.error("Please set PRIVATE_KEY2 environment variable");
        process.exit(1);
    }

    const account = createAccountFromPrivateKey(PRIVATE_KEY);
    const account2 = createAccountFromPrivateKey(PRIVATE_KEY2);
    console.log(`Admin Address: ${account.accountAddress}`);
    console.log(`User 2 Address: ${account2.accountAddress}\n`);

    // Step 1: Initialize prediction market (only needed once)
    console.log("Step 1: Initializing prediction market store...");
    const storeExists = await checkPredictionMarketStoreExists(account.accountAddress.toString());
    if (storeExists) {
        console.log("✓ Prediction market store already exists (skipping initialization)\n");
    } else {
        try {
            await initializePredictionMarket(account);
            console.log("✓ Prediction market store initialized successfully\n");
        } catch (error: any) {
            console.error("❌ Failed to initialize prediction market store:");
            throw error;
        }
    }

    // Step 2: Create a market for a match
    // Use timestamp + random number to ensure uniqueness
    const matchId = Math.floor(Date.now() / 1000) * 1000 + Math.floor(Math.random() * 1000);
    const player1 = ADMIN_ADDRESS;
    const player2 = USER2_ADDRESS;

    console.log("Step 2: Creating market...");
    console.log(`Using unique match_id: ${matchId}`);
    try {
        await createMarket(account, matchId, player1, player2);
        console.log("✓ Market created successfully\n");
    } catch (error: any) {
        if (error.message?.includes("EMARKET_ALREADY_EXISTS") || error.message?.includes("already exists")) {
            console.error("Error: Market already exists for this match_id. Try a different match_id.");
            process.exit(1);
        }
        throw error;
    }

    // Step 3: Place bets from multiple accounts
    console.log("Step 3: Placing bets from multiple accounts...");
    const betAmount = 100000; // 0.1 APT in octas
    
    // Admin bets on player 1
    try {
        await bet(account, MODULE_ADDRESS, matchId, OUTCOME_PLAYER1, betAmount);
        console.log("✓ Admin bet on Player 1\n");
    } catch (error: any) {
        if (error.message?.includes("EMARKET_NOT_FOUND") || error.transaction?.vm_status?.includes("EMARKET_NOT_FOUND")) {
            console.error("Error: Market not found. Make sure to create the market first.");
            process.exit(1);
        }
        throw error;
    }
    
    // Admin also bets on draw (multiple bets from same user)
    try {
        await bet(account, MODULE_ADDRESS, matchId, OUTCOME_DRAW, Math.floor(betAmount / 2));
        console.log("✓ Admin bet on Draw\n");
    } catch (error: any) {
        throw error;
    }
    
    // User 2 bets on player 2
    try {
        await bet(account2, MODULE_ADDRESS, matchId, OUTCOME_PLAYER2, Math.floor(betAmount * 1.5));
        console.log("✓ User 2 bet on Player 2\n");
    } catch (error: any) {
        if (error.message?.includes("EMARKET_NOT_FOUND") || error.transaction?.vm_status?.includes("EMARKET_NOT_FOUND")) {
            console.error("Error: Market not found. Make sure to create the market first.");
            process.exit(1);
        }
        throw error;
    }
    
    // User 2 also bets on player 1 (same user, different outcome)
    try {
        await bet(account2, MODULE_ADDRESS, matchId, OUTCOME_PLAYER1, Math.floor(betAmount / 2));
        console.log("✓ User 2 bet on Player 1\n");
    } catch (error: any) {
        throw error;
    }

    // Step 4: View market stats (moved to Step 5)

    // Step 5: View user shares
    // Note: View functions with 'acquires' may not work with the SDK
    // We'll try but may need to skip if they don't work
    console.log("Step 5: Viewing user shares...");
    try {
        // Try to get market stats first (this might work)
        await getMarketStats(MODULE_ADDRESS, matchId);
        console.log("✓ Market stats retrieved\n");
    } catch (error: any) {
        console.warn("⚠️  Could not get market stats - view functions may not be supported\n");
    }
    
    // Try to get user shares (may not work due to SDK limitations)
    try {
        const adminShares = await getUserAllShares(MODULE_ADDRESS, matchId, ADMIN_ADDRESS);
        console.log("✓ Admin shares retrieved");
        
        const user2Shares = await getUserAllShares(MODULE_ADDRESS, matchId, USER2_ADDRESS);
        console.log("✓ User 2 shares retrieved\n");
    } catch (error: any) {
        console.warn("⚠️  Could not retrieve user shares - view functions with 'acquires' are not supported by SDK");
        console.warn("   This is a known limitation. User shares are stored in nested tables.");
        console.warn("   You can verify bets were placed by checking transaction history.\n");
    }
    
    // Try to get potential rewards (may also not work)
    try {
        const adminReward = await getPotentialReward(MODULE_ADDRESS, matchId, OUTCOME_PLAYER1, ADMIN_ADDRESS);
        console.log(`Admin potential reward (Player 1): ${adminReward} octas`);
        
        const user2Reward = await getPotentialReward(MODULE_ADDRESS, matchId, OUTCOME_PLAYER2, USER2_ADDRESS);
        console.log(`User 2 potential reward (Player 2): ${user2Reward} octas\n`);
    } catch (error: any) {
        console.warn("⚠️  Could not get potential rewards - view functions may not be supported\n");
    }

    // Step 6: Resolve market
    console.log("Step 6: Resolving market...");
    try {
        await resolveMarket(account, matchId, OUTCOME_PLAYER1);
        console.log("✓ Market resolved - Player 1 wins\n");
    } catch (error: any) {
        if (error.message?.includes("EMARKET_ALREADY_RESOLVED") || error.transaction?.vm_status?.includes("EMARKET_ALREADY_RESOLVED")) {
            console.error("Error: Market already resolved.");
            process.exit(1);
        }
        if (error.message?.includes("ENOT_ADMIN") || error.transaction?.vm_status?.includes("ENOT_ADMIN")) {
            console.error("Error: Only admin can resolve market.");
            process.exit(1);
        }
        throw error;
    }

    // Step 7: Claim rewards from both accounts
    console.log("Step 7: Claiming rewards...");
    
    // Admin claims (won on Player 1)
    try {
        await claimRewards(account, MODULE_ADDRESS, matchId);
        console.log("✓ Admin claimed rewards\n");
    } catch (error: any) {
        if (error.message?.includes("ENO_SHARES") || error.transaction?.vm_status?.includes("ENO_SHARES")) {
            console.error("Error: No shares in winning outcome to claim.");
            process.exit(1);
        }
        if (error.message?.includes("EALREADY_CLAIMED") || error.transaction?.vm_status?.includes("EALREADY_CLAIMED")) {
            console.error("Error: Rewards already claimed.");
            process.exit(1);
        }
        throw error;
    }
    
    // User 2 doesn't claim (bet on Player 2, but Player 1 won)
    console.log("User 2 did not bet on winning outcome, so no rewards to claim\n");
}

main().catch(console.error);

