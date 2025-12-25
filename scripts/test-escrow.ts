import { createAccountFromPrivateKey, MODULE_ADDRESS, getAccountBalance } from "./config.js";
import { 
    initializeEscrow, 
    createEscrow, 
    deposit, 
    resolveWin, 
    resolveDraw 
} from "./escrow.js";

// Test addresses
const ADMIN_ADDRESS = "0xed101e6c098f47d3a9ff8cf2dae4331fc2a55848502942246878b2ab63b90b4d";
const PLAYER2_ADDRESS = "0x2cd9c41f929c001a11e57de6b8a7d607cb1f1aca7b8d0435a393f10ee39dbcfa";

/**
 * Comprehensive test script for Escrow contract
 * Tests all functions in logical order
 * 
 * Usage:
 * PRIVATE_KEY=admin_key PRIVATE_KEY2=player2_key tsx test-escrow.ts
 */

async function testEscrow() {
    console.log("========================================");
    console.log("ESCROW CONTRACT COMPREHENSIVE TEST");
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
    const player2Account = createAccountFromPrivateKey(PRIVATE_KEY2);

    console.log(`Admin Address: ${adminAccount.accountAddress}`);
    console.log(`Player 2 Address: ${player2Account.accountAddress}`);
    console.log(`Expected Admin: ${ADMIN_ADDRESS}`);
    console.log(`Expected Player 2: ${PLAYER2_ADDRESS}\n`);

    // Verify addresses match
    if (adminAccount.accountAddress.toString() !== ADMIN_ADDRESS) {
        console.warn("WARNING: Admin address doesn't match expected address");
    }
    if (player2Account.accountAddress.toString() !== PLAYER2_ADDRESS) {
        console.warn("WARNING: Player 2 address doesn't match expected address");
    }

    // Check balances
    console.log("=== Checking Initial Balances ===");
    const adminBalance = await getAccountBalance(adminAccount.accountAddress.toString());
    const player2Balance = await getAccountBalance(player2Account.accountAddress.toString());
    console.log(`Admin balance: ${adminBalance} octas (${adminBalance / 100000000} APT)`);
    console.log(`Player 2 balance: ${player2Balance} octas (${player2Balance / 100000000} APT)\n`);

    try {
        // ========================================
        // TEST 1: Initialize Escrow Store
        // ========================================
        console.log("\n" + "=".repeat(50));
        console.log("TEST 1: Initialize Escrow Store");
        console.log("=".repeat(50));
        try {
            await initializeEscrow(adminAccount);
            console.log("✓ Escrow store initialized successfully\n");
        } catch (error: any) {
            if (error.message?.includes("already exists") || error.message?.includes("EALREADY_EXISTS")) {
                console.log("✓ Escrow store already initialized (skipping)\n");
            } else {
                throw error;
            }
        }

        // ========================================
        // TEST 2: Create Escrow - Match 1 (Winner scenario)
        // ========================================
        console.log("\n" + "=".repeat(50));
        console.log("TEST 2: Create Escrow - Match 1 (Winner scenario)");
        console.log("=".repeat(50));
        const matchId1 = 1;
        const amount1 = 100000000; // 0.1 APT
        
        await createEscrow(
            adminAccount,
            matchId1,
            ADMIN_ADDRESS, // Player 1 (admin)
            PLAYER2_ADDRESS, // Player 2
            amount1
        );
        console.log("✓ Escrow created for Match 1\n");

        // ========================================
        // TEST 3: Player 1 (Admin) Deposits
        // ========================================
        console.log("\n" + "=".repeat(50));
        console.log("TEST 3: Player 1 (Admin) Deposits");
        console.log("=".repeat(50));
        await deposit(adminAccount, MODULE_ADDRESS, matchId1);
        console.log("✓ Player 1 deposited successfully\n");

        // ========================================
        // TEST 4: Player 2 Deposits
        // ========================================
        console.log("\n" + "=".repeat(50));
        console.log("TEST 4: Player 2 Deposits");
        console.log("=".repeat(50));
        await deposit(player2Account, MODULE_ADDRESS, matchId1);
        console.log("✓ Player 2 deposited successfully\n");

        // ========================================
        // TEST 5: Resolve Escrow - Winner (Player 1 wins)
        // ========================================
        console.log("\n" + "=".repeat(50));
        console.log("TEST 5: Resolve Escrow - Winner (Player 1 wins)");
        console.log("=".repeat(50));
        await resolveWin(adminAccount, matchId1, ADMIN_ADDRESS);
        console.log("✓ Escrow resolved - Player 1 wins\n");

        // Check balances after resolution
        const adminBalanceAfter1 = await getAccountBalance(adminAccount.accountAddress.toString());
        console.log(`Admin balance after win: ${adminBalanceAfter1} octas (${adminBalanceAfter1 / 100000000} APT)`);

        // ========================================
        // TEST 6: Create Escrow - Match 2 (Draw scenario)
        // ========================================
        console.log("\n" + "=".repeat(50));
        console.log("TEST 6: Create Escrow - Match 2 (Draw scenario)");
        console.log("=".repeat(50));
        const matchId2 = 2;
        const amount2 = 50000000; // 0.05 APT
        
        await createEscrow(
            adminAccount,
            matchId2,
            ADMIN_ADDRESS, // Player 1 (admin)
            PLAYER2_ADDRESS, // Player 2
            amount2
        );
        console.log("✓ Escrow created for Match 2\n");

        // ========================================
        // TEST 7: Both Players Deposit for Match 2
        // ========================================
        console.log("\n" + "=".repeat(50));
        console.log("TEST 7: Both Players Deposit for Match 2");
        console.log("=".repeat(50));
        await deposit(adminAccount, MODULE_ADDRESS, matchId2);
        console.log("✓ Player 1 deposited for Match 2");
        await deposit(player2Account, MODULE_ADDRESS, matchId2);
        console.log("✓ Player 2 deposited for Match 2\n");

        // ========================================
        // TEST 8: Resolve Escrow - Draw
        // ========================================
        console.log("\n" + "=".repeat(50));
        console.log("TEST 8: Resolve Escrow - Draw");
        console.log("=".repeat(50));
        await resolveDraw(adminAccount, matchId2);
        console.log("✓ Escrow resolved - Draw (players split)\n");

        // Check balances after draw resolution
        const adminBalanceAfter2 = await getAccountBalance(adminAccount.accountAddress.toString());
        const player2BalanceAfter2 = await getAccountBalance(player2Account.accountAddress.toString());
        console.log(`Admin balance after draw: ${adminBalanceAfter2} octas (${adminBalanceAfter2 / 100000000} APT)`);
        console.log(`Player 2 balance after draw: ${player2BalanceAfter2} octas (${player2BalanceAfter2 / 100000000} APT)\n`);

        // ========================================
        // TEST 9: Create Escrow - Match 3 (Player 2 wins)
        // ========================================
        console.log("\n" + "=".repeat(50));
        console.log("TEST 9: Create Escrow - Match 3 (Player 2 wins)");
        console.log("=".repeat(50));
        const matchId3 = 3;
        const amount3 = 75000000; // 0.075 APT
        
        await createEscrow(
            adminAccount,
            matchId3,
            ADMIN_ADDRESS, // Player 1 (admin)
            PLAYER2_ADDRESS, // Player 2
            amount3
        );
        console.log("✓ Escrow created for Match 3\n");

        // ========================================
        // TEST 10: Both Players Deposit for Match 3
        // ========================================
        console.log("\n" + "=".repeat(50));
        console.log("TEST 10: Both Players Deposit for Match 3");
        console.log("=".repeat(50));
        await deposit(adminAccount, MODULE_ADDRESS, matchId3);
        console.log("✓ Player 1 deposited for Match 3");
        await deposit(player2Account, MODULE_ADDRESS, matchId3);
        console.log("✓ Player 2 deposited for Match 3\n");

        // ========================================
        // TEST 11: Resolve Escrow - Winner (Player 2 wins)
        // ========================================
        console.log("\n" + "=".repeat(50));
        console.log("TEST 11: Resolve Escrow - Winner (Player 2 wins)");
        console.log("=".repeat(50));
        await resolveWin(adminAccount, matchId3, PLAYER2_ADDRESS);
        console.log("✓ Escrow resolved - Player 2 wins\n");

        // Final balance check
        const finalAdminBalance = await getAccountBalance(adminAccount.accountAddress.toString());
        const finalPlayer2Balance = await getAccountBalance(player2Account.accountAddress.toString());
        console.log("\n=== Final Balances ===");
        console.log(`Admin final balance: ${finalAdminBalance} octas (${finalAdminBalance / 100000000} APT)`);
        console.log(`Player 2 final balance: ${finalPlayer2Balance} octas (${finalPlayer2Balance / 100000000} APT)\n`);

        console.log("========================================");
        console.log("ALL ESCROW TESTS COMPLETED SUCCESSFULLY!");
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

testEscrow().catch(console.error);

