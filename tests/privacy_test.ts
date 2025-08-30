import { Clarinet, Tx, Chain, Account, types } from "https://deno.land/x/clarinet@v1.0.0/mod.ts";
import { assertEquals, assert } from "https://deno.land/std@0.90.0/testing/asserts.ts";

Clarinet.test({
  name: "Privacy System - Privacy Settings Management",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const user1 = accounts.get("wallet_1")!;
    const user2 = accounts.get("wallet_2")!;

    // Test set privacy settings
    let block = chain.mineBlock([
      Tx.contractCall("privacy", "set-privacy-settings", [
        types.uint(2), // PRIVACY_LEVEL_FOLLOWERS_ONLY
        types.bool(true), // allow-follow-requests
        types.bool(true), // show-follower-count
        types.bool(false), // show-following-count
        types.bool(true), // show-profile-to-public
        types.bool(false), // allow-direct-messages
        types.bool(true) // auto-approve-followers
      ], user1.address)
    ]);

    assertEquals(block.receipts.length, 1);
    const result = block.receipts[0].result.expectOk().expectTuple();
    result["user"].expectPrincipal(user1.address);
    result["privacy-level"].expectUint(2);
    result["allow-follow-requests"].expectBool(true);
    result["show-follower-count"].expectBool(true);
    result["show-following-count"].expectBool(false);
    result["show-profile-to-public"].expectBool(true);
    result["allow-direct-messages"].expectBool(false);
    result["auto-approve-followers"].expectBool(true);

    // Test invalid privacy level
    block = chain.mineBlock([
      Tx.contractCall("privacy", "set-privacy-settings", [
        types.uint(4), // Invalid privacy level
        types.bool(true),
        types.bool(true),
        types.bool(true),
        types.bool(true),
        types.bool(true),
        types.bool(false)
      ], user2.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectErr().expectUint(3002); // ERR-INVALID-PRIVACY-LEVEL

    // Test update privacy settings to private
    block = chain.mineBlock([
      Tx.contractCall("privacy", "set-privacy-settings", [
        types.uint(3), // PRIVACY_LEVEL_PRIVATE
        types.bool(false),
        types.bool(false),
        types.bool(false),
        types.bool(false),
        types.bool(false),
        types.bool(false)
      ], user1.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectOk().expectTuple();
  }
});

Clarinet.test({
  name: "Privacy System - Access Control",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const user1 = accounts.get("wallet_1")!;
    const user2 = accounts.get("wallet_2")!;
    const user3 = accounts.get("wallet_3")!;

    // Set up privacy settings
    chain.mineBlock([
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

    // Test can access profile (public access)
    let result = chain.callReadOnlyFn("privacy", "can-access-profile", [
      types.principal(user2.address),
      types.principal(user1.address)
    ], user2.address);

    result.result.expectOk().expectBool(true);

    // Test can see follower count
    result = chain.callReadOnlyFn("privacy", "can-see-follower-count", [
      types.principal(user2.address),
      types.principal(user1.address)
    ], user2.address);

    result.result.expectOk().expectBool(true);

    // Test can see following count
    result = chain.callReadOnlyFn("privacy", "can-see-following-count", [
      types.principal(user2.address),
      types.principal(user1.address)
    ], user2.address);

    result.result.expectOk().expectBool(true);

    // Test can send direct message
    result = chain.callReadOnlyFn("privacy", "can-send-direct-message", [
      types.principal(user2.address),
      types.principal(user1.address)
    ], user2.address);

    result.result.expectOk().expectBool(true);

    // Change to private settings
    chain.mineBlock([
      Tx.contractCall("privacy", "set-privacy-settings", [
        types.uint(3), // PRIVACY_LEVEL_PRIVATE
        types.bool(false),
        types.bool(false),
        types.bool(false),
        types.bool(false),
        types.bool(false),
        types.bool(false)
      ], user1.address)
    ]);

    // Test access denied for private account
    result = chain.callReadOnlyFn("privacy", "can-access-profile", [
      types.principal(user2.address),
      types.principal(user1.address)
    ], user2.address);

    result.result.expectOk().expectBool(false);

    // Test self access still works
    result = chain.callReadOnlyFn("privacy", "can-access-profile", [
      types.principal(user1.address),
      types.principal(user1.address)
    ], user1.address);

    result.result.expectOk().expectBool(false); // Because show-profile-to-public is false
  }
});

Clarinet.test({
  name: "Privacy System - Whitelist Management",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const user1 = accounts.get("wallet_1")!;
    const user2 = accounts.get("wallet_2")!;
    const user3 = accounts.get("wallet_3")!;

    // Set up private account
    chain.mineBlock([
      Tx.contractCall("privacy", "set-privacy-settings", [
        types.uint(3), // PRIVACY_LEVEL_PRIVATE
        types.bool(false),
        types.bool(false),
        types.bool(false),
        types.bool(false),
        types.bool(false),
        types.bool(false)
      ], user1.address)
    ]);

    // Test add to whitelist
    let block = chain.mineBlock([
      Tx.contractCall("privacy", "add-to-whitelist", [
        types.principal(user2.address)
      ], user1.address)
    ]);

    assertEquals(block.receipts.length, 1);
    const result = block.receipts[0].result.expectOk().expectTuple();
    result["user"].expectPrincipal(user2.address);
    result["status"].expectAscii("whitelisted");

    // Test add self to whitelist
    block = chain.mineBlock([
      Tx.contractCall("privacy", "add-to-whitelist", [
        types.principal(user1.address)
      ], user1.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectErr().expectUint(3001); // ERR-USER-NOT-FOUND

    // Test add already whitelisted user
    block = chain.mineBlock([
      Tx.contractCall("privacy", "add-to-whitelist", [
        types.principal(user2.address)
      ], user1.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectErr().expectUint(3005); // ERR-ALREADY-WHITELISTED

    // Test remove from whitelist
    block = chain.mineBlock([
      Tx.contractCall("privacy", "remove-from-whitelist", [
        types.principal(user2.address)
      ], user1.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectOk().expectTuple();

    // Test remove non-whitelisted user
    block = chain.mineBlock([
      Tx.contractCall("privacy", "remove-from-whitelist", [
        types.principal(user2.address)
      ], user1.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectErr().expectUint(3007); // ERR-NOT-WHITELISTED

    // Test whitelist access
    chain.mineBlock([
      Tx.contractCall("privacy", "add-to-whitelist", [
        types.principal(user3.address)
      ], user1.address)
    ]);

    // Whitelisted user should have access
    let accessResult = chain.callReadOnlyFn("privacy", "can-access-profile", [
      types.principal(user3.address),
      types.principal(user1.address)
    ], user3.address);

    accessResult.result.expectOk().expectBool(false); // Still false because show-profile-to-public is false

    // Change settings to show profile
    chain.mineBlock([
      Tx.contractCall("privacy", "set-privacy-settings", [
        types.uint(3), // PRIVACY_LEVEL_PRIVATE
        types.bool(false),
        types.bool(false),
        types.bool(false),
        types.bool(true), // show-profile-to-public
        types.bool(false),
        types.bool(false)
      ], user1.address)
    ]);

    // Now whitelisted user should have access
    accessResult = chain.callReadOnlyFn("privacy", "can-access-profile", [
      types.principal(user3.address),
      types.principal(user1.address)
    ], user3.address);

    accessResult.result.expectOk().expectBool(true);
  }
});

Clarinet.test({
  name: "Privacy System - Blacklist Management",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const user1 = accounts.get("wallet_1")!;
    const user2 = accounts.get("wallet_2")!;
    const user3 = accounts.get("wallet_3")!;

    // Set up public account
    chain.mineBlock([
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

    // Test add to blacklist
    let block = chain.mineBlock([
      Tx.contractCall("privacy", "add-to-blacklist", [
        types.principal(user2.address)
      ], user1.address)
    ]);

    assertEquals(block.receipts.length, 1);
    const result = block.receipts[0].result.expectOk().expectTuple();
    result["user"].expectPrincipal(user2.address);
    result["status"].expectAscii("blacklisted");

    // Test add self to blacklist
    block = chain.mineBlock([
      Tx.contractCall("privacy", "add-to-blacklist", [
        types.principal(user1.address)
      ], user1.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectErr().expectUint(3001); // ERR-USER-NOT-FOUND

    // Test add already blacklisted user
    block = chain.mineBlock([
      Tx.contractCall("privacy", "add-to-blacklist", [
        types.principal(user2.address)
      ], user1.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectErr().expectUint(3006); // ERR-ALREADY-BLACKLISTED

    // Test remove from blacklist
    block = chain.mineBlock([
      Tx.contractCall("privacy", "remove-from-blacklist", [
        types.principal(user2.address)
      ], user1.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectOk().expectTuple();

    // Test remove non-blacklisted user
    block = chain.mineBlock([
      Tx.contractCall("privacy", "remove-from-blacklist", [
        types.principal(user2.address)
      ], user1.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectErr().expectUint(3008); // ERR-NOT-BLACKLISTED

    // Test blacklist access denial
    chain.mineBlock([
      Tx.contractCall("privacy", "add-to-blacklist", [
        types.principal(user3.address)
      ], user1.address)
    ]);

    // Blacklisted user should be denied access
    let accessResult = chain.callReadOnlyFn("privacy", "can-access-profile", [
      types.principal(user3.address),
      types.principal(user1.address)
    ], user3.address);

    accessResult.result.expectOk().expectBool(false);
  }
});

Clarinet.test({
  name: "Privacy System - Privacy Recommendations",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const user1 = accounts.get("wallet_1")!;

    // Set up privacy settings
    chain.mineBlock([
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

    // Test get privacy recommendations
    let result = chain.callReadOnlyFn("privacy", "get-privacy-recommendations", [
      types.principal(user1.address)
    ], user1.address);

    result.result.expectOk().expectTuple();
  }
});

Clarinet.test({
  name: "Privacy System - Read-only Functions",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const user1 = accounts.get("wallet_1")!;
    const user2 = accounts.get("wallet_2")!;

    // Set up privacy settings
    chain.mineBlock([
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

    // Add to whitelist and blacklist
    chain.mineBlock([
      Tx.contractCall("privacy", "add-to-whitelist", [
        types.principal(user2.address)
      ], user1.address),
      Tx.contractCall("privacy", "add-to-blacklist", [
        types.principal(deployer.address)
      ], user1.address)
    ]);

    // Test get user privacy settings
    let result = chain.callReadOnlyFn("privacy", "get-user-privacy-settings", [
      types.principal(user1.address)
    ], user1.address);

    result.result.expectSome().expectTuple();

    // Test get user privacy settings for non-existent user
    result = chain.callReadOnlyFn("privacy", "get-user-privacy-settings", [
      types.principal(user2.address)
    ], user1.address);

    result.result.expectNone();

    // Test is user whitelisted
    result = chain.callReadOnlyFn("privacy", "is-user-whitelisted", [
      types.principal(user2.address),
      types.principal(user1.address)
    ], user1.address);

    result.result.expectSome().expectUint();

    // Test is user not whitelisted
    result = chain.callReadOnlyFn("privacy", "is-user-whitelisted", [
      types.principal(deployer.address),
      types.principal(user1.address)
    ], user1.address);

    result.result.expectNone();

    // Test is user blacklisted
    result = chain.callReadOnlyFn("privacy", "is-user-blacklisted", [
      types.principal(deployer.address),
      types.principal(user1.address)
    ], user1.address);

    result.result.expectSome().expectUint();

    // Test is user not blacklisted
    result = chain.callReadOnlyFn("privacy", "is-user-blacklisted", [
      types.principal(user2.address),
      types.principal(user1.address)
    ], user1.address);

    result.result.expectNone();

    // Test get privacy access log
    result = chain.callReadOnlyFn("privacy", "get-privacy-access-log", [
      types.principal(user2.address),
      types.principal(user1.address)
    ], user1.address);

    result.result.expectSome().expectTuple();

    // Test get privacy events
    result = chain.callReadOnlyFn("privacy", "get-privacy-events", [
      types.principal(user1.address),
      types.uint(10)
    ], user1.address);

    result.result.expectList();

    // Test get total private accounts
    result = chain.callReadOnlyFn("privacy", "get-total-private-accounts", [], user1.address);
    result.result.expectUint(0); // No private accounts yet

    // Change to private account
    chain.mineBlock([
      Tx.contractCall("privacy", "set-privacy-settings", [
        types.uint(3), // PRIVACY_LEVEL_PRIVATE
        types.bool(false),
        types.bool(false),
        types.bool(false),
        types.bool(false),
        types.bool(false),
        types.bool(false)
      ], user1.address)
    ]);

    result = chain.callReadOnlyFn("privacy", "get-total-private-accounts", [], user1.address);
    result.result.expectUint(1); // Now has one private account

    // Test get privacy stats
    result = chain.callReadOnlyFn("privacy", "get-privacy-stats", [], user1.address);
    result.result.expectTuple();

    // Test get privacy level names
    result = chain.callReadOnlyFn("privacy", "get-privacy-level-names", [], user1.address);
    result.result.expectTuple();
  }
});

Clarinet.test({
  name: "Privacy System - Access Control Scenarios",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const user1 = accounts.get("wallet_1")!;
    const user2 = accounts.get("wallet_2")!;
    const user3 = accounts.get("wallet_3")!;

    // Set up followers-only account
    chain.mineBlock([
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

    // Test access without following relationship
    let result = chain.callReadOnlyFn("privacy", "can-access-profile", [
      types.principal(user2.address),
      types.principal(user1.address)
    ], user2.address);

    result.result.expectOk().expectBool(false); // Should be denied without following

    // Test access with whitelist
    chain.mineBlock([
      Tx.contractCall("privacy", "add-to-whitelist", [
        types.principal(user2.address)
      ], user1.address)
    ]);

    result = chain.callReadOnlyFn("privacy", "can-access-profile", [
      types.principal(user2.address),
      types.principal(user1.address)
    ], user2.address);

    result.result.expectOk().expectBool(true); // Should be allowed with whitelist

    // Test access with blacklist override
    chain.mineBlock([
      Tx.contractCall("privacy", "add-to-blacklist", [
        types.principal(user2.address)
      ], user1.address)
    ]);

    result = chain.callReadOnlyFn("privacy", "can-access-profile", [
      types.principal(user2.address),
      types.principal(user1.address)
    ], user2.address);

    result.result.expectOk().expectBool(false); // Should be denied with blacklist

    // Test self access
    result = chain.callReadOnlyFn("privacy", "can-access-profile", [
      types.principal(user1.address),
      types.principal(user1.address)
    ], user1.address);

    result.result.expectOk().expectBool(true); // Self should always have access
  }
});

Clarinet.test({
  name: "Privacy System - Admin Functions",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const user1 = accounts.get("wallet_1")!;
    const user2 = accounts.get("wallet_2")!;

    // Set up privacy settings
    chain.mineBlock([
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

    // Test emergency privacy reset (non-admin)
    let block = chain.mineBlock([
      Tx.contractCall("privacy", "emergency-privacy-reset", [
        types.principal(user1.address)
      ], user2.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectErr().expectUint(3004); // ERR-UNAUTHORIZED

    // Test emergency privacy reset (admin)
    block = chain.mineBlock([
      Tx.contractCall("privacy", "emergency-privacy-reset", [
        types.principal(user1.address)
      ], deployer.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectOk().expectTuple();

    // Test emergency privacy reset for non-existent user
    block = chain.mineBlock([
      Tx.contractCall("privacy", "emergency-privacy-reset", [
        types.principal(user2.address)
      ], deployer.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectErr().expectUint(3001); // ERR-USER-NOT-FOUND

    // Test update privacy parameters (non-admin)
    block = chain.mineBlock([
      Tx.contractCall("privacy", "update-privacy-parameters", [
        types.uint(100),
        types.uint(50)
      ], user2.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectErr().expectUint(3004); // ERR-UNAUTHORIZED

    // Test update privacy parameters (admin)
    block = chain.mineBlock([
      Tx.contractCall("privacy", "update-privacy-parameters", [
        types.uint(100),
        types.uint(50)
      ], deployer.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectOk().expectAscii("Privacy parameter updates not yet implemented");
  }
});

Clarinet.test({
  name: "Privacy System - Edge Cases and Error Handling",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const user1 = accounts.get("wallet_1")!;
    const user2 = accounts.get("wallet_2")!;

    // Test operations on users without privacy settings
    let result = chain.callReadOnlyFn("privacy", "get-user-privacy-settings", [
      types.principal(user1.address)
    ], user1.address);

    result.result.expectNone();

    // Test access control for user without settings (should use defaults)
    result = chain.callReadOnlyFn("privacy", "can-access-profile", [
      types.principal(user2.address),
      types.principal(user1.address)
    ], user2.address);

    result.result.expectOk().expectBool(true); // Default is public

    // Test whitelist operations on user without settings
    let block = chain.mineBlock([
      Tx.contractCall("privacy", "add-to-whitelist", [
        types.principal(user2.address)
      ], user1.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectOk().expectTuple(); // Should work, creates default settings

    // Test blacklist operations on user without settings
    block = chain.mineBlock([
      Tx.contractCall("privacy", "add-to-blacklist", [
        types.principal(deployer.address)
      ], user1.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectOk().expectTuple(); // Should work, creates default settings

    // Test privacy recommendations for user without settings
    result = chain.callReadOnlyFn("privacy", "get-privacy-recommendations", [
      types.principal(user2.address)
    ], user2.address);

    result.result.expectOk().expectTuple(); // Should work with default settings
  }
}); 