import { StacksTestnet, StacksMainnet } from '@stacks/network';
import { 
  makeContractCall,
  broadcastTransaction,
  getNonce,
  standardPrincipalCV,
  contractPrincipalCV,
  someCV,
  noneCV,
  uintCV,
  stringAsciiCV,
  stringUtf8CV,
  boolCV,
  tupleCV
} from '@stacks/transactions';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

interface DeploymentInfo {
  network: string;
  deployerAddress: string;
  deployedAt: string;
  contracts: Array<{
    contractName: string;
    contractId: string;
    txid: string;
    address: string;
  }>;
}

interface InitializationConfig {
  network: StacksTestnet | StacksMainnet;
  deployerAddress: string;
  deployerPrivateKey: string;
  contracts: {
    followSystem: string;
    reputation: string;
    privacy: string;
  };
  testUsers: Array<{
    address: string;
    username: string;
    displayName: string;
    bio: string;
    avatarUrl: string;
    isPrivate: boolean;
  }>;
}

async function loadDeploymentInfo(network: string): Promise<DeploymentInfo> {
  const filename = `deployment-${network}.json`;
  
  if (!fs.existsSync(filename)) {
    throw new Error(`Deployment info file ${filename} not found. Please run deployment first.`);
  }
  
  const data = fs.readFileSync(filename, 'utf8');
  return JSON.parse(data) as DeploymentInfo;
}

async function initializeUser(
  user: {
    address: string;
    username: string;
    displayName: string;
    bio: string;
    avatarUrl: string;
    isPrivate: boolean;
  },
  config: InitializationConfig
) {
  try {
    console.log(`\n👤 Initializing user: ${user.username}`);
    
    // Get nonce
    const nonce = await getNonce(config.deployerAddress, config.network);
    
    // Register user in follow system
    const registerTx = await makeContractCall({
      contractAddress: config.deployerAddress,
      contractName: 'follow-system',
      functionName: 'register-user',
      functionArgs: [
        stringAsciiCV(user.username),
        stringUtf8CV(user.displayName),
        stringUtf8CV(user.bio),
        stringAsciiCV(user.avatarUrl),
        boolCV(user.isPrivate)
      ],
      senderAddress: config.deployerAddress,
      network: config.network,
      nonce,
      fee: 10000,
      anchorMode: 3,
    });
    
    const registerResponse = await broadcastTransaction(registerTx, config.network);
    
    if (registerResponse.error) {
      throw new Error(`User registration failed: ${registerResponse.error}`);
    }
    
    console.log(`✅ User ${user.username} registered`);
    console.log(`🔗 Transaction: ${registerResponse.txid}`);
    
    // Initialize reputation
    const reputationNonce = await getNonce(config.deployerAddress, config.network);
    
    const reputationTx = await makeContractCall({
      contractAddress: config.deployerAddress,
      contractName: 'reputation',
      functionName: 'initialize-user-reputation',
      functionArgs: [
        standardPrincipalCV(user.address)
      ],
      senderAddress: config.deployerAddress,
      network: config.network,
      nonce: reputationNonce,
      fee: 10000,
      anchorMode: 3,
    });
    
    const reputationResponse = await broadcastTransaction(reputationTx, config.network);
    
    if (reputationResponse.error) {
      throw new Error(`Reputation initialization failed: ${reputationResponse.error}`);
    }
    
    console.log(`✅ Reputation initialized for ${user.username}`);
    console.log(`🔗 Transaction: ${reputationResponse.txid}`);
    
    // Set privacy settings
    const privacyNonce = await getNonce(config.deployerAddress, config.network);
    
    const privacyTx = await makeContractCall({
      contractAddress: config.deployerAddress,
      contractName: 'privacy',
      functionName: 'set-privacy-settings',
      functionArgs: [
        uintCV(user.isPrivate ? 3 : 1), // PRIVACY_LEVEL_PRIVATE or PRIVACY_LEVEL_PUBLIC
        boolCV(true), // allow-follow-requests
        boolCV(true), // show-follower-count
        boolCV(true), // show-following-count
        boolCV(true), // show-profile-to-public
        boolCV(true), // allow-direct-messages
        boolCV(false) // auto-approve-followers
      ],
      senderAddress: config.deployerAddress,
      network: config.network,
      nonce: privacyNonce,
      fee: 10000,
      anchorMode: 3,
    });
    
    const privacyResponse = await broadcastTransaction(privacyTx, config.network);
    
    if (privacyResponse.error) {
      throw new Error(`Privacy settings failed: ${privacyResponse.error}`);
    }
    
    console.log(`✅ Privacy settings configured for ${user.username}`);
    console.log(`🔗 Transaction: ${privacyResponse.txid}`);
    
    return {
      username: user.username,
      address: user.address,
      transactions: [
        { type: 'register', txid: registerResponse.txid },
        { type: 'reputation', txid: reputationResponse.txid },
        { type: 'privacy', txid: privacyResponse.txid }
      ]
    };
    
  } catch (error) {
    console.error(`❌ Failed to initialize user ${user.username}:`, error);
    throw error;
  }
}

async function createFollowRelationships(
  users: Array<{address: string, username: string}>,
  config: InitializationConfig
) {
  console.log('\n🔗 Creating follow relationships...');
  
  const relationships = [
    { follower: users[0], following: users[1] },
    { follower: users[0], following: users[2] },
    { follower: users[1], following: users[0] },
    { follower: users[1], following: users[2] },
    { follower: users[2], following: users[0] },
    { follower: users[2], following: users[1] },
  ];
  
  const results = [];
  
  for (const relationship of relationships) {
    try {
      const nonce = await getNonce(config.deployerAddress, config.network);
      
      const followTx = await makeContractCall({
        contractAddress: config.deployerAddress,
        contractName: 'follow-system',
        functionName: 'follow-user',
        functionArgs: [
          standardPrincipalCV(relationship.following.address)
        ],
        senderAddress: relationship.follower.address,
        network: config.network,
        nonce,
        fee: 10000,
        anchorMode: 3,
      });
      
      const response = await broadcastTransaction(followTx, config.network);
      
      if (response.error) {
        console.warn(`⚠️ Follow relationship failed: ${relationship.follower.username} -> ${relationship.following.username}`);
        continue;
      }
      
      console.log(`✅ ${relationship.follower.username} -> ${relationship.following.username}`);
      results.push({
        follower: relationship.follower.username,
        following: relationship.following.username,
        txid: response.txid
      });
      
      // Wait a bit between transactions
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.warn(`⚠️ Failed to create follow relationship: ${relationship.follower.username} -> ${relationship.following.username}`);
    }
  }
  
  return results;
}

async function addReputationPoints(
  users: Array<{address: string, username: string}>,
  config: InitializationConfig
) {
  console.log('\n⭐ Adding reputation points...');
  
  const results = [];
  
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const points = (i + 1) * 50; // Different points for each user
    
    try {
      const nonce = await getNonce(config.deployerAddress, config.network);
      
      const pointsTx = await makeContractCall({
        contractAddress: config.deployerAddress,
        contractName: 'reputation',
        functionName: 'add-reputation-points-manual',
        functionArgs: [
          standardPrincipalCV(user.address),
          uintCV(points),
          stringAsciiCV('initial-setup')
        ],
        senderAddress: config.deployerAddress,
        network: config.network,
        nonce,
        fee: 10000,
        anchorMode: 3,
      });
      
      const response = await broadcastTransaction(pointsTx, config.network);
      
      if (response.error) {
        console.warn(`⚠️ Failed to add points for ${user.username}`);
        continue;
      }
      
      console.log(`✅ Added ${points} points to ${user.username}`);
      results.push({
        username: user.username,
        points,
        txid: response.txid
      });
      
      // Wait a bit between transactions
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.warn(`⚠️ Failed to add reputation points for ${user.username}`);
    }
  }
  
  return results;
}

async function setupPrivacyWhitelists(
  users: Array<{address: string, username: string}>,
  config: InitializationConfig
) {
  console.log('\n🔒 Setting up privacy whitelists...');
  
  const results = [];
  
  // Create a whitelist network: each user whitelists the next user
  for (let i = 0; i < users.length; i++) {
    const currentUser = users[i];
    const nextUser = users[(i + 1) % users.length];
    
    try {
      const nonce = await getNonce(config.deployerAddress, config.network);
      
      const whitelistTx = await makeContractCall({
        contractAddress: config.deployerAddress,
        contractName: 'privacy',
        functionName: 'add-to-whitelist',
        functionArgs: [
          standardPrincipalCV(nextUser.address)
        ],
        senderAddress: currentUser.address,
        network: config.network,
        nonce,
        fee: 10000,
        anchorMode: 3,
      });
      
      const response = await broadcastTransaction(whitelistTx, config.network);
      
      if (response.error) {
        console.warn(`⚠️ Failed to whitelist ${nextUser.username} for ${currentUser.username}`);
        continue;
      }
      
      console.log(`✅ ${currentUser.username} whitelisted ${nextUser.username}`);
      results.push({
        whitelister: currentUser.username,
        whitelisted: nextUser.username,
        txid: response.txid
      });
      
      // Wait a bit between transactions
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.warn(`⚠️ Failed to setup whitelist: ${currentUser.username} -> ${nextUser.username}`);
    }
  }
  
  return results;
}

async function main() {
  console.log('🚀 Starting Contract Initialization');
  console.log('===================================');
  
  // Determine network from command line argument
  const network = process.argv[2] || 'testnet';
  
  if (!['testnet', 'mainnet'].includes(network)) {
    throw new Error('Invalid network. Use "testnet" or "mainnet"');
  }
  
  // Load deployment info
  const deploymentInfo = await loadDeploymentInfo(network);
  
  // Setup configuration
  const config: InitializationConfig = {
    network: network === 'testnet' ? new StacksTestnet() : new StacksMainnet(),
    deployerAddress: process.env[`${network.toUpperCase()}_DEPLOYER_ADDRESS`]!,
    deployerPrivateKey: process.env[`${network.toUpperCase()}_DEPLOYER_PRIVATE_KEY`]!,
    contracts: {
      followSystem: deploymentInfo.contracts.find(c => c.contractName === 'follow-system')?.contractId!,
      reputation: deploymentInfo.contracts.find(c => c.contractName === 'reputation')?.contractId!,
      privacy: deploymentInfo.contracts.find(c => c.contractName === 'privacy')?.contractId!
    },
    testUsers: [
      {
        address: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
        username: 'alice',
        displayName: 'Alice Johnson',
        bio: 'Blockchain enthusiast and developer',
        avatarUrl: 'https://example.com/avatars/alice.jpg',
        isPrivate: false
      },
      {
        address: 'ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND',
        username: 'bob',
        displayName: 'Bob Smith',
        bio: 'Full-stack developer and crypto enthusiast',
        avatarUrl: 'https://example.com/avatars/bob.jpg',
        isPrivate: false
      },
      {
        address: 'ST2JHG361ZXG51QTKY2NQCVBPPRRE2KZB1HR05NNC',
        username: 'charlie',
        displayName: 'Charlie Brown',
        bio: 'Designer and creative developer',
        avatarUrl: 'https://example.com/avatars/charlie.jpg',
        isPrivate: true
      }
    ]
  };
  
  console.log(`🌐 Network: ${network}`);
  console.log(`👤 Deployer: ${config.deployerAddress}`);
  console.log(`📦 Contracts: ${Object.values(config.contracts).join(', ')}`);
  
  const initializationResults = {
    network,
    initializedAt: new Date().toISOString(),
    users: [],
    followRelationships: [],
    reputationPoints: [],
    privacyWhitelists: []
  };
  
  try {
    // Initialize users
    console.log('\n👥 Initializing test users...');
    
    for (const user of config.testUsers) {
      const result = await initializeUser(user, config);
      initializationResults.users.push(result);
      
      // Wait between user initializations
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    // Create follow relationships
    const followResults = await createFollowRelationships(config.testUsers, config);
    initializationResults.followRelationships = followResults;
    
    // Add reputation points
    const reputationResults = await addReputationPoints(config.testUsers, config);
    initializationResults.reputationPoints = reputationResults;
    
    // Setup privacy whitelists
    const whitelistResults = await setupPrivacyWhitelists(config.testUsers, config);
    initializationResults.privacyWhitelists = whitelistResults;
    
    // Save initialization results
    const filename = `initialization-${network}.json`;
    fs.writeFileSync(filename, JSON.stringify(initializationResults, null, 2));
    
    // Final summary
    console.log('\n🎉 Initialization Complete!');
    console.log('==========================');
    console.log(`\n📊 Summary:`);
    console.log(`   Users initialized: ${initializationResults.users.length}`);
    console.log(`   Follow relationships: ${initializationResults.followRelationships.length}`);
    console.log(`   Reputation points added: ${initializationResults.reputationPoints.length}`);
    console.log(`   Privacy whitelists: ${initializationResults.privacyWhitelists.length}`);
    
    console.log('\n📝 Next Steps:');
    console.log('   1. Wait for all transactions to be confirmed');
    console.log('   2. Test the system with the initialized users');
    console.log('   3. Verify all relationships and settings');
    console.log('   4. Start building your frontend application');
    
    console.log(`\n💾 Initialization info saved to ${filename}`);
    
  } catch (error) {
    console.error('\n❌ Initialization failed:', error);
    process.exit(1);
  }
}

// Run initialization
if (require.main === module) {
  main().catch(console.error);
}

export { 
  initializeUser, 
  createFollowRelationships, 
  addReputationPoints, 
  setupPrivacyWhitelists 
}; 