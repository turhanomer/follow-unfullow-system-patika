import { StacksTestnet, StacksMainnet } from '@stacks/network';
import { 
  makeContractDeploy, 
  broadcastTransaction, 
  getAddressFromPrivateKey,
  makeSTXTokenTransfer,
  estimateTransfer,
  getNonce
} from '@stacks/transactions';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const TESTNET_CONFIG = {
  network: new StacksTestnet(),
  contractName: 'stacks-follow-system',
  deployerAddress: process.env.DEPLOYER_ADDRESS!,
  deployerPrivateKey: process.env.DEPLOYER_PRIVATE_KEY!,
  contracts: [
    {
      name: 'follow-system',
      file: 'contracts/follow-system.clar'
    },
    {
      name: 'reputation',
      file: 'contracts/reputation.clar'
    },
    {
      name: 'privacy',
      file: 'contracts/privacy.clar'
    }
  ]
};

async function deployContract(
  contractName: string,
  contractPath: string,
  deployerAddress: string,
  deployerPrivateKey: string,
  network: StacksTestnet | StacksMainnet
) {
  try {
    console.log(`\n📦 Deploying ${contractName} contract...`);
    
    // Read contract source
    const contractSource = readFileSync(contractPath, 'utf8');
    console.log(`📄 Contract source loaded from ${contractPath}`);
    
    // Get nonce
    const nonce = await getNonce(deployerAddress, network);
    console.log(`🔢 Current nonce: ${nonce}`);
    
    // Create deployment transaction
    const transaction = await makeContractDeploy({
      contractName,
      codeBody: contractSource,
      senderAddress: deployerAddress,
      network,
      nonce,
      fee: 10000, // 0.01 STX fee
      anchorMode: 3, // on-chain only
    });
    
    console.log(`📝 Transaction created for ${contractName}`);
    
    // Broadcast transaction
    const response = await broadcastTransaction(transaction, network);
    
    if (response.error) {
      throw new Error(`Broadcast failed: ${response.error}`);
    }
    
    console.log(`✅ ${contractName} deployed successfully!`);
    console.log(`🔗 Transaction ID: ${response.txid}`);
    console.log(`🌐 Explorer: https://explorer.stacks.co/txid/${response.txid}?chain=testnet`);
    
    return {
      contractName,
      txid: response.txid,
      address: deployerAddress,
      contractId: `${deployerAddress}.${contractName}`
    };
    
  } catch (error) {
    console.error(`❌ Failed to deploy ${contractName}:`, error);
    throw error;
  }
}

async function updateContractReferences(
  deployedContracts: Array<{contractName: string, contractId: string}>
) {
  console.log('\n🔧 Updating contract references...');
  
  const followSystemContract = deployedContracts.find(c => c.contractName === 'follow-system');
  const reputationContract = deployedContracts.find(c => c.contractName === 'reputation');
  
  if (!followSystemContract || !reputationContract) {
    throw new Error('Required contracts not found in deployment results');
  }
  
  // Update reputation contract with follow system reference
  const reputationPath = 'contracts/reputation.clar';
  let reputationSource = readFileSync(reputationPath, 'utf8');
  
  reputationSource = reputationSource.replace(
    /FOLLOW-SYSTEM-CONTRACT 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM\.follow-system'/,
    `FOLLOW-SYSTEM-CONTRACT '${followSystemContract.contractId}'`
  );
  
  // Update privacy contract with follow system reference
  const privacyPath = 'contracts/privacy.clar';
  let privacySource = readFileSync(privacyPath, 'utf8');
  
  privacySource = privacySource.replace(
    /FOLLOW-SYSTEM-CONTRACT 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM\.follow-system'/,
    `FOLLOW-SYSTEM-CONTRACT '${followSystemContract.contractId}'`
  );
  
  console.log('✅ Contract references updated');
  
  return {
    reputation: reputationSource,
    privacy: privacySource
  };
}

async function deployUpdatedContracts(
  updatedContracts: {reputation: string, privacy: string},
  deployerAddress: string,
  deployerPrivateKey: string,
  network: StacksTestnet | StacksMainnet
) {
  console.log('\n🔄 Deploying updated contracts with correct references...');
  
  const contracts = [
    {
      name: 'reputation',
      source: updatedContracts.reputation
    },
    {
      name: 'privacy',
      source: updatedContracts.privacy
    }
  ];
  
  const results = [];
  
  for (const contract of contracts) {
    try {
      console.log(`\n📦 Deploying updated ${contract.name} contract...`);
      
      // Get nonce
      const nonce = await getNonce(deployerAddress, network);
      
      // Create deployment transaction
      const transaction = await makeContractDeploy({
        contractName: contract.name,
        codeBody: contract.source,
        senderAddress: deployerAddress,
        network,
        nonce,
        fee: 10000,
        anchorMode: 3,
      });
      
      // Broadcast transaction
      const response = await broadcastTransaction(transaction, network);
      
      if (response.error) {
        throw new Error(`Broadcast failed: ${response.error}`);
      }
      
      console.log(`✅ Updated ${contract.name} deployed successfully!`);
      console.log(`🔗 Transaction ID: ${response.txid}`);
      console.log(`🌐 Explorer: https://explorer.stacks.co/txid/${response.txid}?chain=testnet`);
      
      results.push({
        contractName: contract.name,
        txid: response.txid,
        address: deployerAddress,
        contractId: `${deployerAddress}.${contract.name}`
      });
      
    } catch (error) {
      console.error(`❌ Failed to deploy updated ${contract.name}:`, error);
      throw error;
    }
  }
  
  return results;
}

async function main() {
  console.log('🚀 Starting Stacks Follow System Testnet Deployment');
  console.log('==================================================');
  
  // Validate environment variables
  if (!TESTNET_CONFIG.deployerAddress || !TESTNET_CONFIG.deployerPrivateKey) {
    throw new Error('Missing required environment variables: DEPLOYER_ADDRESS and DEPLOYER_PRIVATE_KEY');
  }
  
  console.log(`👤 Deployer Address: ${TESTNET_CONFIG.deployerAddress}`);
  console.log(`🌐 Network: Testnet`);
  
  const deployedContracts = [];
  
  try {
    // Deploy follow-system contract first (no dependencies)
    const followSystemResult = await deployContract(
      'follow-system',
      'contracts/follow-system.clar',
      TESTNET_CONFIG.deployerAddress,
      TESTNET_CONFIG.deployerPrivateKey,
      TESTNET_CONFIG.network
    );
    
    deployedContracts.push(followSystemResult);
    
    // Wait a bit for the transaction to be processed
    console.log('\n⏳ Waiting for follow-system deployment to be processed...');
    await new Promise(resolve => setTimeout(resolve, 30000)); // 30 seconds
    
    // Update contract references
    const updatedContracts = await updateContractReferences(deployedContracts);
    
    // Deploy updated contracts
    const updatedResults = await deployUpdatedContracts(
      updatedContracts,
      TESTNET_CONFIG.deployerAddress,
      TESTNET_CONFIG.deployerPrivateKey,
      TESTNET_CONFIG.network
    );
    
    deployedContracts.push(...updatedResults);
    
    // Final summary
    console.log('\n🎉 Deployment Complete!');
    console.log('========================');
    console.log('\n📋 Deployed Contracts:');
    
    deployedContracts.forEach(contract => {
      console.log(`\n📦 ${contract.contractName}:`);
      console.log(`   Contract ID: ${contract.contractId}`);
      console.log(`   Transaction: ${contract.txid}`);
      console.log(`   Explorer: https://explorer.stacks.co/txid/${contract.txid}?chain=testnet`);
    });
    
    console.log('\n🔗 Contract Interactions:');
    console.log(`   Follow System: ${deployedContracts.find(c => c.contractName === 'follow-system')?.contractId}`);
    console.log(`   Reputation: ${deployedContracts.find(c => c.contractName === 'reputation')?.contractId}`);
    console.log(`   Privacy: ${deployedContracts.find(c => c.contractName === 'privacy')?.contractId}`);
    
    console.log('\n📝 Next Steps:');
    console.log('   1. Wait for all transactions to be confirmed');
    console.log('   2. Test the contracts using the provided test suite');
    console.log('   3. Initialize the system with test data');
    console.log('   4. Update your frontend application with the new contract addresses');
    
    // Save deployment info to file
    const deploymentInfo = {
      network: 'testnet',
      deployerAddress: TESTNET_CONFIG.deployerAddress,
      deployedAt: new Date().toISOString(),
      contracts: deployedContracts
    };
    
    const fs = require('fs');
    fs.writeFileSync('deployment-testnet.json', JSON.stringify(deploymentInfo, null, 2));
    console.log('\n💾 Deployment info saved to deployment-testnet.json');
    
  } catch (error) {
    console.error('\n❌ Deployment failed:', error);
    process.exit(1);
  }
}

// Run deployment
if (require.main === module) {
  main().catch(console.error);
}

export { deployContract, updateContractReferences, deployUpdatedContracts }; 