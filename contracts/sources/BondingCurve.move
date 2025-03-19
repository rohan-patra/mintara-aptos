module mintara::bonding_curve {
    use std::option;
    use std::signer;
    use std::string::{Self, String};
    use aptos_framework::fungible_asset::{Self, Metadata, MintRef, BurnRef, TransferRef};
    use aptos_framework::object::{Self, Object, ExtendRef};
    use aptos_framework::primary_fungible_store;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::account;
    use std::event::{Self};

    const E_NOT_INITIALIZED: u64 = 1;
    const E_ALREADY_INITIALIZED: u64 = 2;
    const E_INSUFFICIENT_FUNDS: u64 = 3;
    const E_ZERO_AMOUNT: u64 = 4;
    const E_NOT_OWNER: u64 = 5;
    const E_INSUFFICIENT_APT_BALANCE: u64 = 6;
    const E_INSUFFICIENT_TOKEN_BALANCE: u64 = 7;
    const E_SUPPLY_EXCEEDS_U64_MAX: u64 = 8;
    const E_UNAUTHORIZED: u64 = 9;

    const RESOURCE_ACCOUNT_SEED: vector<u8> = b"mintara_bonding_curve";

    struct BondingCurveCapabilities has key {
        mint_ref: MintRef,
        burn_ref: BurnRef,
        transfer_ref: TransferRef,
        extend_ref: ExtendRef,
        metadata: Object<Metadata>,
    }

    struct CurveInfo has key {
        admin: address,
        base_price: u64,
        price_increment: u64,
        resource_signer_cap: account::SignerCapability,
    }

    struct InitEvent has drop, store {
        admin: address,
        resource_addr: address
    }

    struct PurchaseEvent has drop, store {
        buyer: address,
        amount: u64,
        price: u64
    }

    struct SellEvent has drop, store {
        seller: address,
        amount: u64,
        price: u64
    }

    public entry fun initialize(
        admin: &signer,
        token_name: String,
        token_symbol: String,
        base_price: u64,
        price_increment: u64
    ) acquires CurveInfo {
        let admin_addr = signer::address_of(admin);
        
        let resource_addr = get_resource_address();
        
        if (exists<CurveInfo>(resource_addr)) {
            let curve_info_ref = borrow_global_mut<CurveInfo>(resource_addr);
            curve_info_ref.admin = admin_addr;
            curve_info_ref.base_price = base_price;
            curve_info_ref.price_increment = price_increment;
        } else {
            let (resource_signer, resource_cap) = account::create_resource_account(admin, RESOURCE_ACCOUNT_SEED);
            let resource_addr = signer::address_of(&resource_signer);
            
            assert!(!exists<CurveInfo>(resource_addr), E_ALREADY_INITIALIZED);
            
            let constructor_ref = object::create_named_object(&resource_signer, *string::bytes(&token_symbol));
            
            primary_fungible_store::create_primary_store_enabled_fungible_asset(
                &constructor_ref,
                option::none(), 
                token_name,
                token_symbol,
                8, 
                std::string::utf8(b""), 
                std::string::utf8(b""), 
            );

            let mint_ref = fungible_asset::generate_mint_ref(&constructor_ref);
            let burn_ref = fungible_asset::generate_burn_ref(&constructor_ref);
            let transfer_ref = fungible_asset::generate_transfer_ref(&constructor_ref);
            let extend_ref = object::generate_extend_ref(&constructor_ref);
            
            let metadata = object::object_from_constructor_ref<Metadata>(&constructor_ref);

            move_to(&resource_signer, BondingCurveCapabilities {
                mint_ref,
                burn_ref,
                transfer_ref,
                extend_ref,
                metadata,
            });

            move_to(&resource_signer, CurveInfo {
                admin: admin_addr,
                base_price,
                price_increment,
                resource_signer_cap: resource_cap,
            });
        };
    }

    fun get_resource_address(): address {
        account::create_resource_address(&@mintara, RESOURCE_ACCOUNT_SEED)
    }
    
    public fun calculate_purchase_price(amount: u64): u64 acquires CurveInfo, BondingCurveCapabilities {
        let resource_addr = get_resource_address();
        assert!(exists<CurveInfo>(resource_addr), E_NOT_INITIALIZED);
        let curve_info = borrow_global<CurveInfo>(resource_addr);
        let caps = borrow_global<BondingCurveCapabilities>(resource_addr);
        
        let supply_opt = fungible_asset::supply(caps.metadata);
        let current_supply = if (option::is_some(&supply_opt)) {
            let supply_u128 = *option::borrow(&supply_opt);
            assert!(supply_u128 <= 18446744073709551615u128, E_SUPPLY_EXCEEDS_U64_MAX); // u64::MAX
            (supply_u128 as u64)
        } else {
            0u64
        };
        
        let base = curve_info.base_price;
        let increment = curve_info.price_increment;

        base + (current_supply * increment * amount)
    }

    public fun calculate_sale_price(amount: u64): u64 acquires CurveInfo, BondingCurveCapabilities {
        let resource_addr = get_resource_address();
        assert!(exists<CurveInfo>(resource_addr), E_NOT_INITIALIZED);
        let curve_info_ref = borrow_global<CurveInfo>(resource_addr);
        let caps = borrow_global<BondingCurveCapabilities>(resource_addr);
        
        let supply_opt = fungible_asset::supply(caps.metadata);
        let current_supply = if (option::is_some(&supply_opt)) {
            let supply_u128 = *option::borrow(&supply_opt);
            assert!(supply_u128 <= 18446744073709551615u128, E_SUPPLY_EXCEEDS_U64_MAX); // u64::MAX
            (supply_u128 as u64)
        } else {
            0u64
        };
        
        assert!(current_supply >= amount, E_INSUFFICIENT_FUNDS);
        
        let base = curve_info_ref.base_price;
        let increment = curve_info_ref.price_increment;

        let price = base + ((current_supply - amount) * increment * amount);
        price * 95 / 100 // 5% slippage for selling
    }

    #[view]
    public fun get_resource_address_view(): address {
        get_resource_address()
    }

    public entry fun buy_tokens_direct(
        buyer: &signer,
        amount: u64,
        resource_addr: address
    ) acquires CurveInfo, BondingCurveCapabilities {
        assert!(amount > 0, E_ZERO_AMOUNT);
        assert!(exists<CurveInfo>(resource_addr), E_NOT_INITIALIZED);
        
        let price = calculate_purchase_price_direct(amount, resource_addr);
        let caps = borrow_global<BondingCurveCapabilities>(resource_addr);
        let curve_info = borrow_global<CurveInfo>(resource_addr);

        let buyer_addr = signer::address_of(buyer);
        assert!(coin::balance<AptosCoin>(buyer_addr) >= price, E_INSUFFICIENT_APT_BALANCE);

        coin::transfer<AptosCoin>(buyer, resource_addr, price);

        let fa = fungible_asset::mint(&caps.mint_ref, amount);
        primary_fungible_store::deposit(buyer_addr, fa);
    }

    public entry fun sell_tokens_direct(
        seller: &signer,
        amount: u64,
        resource_addr: address
    ) acquires CurveInfo, BondingCurveCapabilities {
        assert!(amount > 0, E_ZERO_AMOUNT);
        assert!(exists<CurveInfo>(resource_addr), E_NOT_INITIALIZED);
        
        let sale_price = calculate_sale_price_direct(amount, resource_addr);
        let caps = borrow_global<BondingCurveCapabilities>(resource_addr);
        let curve_info = borrow_global<CurveInfo>(resource_addr);

        let seller_addr = signer::address_of(seller);
        assert!(
            primary_fungible_store::balance(seller_addr, caps.metadata) >= amount,
            E_INSUFFICIENT_TOKEN_BALANCE
        );

        assert!(coin::balance<AptosCoin>(resource_addr) >= sale_price, E_INSUFFICIENT_APT_BALANCE);

        let fa = primary_fungible_store::withdraw(seller, caps.metadata, amount);
        fungible_asset::burn(&caps.burn_ref, fa);

        let resource_signer = account::create_signer_with_capability(&curve_info.resource_signer_cap);
        
        coin::transfer<AptosCoin>(&resource_signer, seller_addr, sale_price);
    }

    public fun calculate_purchase_price_direct(amount: u64, resource_addr: address): u64 acquires CurveInfo, BondingCurveCapabilities {
        assert!(exists<CurveInfo>(resource_addr), E_NOT_INITIALIZED);
        let curve_info = borrow_global<CurveInfo>(resource_addr);
        let caps = borrow_global<BondingCurveCapabilities>(resource_addr);
        
        let supply_opt = fungible_asset::supply(caps.metadata);
        let current_supply = if (option::is_some(&supply_opt)) {
            let supply_u128 = *option::borrow(&supply_opt);
            assert!(supply_u128 <= 18446744073709551615u128, E_SUPPLY_EXCEEDS_U64_MAX); // u64::MAX
            (supply_u128 as u64)
        } else {
            0u64
        };
        
        let base = curve_info.base_price;
        let increment = curve_info.price_increment;

        base + (current_supply * increment * amount)
    }

    public fun calculate_sale_price_direct(amount: u64, resource_addr: address): u64 acquires CurveInfo, BondingCurveCapabilities {
        assert!(exists<CurveInfo>(resource_addr), E_NOT_INITIALIZED);
        let curve_info_ref = borrow_global<CurveInfo>(resource_addr);
        let caps = borrow_global<BondingCurveCapabilities>(resource_addr);
        
        let supply_opt = fungible_asset::supply(caps.metadata);
        let current_supply = if (option::is_some(&supply_opt)) {
            let supply_u128 = *option::borrow(&supply_opt);
            assert!(supply_u128 <= 18446744073709551615u128, E_SUPPLY_EXCEEDS_U64_MAX); // u64::MAX
            (supply_u128 as u64)
        } else {
            0u64
        };
        
        assert!(current_supply >= amount, E_INSUFFICIENT_FUNDS);
        
        let base = curve_info_ref.base_price;
        let increment = curve_info_ref.price_increment;

        let price = base + ((current_supply - amount) * increment * amount);
        price * 95 / 100
    }

    #[view]
    public fun get_total_supply_direct(resource_addr: address): u64 acquires BondingCurveCapabilities {
        assert!(exists<BondingCurveCapabilities>(resource_addr), E_NOT_INITIALIZED);
        let caps = borrow_global<BondingCurveCapabilities>(resource_addr);
        let supply_opt = fungible_asset::supply(caps.metadata);
        if (option::is_some(&supply_opt)) {
            let supply_u128 = *option::borrow(&supply_opt);
            assert!(supply_u128 <= 18446744073709551615u128, E_SUPPLY_EXCEEDS_U64_MAX);
            (supply_u128 as u64)
        } else {
            0u64
        }
    }

    #[view]
    public fun get_metadata(): Object<Metadata> acquires BondingCurveCapabilities {
        let resource_addr = get_resource_address();
        assert!(exists<BondingCurveCapabilities>(resource_addr), E_NOT_INITIALIZED);
        let caps = borrow_global<BondingCurveCapabilities>(resource_addr);
        caps.metadata
    }
} 