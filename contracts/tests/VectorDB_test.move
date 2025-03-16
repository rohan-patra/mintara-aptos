#[test_only]
module mintara::vector_db_tests {

use std::string::{Self, String};
use std::vector;
use std::signer;
use aptos_framework::account;

use mintara::vector_db;

const OWNER: address = @mintara;
const USER1: address = @0x456;

fun create_test_vector(seed: u64, dimension: u64): vector<u64> {
    let v = vector::empty<u64>();
    
    let i: u64 = 0;
    while (i < dimension) {
        let val = ((i + 1) * seed) % 100;
        vector::push_back(&mut v, val);
        i = i + 1;
    };
    
    v
}

fun create_test_ipfs_hash(id: u64): vector<u8> {
    let prefix = b"Qm";
    let suffix = vector::empty<u8>();
    
    let i = 0;
    while (i < 10) {
        vector::push_back(&mut suffix, ((48 + (id + i) % 10) as u8));
        i = i + 1;
    };
    
    vector::append(&mut prefix, suffix);
    prefix
}

fun create_test_accounts(): (signer, signer) {
    let owner = account::create_account_for_test(OWNER);
    let user1 = account::create_account_for_test(USER1);
    
    (owner, user1)
}

#[test]
fun test_initialize() {
    let (owner, _) = create_test_accounts();
    
    vector_db::initialize(&owner);
    
    assert!(vector_db::exists_vector_db(OWNER), 0);
    assert!(vector_db::get_vector_count(OWNER) == 0, 1);
}

#[test]
#[expected_failure(abort_code = vector_db::E_ALREADY_INITIALIZED)]
fun test_double_initialization() {
    let (owner, _) = create_test_accounts();
    
    vector_db::initialize(&owner);
    
    vector_db::initialize(&owner);
}

#[test]
fun test_insert_vector() {
    let (owner, _) = create_test_accounts();
    
    vector_db::initialize(&owner);
    
    let vector_data = create_test_vector(1, 1536);
    
    let ipfs_hash = create_test_ipfs_hash(1);
    
    vector_db::insert_vector(&owner, vector_data, ipfs_hash);
    
    assert!(vector_db::get_vector_count(OWNER) == 1, 2);
}

#[test]
#[expected_failure(abort_code = vector_db::E_INVALID_VECTOR_DIMENSION)]
fun test_insert_invalid_dimension() {
    let (owner, _) = create_test_accounts();
    
    vector_db::initialize(&owner);
    
    let vector_data = create_test_vector(1, 64);
    
    let ipfs_hash = create_test_ipfs_hash(1);
    
    vector_db::insert_vector(&owner, vector_data, ipfs_hash);
}

#[test]
#[expected_failure(abort_code = vector_db::E_NOT_AUTHORIZED)]
fun test_unauthorized_insert() {
    let (owner, user1) = create_test_accounts();
    
    vector_db::initialize(&owner);
    
    let vector_data = create_test_vector(1, 1536);
    
    let ipfs_hash = create_test_ipfs_hash(1);
    
    vector_db::insert_vector(&user1, vector_data, ipfs_hash);
}

#[test]
fun test_query_similar_vectors() {
    let (owner, _) = create_test_accounts();
    
    vector_db::initialize(&owner);
    
    let vector1 = create_test_vector(1, 1536);
    let ipfs_hash1 = create_test_ipfs_hash(1);
    vector_db::insert_vector(&owner, vector1, ipfs_hash1);
    
    let vector2 = create_test_vector(2, 1536);
    let ipfs_hash2 = create_test_ipfs_hash(2);
    vector_db::insert_vector(&owner, vector2, ipfs_hash2);
    
    let vector3 = create_test_vector(3, 1536);
    let ipfs_hash3 = create_test_ipfs_hash(3);
    vector_db::insert_vector(&owner, vector3, ipfs_hash3);
    
    let query_vector = vector1;
    
    let results = vector_db::query_similar_vectors(OWNER, query_vector, 2);
    
    assert!(vector::length(&results) == 2, 4);
    
    let expected_hash1 = string::utf8(ipfs_hash1);
    assert!(*vector::borrow(&results, 0) == expected_hash1, 5);
}

#[test]
#[expected_failure(abort_code = vector_db::E_EMPTY_DATABASE)]
fun test_query_empty_database() {
    let (owner, _) = create_test_accounts();
    
    vector_db::initialize(&owner);
    
    let query_vector = create_test_vector(1, 1536);
    
    vector_db::query_similar_vectors(OWNER, query_vector, 2);
}
}
