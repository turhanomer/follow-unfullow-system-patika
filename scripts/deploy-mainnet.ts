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
import * as readline from 'readline';

dotenv.config();

const MAINNET_CONFIG = {
  network: new StacksMainnet(),
  contractName: 'stacks-follow-system',
  deployerAddress: process.env.MAINNET_DEPLOYER_ADDRESS!,
  deployerPrivateKey: process.env.MAINNET_DEPLOYER_PRIVATE_KEY!,
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

// Safety confirmation prompt
async function confirmDeployment(): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    console.log('\n⚠️  WARNING: You are about to deploy to MAINNET!');
    console.log('This will cost real STX and cannot be undone.');
    console.log('\nPlease confirm the following:');
    console.log('1. You have tested the contracts on testnet');
    console.log('2. You have sufficient STX for deployment fees');
    console.log('3. You understand this is irreversible');
    console.log('4. You have backed up your private keys');
    
    rl.question('\nType "DEPLOY" to confirm mainnet deployment: ', (answer) => {
      rl.close();
      resolve(answer === 'DEPLOY');
    });
  });
}

async function deployContract(
  contractName: string,
  contractPath: string,
  deployerAddress: string,
  deployerPrivateKey: string,
  network: StacksTestnet | StacksMainnet
) {
  try {
    console.log(`\n📦 Deploying ${contractName} contract to MAINNET...`);
    
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
      fee: 50000, // 0.05 STX fee for mainnet
      anchorMode: 3, // on-chain only
    });
    
    console.log(`📝 Transaction created for ${contractName}`);
    
    // Broadcast transaction
    const response = await broadcastTransaction(transaction, network);
    
    if (response.error) {
      throw new Error(`Broadcast failed: ${response.error}`);
    }
    
    console.log(`✅ ${contractName} deployed successfully to MAINNET!`);
    console.log(`🔗 Transaction ID: ${response.txid}`);
    console.log(`🌐 Explorer: https://explorer.stacks.co/txid/${response.txid}?chain=mainnet`);
    
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
  
  if (!followSystemContract) {
    throw new Error('Follow system contract not found in deployment results');
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
      console.log(`\n📦 Deploying updated ${contract.name} contract to MAINNET...`);
      
      // Get nonce
      const nonce = await getNonce(deployerAddress, network);
      
      // Create deployment transaction
      const transaction = await makeContractDeploy({
        contractName: contract.name,
        codeBody: contract.source,
        senderAddress: deployerAddress,
        network,
        nonce,
        fee: 50000, // 0.05 STX fee for mainnet
        anchorMode: 3,
      });
      
      // Broadcast transaction
      const response = await broadcastTransaction(transaction, network);
      
      if (response.error) {
        throw new Error(`Broadcast failed: ${response.error}`);
      }
      
      console.log(`✅ Updated ${contract.name} deployed successfully to MAINNET!`);
      console.log(`🔗 Transaction ID: ${response.txid}`);
      console.log(`🌐 Explorer: https://explorer.stacks.co/txid/${response.txid}?chain=mainnet`);
      
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
  console.log('🚀 Starting Stacks Follow System Mainnet Deployment');
  console.log('==================================================');
  
  // Validate environment variables
  if (!MAINNET_CONFIG.deployerAddress || !MAINNET_CONFIG.deployerPrivateKey) {
    throw new Error('Missing required environment variables: MAINNET_DEPLOYER_ADDRESS and MAINNET_DEPLOYER_PRIVATE_KEY');
  }
  
  console.log(`👤 Deployer Address: ${MAINNET_CONFIG.deployerAddress}`);
  console.log(`🌐 Network: Mainnet`);
  
  // Safety confirmation
  const confirmed = await confirmDeployment();
  if (!confirmed) {
    console.log('\n❌ Deployment cancelled by user');
    process.exit(0);
  }
  
  const deployedContracts = [];
  
  try {
    // Deploy follow-system contract first (no dependencies)
    const followSystemResult = await deployContract(
      'follow-system',
      'contracts/follow-system.clar',
      MAINNET_CONFIG.deployerAddress,
      MAINNET_CONFIG.deployerPrivateKey,
      MAINNET_CONFIG.network
    );
    
    deployedContracts.push(followSystemResult);
    
    // Wait longer for mainnet processing
    console.log('\n⏳ Waiting for follow-system deployment to be processed on mainnet...');
    await new Promise(resolve => setTimeout(resolve, 60000)); // 60 seconds
    
    // Update contract references
    const updatedContracts = await updateContractReferences(deployedContracts);
    
    // Deploy updated contracts
    const updatedResults = await deployUpdatedContracts(
      updatedContracts,
      MAINNET_CONFIG.deployerAddress,
      MAINNET_CONFIG.deployerPrivateKey,
      MAINNET_CONFIG.network
    );
    
    deployedContracts.push(...updatedResults);
    
    // Final summary
    console.log('\n🎉 Mainnet Deployment Complete!');
    console.log('==============================');
    console.log('\n📋 Deployed Contracts:');
    
    deployedContracts.forEach(contract => {
      console.log(`\n📦 ${contract.contractName}:`);
      console.log(`   Contract ID: ${contract.contractId}`);
      console.log(`   Transaction: ${contract.txid}`);
      console.log(`   Explorer: https://explorer.stacks.co/txid/${contract.txid}?chain=mainnet`);
    });
    
    console.log('\n🔗 Contract Interactions:');
    console.log(`   Follow System: ${deployedContracts.find(c => c.contractName === 'follow-system')?.contractId}`);
    console.log(`   Reputation: ${deployedContracts.find(c => c.contractName === 'reputation')?.contractId}`);
    console.log(`   Privacy: ${deployedContracts.find(c => c.contractName === 'privacy')?.contractId}`);
    
    console.log('\n📝 Next Steps:');
    console.log('   1. Wait for all transactions to be confirmed (may take several blocks)');
    console.log('   2. Verify contracts on the Stacks explorer');
    console.log('   3. Test the contracts with small amounts first');
    console.log('   4. Update your production frontend application');
    console.log('   5. Monitor contract usage and performance');
    
    // Save deployment info to file
    const deploymentInfo = {
      network: 'mainnet',
      deployerAddress: MAINNET_CONFIG.deployerAddress,
      deployedAt: new Date().toISOString(),
      contracts: deployedContracts,
      warnings: [
        'This is a mainnet deployment - contracts are live and irreversible',
        'Ensure proper testing before using with real funds',
        'Monitor contract performance and user feedback',
        'Keep private keys secure and backed up'
      ]
    };
    
    const fs = require('fs');
    fs.writeFileSync('deployment-mainnet.json', JSON.stringify(deploymentInfo, null, 2));
    console.log('\n💾 Deployment info saved to deployment-mainnet.json');
    
    console.log('\n🔒 Security Reminders:');
    console.log('   - Keep your private keys secure');
    console.log('   - Monitor contract activity');
    console.log('   - Have a plan for emergency situations');
    console.log('   - Consider multi-signature setup for admin functions');
    
  } catch (error) {
    console.error('\n❌ Mainnet deployment failed:', error);
    console.log('\n🔍 Troubleshooting:');
    console.log('   - Check your STX balance for fees');
    console.log('   - Verify your private key is correct');
    console.log('   - Ensure network connectivity');
    console.log('   - Check transaction status on explorer');
    process.exit(1);
  }
}

// Run deployment
if (require.main === module) {
  main().catch(console.error);
}

export { deployContract, updateContractReferences, deployUpdatedContracts }; 