module mintara::vector_db {

use std::signer;
use std::string::{Self, String};
use std::vector;
use aptos_std::table::{Self, Table};
use aptos_std::math64::sqrt;

const E_NOT_AUTHORIZED: u64 = 1;
const E_ALREADY_INITIALIZED: u64 = 2;
const E_INVALID_VECTOR_DIMENSION: u64 = 3;
const E_EMPTY_DATABASE: u64 = 4;
const E_NO_RESULTS_FOUND: u64 = 5;

const VECTOR_DIMENSION: u64 = 1536;

struct VectorEntry has store, drop, copy {
    vector: vector<u64>, 
    ipfs_hash: String,
}

struct VectorDB has key {
    owner: address,
    vectors: Table<u64, VectorEntry>,
    next_id: u64,
}

public entry fun initialize(account: &signer) {
    let addr = signer::address_of(account);
    
    assert!(!exists<VectorDB>(addr), E_ALREADY_INITIALIZED);
    
    let vectors = table::new<u64, VectorEntry>();
    
    move_to(account, VectorDB {
        owner: addr,
        vectors: vectors,
        next_id: 0,
    });
}

public entry fun insert_vector(
    account: &signer,
    vector_data: vector<u64>,
    ipfs_hash: vector<u8>,
) acquires VectorDB {
    let addr = signer::address_of(account);
    
    assert!(exists<VectorDB>(addr), E_NOT_AUTHORIZED);
    
    assert!(vector::length(&vector_data) == VECTOR_DIMENSION, E_INVALID_VECTOR_DIMENSION);
    
    let vector_db = borrow_global_mut<VectorDB>(addr);
    
    let normalized_vector = normalize_vector(vector_data);
    
    let vector_entry = VectorEntry {
        vector: normalized_vector,
        ipfs_hash: string::utf8(ipfs_hash),
    };
    
    table::add(&mut vector_db.vectors, vector_db.next_id, vector_entry);
    
    vector_db.next_id = vector_db.next_id + 1;
}

public fun query_similar_vectors(
    db_owner: address,
    query_vector: vector<u64>,
    top_k: u64,
): vector<String> acquires VectorDB {
    assert!(exists<VectorDB>(db_owner), E_NOT_AUTHORIZED);
    
    assert!(vector::length(&query_vector) == VECTOR_DIMENSION, E_INVALID_VECTOR_DIMENSION);
    
    let vector_db = borrow_global<VectorDB>(db_owner);
    
    assert!(vector_db.next_id > 0, E_EMPTY_DATABASE);
    
    let normalized_query = normalize_vector(query_vector);
    
    let result = find_top_k_similar(vector_db, &normalized_query, top_k);
    
    assert!(!vector::is_empty(&result), E_NO_RESULTS_FOUND);
    
    result
}

fun find_top_k_similar(
    db: &VectorDB,
    query: &vector<u64>,
    top_k: u64,
): vector<String> {
    let result = vector::empty<String>();
    
    let similarities = vector::empty<u64>();
    
    let i: u64 = 0;
    while (i < db.next_id) {
        if (table::contains(&db.vectors, i)) {
            let entry = table::borrow(&db.vectors, i);
            let similarity = cosine_similarity(query, &entry.vector);
            
            insert_sorted(&mut result, &mut similarities, entry.ipfs_hash, similarity, top_k);
        };
        i = i + 1;
    };
    
    result
}

fun cosine_similarity(v1: &vector<u64>, v2: &vector<u64>): u64 {
    let dot_product: u64 = 0;
    let len = vector::length(v1);
    
    let i: u64 = 0;
    while (i < len) {
        dot_product = dot_product + (*vector::borrow(v1, i) * *vector::borrow(v2, i));
        i = i + 1;
    };
    
    dot_product
}

fun normalize_vector(v: vector<u64>): vector<u64> {
    let result = vector::empty<u64>();
    let squared_sum: u64 = 0;
    let len = vector::length(&v);
    
    let i: u64 = 0;
    while (i < len) {
        let val = *vector::borrow(&v, i);
        squared_sum = squared_sum + (val * val);
        i = i + 1;
    };
    
    if (squared_sum == 0) {
        i = 0;
        while (i < len) {
            vector::push_back(&mut result, 0);
            i = i + 1;
        };
        return result
    };
    
    let magnitude = sqrt(squared_sum);
    
    if (magnitude == 0) {
        magnitude = 1;
    };
    
    i = 0;
    while (i < len) {
        let val = *vector::borrow(&v, i);
        let normalized_val = (val * 1000000) / magnitude;
        vector::push_back(&mut result, normalized_val);
        i = i + 1;
    };
    
    result
}

fun insert_sorted(
    result: &mut vector<String>,
    similarities: &mut vector<u64>,
    ipfs_hash: String,
    similarity: u64,
    max_size: u64,
) {
    let len = vector::length(similarities);
    
    if (len < max_size) {
        let pos = 0;
        while (pos < len && *vector::borrow(similarities, pos) > similarity) {
            pos = pos + 1;
        };
        
        vector::insert(similarities, pos, similarity);
        vector::push_back(result, ipfs_hash);
        if (pos < len) {
            let i = len;
            while (i > pos) {
                let prev_str = vector::swap_remove(result, i - 1);
                vector::push_back(result, prev_str);
                i = i - 1;
            };
        };
    } else if (len > 0 && similarity > *vector::borrow(similarities, len - 1)) {
        let pos = 0;
        while (pos < len && *vector::borrow(similarities, pos) > similarity) {
            pos = pos + 1;
        };
        
        if (pos < len) {
            vector::insert(similarities, pos, similarity);
            vector::push_back(result, ipfs_hash);
            if (pos < len) {
                let i = len;
                while (i > pos) {
                    let prev_str = vector::swap_remove(result, i - 1);
                    vector::push_back(result, prev_str);
                    i = i - 1;
                };
            };
            vector::pop_back(similarities);
            vector::pop_back(result);
        };
    };
}

public fun get_vector_count(db_owner: address): u64 acquires VectorDB {
    assert!(exists<VectorDB>(db_owner), E_NOT_AUTHORIZED);
    let vector_db = borrow_global<VectorDB>(db_owner);
    vector_db.next_id
}

public fun exists_vector_db(addr: address): bool {
    exists<VectorDB>(addr)
}
}