# Stacks Follow System - Deployment Guide

This guide provides step-by-step instructions for deploying the Stacks Follow System smart contracts to both testnet and mainnet.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Testnet Deployment](#testnet-deployment)
4. [Mainnet Deployment](#mainnet-deployment)
5. [Post-Deployment](#post-deployment)
6. [Troubleshooting](#troubleshooting)

## Prerequisites

Before deploying, ensure you have the following:

### Required Software
- Node.js 18+ and npm
- Stacks CLI (optional, for local development)
- Git

### Required Accounts
- Stacks wallet (Hiro Wallet recommended)
- Testnet STX for deployment fees
- Mainnet STX for production deployment

### Required Knowledge
- Basic understanding of Stacks blockchain
- Familiarity with Clarity smart contracts
- Understanding of private key management

## Environment Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd stacks-follow-system
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Create Environment File

Create a `.env` file in the project root:

```bash
# Testnet Configuration
DEPLOYER_ADDRESS=ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM
DEPLOYER_PRIVATE_KEY=your-testnet-private-key

# Mainnet Configuration
MAINNET_DEPLOYER_ADDRESS=ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM
MAINNET_DEPLOYER_PRIVATE_KEY=your-mainnet-private-key
```

### 4. Verify Configuration

Run the configuration verification:

```bash
npm run verify-config
```

## Testnet Deployment

### Step 1: Prepare Testnet Environment

1. **Get Testnet STX**
   - Visit [Stacks Testnet Faucet](https://explorer.stacks.co/sandbox/faucet)
   - Enter your testnet address
   - Request test STX (minimum 100 STX recommended)

2. **Verify Balance**
   ```bash
   npm run check-balance -- --network testnet
   ```

### Step 2: Run Tests

Before deployment, run the test suite:

```bash
npm test
```

Ensure all tests pass before proceeding.

### Step 3: Deploy to Testnet

```bash
npm run deploy:testnet
```

The deployment script will:

1. Deploy the follow-system contract first
2. Update contract references in reputation and privacy contracts
3. Deploy the updated reputation and privacy contracts
4. Save deployment information to `deployment-testnet.json`

### Step 4: Verify Deployment

1. **Check Transaction Status**
   - Visit the Stacks Explorer links provided in the deployment output
   - Ensure all transactions are confirmed

2. **Verify Contract Addresses**
   ```bash
   npm run verify-deployment -- --network testnet
   ```

3. **Test Contract Functions**
   ```bash
   npm run test-contracts -- --network testnet
   ```

### Step 5: Initialize System

```bash
npm run initialize -- testnet
```

This will:
- Register test users
- Create follow relationships
- Set up reputation points
- Configure privacy settings

## Mainnet Deployment

⚠️ **WARNING**: Mainnet deployment is irreversible and costs real STX. Ensure thorough testing on testnet first.

### Step 1: Final Testing

1. **Complete Testnet Testing**
   - Test all functionality thoroughly
   - Verify edge cases
   - Test with multiple users
   - Validate all error conditions

2. **Security Review**
   - Review all contract code
   - Check for potential vulnerabilities
   - Verify access controls
   - Test admin functions

### Step 2: Prepare Mainnet Environment

1. **Get Mainnet STX**
   - Ensure you have sufficient STX for deployment fees
   - Recommended: 1-2 STX for deployment costs

2. **Verify Mainnet Balance**
   ```bash
   npm run check-balance -- --network mainnet
   ```

3. **Backup Private Keys**
   - Ensure private keys are securely backed up
   - Consider using hardware wallets for production

### Step 3: Deploy to Mainnet

```bash
npm run deploy:mainnet
```

The script will:
1. Prompt for confirmation with safety warnings
2. Deploy contracts in the correct order
3. Update contract references
4. Save deployment information to `deployment-mainnet.json`

### Step 4: Post-Deployment Verification

1. **Verify All Transactions**
   - Check each transaction on the mainnet explorer
   - Ensure all contracts are deployed correctly
   - Verify contract addresses match expected values

2. **Test Critical Functions**
   ```bash
   npm run test-critical -- --network mainnet
   ```

3. **Monitor Deployment**
   - Watch for any issues in the first few hours
   - Monitor contract interactions
   - Check for any unexpected behavior

## Post-Deployment

### 1. Update Frontend Configuration

Update your frontend application with the new contract addresses:

```javascript
// Example configuration
const CONTRACTS = {
  testnet: {
    followSystem: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.follow-system',
    reputation: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.reputation',
    privacy: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.privacy'
  },
  mainnet: {
    followSystem: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.follow-system',
    reputation: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.reputation',
    privacy: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.privacy'
  }
};
```

### 2. Initialize Production Data

For mainnet, you may want to initialize with real users:

```bash
npm run initialize-production -- --network mainnet
```

### 3. Monitor and Maintain

1. **Regular Monitoring**
   - Monitor contract usage
   - Watch for any errors or issues
   - Track user engagement metrics

2. **Backup and Recovery**
   - Keep deployment information secure
   - Document all contract addresses
   - Plan for emergency procedures

3. **Updates and Maintenance**
   - Plan for future contract upgrades
   - Monitor for security updates
   - Keep documentation current

## Troubleshooting

### Common Issues

#### 1. Insufficient STX Balance

**Error**: `Insufficient balance for transaction`

**Solution**:
- Check your STX balance
- Request more testnet STX if needed
- Ensure you have enough for fees

#### 2. Contract Deployment Fails

**Error**: `Contract deployment failed`

**Solution**:
- Check network connectivity
- Verify private key is correct
- Ensure contract syntax is valid
- Check for duplicate contract names

#### 3. Contract Reference Errors

**Error**: `Contract not found`

**Solution**:
- Verify contract addresses are correct
- Check that contracts were deployed in the right order
- Ensure contract references are updated properly

#### 4. Transaction Timeout

**Error**: `Transaction timeout`

**Solution**:
- Wait for network congestion to clear
- Increase transaction fees
- Retry the transaction

### Debug Commands

```bash
# Check contract status
npm run check-contracts -- --network testnet

# Verify deployment
npm run verify-deployment -- --network testnet

# Test specific functions
npm run test-function -- --function follow-user --network testnet

# Check user data
npm run check-user -- --user ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM --network testnet
```

### Getting Help

If you encounter issues:

1. **Check Documentation**
   - Review this deployment guide
   - Check the contract guide
   - Review error codes

2. **Community Support**
   - Stacks Discord: [https://discord.gg/stacks](https://discord.gg/stacks)
   - Stacks Forum: [https://forum.stacks.org](https://forum.stacks.org)

3. **Developer Resources**
   - Stacks Documentation: [https://docs.stacks.co](https://docs.stacks.co)
   - Clarity Language Guide: [https://docs.stacks.co/write-smart-contracts/](https://docs.stacks.co/write-smart-contracts/)

## Security Considerations

### Before Deployment

1. **Code Review**
   - Review all contract code thoroughly
   - Check for security vulnerabilities
   - Verify access controls

2. **Testing**
   - Run comprehensive tests
   - Test edge cases
   - Validate error conditions

3. **Key Management**
   - Use secure key storage
   - Consider hardware wallets
   - Backup keys securely

### After Deployment

1. **Monitoring**
   - Monitor contract activity
   - Watch for suspicious transactions
   - Track user behavior

2. **Access Control**
   - Limit admin access
   - Monitor admin functions
   - Plan for key rotation

3. **Emergency Procedures**
   - Have a plan for emergencies
   - Document recovery procedures
   - Keep contact information current

## Cost Estimation

### Testnet Deployment
- Follow System Contract: ~0.01 STX
- Reputation Contract: ~0.01 STX
- Privacy Contract: ~0.01 STX
- **Total**: ~0.03 STX

### Mainnet Deployment
- Follow System Contract: ~0.05 STX
- Reputation Contract: ~0.05 STX
- Privacy Contract: ~0.05 STX
- **Total**: ~0.15 STX

### Ongoing Costs
- User registration: ~0.001 STX per user
- Follow/unfollow operations: ~0.001 STX per operation
- Profile updates: ~0.001 STX per update

## Best Practices

1. **Always test on testnet first**
2. **Keep private keys secure**
3. **Monitor deployments closely**
4. **Document everything**
5. **Have a rollback plan**
6. **Test with real users before mainnet**
7. **Monitor performance and usage**
8. **Keep backups of deployment information** 