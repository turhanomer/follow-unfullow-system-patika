import { StacksTestnet } from "@stacks/network";
import { makeContractDeploy, broadcastTransaction } from "@stacks/transactions";
import { readFileSync } from "fs";
import * as dotenv from "dotenv";

dotenv.config();

const network = new StacksTestnet();

async function deploySimpleFollow() {
  try {
    console.log("🚀 Basit takip sistemi deploy ediliyor...");
    
    // Contract dosyasını oku
    const contractSource = readFileSync("contracts/simple-follow.clar", "utf8");
    
    // Deploy transaction oluştur
    const transaction = await makeContractDeploy({
      contractName: "simple-follow",
      codeBody: contractSource,
      senderKey: process.env.PRIVATE_KEY!,
      network,
    });
    
    // Transaction'ı gönder
    const response = await broadcastTransaction(transaction, network);
    
    if (response.error) {
      console.error("❌ Deploy hatası:", response.error);
      return;
    }
    
    console.log("✅ Contract başarıyla deploy edildi!");
    console.log("Transaction ID:", response.txid);
    console.log("Explorer:", `https://explorer.stacks.co/txid/${response.txid}?chain=testnet`);
    
    // Contract ID'yi kaydet
    const contractId = `${process.env.STACKS_ADDRESS}.simple-follow`;
    console.log("Contract ID:", contractId);
    
    // Kullanım örnekleri
    console.log("\n📖 Kullanım örnekleri:");
    console.log("1. Kullanıcı kaydı:");
    console.log(`   (contract-call? '${contractId} register-user "kullanici_adi" "biyografi")`);
    
    console.log("\n2. Kullanıcı takip etme:");
    console.log(`   (contract-call? '${contractId} follow-user 'HEDEF_ADRES)`);
    
    console.log("\n3. Takipten çıkarma:");
    console.log(`   (contract-call? '${contractId} unfollow-user 'HEDEF_ADRES)`);
    
    console.log("\n4. Takipçi sayısını görme:");
    console.log(`   (contract-call? '${contractId} get-follower-count 'KULLANICI_ADRES)`);
    
  } catch (error) {
    console.error("❌ Hata:", error);
  }
}

// Script'i çalıştır
deploySimpleFollow(); 