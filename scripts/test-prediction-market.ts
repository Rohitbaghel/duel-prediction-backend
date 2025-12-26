import { createAccountFromPrivateKey, MODULE_ADDRESS, getAccountBalance } from "./config.js";
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
    hasClaimed,
    marketExists,
    OUTCOME_PLAYER1,
    OUTCOME_PLAYER2,
    OUTCOME_DRAW
} from "./prediction-market.js";

// Test addresses
const ADMIN_ADDRESS = "0xed101e6c098f47d3a9ff8cf2dae4331fc2a55848502942246878b2ab63b90b4d";
const USER2_ADDRESS = "0x2cd9c41f929c001a11e57de6b8a7d607cb1f1aca7b8d0435a393f10ee39dbcfa";

/**
 * Comprehensive test script for Prediction Market contract
 * Tests all functions in logical order
 * 
 * Usage:
 * PRIVATE_KEY=admin_key PRIVATE_KEY2=user2_key tsx test-prediction-market.ts
 */

async function testPredictionMarket() {
    console.log("========================================");
    console.log("PREDICTION MARKET CONTRACT COMPREHENSIVE TEST");
    console.log("========================================\n");

    // Get private keys from environment
    const PRIVATE_KEY = process.env.PRIVATE_KEY;
    const PRIVATE_KEY2 = process.env.PRIVATE_KEY2;

    if (!PRIVATE_KEY) {
        console.error("ERROR: Please set PRIVATE_KEY environment variable");
        process.exit(1);
    }

    if (!PRIVATE_KEY2) {
        console.error("ERROR: Please set PRIVATE_KEY2 environment variable");
        process.exit(1);
    }

    // Create accounts
    const adminAccount = createAccountFromPrivateKey(PRIVATE_KEY);
    const user2Account = createAccountFromPrivateKey(PRIVATE_KEY2);

    console.log(`Admin Address: ${adminAccount.accountAddress}`);
    console.log(`User 2 Address: ${user2Account.accountAddress}`);
    console.log(`Expected Admin: ${ADMIN_ADDRESS}`);
    console.log(`Expected User 2: ${USER2_ADDRESS}\n`);

    // Verify addresses match
    if (adminAccount.accountAddress.toString() !== ADMIN_ADDRESS) {
        console.warn("WARNING: Admin address doesn't match expected address");
    }
    if (user2Account.accountAddress.toString() !== USER2_ADDRESS) {
        console.warn("WARNING: User 2 address doesn't match expected address");
    }

    // Check balances
    console.log("=== Checking Initial Balances ===");
    const adminBalance = await getAccountBalance(adminAccount.accountAddress.toString());
    const user2Balance = await getAccountBalance(user2Account.accountAddress.toString());
    console.log(`Admin balance: ${adminBalance} octas (${adminBalance / 100000000} APT)`);
    console.log(`User 2 balance: ${user2Balance} octas (${user2Balance / 100000000} APT)\n`);

    try {
        // ========================================
        // TEST 1: Initialize Prediction Market Store
        // ========================================
        console.log("\n" + "=".repeat(50));
        console.log("TEST 1: Initialize Prediction Market Store");
        console.log("=".repeat(50));
        try {
            await initializePredictionMarket(adminAccount);
            console.log("✓ Prediction market store initialized successfully\n");
        } catch (error: any) {
            if (error.message?.includes("already exists") || error.message?.includes("EALREADY_EXISTS")) {
                console.log("✓ Prediction market store already initialized (skipping)\n");
            } else {
                throw error;
            }
        }

        // ========================================
        // TEST 2: Create Market - Match 1
        // ========================================
        console.log("\n" + "=".repeat(50));
        console.log("TEST 2: Create Market - Match 1");
        console.log("=".repeat(50));
        const matchId1 = 1;
        
        await createMarket(
            adminAccount,
            matchId1,
            ADMIN_ADDRESS, // Player 1
            USER2_ADDRESS  // Player 2
        );
        console.log("✓ Market created for Match 1\n");

        // ========================================
        // TEST 3: Check Market Exists
        // ========================================
        console.log("\n" + "=".repeat(50));
        console.log("TEST 3: Check Market Exists");
        console.log("=".repeat(50));
        const exists = await marketExists(MODULE_ADDRESS, matchId1);
        console.log(`✓ Market exists check: ${exists}\n`);

        // ========================================
        // TEST 4: Place Bets - Multiple Users and Outcomes
        // ========================================
        console.log("\n" + "=".repeat(50));
        console.log("TEST 4: Place Bets - Multiple Users and Outcomes");
        console.log("=".repeat(50));
        
        // Admin bets on Player 1
        console.log("Admin betting on Player 1...");
        await bet(adminAccount, MODULE_ADDRESS, matchId1, OUTCOME_PLAYER1, 100000000); // 0.1 APT
        console.log("✓ Admin bet on Player 1\n");

        // Admin bets on Draw (multiple bets from same user)
        console.log("Admin betting on Draw...");
        await bet(adminAccount, MODULE_ADDRESS, matchId1, OUTCOME_DRAW, 50000000); // 0.05 APT
        console.log("✓ Admin bet on Draw\n");

        // User 2 bets on Player 2
        console.log("User 2 betting on Player 2...");
        await bet(user2Account, MODULE_ADDRESS, matchId1, OUTCOME_PLAYER2, 150000000); // 0.15 APT
        console.log("✓ User 2 bet on Player 2\n");

        // User 2 bets on Player 1 (same user, different outcome)
        console.log("User 2 betting on Player 1...");
        await bet(user2Account, MODULE_ADDRESS, matchId1, OUTCOME_PLAYER1, 75000000); // 0.075 APT
        console.log("✓ User 2 bet on Player 1\n");

        // ========================================
        // TEST 5: Get Market Stats
        // ========================================
        console.log("\n" + "=".repeat(50));
        console.log("TEST 5: Get Market Stats");
        console.log("=".repeat(50));
        const stats = await getMarketStats(MODULE_ADDRESS, matchId1);
        console.log("✓ Market stats retrieved\n");

        // ========================================
        // TEST 6: Get User Shares - Individual Outcomes
        // ========================================
        console.log("\n" + "=".repeat(50));
        console.log("TEST 6: Get User Shares - Individual Outcomes");
        console.log("=".repeat(50));
        
        // Admin shares
        const adminPlayer1Shares = await getUserShares(MODULE_ADDRESS, matchId1, OUTCOME_PLAYER1, ADMIN_ADDRESS);
        console.log(`✓ Admin Player 1 shares: ${adminPlayer1Shares}`);
        
        const adminDrawShares = await getUserShares(MODULE_ADDRESS, matchId1, OUTCOME_DRAW, ADMIN_ADDRESS);
        console.log(`✓ Admin Draw shares: ${adminDrawShares}`);
        
        const adminPlayer2Shares = await getUserShares(MODULE_ADDRESS, matchId1, OUTCOME_PLAYER2, ADMIN_ADDRESS);
        console.log(`✓ Admin Player 2 shares: ${adminPlayer2Shares}\n`);

        // User 2 shares
        const user2Player1Shares = await getUserShares(MODULE_ADDRESS, matchId1, OUTCOME_PLAYER1, USER2_ADDRESS);
        console.log(`✓ User 2 Player 1 shares: ${user2Player1Shares}`);
        
        const user2Player2Shares = await getUserShares(MODULE_ADDRESS, matchId1, OUTCOME_PLAYER2, USER2_ADDRESS);
        console.log(`✓ User 2 Player 2 shares: ${user2Player2Shares}\n`);

        // ========================================
        // TEST 7: Get All User Shares
        // ========================================
        console.log("\n" + "=".repeat(50));
        console.log("TEST 7: Get All User Shares");
        console.log("=".repeat(50));
        
        const adminAllShares = await getUserAllShares(MODULE_ADDRESS, matchId1, ADMIN_ADDRESS);
        console.log("✓ Admin all shares retrieved");
        
        const user2AllShares = await getUserAllShares(MODULE_ADDRESS, matchId1, USER2_ADDRESS);
        console.log("✓ User 2 all shares retrieved\n");

        // ========================================
        // TEST 8: Get Potential Rewards
        // ========================================
        console.log("\n" + "=".repeat(50));
        console.log("TEST 8: Get Potential Rewards");
        console.log("=".repeat(50));
        
        const adminPlayer1Reward = await getPotentialReward(MODULE_ADDRESS, matchId1, OUTCOME_PLAYER1, ADMIN_ADDRESS);
        console.log(`✓ Admin potential reward (Player 1): ${adminPlayer1Reward} octas`);
        
        const user2Player2Reward = await getPotentialReward(MODULE_ADDRESS, matchId1, OUTCOME_PLAYER2, USER2_ADDRESS);
        console.log(`✓ User 2 potential reward (Player 2): ${user2Player2Reward} octas\n`);

        // ========================================
        // TEST 9: Resolve Market - Player 1 Wins
        // ========================================
        console.log("\n" + "=".repeat(50));
        console.log("TEST 9: Resolve Market - Player 1 Wins");
        console.log("=".repeat(50));
        await resolveMarket(adminAccount, matchId1, OUTCOME_PLAYER1);
        console.log("✓ Market resolved - Player 1 wins\n");

        // Check market stats after resolution
        const statsAfter = await getMarketStats(MODULE_ADDRESS, matchId1);
        console.log("✓ Market stats after resolution retrieved\n");

        // ========================================
        // TEST 10: Check Claim Status (Before Claiming)
        // ========================================
        console.log("\n" + "=".repeat(50));
        console.log("TEST 10: Check Claim Status (Before Claiming)");
        console.log("=".repeat(50));
        
        const adminClaimedBefore = await hasClaimed(MODULE_ADDRESS, matchId1, ADMIN_ADDRESS);
        console.log(`✓ Admin has claimed: ${adminClaimedBefore}`);
        
        const user2ClaimedBefore = await hasClaimed(MODULE_ADDRESS, matchId1, USER2_ADDRESS);
        console.log(`✓ User 2 has claimed: ${user2ClaimedBefore}\n`);

        // ========================================
        // TEST 11: Claim Rewards - Admin (Winner)
        // ========================================
        console.log("\n" + "=".repeat(50));
        console.log("TEST 11: Claim Rewards - Admin (Winner)");
        console.log("=".repeat(50));
        const adminBalanceBeforeClaim = await getAccountBalance(ADMIN_ADDRESS);
        await claimRewards(adminAccount, MODULE_ADDRESS, matchId1);
        const adminBalanceAfterClaim = await getAccountBalance(ADMIN_ADDRESS);
        console.log(`✓ Admin claimed rewards: ${adminBalanceAfterClaim - adminBalanceBeforeClaim} octas\n`);

        // ========================================
        // TEST 12: Check Claim Status (After Claiming)
        // ========================================
        console.log("\n" + "=".repeat(50));
        console.log("TEST 12: Check Claim Status (After Claiming)");
        console.log("=".repeat(50));
        
        const adminClaimedAfter = await hasClaimed(MODULE_ADDRESS, matchId1, ADMIN_ADDRESS);
        console.log(`✓ Admin has claimed: ${adminClaimedAfter}\n`);

        // ========================================
        // TEST 13: Create Market - Match 2 (Draw scenario)
        // ========================================
        console.log("\n" + "=".repeat(50));
        console.log("TEST 13: Create Market - Match 2 (Draw scenario)");
        console.log("=".repeat(50));
        const matchId2 = 2;
        
        await createMarket(
            adminAccount,
            matchId2,
            ADMIN_ADDRESS,
            USER2_ADDRESS
        );
        console.log("✓ Market created for Match 2\n");

        // ========================================
        // TEST 14: Place Bets on Match 2
        // ========================================
        console.log("\n" + "=".repeat(50));
        console.log("TEST 14: Place Bets on Match 2");
        console.log("=".repeat(50));
        
        await bet(adminAccount, MODULE_ADDRESS, matchId2, OUTCOME_DRAW, 80000000);
        console.log("✓ Admin bet on Draw");
        
        await bet(user2Account, MODULE_ADDRESS, matchId2, OUTCOME_PLAYER2, 120000000);
        console.log("✓ User 2 bet on Player 2\n");

        // ========================================
        // TEST 15: Resolve Market - Draw
        // ========================================
        console.log("\n" + "=".repeat(50));
        console.log("TEST 15: Resolve Market - Draw");
        console.log("=".repeat(50));
        await resolveMarket(adminAccount, matchId2, OUTCOME_DRAW);
        console.log("✓ Market resolved - Draw\n");

        // ========================================
        // TEST 16: Claim Rewards - Admin (Draw winner)
        // ========================================
        console.log("\n" + "=".repeat(50));
        console.log("TEST 16: Claim Rewards - Admin (Draw winner)");
        console.log("=".repeat(50));
        await claimRewards(adminAccount, MODULE_ADDRESS, matchId2);
        console.log("✓ Admin claimed rewards for Draw\n");

        // ========================================
        // TEST 17: Create Market - Match 3 (Player 2 wins)
        // ========================================
        console.log("\n" + "=".repeat(50));
        console.log("TEST 17: Create Market - Match 3 (Player 2 wins)");
        console.log("=".repeat(50));
        const matchId3 = 3;
        
        await createMarket(
            adminAccount,
            matchId3,
            ADMIN_ADDRESS,
            USER2_ADDRESS
        );
        console.log("✓ Market created for Match 3\n");

        // ========================================
        // TEST 18: Place Bets on Match 3
        // ========================================
        console.log("\n" + "=".repeat(50));
        console.log("TEST 18: Place Bets on Match 3");
        console.log("=".repeat(50));
        
        await bet(adminAccount, MODULE_ADDRESS, matchId3, OUTCOME_PLAYER1, 60000000);
        await bet(user2Account, MODULE_ADDRESS, matchId3, OUTCOME_PLAYER2, 90000000);
        await bet(adminAccount, MODULE_ADDRESS, matchId3, OUTCOME_PLAYER2, 40000000);
        console.log("✓ Multiple bets placed on Match 3\n");

        // ========================================
        // TEST 19: Resolve Market - Player 2 Wins
        // ========================================
        console.log("\n" + "=".repeat(50));
        console.log("TEST 19: Resolve Market - Player 2 Wins");
        console.log("=".repeat(50));
        await resolveMarket(adminAccount, matchId3, OUTCOME_PLAYER2);
        console.log("✓ Market resolved - Player 2 wins\n");

        // ========================================
        // TEST 20: Claim Rewards - Both Users
        // ========================================
        console.log("\n" + "=".repeat(50));
        console.log("TEST 20: Claim Rewards - Both Users");
        console.log("=".repeat(50));
        
        const user2BalanceBefore = await getAccountBalance(USER2_ADDRESS);
        await claimRewards(user2Account, MODULE_ADDRESS, matchId3);
        const user2BalanceAfter = await getAccountBalance(USER2_ADDRESS);
        console.log(`✓ User 2 claimed rewards: ${user2BalanceAfter - user2BalanceBefore} octas`);
        
        const adminBalanceBeforeClaim3 = await getAccountBalance(ADMIN_ADDRESS);
        await claimRewards(adminAccount, MODULE_ADDRESS, matchId3);
        const adminBalanceAfterClaim3 = await getAccountBalance(ADMIN_ADDRESS);
        console.log(`✓ Admin claimed rewards: ${adminBalanceAfterClaim3 - adminBalanceBeforeClaim3} octas\n`);

        // Final balance check
        const finalAdminBalance = await getAccountBalance(ADMIN_ADDRESS);
        const finalUser2Balance = await getAccountBalance(USER2_ADDRESS);
        console.log("\n=== Final Balances ===");
        console.log(`Admin final balance: ${finalAdminBalance} octas (${finalAdminBalance / 100000000} APT)`);
        console.log(`User 2 final balance: ${finalUser2Balance} octas (${finalUser2Balance / 100000000} APT)\n`);

        console.log("========================================");
        console.log("ALL PREDICTION MARKET TESTS COMPLETED SUCCESSFULLY!");
        console.log("========================================");

    } catch (error: any) {
        console.error("\n❌ TEST FAILED:");
        console.error(error.message);
        if (error.stack) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}

testPredictionMarket().catch(console.error);

