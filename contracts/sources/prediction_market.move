module chess_escrow::prediction_market {
    use aptos_framework::coin::{Self, Coin};
    use aptos_framework::aptos_coin::AptosCoin;
    use std::signer;
    use std::table::{Self, Table};

    /// Error codes
    const ENOT_ADMIN: u64 = 1;
    const EMARKET_NOT_FOUND: u64 = 2;
    const EMARKET_ALREADY_EXISTS: u64 = 3;
    const EMARKET_ALREADY_RESOLVED: u64 = 4;
    const EINVALID_OUTCOME: u64 = 5;
    const EZERO_BET: u64 = 6;
    const ENOT_RESOLVED: u64 = 7;
    const ENO_SHARES: u64 = 8;
    const EALREADY_CLAIMED: u64 = 9;

    /// Market outcome options
    const OUTCOME_PLAYER1: u8 = 1;
    const OUTCOME_PLAYER2: u8 = 2;
    const OUTCOME_DRAW: u8 = 3;

    /// Market status
    const STATUS_ACTIVE: u8 = 1;
    const STATUS_RESOLVED: u8 = 2;

    /// Market structure - now holds coins directly
    struct Market has store {
        admin: address,
        match_id: u64,
        player1: address,
        player2: address,
        status: u8,
        winning_outcome: u8,
        pool: Coin<AptosCoin>, // Contract holds the coins
        original_pool_size: u64, // Store original pool size at resolution for reward calculations
        player1_shares: u64,
        player2_shares: u64,
        draw_shares: u64,
    }

    /// User shares in a specific outcome of a market
    struct UserShares has store {
        shares: Table<address, u64>,
    }

    /// Track if user has claimed
    struct ClaimStatus has store {
        claimed: Table<address, bool>,
    }

    /// Market store that holds all markets
    struct MarketStore has key {
        markets: Table<u64, Market>,
    }

    /// Outcome shares store
    struct OutcomeSharesStore has key {
        shares: Table<u64, Table<u8, UserShares>>,
    }

    /// Claim tracking store
    struct ClaimTrackingStore has key {
        claims: Table<u64, ClaimStatus>,
    }

    /// Initialize the market store
    public entry fun initialize(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        if (!exists<MarketStore>(admin_addr)) {
            move_to(admin, MarketStore {
                markets: table::new(),
            });
        };
        if (!exists<OutcomeSharesStore>(admin_addr)) {
            move_to(admin, OutcomeSharesStore {
                shares: table::new(),
            });
        };
        if (!exists<ClaimTrackingStore>(admin_addr)) {
            move_to(admin, ClaimTrackingStore {
                claims: table::new(),
            });
        };
    }

    /// Create a new prediction market
    public entry fun create_market(
        admin: &signer,
        match_id: u64,
        player1: address,
        player2: address
    ) acquires MarketStore {
        let admin_addr = signer::address_of(admin);
        let store = borrow_global_mut<MarketStore>(admin_addr);
        
        assert!(!table::contains(&store.markets, match_id), EMARKET_ALREADY_EXISTS);

        table::add(&mut store.markets, match_id, Market {
            admin: admin_addr,
            match_id,
            player1,
            player2,
            status: STATUS_ACTIVE,
            winning_outcome: 0,
            pool: coin::zero<AptosCoin>(),
            original_pool_size: 0,
            player1_shares: 0,
            player2_shares: 0,
            draw_shares: 0,
        });
    }

    /// Place a bet - tokens go to contract
    public entry fun bet(
        user: &signer,
        admin: address,
        match_id: u64,
        outcome: u8,
        amount: u64
    ) acquires MarketStore, OutcomeSharesStore {
        assert!(outcome == OUTCOME_PLAYER1 || outcome == OUTCOME_PLAYER2 || outcome == OUTCOME_DRAW, EINVALID_OUTCOME);
        assert!(amount > 0, EZERO_BET);

        let market_store = borrow_global_mut<MarketStore>(admin);
        assert!(table::contains(&market_store.markets, match_id), EMARKET_NOT_FOUND);
        
        let market = table::borrow_mut(&mut market_store.markets, match_id);
        assert!(market.status == STATUS_ACTIVE, EMARKET_ALREADY_RESOLVED);

        let user_addr = signer::address_of(user);
        
        // Withdraw coins from user and merge into market pool
        let coins = coin::withdraw<AptosCoin>(user, amount);
        coin::merge(&mut market.pool, coins);

        // Update market totals
        if (outcome == OUTCOME_PLAYER1) {
            market.player1_shares = market.player1_shares + amount;
        } else if (outcome == OUTCOME_PLAYER2) {
            market.player2_shares = market.player2_shares + amount;
        } else {
            market.draw_shares = market.draw_shares + amount;
        };

        // Update user shares
        let shares_store = borrow_global_mut<OutcomeSharesStore>(admin);
        if (!table::contains(&shares_store.shares, match_id)) {
            let outcome_table = table::new();
            table::add(&mut shares_store.shares, match_id, outcome_table);
        };
        
        let outcome_table = table::borrow_mut(&mut shares_store.shares, match_id);
        if (!table::contains(outcome_table, outcome)) {
            table::add(outcome_table, outcome, UserShares {
                shares: table::new(),
            });
        };
        
        let user_shares = table::borrow_mut(outcome_table, outcome);
        if (!table::contains(&user_shares.shares, user_addr)) {
            table::add(&mut user_shares.shares, user_addr, 0);
        };
        
        let current_shares = *table::borrow(&user_shares.shares, user_addr);
        table::upsert(&mut user_shares.shares, user_addr, current_shares + amount);
    }

    /// Resolve market
    public entry fun resolve_market(
        admin: &signer,
        match_id: u64,
        winning_outcome: u8
    ) acquires MarketStore, ClaimTrackingStore {
        let admin_addr = signer::address_of(admin);
        let store = borrow_global_mut<MarketStore>(admin_addr);
        
        assert!(table::contains(&store.markets, match_id), EMARKET_NOT_FOUND);
        assert!(winning_outcome == OUTCOME_PLAYER1 || winning_outcome == OUTCOME_PLAYER2 || winning_outcome == OUTCOME_DRAW, EINVALID_OUTCOME);
        
        let market = table::borrow_mut(&mut store.markets, match_id);
        assert!(admin_addr == market.admin, ENOT_ADMIN);
        assert!(market.status == STATUS_ACTIVE, EMARKET_ALREADY_RESOLVED);

        market.status = STATUS_RESOLVED;
        market.winning_outcome = winning_outcome;
        market.original_pool_size = coin::value(&market.pool);

        // Initialize claim tracking for this market
        let claim_store = borrow_global_mut<ClaimTrackingStore>(admin_addr);
        if (!table::contains(&claim_store.claims, match_id)) {
            table::add(&mut claim_store.claims, match_id, ClaimStatus {
                claimed: table::new(),
            });
        };
    }

    /// User claims their own rewards
    public entry fun claim_rewards(
        user: &signer,
        admin: address,
        match_id: u64
    ) acquires MarketStore, OutcomeSharesStore, ClaimTrackingStore {
        let user_addr = signer::address_of(user);
        
        let market_store = borrow_global_mut<MarketStore>(admin);
        assert!(table::contains(&market_store.markets, match_id), EMARKET_NOT_FOUND);
        
        let market = table::borrow_mut(&mut market_store.markets, match_id);
        assert!(market.status == STATUS_RESOLVED, ENOT_RESOLVED);
        assert!(market.winning_outcome != 0, ENOT_RESOLVED);

        // Check if already claimed
        let claim_store = borrow_global_mut<ClaimTrackingStore>(admin);
        let claim_status = table::borrow_mut(&mut claim_store.claims, match_id);
        if (table::contains(&claim_status.claimed, user_addr)) {
            assert!(!*table::borrow(&claim_status.claimed, user_addr), EALREADY_CLAIMED);
        };

        let winning_outcome = market.winning_outcome;

        // Get user's shares in winning outcome
        let shares_store = borrow_global_mut<OutcomeSharesStore>(admin);
        assert!(table::contains(&shares_store.shares, match_id), EMARKET_NOT_FOUND);
        
        let outcome_table = table::borrow_mut(&mut shares_store.shares, match_id);
        assert!(table::contains(outcome_table, winning_outcome), EMARKET_NOT_FOUND);
        
        let user_shares = table::borrow_mut(outcome_table, winning_outcome);
        assert!(table::contains(&user_shares.shares, user_addr), ENO_SHARES);
        
        let user_share_amount = *table::borrow(&user_shares.shares, user_addr);
        assert!(user_share_amount > 0, ENO_SHARES);

        // Calculate reward
        let winning_outcome_shares = if (winning_outcome == OUTCOME_PLAYER1) {
            market.player1_shares
        } else if (winning_outcome == OUTCOME_PLAYER2) {
            market.player2_shares
        } else {
            market.draw_shares
        };

        assert!(winning_outcome_shares > 0, ENO_SHARES);

        // Use original pool size at resolution time for fair proportional distribution
        let total_pool = market.original_pool_size;
        let reward = (user_share_amount * total_pool) / winning_outcome_shares;

        // Mark as claimed
        table::upsert(&mut claim_status.claimed, user_addr, true);

        // Remove user shares
        table::remove(&mut user_shares.shares, user_addr);

        // Extract coins from pool and deposit to user
        let reward_coins = coin::extract(&mut market.pool, reward);
        coin::deposit(user_addr, reward_coins);
    }

    // ========== Read/Getter Functions ==========

    /// Get market statistics
    public fun get_market_stats(
        admin: address,
        match_id: u64
    ): (u8, u8, u64, u64, u64, u64) acquires MarketStore {
        let store = borrow_global<MarketStore>(admin);
        assert!(table::contains(&store.markets, match_id), EMARKET_NOT_FOUND);
        
        let market = table::borrow(&store.markets, match_id);
        (
            market.status,
            market.winning_outcome,
            coin::value(&market.pool),
            market.player1_shares,
            market.player2_shares,
            market.draw_shares
        )
    }

    /// Get user's shares in a specific outcome
    public fun get_user_shares(
        admin: address,
        match_id: u64,
        outcome: u8,
        user: address
    ): u64 acquires OutcomeSharesStore {
        let shares_store = borrow_global<OutcomeSharesStore>(admin);
        if (!table::contains(&shares_store.shares, match_id)) {
            return 0
        };
        
        let outcome_table = table::borrow(&shares_store.shares, match_id);
        if (!table::contains(outcome_table, outcome)) {
            return 0
        };
        
        let user_shares = table::borrow(outcome_table, outcome);
        if (!table::contains(&user_shares.shares, user)) {
            return 0
        };
        
        *table::borrow(&user_shares.shares, user)
    }

    /// Check if user has claimed
    public fun has_claimed(
        admin: address,
        match_id: u64,
        user: address
    ): bool acquires ClaimTrackingStore {
        let claim_store = borrow_global<ClaimTrackingStore>(admin);
        if (!table::contains(&claim_store.claims, match_id)) {
            return false
        };
        
        let claim_status = table::borrow(&claim_store.claims, match_id);
        if (!table::contains(&claim_status.claimed, user)) {
            return false
        };
        
        *table::borrow(&claim_status.claimed, user)
    }

    /// Get potential reward
    public fun get_potential_reward(
        admin: address,
        match_id: u64,
        outcome: u8,
        user: address
    ): u64 acquires MarketStore, OutcomeSharesStore {
        let market_store = borrow_global<MarketStore>(admin);
        if (!table::contains(&market_store.markets, match_id)) {
            return 0
        };
        
        let market = table::borrow(&market_store.markets, match_id);
        let user_shares = get_user_shares(admin, match_id, outcome, user);
        
        if (user_shares == 0) {
            return 0
        };

        if (market.status == STATUS_RESOLVED && market.winning_outcome != outcome) {
            return 0
        };

        let outcome_shares = if (outcome == OUTCOME_PLAYER1) {
            market.player1_shares
        } else if (outcome == OUTCOME_PLAYER2) {
            market.player2_shares
        } else {
            market.draw_shares
        };

        if (outcome_shares == 0) {
            return 0
        };

        let total_pool = coin::value(&market.pool);
        (user_shares * total_pool) / outcome_shares
    }

    /// Get all user shares across all outcomes
    public fun get_user_all_shares(
        admin: address,
        match_id: u64,
        user: address
    ): (u64, u64, u64) acquires OutcomeSharesStore {
        (
            get_user_shares(admin, match_id, OUTCOME_PLAYER1, user),
            get_user_shares(admin, match_id, OUTCOME_PLAYER2, user),
            get_user_shares(admin, match_id, OUTCOME_DRAW, user)
        )
    }

    /// Check if market exists
    public fun market_exists(admin: address, match_id: u64): bool acquires MarketStore {
        let store = borrow_global<MarketStore>(admin);
        table::contains(&store.markets, match_id)
    }

    /// Get market admin
    public fun get_market_admin(admin: address, match_id: u64): address acquires MarketStore {
        let store = borrow_global<MarketStore>(admin);
        assert!(table::contains(&store.markets, match_id), EMARKET_NOT_FOUND);
        let market = table::borrow(&store.markets, match_id);
        market.admin
    }
}