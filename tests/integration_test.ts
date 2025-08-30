import { Clarinet, Tx, Chain, Account, types } from "https://deno.land/x/clarinet@v1.0.0/mod.ts";
import { assertEquals, assert } from "https://deno.land/std@0.90.0/testing/asserts.ts";

Clarinet.test({
  name: "Integration - Complete User Registration and Setup",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const user1 = accounts.get("wallet_1")!;
    const user2 = accounts.get("wallet_2")!;

    // Step 1: Register user in follow system
    let block = chain.mineBlock([
      Tx.contractCall("follow-system", "register-user", [
        types.ascii("alice"),
        types.utf8("Alice Johnson"),
        types.utf8("Blockchain enthusiast"),
        types.ascii("https://example.com/avatar1.jpg"),
        types.bool(false)
      ], user1.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectOk().expectTuple();

    // Step 2: Initialize user reputation
    block = chain.mineBlock([
      Tx.contractCall("reputation", "initialize-user-reputation", [
        types.principal(user1.address)
      ], deployer.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectOk().expectTuple();

    // Step 3: Set up privacy settings
    block = chain.mineBlock([
      Tx.contractCall("privacy", "set-privacy-settings", [
        types.uint(2), // PRIVACY_LEVEL_FOLLOWERS_ONLY
        types.bool(true),
        types.bool(true),
        types.bool(true),
        types.bool(true),
        types.bool(true),
        types.bool(false)
      ], user1.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectOk().expectTuple();

    // Verify all systems are properly set up
    let result = chain.callReadOnlyFn("follow-system", "get-user-profile", [
      types.principal(user1.address)
    ], user1.address);
    result.result.expectSome().expectTuple();

    result = chain.callReadOnlyFn("reputation", "get-user-reputation", [
      types.principal(user1.address)
    ], user1.address);
    result.result.expectSome().expectTuple();

    result = chain.callReadOnlyFn("privacy", "get-user-privacy-settings", [
      types.principal(user1.address)
    ], user1.address);
    result.result.expectSome().expectTuple();

    // Verify initial reputation score
    result = chain.callReadOnlyFn("reputation", "get-reputation-score", [
      types.principal(user1.address)
    ], user1.address);
    result.result.expectUint(50); // Initial profile completion bonus
  }
});

Clarinet.test({
  name: "Integration - Follow/Unfollow with Reputation and Privacy",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const user1 = accounts.get("wallet_1")!;
    const user2 = accounts.get("wallet_2")!;

    // Set up both users completely
    chain.mineBlock([
      // Register users
      Tx.contractCall("follow-system", "register-user", [
        types.ascii("alice"),
        types.utf8("Alice Johnson"),
        types.utf8("Blockchain enthusiast"),
        types.ascii("https://example.com/avatar1.jpg"),
        types.bool(false)
      ], user1.address),
      Tx.contractCall("follow-system", "register-user", [
        types.ascii("bob"),
        types.utf8("Bob Smith"),
        types.utf8("Developer"),
        types.ascii("https://example.com/avatar2.jpg"),
        types.bool(false)
      ], user2.address),
      // Initialize reputation
      Tx.contractCall("reputation", "initialize-user-reputation", [
        types.principal(user1.address)
      ], deployer.address),
      Tx.contractCall("reputation", "initialize-user-reputation", [
        types.principal(user2.address)
      ], deployer.address),
      // Set privacy settings
      Tx.contractCall("privacy", "set-privacy-settings", [
        types.uint(1), // PRIVACY_LEVEL_PUBLIC
        types.bool(true),
        types.bool(true),
        types.bool(true),
        types.bool(true),
        types.bool(true),
        types.bool(false)
      ], user1.address),
      Tx.contractCall("privacy", "set-privacy-settings", [
        types.uint(2), // PRIVACY_LEVEL_FOLLOWERS_ONLY
        types.bool(true),
        types.bool(true),
        types.bool(true),
        types.bool(true),
        types.bool(true),
        types.bool(false)
      ], user2.address)
    ]);

    // Test follow operation
    let block = chain.mineBlock([
      Tx.contractCall("follow-system", "follow-user", [
        types.principal(user2.address)
      ], user1.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectOk().expectTuple();

    // Verify follow relationship
    let result = chain.callReadOnlyFn("follow-system", "is-user-following", [
      types.principal(user1.address),
      types.principal(user2.address)
    ], user1.address);
    result.result.expectSome().expectUint();

    // Verify follower counts
    result = chain.callReadOnlyFn("follow-system", "get-follower-count", [
      types.principal(user2.address)
    ], user1.address);
    result.result.expectUint(1);

    result = chain.callReadOnlyFn("follow-system", "get-following-count", [
      types.principal(user1.address)
    ], user1.address);
    result.result.expectUint(1);

    // Verify reputation points were awarded
    result = chain.callReadOnlyFn("reputation", "get-reputation-score", [
      types.principal(user2.address)
    ], user1.address);
    result.result.expectUint(60); // 50 (initial) + 10 (follower)

    // Test privacy access for followers-only account
    result = chain.callReadOnlyFn("privacy", "can-access-profile", [
      types.principal(user1.address),
      types.principal(user2.address)
    ], user1.address);
    result.result.expectOk().expectBool(true); // Should have access as follower

    // Test unfollow operation
    block = chain.mineBlock([
      Tx.contractCall("follow-system", "unfollow-user", [
        types.principal(user2.address)
      ], user1.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectOk().expectTuple();

    // Verify follower counts decreased
    result = chain.callReadOnlyFn("follow-system", "get-follower-count", [
      types.principal(user2.address)
    ], user1.address);
    result.result.expectUint(0);

    result = chain.callReadOnlyFn("follow-system", "get-following-count", [
      types.principal(user1.address)
    ], user1.address);
    result.result.expectUint(0);

    // Verify reputation points were deducted
    result = chain.callReadOnlyFn("reputation", "get-reputation-score", [
      types.principal(user2.address)
    ], user1.address);
    result.result.expectUint(58); // 60 - 2 (unfollow deduction)

    // Test privacy access denied after unfollow
    result = chain.callReadOnlyFn("privacy", "can-access-profile", [
      types.principal(user1.address),
      types.principal(user2.address)
    ], user1.address);
    result.result.expectOk().expectBool(false); // Should be denied as non-follower
  }
});

Clarinet.test({
  name: "Integration - Private Account Follow Requests",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const user1 = accounts.get("wallet_1")!;
    const user2 = accounts.get("wallet_2")!;

    // Set up users
    chain.mineBlock([
      // Register users
      Tx.contractCall("follow-system", "register-user", [
        types.ascii("alice"),
        types.utf8("Alice Johnson"),
        types.utf8("Blockchain enthusiast"),
        types.ascii("https://example.com/avatar1.jpg"),
        types.bool(false)
      ], user1.address),
      Tx.contractCall("follow-system", "register-user", [
        types.ascii("bob"),
        types.utf8("Bob Smith"),
        types.utf8("Developer"),
        types.ascii("https://example.com/avatar2.jpg"),
        types.bool(true) // Private account
      ], user2.address),
      // Initialize reputation
      Tx.contractCall("reputation", "initialize-user-reputation", [
        types.principal(user1.address)
      ], deployer.address),
      Tx.contractCall("reputation", "initialize-user-reputation", [
        types.principal(user2.address)
      ], deployer.address),
      // Set privacy settings
      Tx.contractCall("privacy", "set-privacy-settings", [
        types.uint(1), // PRIVACY_LEVEL_PUBLIC
        types.bool(true),
        types.bool(true),
        types.bool(true),
        types.bool(true),
        types.bool(true),
        types.bool(false)
      ], user1.address),
      Tx.contractCall("privacy", "set-privacy-settings", [
        types.uint(3), // PRIVACY_LEVEL_PRIVATE
        types.bool(true),
        types.bool(false),
        types.bool(false),
        types.bool(false),
        types.bool(false),
        types.bool(false)
      ], user2.address)
    ]);

    // Test follow request for private account
    let block = chain.mineBlock([
      Tx.contractCall("follow-system", "follow-user", [
        types.principal(user2.address)
      ], user1.address)
    ]);

    assertEquals(block.receipts.length, 1);
    const result = block.receipts[0].result.expectOk().expectTuple();
    result["status"].expectAscii("request-sent");

    // Verify no follow relationship yet
    let followResult = chain.callReadOnlyFn("follow-system", "is-user-following", [
      types.principal(user1.address),
      types.principal(user2.address)
    ], user1.address);
    followResult.result.expectNone();

    // Verify no reputation points yet
    let reputationResult = chain.callReadOnlyFn("reputation", "get-reputation-score", [
      types.principal(user2.address)
    ], user1.address);
    reputationResult.result.expectUint(50); // Still initial score

    // Test approve follow request
    block = chain.mineBlock([
      Tx.contractCall("follow-system", "approve-follow-request", [
        types.principal(user1.address)
      ], user2.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectOk().expectTuple();

    // Verify follow relationship established
    followResult = chain.callReadOnlyFn("follow-system", "is-user-following", [
      types.principal(user1.address),
      types.principal(user2.address)
    ], user1.address);
    followResult.result.expectSome().expectUint();

    // Verify reputation points awarded
    reputationResult = chain.callReadOnlyFn("reputation", "get-reputation-score", [
      types.principal(user2.address)
    ], user1.address);
    reputationResult.result.expectUint(60); // 50 + 10 (follower)

    // Test privacy access for private account
    let privacyResult = chain.callReadOnlyFn("privacy", "can-access-profile", [
      types.principal(user1.address),
      types.principal(user2.address)
    ], user1.address);
    privacyResult.result.expectOk().expectBool(false); // Still denied due to privacy settings

    // Add user1 to whitelist
    block = chain.mineBlock([
      Tx.contractCall("privacy", "add-to-whitelist", [
        types.principal(user1.address)
      ], user2.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectOk().expectTuple();

    // Now should have access
    privacyResult = chain.callReadOnlyFn("privacy", "can-access-profile", [
      types.principal(user1.address),
      types.principal(user2.address)
    ], user1.address);
    privacyResult.result.expectOk().expectBool(false); // Still false because show-profile-to-public is false

    // Update privacy settings to show profile
    block = chain.mineBlock([
      Tx.contractCall("privacy", "set-privacy-settings", [
        types.uint(3), // PRIVACY_LEVEL_PRIVATE
        types.bool(true),
        types.bool(false),
        types.bool(false),
        types.bool(true), // show-profile-to-public
        types.bool(false),
        types.bool(false)
      ], user2.address)
    ]);

    // Now should have access
    privacyResult = chain.callReadOnlyFn("privacy", "can-access-profile", [
      types.principal(user1.address),
      types.principal(user2.address)
    ], user1.address);
    privacyResult.result.expectOk().expectBool(true);
  }
});

Clarinet.test({
  name: "Integration - Block/Unblock with Reputation Impact",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const user1 = accounts.get("wallet_1")!;
    const user2 = accounts.get("wallet_2")!;

    // Set up users
    chain.mineBlock([
      // Register users
      Tx.contractCall("follow-system", "register-user", [
        types.ascii("alice"),
        types.utf8("Alice Johnson"),
        types.utf8("Blockchain enthusiast"),
        types.ascii("https://example.com/avatar1.jpg"),
        types.bool(false)
      ], user1.address),
      Tx.contractCall("follow-system", "register-user", [
        types.ascii("bob"),
        types.utf8("Bob Smith"),
        types.utf8("Developer"),
        types.ascii("https://example.com/avatar2.jpg"),
        types.bool(false)
      ], user2.address),
      // Initialize reputation
      Tx.contractCall("reputation", "initialize-user-reputation", [
        types.principal(user1.address)
      ], deployer.address),
      Tx.contractCall("reputation", "initialize-user-reputation", [
        types.principal(user2.address)
      ], deployer.address),
      // Set privacy settings
      Tx.contractCall("privacy", "set-privacy-settings", [
        types.uint(1), // PRIVACY_LEVEL_PUBLIC
        types.bool(true),
        types.bool(true),
        types.bool(true),
        types.bool(true),
        types.bool(true),
        types.bool(false)
      ], user1.address),
      Tx.contractCall("privacy", "set-privacy-settings", [
        types.uint(1), // PRIVACY_LEVEL_PUBLIC
        types.bool(true),
        types.bool(true),
        types.bool(true),
        types.bool(true),
        types.bool(true),
        types.bool(false)
      ], user2.address)
    ]);

    // Establish follow relationship
    chain.mineBlock([
      Tx.contractCall("follow-system", "follow-user", [
        types.principal(user2.address)
      ], user1.address),
      Tx.contractCall("follow-system", "follow-user", [
        types.principal(user1.address)
      ], user2.address)
    ]);

    // Verify initial state
    let result = chain.callReadOnlyFn("follow-system", "get-follower-count", [
      types.principal(user1.address)
    ], user1.address);
    result.result.expectUint(1);

    result = chain.callReadOnlyFn("follow-system", "get-follower-count", [
      types.principal(user2.address)
    ], user1.address);
    result.result.expectUint(1);

    result = chain.callReadOnlyFn("reputation", "get-reputation-score", [
      types.principal(user1.address)
    ], user1.address);
    result.result.expectUint(60); // 50 + 10 (follower)

    result = chain.callReadOnlyFn("reputation", "get-reputation-score", [
      types.principal(user2.address)
    ], user1.address);
    result.result.expectUint(60); // 50 + 10 (follower)

    // Test block operation
    let block = chain.mineBlock([
      Tx.contractCall("follow-system", "block-user", [
        types.principal(user2.address)
      ], user1.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectOk().expectTuple();

    // Verify follow relationships removed
    result = chain.callReadOnlyFn("follow-system", "get-follower-count", [
      types.principal(user1.address)
    ], user1.address);
    result.result.expectUint(0);

    result = chain.callReadOnlyFn("follow-system", "get-follower-count", [
      types.principal(user2.address)
    ], user1.address);
    result.result.expectUint(0);

    // Verify reputation points deducted
    result = chain.callReadOnlyFn("reputation", "get-reputation-score", [
      types.principal(user2.address)
    ], user1.address);
    result.result.expectUint(55); // 60 - 5 (block deduction)

    // Verify privacy access denied
    result = chain.callReadOnlyFn("privacy", "can-access-profile", [
      types.principal(user1.address),
      types.principal(user2.address)
    ], user1.address);
    result.result.expectOk().expectBool(false);

    // Test unblock operation
    block = chain.mineBlock([
      Tx.contractCall("follow-system", "unblock-user", [
        types.principal(user2.address)
      ], user1.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectOk().expectTuple();

    // Verify privacy access restored
    result = chain.callReadOnlyFn("privacy", "can-access-profile", [
      types.principal(user1.address),
      types.principal(user2.address)
    ], user1.address);
    result.result.expectOk().expectBool(true);
  }
});

Clarinet.test({
  name: "Integration - Reputation Tier Progression",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const user1 = accounts.get("wallet_1")!;
    const user2 = accounts.get("wallet_2")!;
    const user3 = accounts.get("wallet_3")!;
    const user4 = accounts.get("wallet_4")!;
    const user5 = accounts.get("wallet_5")!;

    // Set up users
    chain.mineBlock([
      // Register users
      Tx.contractCall("follow-system", "register-user", [
        types.ascii("alice"),
        types.utf8("Alice Johnson"),
        types.utf8("Blockchain enthusiast"),
        types.ascii("https://example.com/avatar1.jpg"),
        types.bool(false)
      ], user1.address),
      Tx.contractCall("follow-system", "register-user", [
        types.ascii("bob"),
        types.utf8("Bob Smith"),
        types.utf8("Developer"),
        types.ascii("https://example.com/avatar2.jpg"),
        types.bool(false)
      ], user2.address),
      Tx.contractCall("follow-system", "register-user", [
        types.ascii("charlie"),
        types.utf8("Charlie Brown"),
        types.utf8("Designer"),
        types.ascii("https://example.com/avatar3.jpg"),
        types.bool(false)
      ], user3.address),
      Tx.contractCall("follow-system", "register-user", [
        types.ascii("david"),
        types.utf8("David Wilson"),
        types.utf8("Artist"),
        types.ascii("https://example.com/avatar4.jpg"),
        types.bool(false)
      ], user4.address),
      Tx.contractCall("follow-system", "register-user", [
        types.ascii("eve"),
        types.utf8("Eve Davis"),
        types.utf8("Writer"),
        types.ascii("https://example.com/avatar5.jpg"),
        types.bool(false)
      ], user5.address),
      // Initialize reputation
      Tx.contractCall("reputation", "initialize-user-reputation", [
        types.principal(user1.address)
      ], deployer.address),
      Tx.contractCall("reputation", "initialize-user-reputation", [
        types.principal(user2.address)
      ], deployer.address),
      Tx.contractCall("reputation", "initialize-user-reputation", [
        types.principal(user3.address)
      ], deployer.address),
      Tx.contractCall("reputation", "initialize-user-reputation", [
        types.principal(user4.address)
      ], deployer.address),
      Tx.contractCall("reputation", "initialize-user-reputation", [
        types.principal(user5.address)
      ], deployer.address)
    ]);

    // Verify initial tier
    let result = chain.callReadOnlyFn("reputation", "get-reputation-tier", [
      types.principal(user1.address)
    ], user1.address);
    result.result.expectUint(1); // Newcomer

    result = chain.callReadOnlyFn("reputation", "get-user-tier-name", [
      types.principal(user1.address)
    ], user1.address);
    result.result.expectAscii("Newcomer");

    // Add followers to progress through tiers
    chain.mineBlock([
      Tx.contractCall("follow-system", "follow-user", [
        types.principal(user1.address)
      ], user2.address),
      Tx.contractCall("follow-system", "follow-user", [
        types.principal(user1.address)
      ], user3.address),
      Tx.contractCall("follow-system", "follow-user", [
        types.principal(user1.address)
      ], user4.address),
      Tx.contractCall("follow-system", "follow-user", [
        types.principal(user1.address)
      ], user5.address)
    ]);

    // Verify Rising tier (100+ points)
    result = chain.callReadOnlyFn("reputation", "get-reputation-score", [
      types.principal(user1.address)
    ], user1.address);
    result.result.expectUint(90); // 50 + (4 * 10) = 90

    // Add more followers to reach Popular tier
    for (let i = 0; i < 6; i++) {
      chain.mineBlock([
        Tx.contractCall("follow-system", "follow-user", [
          types.principal(user1.address)
        ], deployer.address)
      ]);
    }

    result = chain.callReadOnlyFn("reputation", "get-reputation-score", [
      types.principal(user1.address)
    ], user1.address);
    result.result.expectUint(150); // 90 + (6 * 10) = 150

    // Add manual points to reach Popular tier (500+ points)
    chain.mineBlock([
      Tx.contractCall("reputation", "add-reputation-points-manual", [
        types.principal(user1.address),
        types.int(400),
        types.ascii("manual-award")
      ], deployer.address)
    ]);

    result = chain.callReadOnlyFn("reputation", "get-reputation-score", [
      types.principal(user1.address)
    ], user1.address);
    result.result.expectUint(550); // 150 + 400 = 550

    result = chain.callReadOnlyFn("reputation", "get-reputation-tier", [
      types.principal(user1.address)
    ], user1.address);
    result.result.expectUint(3); // Popular

    result = chain.callReadOnlyFn("reputation", "get-user-tier-name", [
      types.principal(user1.address)
    ], user1.address);
    result.result.expectAscii("Popular");
  }
});

Clarinet.test({
  name: "Integration - Privacy Recommendations with Follow Data",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const user1 = accounts.get("wallet_1")!;
    const user2 = accounts.get("wallet_2")!;
    const user3 = accounts.get("wallet_3")!;

    // Set up users
    chain.mineBlock([
      // Register users
      Tx.contractCall("follow-system", "register-user", [
        types.ascii("alice"),
        types.utf8("Alice Johnson"),
        types.utf8("Blockchain enthusiast"),
        types.ascii("https://example.com/avatar1.jpg"),
        types.bool(false)
      ], user1.address),
      Tx.contractCall("follow-system", "register-user", [
        types.ascii("bob"),
        types.utf8("Bob Smith"),
        types.utf8("Developer"),
        types.ascii("https://example.com/avatar2.jpg"),
        types.bool(false)
      ], user2.address),
      Tx.contractCall("follow-system", "register-user", [
        types.ascii("charlie"),
        types.utf8("Charlie Brown"),
        types.utf8("Designer"),
        types.ascii("https://example.com/avatar3.jpg"),
        types.bool(false)
      ], user3.address),
      // Initialize reputation
      Tx.contractCall("reputation", "initialize-user-reputation", [
        types.principal(user1.address)
      ], deployer.address),
      Tx.contractCall("reputation", "initialize-user-reputation", [
        types.principal(user2.address)
      ], deployer.address),
      Tx.contractCall("reputation", "initialize-user-reputation", [
        types.principal(user3.address)
      ], deployer.address),
      // Set privacy settings
      Tx.contractCall("privacy", "set-privacy-settings", [
        types.uint(1), // PRIVACY_LEVEL_PUBLIC
        types.bool(true),
        types.bool(true),
        types.bool(true),
        types.bool(true),
        types.bool(true),
        types.bool(false)
      ], user1.address)
    ]);

    // Add many followers to trigger privacy recommendations
    for (let i = 0; i < 15; i++) {
      chain.mineBlock([
        Tx.contractCall("follow-system", "follow-user", [
          types.principal(user1.address)
        ], deployer.address)
      ]);
    }

    // Test privacy recommendations
    let result = chain.callReadOnlyFn("privacy", "get-privacy-recommendations", [
      types.principal(user1.address)
    ], user1.address);

    const recommendations = result.result.expectOk().expectTuple();
    recommendations["follower-count"].expectUint(15);
    recommendations["following-count"].expectUint(0);
    recommendations["privacy-level"].expectUint(1);
  }
});

Clarinet.test({
  name: "Integration - System Statistics and Analytics",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const user1 = accounts.get("wallet_1")!;
    const user2 = accounts.get("wallet_2")!;

    // Set up users
    chain.mineBlock([
      // Register users
      Tx.contractCall("follow-system", "register-user", [
        types.ascii("alice"),
        types.utf8("Alice Johnson"),
        types.utf8("Blockchain enthusiast"),
        types.ascii("https://example.com/avatar1.jpg"),
        types.bool(false)
      ], user1.address),
      Tx.contractCall("follow-system", "register-user", [
        types.ascii("bob"),
        types.utf8("Bob Smith"),
        types.utf8("Developer"),
        types.ascii("https://example.com/avatar2.jpg"),
        types.bool(false)
      ], user2.address),
      // Initialize reputation
      Tx.contractCall("reputation", "initialize-user-reputation", [
        types.principal(user1.address)
      ], deployer.address),
      Tx.contractCall("reputation", "initialize-user-reputation", [
        types.principal(user2.address)
      ], deployer.address),
      // Set privacy settings
      Tx.contractCall("privacy", "set-privacy-settings", [
        types.uint(1), // PRIVACY_LEVEL_PUBLIC
        types.bool(true),
        types.bool(true),
        types.bool(true),
        types.bool(true),
        types.bool(true),
        types.bool(false)
      ], user1.address),
      Tx.contractCall("privacy", "set-privacy-settings", [
        types.uint(3), // PRIVACY_LEVEL_PRIVATE
        types.bool(false),
        types.bool(false),
        types.bool(false),
        types.bool(false),
        types.bool(false),
        types.bool(false)
      ], user2.address)
    ]);

    // Establish follow relationship
    chain.mineBlock([
      Tx.contractCall("follow-system", "follow-user", [
        types.principal(user2.address)
      ], user1.address)
    ]);

    // Test system statistics
    let result = chain.callReadOnlyFn("follow-system", "get-total-users", [], user1.address);
    result.result.expectUint(2);

    result = chain.callReadOnlyFn("follow-system", "get-total-follows", [], user1.address);
    result.result.expectUint(1);

    result = chain.callReadOnlyFn("reputation", "get-total-reputation-points", [], user1.address);
    result.result.expectUint(120); // 50 + 50 (initial) + 10 (follower) + 10 (following)

    result = chain.callReadOnlyFn("privacy", "get-total-private-accounts", [], user1.address);
    result.result.expectUint(1);

    // Test contract statistics
    result = chain.callReadOnlyFn("follow-system", "get-contract-owner", [], user1.address);
    result.result.expectPrincipal(deployer.address);

    result = chain.callReadOnlyFn("reputation", "get-reputation-stats", [], user1.address);
    result.result.expectTuple();

    result = chain.callReadOnlyFn("privacy", "get-privacy-stats", [], user1.address);
    result.result.expectTuple();
  }
}); 