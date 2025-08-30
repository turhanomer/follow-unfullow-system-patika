import { Clarinet, Tx, Chain, Account, types } from "https://deno.land/x/clarinet@v1.0.0/mod.ts";
import { assertEquals, assert } from "https://deno.land/std@0.90.0/testing/asserts.ts";

Clarinet.test({
  name: "Follow System - User Registration",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const user1 = accounts.get("wallet_1")!;
    const user2 = accounts.get("wallet_2")!;

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
    assertEquals(block.height, 2);
    block.receipts[0].result.expectOk().expectTuple();

    block = chain.mineBlock([
      Tx.contractCall("follow-system", "register-user", [
        types.ascii("alice2"),
        types.utf8("Alice Johnson 2"),
        types.utf8("Another profile"),
        types.ascii("https://example.com/avatar2.jpg"),
        types.bool(true)
      ], user1.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectErr().expectUint(1001);

    block = chain.mineBlock([
      Tx.contractCall("follow-system", "register-user", [
        types.ascii(""),
        types.utf8("Empty Username"),
        types.utf8("Test bio"),
        types.ascii("https://example.com/avatar.jpg"),
        types.bool(false)
      ], user2.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectErr().expectUint(1013);
  }
});

Clarinet.test({
  name: "Follow System - Follow/Unfollow Operations",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const user1 = accounts.get("wallet_1")!;
    const user2 = accounts.get("wallet_2")!;
    const user3 = accounts.get("wallet_3")!;

    chain.mineBlock([
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
        types.bool(true)
      ], user3.address)
    ]);

    let block = chain.mineBlock([
      Tx.contractCall("follow-system", "follow-user", [
        types.principal(user2.address)
      ], user1.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectOk().expectTuple();

    block = chain.mineBlock([
      Tx.contractCall("follow-system", "follow-user", [
        types.principal(user1.address)
      ], user1.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectErr().expectUint(1004);

    block = chain.mineBlock([
      Tx.contractCall("follow-system", "follow-user", [
        types.principal(user2.address)
      ], user1.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectErr().expectUint(1002);

    block = chain.mineBlock([
      Tx.contractCall("follow-system", "follow-user", [
        types.principal(user3.address)
      ], user1.address)
    ]);

    assertEquals(block.receipts.length, 1);
    const result = block.receipts[0].result.expectOk().expectTuple();
    result["status"].expectAscii("request-sent");

    block = chain.mineBlock([
      Tx.contractCall("follow-system", "unfollow-user", [
        types.principal(user2.address)
      ], user1.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectOk().expectTuple();

    block = chain.mineBlock([
      Tx.contractCall("follow-system", "unfollow-user", [
        types.principal(user2.address)
      ], user1.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectErr().expectUint(1003);
  }
});

Clarinet.test({
  name: "Follow System - Follow Request Management",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const user1 = accounts.get("wallet_1")!;
    const user2 = accounts.get("wallet_2")!;

    chain.mineBlock([
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
        types.bool(true)
      ], user2.address)
    ]);

    chain.mineBlock([
      Tx.contractCall("follow-system", "follow-user", [
        types.principal(user2.address)
      ], user1.address)
    ]);

    let block = chain.mineBlock([
      Tx.contractCall("follow-system", "follow-user", [
        types.principal(user2.address)
      ], user1.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectErr().expectUint(1010);

    block = chain.mineBlock([
      Tx.contractCall("follow-system", "approve-follow-request", [
        types.principal(user1.address)
      ], user2.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectOk().expectTuple();

    block = chain.mineBlock([
      Tx.contractCall("follow-system", "approve-follow-request", [
        types.principal(user1.address)
      ], user2.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectErr().expectUint(1011);

    chain.mineBlock([
      Tx.contractCall("follow-system", "follow-user", [
        types.principal(user2.address)
      ], deployer.address)
    ]);

    block = chain.mineBlock([
      Tx.contractCall("follow-system", "reject-follow-request", [
        types.principal(deployer.address)
      ], user2.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectOk().expectTuple();
  }
});

Clarinet.test({
  name: "Follow System - Block/Unblock Operations",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const user1 = accounts.get("wallet_1")!;
    const user2 = accounts.get("wallet_2")!;

    chain.mineBlock([
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
      ], user2.address)
    ]);

    chain.mineBlock([
      Tx.contractCall("follow-system", "follow-user", [
        types.principal(user2.address)
      ], user1.address),
      Tx.contractCall("follow-system", "follow-user", [
        types.principal(user1.address)
      ], user2.address)
    ]);

    let block = chain.mineBlock([
      Tx.contractCall("follow-system", "block-user", [
        types.principal(user2.address)
      ], user1.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectOk().expectTuple();

    block = chain.mineBlock([
      Tx.contractCall("follow-system", "block-user", [
        types.principal(user1.address)
      ], user1.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectErr().expectUint(1004);

    block = chain.mineBlock([
      Tx.contractCall("follow-system", "block-user", [
        types.principal(user2.address)
      ], user1.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectErr().expectUint(1005);

    block = chain.mineBlock([
      Tx.contractCall("follow-system", "unblock-user", [
        types.principal(user2.address)
      ], user1.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectOk().expectTuple();

    block = chain.mineBlock([
      Tx.contractCall("follow-system", "unblock-user", [
        types.principal(user2.address)
      ], user1.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectErr().expectUint(1005);
  }
});

Clarinet.test({
  name: "Follow System - Profile Management",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const user1 = accounts.get("wallet_1")!;

    chain.mineBlock([
      Tx.contractCall("follow-system", "register-user", [
        types.ascii("alice"),
        types.utf8("Alice Johnson"),
        types.utf8("Blockchain enthusiast"),
        types.ascii("https://example.com/avatar1.jpg"),
        types.bool(false)
      ], user1.address)
    ]);

    let block = chain.mineBlock([
      Tx.contractCall("follow-system", "update-profile", [
        types.ascii("alice_updated"),
        types.utf8("Alice Johnson Updated"),
        types.utf8("Updated bio"),
        types.ascii("https://example.com/avatar_updated.jpg"),
        types.bool(true)
      ], user1.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectOk().expectTuple();

    block = chain.mineBlock([
      Tx.contractCall("follow-system", "update-profile", [
        types.ascii(""),
        types.utf8("Empty Username"),
        types.utf8("Test bio"),
        types.ascii("https://example.com/avatar.jpg"),
        types.bool(false)
      ], user1.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectErr().expectUint(1013);
  }
});

Clarinet.test({
  name: "Follow System - Read-only Functions",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const user1 = accounts.get("wallet_1")!;
    const user2 = accounts.get("wallet_2")!;

    chain.mineBlock([
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
      ], user2.address)
    ]);

    chain.mineBlock([
      Tx.contractCall("follow-system", "follow-user", [
        types.principal(user2.address)
      ], user1.address)
    ]);

    let result = chain.callReadOnlyFn("follow-system", "get-user-profile", [
      types.principal(user1.address)
    ], user1.address);

    result.result.expectSome().expectTuple();

    result = chain.callReadOnlyFn("follow-system", "get-follower-count", [
      types.principal(user2.address)
    ], user1.address);

    result.result.expectUint(1);

    result = chain.callReadOnlyFn("follow-system", "get-following-count", [
      types.principal(user1.address)
    ], user1.address);

    result.result.expectUint(1);

    result = chain.callReadOnlyFn("follow-system", "is-user-following", [
      types.principal(user1.address),
      types.principal(user2.address)
    ], user1.address);

    result.result.expectSome().expectUint();

    result = chain.callReadOnlyFn("follow-system", "is-user-blocked", [
      types.principal(user1.address),
      types.principal(user2.address)
    ], user1.address);

    result.result.expectNone();

    result = chain.callReadOnlyFn("follow-system", "has-follow-request", [
      types.principal(user1.address),
      types.principal(user2.address)
    ], user1.address);

    result.result.expectNone();

    result = chain.callReadOnlyFn("follow-system", "get-total-users", [], user1.address);
    result.result.expectUint(2);

    result = chain.callReadOnlyFn("follow-system", "get-total-follows", [], user1.address);
    result.result.expectUint(1);

    result = chain.callReadOnlyFn("follow-system", "get-contract-owner", [], user1.address);
    result.result.expectPrincipal(deployer.address);
  }
});

Clarinet.test({
  name: "Follow System - Rate Limiting",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const user1 = accounts.get("wallet_1")!;
    const user2 = accounts.get("wallet_2")!;
    const user3 = accounts.get("wallet_3")!;

    chain.mineBlock([
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
      ], user3.address)
    ]);

    const followAttempts = [];
    for (let i = 0; i < 60; i++) {
      followAttempts.push(
        Tx.contractCall("follow-system", "follow-user", [
          types.principal(user2.address)
        ], user1.address)
      );
    }

    const block = chain.mineBlock(followAttempts);
    
    let successCount = 0;
    let rateLimitCount = 0;
    
    block.receipts.forEach(receipt => {
      if (receipt.result.isOk()) {
        successCount++;
      } else if (receipt.result.expectErr().expectUint() === 1006) {
        rateLimitCount++;
      }
    });

    assert(successCount > 0, "Some follow attempts should succeed");
    assert(rateLimitCount > 0, "Some follow attempts should be rate limited");
  }
});

Clarinet.test({
  name: "Follow System - Edge Cases and Error Handling",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const user1 = accounts.get("wallet_1")!;
    const user2 = accounts.get("wallet_2")!;

    let block = chain.mineBlock([
      Tx.contractCall("follow-system", "follow-user", [
        types.principal(user2.address)
      ], user1.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectErr().expectUint(1001);

    chain.mineBlock([
      Tx.contractCall("follow-system", "register-user", [
        types.ascii("alice"),
        types.utf8("Alice Johnson"),
        types.utf8("Blockchain enthusiast"),
        types.ascii("https://example.com/avatar1.jpg"),
        types.bool(false)
      ], user1.address)
    ]);

    block = chain.mineBlock([
      Tx.contractCall("follow-system", "follow-user", [
        types.principal(user2.address)
      ], user1.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectErr().expectUint(1001);

    block = chain.mineBlock([
      Tx.contractCall("follow-system", "block-user", [
        types.principal(user2.address)
      ], user1.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectErr().expectUint(1001);

    block = chain.mineBlock([
      Tx.contractCall("follow-system", "update-profile", [
        types.ascii("alice2"),
        types.utf8("Alice Johnson 2"),
        types.utf8("Updated bio"),
        types.ascii("https://example.com/avatar2.jpg"),
        types.bool(false)
      ], user2.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectErr().expectUint(1001);
  }
});

Clarinet.test({
  name: "Follow System - Admin Functions",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const user1 = accounts.get("wallet_1")!;

    let block = chain.mineBlock([
      Tx.contractCall("follow-system", "emergency-pause", [], user1.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectErr().expectUint(1012);

    block = chain.mineBlock([
      Tx.contractCall("follow-system", "emergency-pause", [], deployer.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectOk().expectAscii("Emergency pause not yet implemented");

    block = chain.mineBlock([
      Tx.contractCall("follow-system", "update-parameters", [
        types.uint(15000),
        types.uint(7500)
      ], user1.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectErr().expectUint(1012);

    block = chain.mineBlock([
      Tx.contractCall("follow-system", "update-parameters", [
        types.uint(15000),
        types.uint(7500)
      ], deployer.address)
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectOk().expectAscii("Parameter updates not yet implemented");
  }
}); 