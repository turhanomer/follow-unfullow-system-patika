import { Clarinet, Tx, Chain, Account, types } from "https://deno.land/x/clarinet@v1.7.1/mod.ts";
import { assertEquals } from "https://deno.land/std@0.170.0/testing/asserts.ts";

Clarinet.test({
  name: "Basit takip sistemi testleri",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const user1 = accounts.get("wallet_1")!;
    const user2 = accounts.get("wallet_2")!;

    // Test 1: Kullanıcı kaydı
    let block = chain.mineBlock([
      Tx.contractCall("simple-follow", "register-user", [
        types.ascii("alice"),
        types.ascii("Merhaba dünya!")
      ], user1.address)
    ]);
    assertEquals(block.receipts.length, 1);
    assertEquals(block.height, 2);

    // Test 2: İkinci kullanıcı kaydı
    block = chain.mineBlock([
      Tx.contractCall("simple-follow", "register-user", [
        types.ascii("bob"),
        types.ascii("Blockchain meraklısı")
      ], user2.address)
    ]);
    assertEquals(block.receipts.length, 1);
    assertEquals(block.height, 3);

    // Test 3: Takip etme
    block = chain.mineBlock([
      Tx.contractCall("simple-follow", "follow-user", [
        types.principal(user2.address)
      ], user1.address)
    ]);
    assertEquals(block.receipts.length, 1);
    assertEquals(block.height, 4);

    // Test 4: Takipçi sayısını kontrol et
    let result = chain.callReadOnlyFn("simple-follow", "get-follower-count", [
      types.principal(user2.address)
    ], deployer.address);
    assertEquals(result.result, types.uint(1));

    // Test 5: Takip edilen sayısını kontrol et
    result = chain.callReadOnlyFn("simple-follow", "get-following-count", [
      types.principal(user1.address)
    ], deployer.address);
    assertEquals(result.result, types.uint(1));

    // Test 6: Takip ediyor mu kontrol et
    result = chain.callReadOnlyFn("simple-follow", "is-user-following", [
      types.principal(user1.address),
      types.principal(user2.address)
    ], deployer.address);
    assertEquals(result.result, types.bool(true));

    // Test 7: Takipten çıkarma
    block = chain.mineBlock([
      Tx.contractCall("simple-follow", "unfollow-user", [
        types.principal(user2.address)
      ], user1.address)
    ]);
    assertEquals(block.receipts.length, 1);

    // Test 8: Takipten çıktıktan sonra sayıları kontrol et
    result = chain.callReadOnlyFn("simple-follow", "get-follower-count", [
      types.principal(user2.address)
    ], deployer.address);
    assertEquals(result.result, types.uint(0));

    result = chain.callReadOnlyFn("simple-follow", "get-following-count", [
      types.principal(user1.address)
    ], deployer.address);
    assertEquals(result.result, types.uint(0));
  },
});

Clarinet.test({
  name: "Hata durumları testleri",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const user1 = accounts.get("wallet_1")!;
    const user2 = accounts.get("wallet_2")!;

    // Test 1: Kendini takip etmeye çalışma
    let block = chain.mineBlock([
      Tx.contractCall("simple-follow", "register-user", [
        types.ascii("alice"),
        types.ascii("Test kullanıcısı")
      ], user1.address),
      Tx.contractCall("simple-follow", "follow-user", [
        types.principal(user1.address)
      ], user1.address)
    ]);
    assertEquals(block.receipts[0].result, "(ok true)");
    assertEquals(block.receipts[1].result, "(err 1001)"); // ERR-CANNOT-FOLLOW-SELF

    // Test 2: Kayıtlı olmayan kullanıcıyı takip etmeye çalışma
    block = chain.mineBlock([
      Tx.contractCall("simple-follow", "follow-user", [
        types.principal(user2.address)
      ], user1.address)
    ]);
    assertEquals(block.receipts[0].result, "(err 1000)"); // ERR-USER-NOT-FOUND

    // Test 3: Takipten çıkmaya çalışma (takip etmiyorken)
    block = chain.mineBlock([
      Tx.contractCall("simple-follow", "unfollow-user", [
        types.principal(user2.address)
      ], user1.address)
    ]);
    assertEquals(block.receipts[0].result, "(err 1003)"); // ERR-NOT-FOLLOWING
  },
}); 