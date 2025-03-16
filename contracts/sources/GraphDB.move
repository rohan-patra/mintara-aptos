module mintara::graph_db {

use std::signer;
use std::string::{Self, String};
use std::vector;
use aptos_std::table::{Self, Table};

const E_NOT_AUTHORIZED: u64 = 1;
const E_ALREADY_INITIALIZED: u64 = 2;
const E_NODE_ALREADY_EXISTS: u64 = 3;
const E_NODE_NOT_FOUND: u64 = 4;
const E_EDGE_ALREADY_EXISTS: u64 = 5;
const E_INVALID_RADIUS: u64 = 6;

struct Node has store, drop, copy {
    cid: String,
    neighbors: vector<String>,
}

struct GraphDB has key {
    owner: address,
    nodes: Table<String, Node>,
    node_count: u64,
    edge_count: u64,
}

public entry fun initialize(account: &signer) {
    let addr = signer::address_of(account);
    assert!(!exists<GraphDB>(addr), E_ALREADY_INITIALIZED);
    let nodes = table::new<String, Node>();
    move_to(account, GraphDB {
        owner: addr,
        nodes: nodes,
        node_count: 0,
        edge_count: 0,
    });
}

public entry fun add_node(
    account: &signer,
    cid: String,
) acquires GraphDB {
    let addr = signer::address_of(account);
    assert!(exists<GraphDB>(addr), E_NOT_AUTHORIZED);
    let graph_db = borrow_global_mut<GraphDB>(addr);
    if (table::contains(&graph_db.nodes, cid)) {
        return 
    };
    let node = Node {
        cid: cid,
        neighbors: vector::empty<String>(),
    };
    table::add(&mut graph_db.nodes, cid, node);
    graph_db.node_count = graph_db.node_count + 1;
}

public entry fun add_edge(
    account: &signer,
    from_cid: String,
    to_cid: String,
) acquires GraphDB {
    let addr = signer::address_of(account);
    assert!(exists<GraphDB>(addr), E_NOT_AUTHORIZED);
    let graph_db = borrow_global_mut<GraphDB>(addr);
    
    // Create from_node if it doesn't exist
    if (!table::contains(&graph_db.nodes, from_cid)) {
        let from_node = Node {
            cid: from_cid,
            neighbors: vector::empty<String>(),
        };
        table::add(&mut graph_db.nodes, from_cid, from_node);
        graph_db.node_count = graph_db.node_count + 1;
    };
    
    // Create to_node if it doesn't exist
    if (!table::contains(&graph_db.nodes, to_cid)) {
        let to_node = Node {
            cid: to_cid,
            neighbors: vector::empty<String>(),
        };
        table::add(&mut graph_db.nodes, to_cid, to_node);
        graph_db.node_count = graph_db.node_count + 1;
    };
    
    // Get the from_node and check if the edge already exists
    let from_node = table::borrow_mut(&mut graph_db.nodes, from_cid);
    let edge_exists = false;
    let i = 0;
    let len = vector::length(&from_node.neighbors);
    
    while (i < len) {
        if (*vector::borrow(&from_node.neighbors, i) == to_cid) {
            edge_exists = true;
            break
        };
        i = i + 1;
    };
    
    // If edge doesn't exist, add it
    if (!edge_exists) {
        vector::push_back(&mut from_node.neighbors, to_cid);
        graph_db.edge_count = graph_db.edge_count + 1;
    };
}

#[view]
public fun query_neighbors(
    db_owner: address,
    root_cid: String,
    radius: u64,
): vector<String> acquires GraphDB {
    assert!(exists<GraphDB>(db_owner), E_NOT_AUTHORIZED);
    assert!(radius > 0, E_INVALID_RADIUS);
    let graph_db = borrow_global<GraphDB>(db_owner);
    if (!table::contains(&graph_db.nodes, root_cid)) {
        return vector::empty<String>()
    };
    let visited = vector::empty<String>();
    let current_level = vector::empty<String>();
    let next_level = vector::empty<String>();
    let result = vector::empty<String>();
    vector::push_back(&mut current_level, root_cid);
    vector::push_back(&mut visited, root_cid);
    let current_radius = 0;
    while (current_radius < radius && !vector::is_empty(&current_level)) {
        while (!vector::is_empty(&current_level)) {
            let current_cid = vector::pop_back(&mut current_level);
            vector::push_back(&mut result, current_cid);
            let current_node = table::borrow(&graph_db.nodes, current_cid);
            let neighbors = &current_node.neighbors;
            let i = 0;
            while (i < vector::length(neighbors)) {
                let neighbor_cid = *vector::borrow(neighbors, i);
                if (!contains(&visited, &neighbor_cid)) {
                    vector::push_back(&mut visited, neighbor_cid);
                    vector::push_back(&mut next_level, neighbor_cid);
                };
                i = i + 1;
            };
        };
        current_level = next_level;
        next_level = vector::empty<String>();
        current_radius = current_radius + 1;
    };
    while (!vector::is_empty(&current_level)) {
        let cid = vector::pop_back(&mut current_level);
        vector::push_back(&mut result, cid);
    };
    if (vector::length(&result) > 1) {
        vector::remove(&mut result, 0);
        result
    } else {
        vector::empty<String>()
    }
}

fun contains(v: &vector<String>, str: &String): bool {
    let i = 0;
    let len = vector::length(v);
    while (i < len) {
        if (*vector::borrow(v, i) == *str) {
            return true
        };
        i = i + 1;
    };
    false
}

#[view]
public fun get_node_count(db_owner: address): u64 acquires GraphDB {
    assert!(exists<GraphDB>(db_owner), E_NOT_AUTHORIZED);
    let graph_db = borrow_global<GraphDB>(db_owner);
    graph_db.node_count
}

#[view]
public fun get_edge_count(db_owner: address): u64 acquires GraphDB {
    assert!(exists<GraphDB>(db_owner), E_NOT_AUTHORIZED);
    let graph_db = borrow_global<GraphDB>(db_owner);
    graph_db.edge_count
}

#[view]
public fun exists_graph_db(addr: address): bool {
    exists<GraphDB>(addr)
}

#[view]
public fun has_edge(
    db_owner: address,
    from_cid: String,
    to_cid: String,
): bool acquires GraphDB {
    assert!(exists<GraphDB>(db_owner), E_NOT_AUTHORIZED);
    let graph_db = borrow_global<GraphDB>(db_owner);
    if (!table::contains(&graph_db.nodes, from_cid)) {
        return false
    };
    let from_node = table::borrow(&graph_db.nodes, from_cid);
    let neighbors = &from_node.neighbors;
    let i = 0;
    while (i < vector::length(neighbors)) {
        if (*vector::borrow(neighbors, i) == to_cid) {
            return true
        };
        i = i + 1;
    };
    false
}
}
