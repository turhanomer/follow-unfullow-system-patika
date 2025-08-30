import { Clarinet, Tx, Chain, Account, types } from "https://deno.land/x/clarinet@v1.0.0/mod.ts";
import { assertEquals, assert } from "https://deno.land/std@0.90.0/testing/asserts.ts";

Clarinet.test({
  name: "Reputation System - User Initialization",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const user1 = accounts.get("wallet_1")!;
    const user2 = accounts.get("wallet_2")!;

    // Test successful user reputation initialization
    let block = chain.mineBlock([
      Tx.contractCall("reputation", "initialize-user-reputation", [
        types.principal(user1.address)
      ], deployer.address)
    ]);

    assertEquals(block.receipts.length, 1);
    assertEquals(block.height, 2);
    const result = block.receipts[0].result.expectOk().expectTuple();
    result["user"].expectPrincipal(user1.address);
    result["initial-score"].expectUint(50); // POINTS_FOR_PROFILE_COMPLETION
    result["tier"].expectUint(1);
    result["tier-name"].expectAscii("Newcomer");

    // Test duplicate initialization
    block = chain.mineBlock([
      Tx.contractCall("reputation", "initialize-user-reputation", [
        types.principal(user1.address)
      ], deployer.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectErr().expectUint(2001); // ERR-USER-NOT-FOUND

    // Test initialization by non-admin
    block = chain.mineBlock([
      Tx.contractCall("reputation", "initialize-user-reputation", [
        types.principal(user2.address)
      ], user1.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectOk().expectTuple(); // Should still work as it's not admin-only
  }
});

Clarinet.test({
  name: "Reputation System - Reputation Calculation",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const user1 = accounts.get("wallet_1")!;
    const user2 = accounts.get("wallet_2")!;

    // Initialize user reputation
    chain.mineBlock([
      Tx.contractCall("reputation", "initialize-user-reputation", [
        types.principal(user1.address)
      ], deployer.address)
    ]);

    // Test reputation calculation for user without follow system data
    let block = chain.mineBlock([
      Tx.contractCall("reputation", "calculate-reputation", [
        types.principal(user1.address)
      ], user1.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectOk().expectTuple();

    // Test reputation calculation for non-existent user
    block = chain.mineBlock([
      Tx.contractCall("reputation", "calculate-reputation", [
        types.principal(user2.address)
      ], user1.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectErr().expectUint(2001); // ERR-USER-NOT-FOUND
  }
});

Clarinet.test({
  name: "Reputation System - Manual Points Management",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const user1 = accounts.get("wallet_1")!;
    const user2 = accounts.get("wallet_2")!;

    // Initialize user reputation
    chain.mineBlock([
      Tx.contractCall("reputation", "initialize-user-reputation", [
        types.principal(user1.address)
      ], deployer.address)
    ]);

    // Test add points manually (admin)
    let block = chain.mineBlock([
      Tx.contractCall("reputation", "add-reputation-points-manual", [
        types.principal(user1.address),
        types.int(100),
        types.ascii("test-award")
      ], deployer.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectOk().expectTuple();

    // Test add points manually (non-admin)
    block = chain.mineBlock([
      Tx.contractCall("reputation", "add-reputation-points-manual", [
        types.principal(user1.address),
        types.int(50),
        types.ascii("test-award-2")
      ], user2.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectErr().expectUint(2003); // ERR-UNAUTHORIZED

    // Test add points to non-existent user
    block = chain.mineBlock([
      Tx.contractCall("reputation", "add-reputation-points-manual", [
        types.principal(user2.address),
        types.int(100),
        types.ascii("test-award")
      ], deployer.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectErr().expectUint(2001); // ERR-USER-NOT-FOUND

    // Test add zero points
    block = chain.mineBlock([
      Tx.contractCall("reputation", "add-reputation-points-manual", [
        types.principal(user1.address),
        types.int(0),
        types.ascii("zero-points")
      ], deployer.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectErr().expectUint(2002); // ERR-INVALID-POINTS
  }
});

Clarinet.test({
  name: "Reputation System - Event Handling",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const user1 = accounts.get("wallet_1")!;
    const user2 = accounts.get("wallet_2")!;

    // Initialize user reputation
    chain.mineBlock([
      Tx.contractCall("reputation", "initialize-user-reputation", [
        types.principal(user1.address)
      ], deployer.address),
      Tx.contractCall("reputation", "initialize-user-reputation", [
        types.principal(user2.address)
      ], deployer.address)
    ]);

    // Test handle follow event
    let block = chain.mineBlock([
      Tx.contractCall("reputation", "handle-follow-event", [
        types.principal(user1.address),
        types.principal(user2.address)
      ], deployer.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectOk().expectBool(true);

    // Test handle unfollow event
    block = chain.mineBlock([
      Tx.contractCall("reputation", "handle-unfollow-event", [
        types.principal(user1.address),
        types.principal(user2.address)
      ], deployer.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectOk().expectBool(true);

    // Test handle block event
    block = chain.mineBlock([
      Tx.contractCall("reputation", "handle-block-event", [
        types.principal(user1.address),
        types.principal(user2.address)
      ], deployer.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectOk().expectBool(true);

    // Test event handling by non-admin
    block = chain.mineBlock([
      Tx.contractCall("reputation", "handle-follow-event", [
        types.principal(user1.address),
        types.principal(user2.address)
      ], user1.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectErr().expectUint(2003); // ERR-UNAUTHORIZED
  }
});

Clarinet.test({
  name: "Reputation System - Profile Completion Bonus",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const user1 = accounts.get("wallet_1")!;

    // Initialize user reputation
    chain.mineBlock([
      Tx.contractCall("reputation", "initialize-user-reputation", [
        types.principal(user1.address)
      ], deployer.address)
    ]);

    // Test award profile completion bonus
    let block = chain.mineBlock([
      Tx.contractCall("reputation", "award-profile-completion-bonus", [
        types.principal(user1.address)
      ], user1.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectOk().expectBool(false); // Already awarded during initialization

    // Test award bonus for non-existent user
    block = chain.mineBlock([
      Tx.contractCall("reputation", "award-profile-completion-bonus", [
        types.principal(deployer.address)
      ], user1.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectErr().expectUint(2001); // ERR-USER-NOT-FOUND
  }
});

Clarinet.test({
  name: "Reputation System - Read-only Functions",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const user1 = accounts.get("wallet_1")!;
    const user2 = accounts.get("wallet_2")!;

    // Initialize user reputation
    chain.mineBlock([
      Tx.contractCall("reputation", "initialize-user-reputation", [
        types.principal(user1.address)
      ], deployer.address)
    ]);

    // Add some points
    chain.mineBlock([
      Tx.contractCall("reputation", "add-reputation-points-manual", [
        types.principal(user1.address),
        types.int(200),
        types.ascii("test-award")
      ], deployer.address)
    ]);

    // Test get user reputation
    let result = chain.callReadOnlyFn("reputation", "get-user-reputation", [
      types.principal(user1.address)
    ], user1.address);

    result.result.expectSome().expectTuple();

    // Test get reputation score
    result = chain.callReadOnlyFn("reputation", "get-reputation-score", [
      types.principal(user1.address)
    ], user1.address);

    result.result.expectUint(250); // 50 (initial) + 200 (manual) = 250

    // Test get reputation tier
    result = chain.callReadOnlyFn("reputation", "get-reputation-tier", [
      types.principal(user1.address)
    ], user1.address);

    result.result.expectUint(2); // Rising tier (100-499 points)

    // Test get tier name
    result = chain.callReadOnlyFn("reputation", "get-user-tier-name", [
      types.principal(user1.address)
    ], user1.address);

    result.result.expectAscii("Rising");

    // Test get reputation for non-existent user
    result = chain.callReadOnlyFn("reputation", "get-user-reputation", [
      types.principal(user2.address)
    ], user1.address);

    result.result.expectNone();

    // Test get reputation score for non-existent user
    result = chain.callReadOnlyFn("reputation", "get-reputation-score", [
      types.principal(user2.address)
    ], user1.address);

    result.result.expectUint(0);

    // Test get reputation tier for non-existent user
    result = chain.callReadOnlyFn("reputation", "get-reputation-tier", [
      types.principal(user2.address)
    ], user1.address);

    result.result.expectUint(1); // Default tier

    // Test get total reputation points
    result = chain.callReadOnlyFn("reputation", "get-total-reputation-points", [], user1.address);
    result.result.expectUint(250);

    // Test get reputation stats
    result = chain.callReadOnlyFn("reputation", "get-reputation-stats", [], user1.address);
    result.result.expectTuple();

    // Test get tier thresholds
    result = chain.callReadOnlyFn("reputation", "get-tier-thresholds", [], user1.address);
    result.result.expectTuple();

    // Test get point values
    result = chain.callReadOnlyFn("reputation", "get-point-values", [], user1.address);
    result.result.expectTuple();
  }
});

Clarinet.test({
  name: "Reputation System - Tier Progression",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const user1 = accounts.get("wallet_1")!;

    // Initialize user reputation
    chain.mineBlock([
      Tx.contractCall("reputation", "initialize-user-reputation", [
        types.principal(user1.address)
      ], deployer.address)
    ]);

    // Test Newcomer tier (0-99 points)
    let result = chain.callReadOnlyFn("reputation", "get-reputation-tier", [
      types.principal(user1.address)
    ], user1.address);
    result.result.expectUint(1);

    result = chain.callReadOnlyFn("reputation", "get-user-tier-name", [
      types.principal(user1.address)
    ], user1.address);
    result.result.expectAscii("Newcomer");

    // Add points to reach Rising tier (100-499 points)
    chain.mineBlock([
      Tx.contractCall("reputation", "add-reputation-points-manual", [
        types.principal(user1.address),
        types.int(100),
        types.ascii("rising-tier")
      ], deployer.address)
    ]);

    result = chain.callReadOnlyFn("reputation", "get-reputation-tier", [
      types.principal(user1.address)
    ], user1.address);
    result.result.expectUint(2);

    result = chain.callReadOnlyFn("reputation", "get-user-tier-name", [
      types.principal(user1.address)
    ], user1.address);
    result.result.expectAscii("Rising");

    // Add points to reach Popular tier (500-999 points)
    chain.mineBlock([
      Tx.contractCall("reputation", "add-reputation-points-manual", [
        types.principal(user1.address),
        types.int(400),
        types.ascii("popular-tier")
      ], deployer.address)
    ]);

    result = chain.callReadOnlyFn("reputation", "get-reputation-tier", [
      types.principal(user1.address)
    ], user1.address);
    result.result.expectUint(3);

    result = chain.callReadOnlyFn("reputation", "get-user-tier-name", [
      types.principal(user1.address)
    ], user1.address);
    result.result.expectAscii("Popular");

    // Add points to reach Influencer tier (1000-4999 points)
    chain.mineBlock([
      Tx.contractCall("reputation", "add-reputation-points-manual", [
        types.principal(user1.address),
        types.int(500),
        types.ascii("influencer-tier")
      ], deployer.address)
    ]);

    result = chain.callReadOnlyFn("reputation", "get-reputation-tier", [
      types.principal(user1.address)
    ], user1.address);
    result.result.expectUint(4);

    result = chain.callReadOnlyFn("reputation", "get-user-tier-name", [
      types.principal(user1.address)
    ], user1.address);
    result.result.expectAscii("Influencer");

    // Add points to reach Legendary tier (5000+ points)
    chain.mineBlock([
      Tx.contractCall("reputation", "add-reputation-points-manual", [
        types.principal(user1.address),
        types.int(4000),
        types.ascii("legendary-tier")
      ], deployer.address)
    ]);

    result = chain.callReadOnlyFn("reputation", "get-reputation-tier", [
      types.principal(user1.address)
    ], user1.address);
    result.result.expectUint(5);

    result = chain.callReadOnlyFn("reputation", "get-user-tier-name", [
      types.principal(user1.address)
    ], user1.address);
    result.result.expectAscii("Legendary");
  }
});

Clarinet.test({
  name: "Reputation System - Point Deductions",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const user1 = accounts.get("wallet_1")!;

    // Initialize user reputation
    chain.mineBlock([
      Tx.contractCall("reputation", "initialize-user-reputation", [
        types.principal(user1.address)
      ], deployer.address)
    ]);

    // Add some points first
    chain.mineBlock([
      Tx.contractCall("reputation", "add-reputation-points-manual", [
        types.principal(user1.address),
        types.int(100),
        types.ascii("initial-points")
      ], deployer.address)
    ]);

    // Test point deduction
    let block = chain.mineBlock([
      Tx.contractCall("reputation", "add-reputation-points-manual", [
        types.principal(user1.address),
        types.int(-20),
        types.ascii("point-deduction")
      ], deployer.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectOk().expectTuple();

    // Verify score decreased
    let result = chain.callReadOnlyFn("reputation", "get-reputation-score", [
      types.principal(user1.address)
    ], user1.address);
    result.result.expectUint(130); // 50 (initial) + 100 (added) - 20 (deducted) = 130

    // Test large deduction that would go below zero
    block = chain.mineBlock([
      Tx.contractCall("reputation", "add-reputation-points-manual", [
        types.principal(user1.address),
        types.int(-200),
        types.ascii("large-deduction")
      ], deployer.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectOk().expectTuple();

    // Verify score doesn't go below zero
    result = chain.callReadOnlyFn("reputation", "get-reputation-score", [
      types.principal(user1.address)
    ], user1.address);
    result.result.expectUint(0);

    // Verify tier is reset to Newcomer
    result = chain.callReadOnlyFn("reputation", "get-reputation-tier", [
      types.principal(user1.address)
    ], user1.address);
    result.result.expectUint(1);

    result = chain.callReadOnlyFn("reputation", "get-user-tier-name", [
      types.principal(user1.address)
    ], user1.address);
    result.result.expectAscii("Newcomer");
  }
});

Clarinet.test({
  name: "Reputation System - History and Events",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const user1 = accounts.get("wallet_1")!;

    // Initialize user reputation
    chain.mineBlock([
      Tx.contractCall("reputation", "initialize-user-reputation", [
        types.principal(user1.address)
      ], deployer.address)
    ]);

    // Add points to create history
    chain.mineBlock([
      Tx.contractCall("reputation", "add-reputation-points-manual", [
        types.principal(user1.address),
        types.int(100),
        types.ascii("history-test")
      ], deployer.address)
    ]);

    // Test get reputation history
    let result = chain.callReadOnlyFn("reputation", "get-reputation-history", [
      types.principal(user1.address),
      types.uint(10)
    ], user1.address);

    result.result.expectList();

    // Test get reputation events
    result = chain.callReadOnlyFn("reputation", "get-reputation-events", [
      types.principal(user1.address),
      types.uint(10)
    ], user1.address);

    result.result.expectList();

    // Test history for non-existent user
    result = chain.callReadOnlyFn("reputation", "get-reputation-history", [
      types.principal(deployer.address),
      types.uint(10)
    ], user1.address);

    result.result.expectList();

    // Test events for non-existent user
    result = chain.callReadOnlyFn("reputation", "get-reputation-events", [
      types.principal(deployer.address),
      types.uint(10)
    ], user1.address);

    result.result.expectList();
  }
});

Clarinet.test({
  name: "Reputation System - Admin Functions",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const user1 = accounts.get("wallet_1")!;
    const user2 = accounts.get("wallet_2")!;

    // Initialize user reputation
    chain.mineBlock([
      Tx.contractCall("reputation", "initialize-user-reputation", [
        types.principal(user1.address)
      ], deployer.address)
    ]);

    // Test update point values (non-admin)
    let block = chain.mineBlock([
      Tx.contractCall("reputation", "update-point-values", [
        types.uint(15),
        types.uint(2),
        types.uint(10),
        types.uint(100),
        types.int(-3),
        types.int(-10)
      ], user2.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectErr().expectUint(2003); // ERR-UNAUTHORIZED

    // Test update point values (admin)
    block = chain.mineBlock([
      Tx.contractCall("reputation", "update-point-values", [
        types.uint(15),
        types.uint(2),
        types.uint(10),
        types.uint(100),
        types.int(-3),
        types.int(-10)
      ], deployer.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectOk().expectAscii("Point value updates not yet implemented");

    // Test reset user reputation (non-admin)
    block = chain.mineBlock([
      Tx.contractCall("reputation", "reset-user-reputation", [
        types.principal(user1.address)
      ], user2.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectErr().expectUint(2003); // ERR-UNAUTHORIZED

    // Test reset user reputation (admin)
    block = chain.mineBlock([
      Tx.contractCall("reputation", "reset-user-reputation", [
        types.principal(user1.address)
      ], deployer.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectOk().expectTuple();

    // Test reset non-existent user reputation
    block = chain.mineBlock([
      Tx.contractCall("reputation", "reset-user-reputation", [
        types.principal(user2.address)
      ], deployer.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectErr().expectUint(2001); // ERR-USER-NOT-FOUND
  }
}); 