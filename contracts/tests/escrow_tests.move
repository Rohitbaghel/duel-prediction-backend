#[test_only]
module chess_escrow::escrow_tests {

    use aptos_framework::account;
    use chess_escrow::escrow;

    // Test account addresses
    const ADMIN_ADDR: address = @0xA;
    const PLAYER1_ADDR: address = @0xB;
    const PLAYER2_ADDR: address = @0xC;
    const PLAYER3_ADDR: address = @0xE;
    const PLAYER4_ADDR: address = @0xF;
    const NON_ADMIN_ADDR: address = @0xD;

    // Test constants
    const DEPOSIT_AMOUNT: u64 = 100000000; // 1 MOVE (8 decimals)
    const MATCH_ID_1: u64 = 1;
    const MATCH_ID_2: u64 = 2;
    const MATCH_ID_3: u64 = 3;

    // Test helper: creates a test signer
    fun create_test_signer(addr: address): signer {
        account::create_account_for_test(addr)
    }

    // Test helper: initialize escrow store
    fun setup_escrow_store(admin: &signer) {
        escrow::initialize(admin);
    }

    #[test]
    fun test_initialize_escrow_store() {
        let admin = create_test_signer(ADMIN_ADDR);
        setup_escrow_store(&admin);
        // Test passes if initialization doesn't abort
    }

    #[test]
    fun test_create_escrow() {
        let admin = create_test_signer(ADMIN_ADDR);
        setup_escrow_store(&admin);

        // Create escrow with match_id
        escrow::create_escrow(
            &admin,
            MATCH_ID_1,
            PLAYER1_ADDR,
            PLAYER2_ADDR,
            DEPOSIT_AMOUNT
        );

        // Test passes if escrow creation doesn't abort
    }

    #[test]
    #[expected_failure(abort_code = 5, location = chess_escrow::escrow)] // EESCROW_ALREADY_EXISTS
    fun test_create_duplicate_escrow() {
        let admin = create_test_signer(ADMIN_ADDR);
        setup_escrow_store(&admin);

        // Create first escrow
        escrow::create_escrow(
            &admin,
            MATCH_ID_1,
            PLAYER1_ADDR,
            PLAYER2_ADDR,
            DEPOSIT_AMOUNT
        );

        // Try to create duplicate escrow with same match_id - should fail
        escrow::create_escrow(
            &admin,
            MATCH_ID_1,
            PLAYER1_ADDR,
            PLAYER2_ADDR,
            DEPOSIT_AMOUNT
        );
    }

    #[test]
    fun test_create_multiple_escrows() {
        let admin = create_test_signer(ADMIN_ADDR);
        setup_escrow_store(&admin);

        // Create first escrow
        escrow::create_escrow(
            &admin,
            MATCH_ID_1,
            PLAYER1_ADDR,
            PLAYER2_ADDR,
            DEPOSIT_AMOUNT
        );

        // Create second escrow with different match_id
        escrow::create_escrow(
            &admin,
            MATCH_ID_2,
            PLAYER3_ADDR,
            PLAYER4_ADDR,
            DEPOSIT_AMOUNT * 2
        );

        // Create third escrow
        escrow::create_escrow(
            &admin,
            MATCH_ID_3,
            PLAYER1_ADDR,
            PLAYER3_ADDR,
            DEPOSIT_AMOUNT * 3
        );

        // Test passes if all escrows are created successfully
    }

    #[test]
    #[expected_failure(abort_code = 4, location = chess_escrow::escrow)] // EESCROW_NOT_FOUND
    fun test_deposit_nonexistent_escrow() {
        let admin = create_test_signer(ADMIN_ADDR);
        let player1 = create_test_signer(PLAYER1_ADDR);
        setup_escrow_store(&admin);

        // Try to deposit to non-existent escrow - should fail
        escrow::deposit(&player1, ADMIN_ADDR, MATCH_ID_1);
    }

    #[test]
    #[expected_failure(abort_code = 4, location = chess_escrow::escrow)] // EESCROW_NOT_FOUND
    fun test_resolve_win_nonexistent_escrow() {
        let admin = create_test_signer(ADMIN_ADDR);
        setup_escrow_store(&admin);

        // Try to resolve non-existent escrow - should fail
        escrow::resolve_win(&admin, MATCH_ID_1, PLAYER1_ADDR);
    }

    #[test]
    #[expected_failure(abort_code = 4, location = chess_escrow::escrow)] // EESCROW_NOT_FOUND
    fun test_resolve_draw_nonexistent_escrow() {
        let admin = create_test_signer(ADMIN_ADDR);
        setup_escrow_store(&admin);

        // Try to resolve non-existent escrow - should fail
        escrow::resolve_draw(&admin, MATCH_ID_1);
    }

    #[test]
    #[expected_failure] // Non-admin doesn't have EscrowStore, so fails with MISSING_DATA
    fun test_resolve_win_not_admin() {
        let admin = create_test_signer(ADMIN_ADDR);
        let non_admin = create_test_signer(NON_ADMIN_ADDR);
        setup_escrow_store(&admin);

        // Create escrow
        escrow::create_escrow(
            &admin,
            MATCH_ID_1,
            PLAYER1_ADDR,
            PLAYER2_ADDR,
            DEPOSIT_AMOUNT
        );

        // Non-admin tries to resolve - fails because they don't have EscrowStore
        escrow::resolve_win(&non_admin, MATCH_ID_1, PLAYER1_ADDR);
    }

    #[test]
    #[expected_failure(abort_code = 3, location = chess_escrow::escrow)] // EESCROW_NOT_READY
    fun test_resolve_before_both_deposit() {
        let admin = create_test_signer(ADMIN_ADDR);
        setup_escrow_store(&admin);

        // Create escrow
        escrow::create_escrow(
            &admin,
            MATCH_ID_1,
            PLAYER1_ADDR,
            PLAYER2_ADDR,
            DEPOSIT_AMOUNT
        );

        // Try to resolve before both players deposit - should fail
        escrow::resolve_win(&admin, MATCH_ID_1, PLAYER1_ADDR);
    }

    #[test]
    #[expected_failure(abort_code = 3, location = chess_escrow::escrow)] // EESCROW_NOT_READY
    fun test_resolve_draw_before_both_deposit() {
        let admin = create_test_signer(ADMIN_ADDR);
        setup_escrow_store(&admin);

        // Create escrow
        escrow::create_escrow(
            &admin,
            MATCH_ID_1,
            PLAYER1_ADDR,
            PLAYER2_ADDR,
            DEPOSIT_AMOUNT
        );

        // Try to resolve draw before both players deposit - should fail
        escrow::resolve_draw(&admin, MATCH_ID_1);
    }

    #[test]
    fun test_escrow_with_different_amounts() {
        let admin = create_test_signer(ADMIN_ADDR);
        setup_escrow_store(&admin);

        // Test creating escrow with different deposit amounts
        let large_amount = 10000000000; // 100 MOVE
        escrow::create_escrow(
            &admin,
            MATCH_ID_1,
            PLAYER1_ADDR,
            PLAYER2_ADDR,
            large_amount
        );

        // Test passes if escrow creation succeeds
    }

    #[test]
    fun test_multiple_escrows_independent() {
        let admin = create_test_signer(ADMIN_ADDR);
        setup_escrow_store(&admin);

        // Create multiple escrows with different parameters
        escrow::create_escrow(
            &admin,
            MATCH_ID_1,
            PLAYER1_ADDR,
            PLAYER2_ADDR,
            DEPOSIT_AMOUNT
        );

        escrow::create_escrow(
            &admin,
            MATCH_ID_2,
            PLAYER3_ADDR,
            PLAYER4_ADDR,
            DEPOSIT_AMOUNT * 2
        );

        // Verify both escrows exist independently
        // This test passes if both creations succeed without conflicts
    }

    #[test]
    fun test_escrow_operations_with_match_id() {
        let admin = create_test_signer(ADMIN_ADDR);
        setup_escrow_store(&admin);

        // Create escrow with specific match_id
        escrow::create_escrow(
            &admin,
            MATCH_ID_1,
            PLAYER1_ADDR,
            PLAYER2_ADDR,
            DEPOSIT_AMOUNT
        );

        // Test passes if escrow is created successfully with match_id
    }
}
