#[test_only]
module mintara::graph_db_tests {

use std::string::{Self, String};
use std::vector;
use std::signer;
use aptos_framework::account;

use mintara::graph_db;

/// Test addresses
const OWNER: address = @mintara;
const USER1: address = @0x456;

/// Helper function to create test CIDs
fun create_test_cid(id: u64): vector<u8> {
    // Example CID format: bafy + some characters
    let prefix = b"bafy";
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
    
    // Initialize the graph database
    graph_db::initialize(&owner);
    
    // Check that initialization was successful
    assert!(graph_db::exists_graph_db(OWNER), 0);
    assert!(graph_db::get_node_count(OWNER) == 0, 1);
    assert!(graph_db::get_edge_count(OWNER) == 0, 2);
}

#[test]
#[expected_failure(abort_code = graph_db::E_ALREADY_INITIALIZED)]
fun test_double_initialization() {
    let (owner, _) = create_test_accounts();
    
    // Initialize the graph database
    graph_db::initialize(&owner);
    
    // Try to initialize again (should fail)
    graph_db::initialize(&owner);
}

#[test]
fun test_add_node() {
    let (owner, _) = create_test_accounts();
    
    // Initialize the graph database
    graph_db::initialize(&owner);
    
    // Create a test CID
    let cid = create_test_cid(1);
    
    // Add the node
    graph_db::add_node(&owner, cid);
    
    // Check that the node was added
    assert!(graph_db::get_node_count(OWNER) == 1, 3);
}

#[test]
fun test_add_node_idempotent() {
    let (owner, _) = create_test_accounts();
    
    // Initialize the graph database
    graph_db::initialize(&owner);
    
    // Create a test CID
    let cid = create_test_cid(1);
    
    // Add the node twice
    graph_db::add_node(&owner, cid);
    graph_db::add_node(&owner, cid);
    
    // Check that the node was added only once
    assert!(graph_db::get_node_count(OWNER) == 1, 4);
}

#[test]
#[expected_failure(abort_code = graph_db::E_NOT_AUTHORIZED)]
fun test_unauthorized_add_node() {
    let (owner, user1) = create_test_accounts();
    
    // Initialize the graph database
    graph_db::initialize(&owner);
    
    // Create a test CID
    let cid = create_test_cid(1);
    
    // Try to add node as unauthorized user (should fail)
    graph_db::add_node(&user1, cid);
}

#[test]
fun test_add_edge() {
    let (owner, _) = create_test_accounts();
    
    // Initialize the graph database
    graph_db::initialize(&owner);
    
    // Create test CIDs
    let cid1 = create_test_cid(1);
    let cid2 = create_test_cid(2);
    
    // Add nodes
    graph_db::add_node(&owner, cid1);
    graph_db::add_node(&owner, cid2);
    
    // Add edge
    graph_db::add_edge(&owner, cid1, cid2);
    
    // Check that the edge was added
    assert!(graph_db::get_edge_count(OWNER) == 1, 5);
    assert!(graph_db::has_edge(OWNER, cid1, cid2), 6);
}

#[test]
fun test_add_edge_with_implicit_nodes() {
    let (owner, _) = create_test_accounts();
    
    // Initialize the graph database
    graph_db::initialize(&owner);
    
    // Create test CIDs
    let cid1 = create_test_cid(1);
    let cid2 = create_test_cid(2);
    
    // Add edge directly (should implicitly create nodes)
    graph_db::add_edge(&owner, cid1, cid2);
    
    // Check that the nodes and edge were added
    assert!(graph_db::get_node_count(OWNER) == 2, 7);
    assert!(graph_db::get_edge_count(OWNER) == 1, 8);
    assert!(graph_db::has_edge(OWNER, cid1, cid2), 9);
}

#[test]
fun test_idempotent_edge_addition() {
    let (owner, _) = create_test_accounts();
    
    // Initialize the graph database
    graph_db::initialize(&owner);
    
    // Create test CIDs
    let cid1 = create_test_cid(1);
    let cid2 = create_test_cid(2);
    
    // Add edge twice
    graph_db::add_edge(&owner, cid1, cid2);
    graph_db::add_edge(&owner, cid1, cid2);
    
    // Check that the edge was added only once
    assert!(graph_db::get_edge_count(OWNER) == 1, 10);
}

#[test]
#[expected_failure(abort_code = graph_db::E_NOT_AUTHORIZED)]
fun test_unauthorized_add_edge() {
    let (owner, user1) = create_test_accounts();
    
    // Initialize the graph database
    graph_db::initialize(&owner);
    
    // Create test CIDs
    let cid1 = create_test_cid(1);
    let cid2 = create_test_cid(2);
    
    // Try to add edge as unauthorized user (should fail)
    graph_db::add_edge(&user1, cid1, cid2);
}

#[test]
fun test_query_neighbors_radius_1() {
    let (owner, _) = create_test_accounts();
    
    // Initialize the graph database
    graph_db::initialize(&owner);
    
    // Create a simple graph:
    // cid1 -> cid2 -> cid3
    //  |       |
    //  v       v
    // cid4    cid5
    
    let cid1 = create_test_cid(1);
    let cid2 = create_test_cid(2);
    let cid3 = create_test_cid(3);
    let cid4 = create_test_cid(4);
    let cid5 = create_test_cid(5);
    
    graph_db::add_edge(&owner, cid1, cid2);
    graph_db::add_edge(&owner, cid1, cid4);
    graph_db::add_edge(&owner, cid2, cid3);
    graph_db::add_edge(&owner, cid2, cid5);
    
    // Query for radius 1 from cid1
    let results = graph_db::query_neighbors(OWNER, cid1, 1);
    
    // Check the results - should include cid2 and cid4
    assert!(vector::length(&results) == 2, 11);
    
    // The results should contain cid2 and cid4
    let cid2_str = string::utf8(cid2);
    let cid4_str = string::utf8(cid4);
    
    let has_cid2 = false;
    let has_cid4 = false;
    
    let i = 0;
    while (i < vector::length(&results)) {
        let result = vector::borrow(&results, i);
        if (*result == cid2_str) {
            has_cid2 = true;
        };
        if (*result == cid4_str) {
            has_cid4 = true;
        };
        i = i + 1;
    };
    
    assert!(has_cid2, 12);
    assert!(has_cid4, 13);
}

#[test]
fun test_query_neighbors_radius_2() {
    let (owner, _) = create_test_accounts();
    
    // Initialize the graph database
    graph_db::initialize(&owner);
    
    // Create a simple graph:
    // cid1 -> cid2 -> cid3
    //  |       |
    //  v       v
    // cid4    cid5
    
    let cid1 = create_test_cid(1);
    let cid2 = create_test_cid(2);
    let cid3 = create_test_cid(3);
    let cid4 = create_test_cid(4);
    let cid5 = create_test_cid(5);
    
    graph_db::add_edge(&owner, cid1, cid2);
    graph_db::add_edge(&owner, cid1, cid4);
    graph_db::add_edge(&owner, cid2, cid3);
    graph_db::add_edge(&owner, cid2, cid5);
    
    // Query for radius 2 from cid1
    let results = graph_db::query_neighbors(OWNER, cid1, 2);
    
    // Check the results - should include cid2, cid3, cid4, and cid5
    assert!(vector::length(&results) == 4, 14);
    
    // The results should contain all 4 nodes
    let cid2_str = string::utf8(cid2);
    let cid3_str = string::utf8(cid3);
    let cid4_str = string::utf8(cid4);
    let cid5_str = string::utf8(cid5);
    
    let has_cid2 = false;
    let has_cid3 = false;
    let has_cid4 = false;
    let has_cid5 = false;
    
    let i = 0;
    while (i < vector::length(&results)) {
        let result = vector::borrow(&results, i);
        if (*result == cid2_str) {
            has_cid2 = true;
        };
        if (*result == cid3_str) {
            has_cid3 = true;
        };
        if (*result == cid4_str) {
            has_cid4 = true;
        };
        if (*result == cid5_str) {
            has_cid5 = true;
        };
        i = i + 1;
    };
    
    assert!(has_cid2, 15);
    assert!(has_cid3, 16);
    assert!(has_cid4, 17);
    assert!(has_cid5, 18);
}

#[test]
fun test_query_non_existent_node() {
    let (owner, _) = create_test_accounts();
    
    // Initialize the graph database
    graph_db::initialize(&owner);
    
    // Add some nodes and edges
    let cid1 = create_test_cid(1);
    let cid2 = create_test_cid(2);
    graph_db::add_edge(&owner, cid1, cid2);
    
    // Query for a non-existent node
    let non_existent_cid = create_test_cid(99);
    let results = graph_db::query_neighbors(OWNER, non_existent_cid, 1);
    
    // Should return empty results
    assert!(vector::length(&results) == 0, 19);
}

#[test]
#[expected_failure(abort_code = graph_db::E_INVALID_RADIUS)]
fun test_query_invalid_radius() {
    let (owner, _) = create_test_accounts();
    
    // Initialize the graph database
    graph_db::initialize(&owner);
    
    // Add some nodes
    let cid = create_test_cid(1);
    graph_db::add_node(&owner, cid);
    
    // Query with radius 0 (invalid)
    graph_db::query_neighbors(OWNER, cid, 0);
}

#[test]
fun test_query_disconnected_node() {
    let (owner, _) = create_test_accounts();
    
    // Initialize the graph database
    graph_db::initialize(&owner);
    
    // Add a node with no connections
    let cid = create_test_cid(1);
    graph_db::add_node(&owner, cid);
    
    // Query for neighbors
    let results = graph_db::query_neighbors(OWNER, cid, 1);
    
    // Should return empty results
    assert!(vector::length(&results) == 0, 20);
}

#[test]
fun test_cyclic_graph() {
    let (owner, _) = create_test_accounts();
    
    // Initialize the graph database
    graph_db::initialize(&owner);
    
    // Create a cyclic graph:
    // cid1 -> cid2 -> cid3 -> cid1
    
    let cid1 = create_test_cid(1);
    let cid2 = create_test_cid(2);
    let cid3 = create_test_cid(3);
    
    graph_db::add_edge(&owner, cid1, cid2);
    graph_db::add_edge(&owner, cid2, cid3);
    graph_db::add_edge(&owner, cid3, cid1);
    
    // Query for radius 3 from cid1
    let results = graph_db::query_neighbors(OWNER, cid1, 3);
    
    // Should find cid2 and cid3 (no duplicates)
    assert!(vector::length(&results) == 2, 21);
    
    let cid2_str = string::utf8(cid2);
    let cid3_str = string::utf8(cid3);
    
    let has_cid2 = false;
    let has_cid3 = false;
    
    let i = 0;
    while (i < vector::length(&results)) {
        let result = vector::borrow(&results, i);
        if (*result == cid2_str) {
            has_cid2 = true;
        };
        if (*result == cid3_str) {
            has_cid3 = true;
        };
        i = i + 1;
    };
    
    assert!(has_cid2, 22);
    assert!(has_cid3, 23);
}
} 