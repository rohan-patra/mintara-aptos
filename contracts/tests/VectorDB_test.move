#[test_only]
module mintara::vector_db_tests {

use std::string::{Self, String};
use std::vector;
use std::signer;
use aptos_framework::account;

use mintara::vector_db;

/// Test addresses
const OWNER: address = @mintara;
const USER1: address = @0x456;

/// Helper function to create test vectors
fun create_test_vector(seed: u64, dimension: u64): vector<u64> {
    let v = vector::empty<u64>();
    
    let i: u64 = 0;
    while (i < dimension) {
        // A simple way to generate vector values based on seed
        let val = ((i + 1) * seed) % 100;
        vector::push_back(&mut v, val);
        i = i + 1;
    };
    
    v
}

/// Helper function to create a test IPFS hash
fun create_test_ipfs_hash(id: u64): vector<u8> {
    // Example IPFS hash format: Qm + some characters
    let prefix = b"Qm";
    let suffix = vector::empty<u8>();
    
    // Add the ID as bytes
    let i = 0;
    while (i < 10) {
        vector::push_back(&mut suffix, ((48 + (id + i) % 10) as u8));
        i = i + 1;
    };
    
    vector::append(&mut prefix, suffix);
    prefix
}

/// Helper function to create test accounts
fun create_test_accounts(): (signer, signer) {
    let owner = account::create_account_for_test(OWNER);
    let user1 = account::create_account_for_test(USER1);
    
    (owner, user1)
}

#[test]
fun test_initialize() {
    let (owner, _) = create_test_accounts();
    
    // Initialize the vector database
    vector_db::initialize(&owner);
    
    // Check that initialization was successful
    assert!(vector_db::exists_vector_db(OWNER), 0);
    assert!(vector_db::get_vector_count(OWNER) == 0, 1);
}

#[test]
#[expected_failure(abort_code = vector_db::E_ALREADY_INITIALIZED)]
fun test_double_initialization() {
    let (owner, _) = create_test_accounts();
    
    // Initialize the vector database
    vector_db::initialize(&owner);
    
    // Try to initialize again (should fail)
    vector_db::initialize(&owner);
}

#[test]
fun test_insert_vector() {
    let (owner, _) = create_test_accounts();
    
    // Initialize the vector database
    vector_db::initialize(&owner);
    
    // Create a test vector (1536 dimensions)
    let vector_data = create_test_vector(1, 1536);
    
    // Create a test IPFS hash
    let ipfs_hash = create_test_ipfs_hash(1);
    
    // Insert the vector
    vector_db::insert_vector(&owner, vector_data, ipfs_hash);
    
    // Check that the vector was inserted
    assert!(vector_db::get_vector_count(OWNER) == 1, 2);
}

#[test]
#[expected_failure(abort_code = vector_db::E_INVALID_VECTOR_DIMENSION)]
fun test_insert_invalid_dimension() {
    let (owner, _) = create_test_accounts();
    
    // Initialize the vector database
    vector_db::initialize(&owner);
    
    // Create a test vector with WRONG dimension (should be 1536)
    let vector_data = create_test_vector(1, 64);
    
    // Create a test IPFS hash
    let ipfs_hash = create_test_ipfs_hash(1);
    
    // Insert the vector (should fail due to wrong dimension)
    vector_db::insert_vector(&owner, vector_data, ipfs_hash);
}

#[test]
#[expected_failure(abort_code = vector_db::E_NOT_AUTHORIZED)]
fun test_unauthorized_insert() {
    let (owner, user1) = create_test_accounts();
    
    // Initialize the vector database
    vector_db::initialize(&owner);
    
    // Create a test vector
    let vector_data = create_test_vector(1, 1536);
    
    // Create a test IPFS hash
    let ipfs_hash = create_test_ipfs_hash(1);
    
    // Try to insert as unauthorized user (should fail)
    vector_db::insert_vector(&user1, vector_data, ipfs_hash);
}

#[test]
fun test_query_similar_vectors() {
    let (owner, _) = create_test_accounts();
    
    // Initialize the vector database
    vector_db::initialize(&owner);
    
    // Insert several test vectors
    let vector1 = create_test_vector(1, 1536);
    let ipfs_hash1 = create_test_ipfs_hash(1);
    vector_db::insert_vector(&owner, vector1, ipfs_hash1);
    
    let vector2 = create_test_vector(2, 1536);
    let ipfs_hash2 = create_test_ipfs_hash(2);
    vector_db::insert_vector(&owner, vector2, ipfs_hash2);
    
    let vector3 = create_test_vector(3, 1536);
    let ipfs_hash3 = create_test_ipfs_hash(3);
    vector_db::insert_vector(&owner, vector3, ipfs_hash3);
    
    // Create a query vector (similar to vector1)
    let query_vector = vector1;
    
    // Query for similar vectors
    let results = vector_db::query_similar_vectors(OWNER, query_vector, 2);
    
    // Check the results
    assert!(vector::length(&results) == 2, 4);
    
    // The closest match should be the first vector (since it's identical to the query)
    let expected_hash1 = string::utf8(ipfs_hash1);
    assert!(*vector::borrow(&results, 0) == expected_hash1, 5);
}

#[test]
#[expected_failure(abort_code = vector_db::E_EMPTY_DATABASE)]
fun test_query_empty_database() {
    let (owner, _) = create_test_accounts();
    
    // Initialize the vector database
    vector_db::initialize(&owner);
    
    // Create a query vector
    let query_vector = create_test_vector(1, 1536);
    
    // Query against empty database (should fail)
    vector_db::query_similar_vectors(OWNER, query_vector, 2);
}
}

