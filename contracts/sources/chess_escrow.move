module chess_escrow::escrow {

    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;
    use std::signer;
    use std::table::{Self, Table};

    /// Error codes
    const ENOT_ADMIN: u64 = 1;
    const EALREADY_DEPOSITED: u64 = 2;
    const EESCROW_NOT_READY: u64 = 3;
    const EESCROW_NOT_FOUND: u64 = 4;
    const EESCROW_ALREADY_EXISTS: u64 = 5;

    /// Escrow resource
    struct Escrow has store, drop {
        admin: address,
        player1: address,
        player2: address,
        amount: u64,
        total: u64,
        deposited1: bool,
        deposited2: bool,
    }

    /// Escrow store that holds all escrows in a table
    struct EscrowStore has key {
        escrows: Table<u64, Escrow>,
    }

    /// Initialize the escrow store (called once by admin)
    public entry fun initialize(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        if (!exists<EscrowStore>(admin_addr)) {
            move_to(admin, EscrowStore {
                escrows: table::new(),
            });
        };
    }

    /// Create escrow (admin) - match_id is used as the key
    public entry fun create_escrow(
        admin: &signer,
        match_id: u64,
        player1: address,
        player2: address,
        amount: u64
    ) acquires EscrowStore {
        let admin_addr = signer::address_of(admin);
        let store = borrow_global_mut<EscrowStore>(admin_addr);
        
        // Check if escrow already exists for this match_id
        assert!(!table::contains(&store.escrows, match_id), EESCROW_ALREADY_EXISTS);

        table::add(&mut store.escrows, match_id, Escrow {
            admin: admin_addr,
            player1,
            player2,
            amount,
            total: 0,
            deposited1: false,
            deposited2: false,
        });
    }

    /// Player deposit
    public entry fun deposit(
        player: &signer,
        admin: address,
        match_id: u64
    ) acquires EscrowStore {
        let store = borrow_global_mut<EscrowStore>(admin);
        assert!(table::contains(&store.escrows, match_id), EESCROW_NOT_FOUND);
        
        let escrow = table::borrow_mut(&mut store.escrows, match_id);
        let sender = signer::address_of(player);

        if (sender == escrow.player1) {
            assert!(!escrow.deposited1, EALREADY_DEPOSITED);
            coin::transfer<AptosCoin>(player, admin, escrow.amount);
            escrow.deposited1 = true;
            escrow.total += escrow.amount;
        } else if (sender == escrow.player2) {
            assert!(!escrow.deposited2, EALREADY_DEPOSITED);
            coin::transfer<AptosCoin>(player, admin, escrow.amount);
            escrow.deposited2 = true;
            escrow.total += escrow.amount;
        };
    }

    /// Resolve WINNER TAKES ALL (minus fee)
    public entry fun resolve_win(
        admin: &signer,
        match_id: u64,
        winner: address
    ) acquires EscrowStore {
        let admin_addr = signer::address_of(admin);
        let store = borrow_global_mut<EscrowStore>(admin_addr);
        
        assert!(table::contains(&store.escrows, match_id), EESCROW_NOT_FOUND);
        let escrow = table::borrow(&store.escrows, match_id);

        assert!(admin_addr == escrow.admin, ENOT_ADMIN);
        assert!(escrow.deposited1 && escrow.deposited2, EESCROW_NOT_READY);

        let total = escrow.total;
        let fee = total * 5 / 100;
        let payout = total - fee;

        // Winner payout
        coin::transfer<AptosCoin>(admin, winner, payout);

        // Remove escrow from table
        table::remove(&mut store.escrows, match_id);
    }

    /// Resolve DRAW (split after fee)
    public entry fun resolve_draw(
        admin: &signer,
        match_id: u64
    ) acquires EscrowStore {
        let admin_addr = signer::address_of(admin);
        let store = borrow_global_mut<EscrowStore>(admin_addr);
        
        assert!(table::contains(&store.escrows, match_id), EESCROW_NOT_FOUND);
        let escrow = table::borrow(&store.escrows, match_id);

        assert!(admin_addr == escrow.admin, ENOT_ADMIN);
        assert!(escrow.deposited1 && escrow.deposited2, EESCROW_NOT_READY);

        let total = escrow.total;
        let fee = total * 5 / 100;
        let remaining = total - fee;
        let split = remaining / 2;

        // Refund players
        coin::transfer<AptosCoin>(admin, escrow.player1, split);
        coin::transfer<AptosCoin>(admin, escrow.player2, split);

        // Remove escrow from table
        table::remove(&mut store.escrows, match_id);
    }
}

