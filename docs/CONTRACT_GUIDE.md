# Stacks Follow System - Contract Guide

This guide provides detailed documentation for all smart contracts in the Stacks Follow System, including function descriptions, parameters, return values, and usage examples.

## Table of Contents

1. [Follow System Contract](#follow-system-contract)
2. [Reputation Contract](#reputation-contract)
3. [Privacy Contract](#privacy-contract)
4. [Contract Interactions](#contract-interactions)
5. [Error Codes](#error-codes)
6. [Best Practices](#best-practices)

## Follow System Contract

The main contract that handles follow/unfollow operations, user registration, and relationship management.

### User Management Functions

#### `register-user`

Registers a new user in the system.

**Parameters:**
- `username` (string-ascii 50): Unique username for the user
- `display-name` (string-utf8 100): Display name shown to other users
- `bio` (string-utf8 500): User biography/description
- `avatar-url` (string-ascii 200): URL to user's avatar image
- `is-private` (bool): Whether the account is private

**Returns:**
```clarity
(ok (tuple 
  (user principal)
  (username (string-ascii 50))
  (display-name (string-utf8 100))
  (is-private bool)
))
```

**Example:**
```clarity
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.follow-system register-user
  "alice"
  "Alice Johnson"
  "Blockchain enthusiast and developer"
  "https://example.com/avatar.jpg"
  false
)
```

#### `update-profile`

Updates an existing user's profile information.

**Parameters:**
- `username` (string-ascii 50): New username
- `display-name` (string-utf8 100): New display name
- `bio` (string-utf8 500): New biography
- `avatar-url` (string-ascii 200): New avatar URL
- `is-private` (bool): New privacy setting

**Returns:**
```clarity
(ok (tuple 
  (status (string-ascii 20))
  (user principal)
))
```

### Follow/Unfollow Functions

#### `follow-user`

Follows another user. For private accounts, this creates a follow request.

**Parameters:**
- `target` (principal): Address of the user to follow

**Returns:**
```clarity
(ok (tuple 
  (status (string-ascii 20))
  (target principal)
))
```

**Example:**
```clarity
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.follow-system follow-user
  'ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND
)
```

#### `unfollow-user`

Unfollows a previously followed user.

**Parameters:**
- `target` (principal): Address of the user to unfollow

**Returns:**
```clarity
(ok (tuple 
  (status (string-ascii 20))
  (target principal)
))
```

### Follow Request Management

#### `approve-follow-request`

Approves a pending follow request (for private accounts).

**Parameters:**
- `requester` (principal): Address of the user who sent the request

**Returns:**
```clarity
(ok (tuple 
  (status (string-ascii 20))
  (requester principal)
))
```

#### `reject-follow-request`

Rejects a pending follow request.

**Parameters:**
- `requester` (principal): Address of the user who sent the request

**Returns:**
```clarity
(ok (tuple 
  (status (string-ascii 20))
  (requester principal)
))
```

### Block/Unblock Functions

#### `block-user`

Blocks a user, removing any existing follow relationships.

**Parameters:**
- `target` (principal): Address of the user to block

**Returns:**
```clarity
(ok (tuple 
  (status (string-ascii 20))
  (target principal)
))
```

#### `unblock-user`

Unblocks a previously blocked user.

**Parameters:**
- `target` (principal): Address of the user to unblock

**Returns:**
```clarity
(ok (tuple 
  (status (string-ascii 20))
  (target principal)
))
```

### Read-Only Functions

#### `get-user-profile`

Retrieves a user's profile information.

**Parameters:**
- `user` (principal): Address of the user

**Returns:**
```clarity
(some (tuple 
  (username (string-ascii 50))
  (display-name (string-utf8 100))
  (bio (string-utf8 500))
  (avatar-url (string-ascii 200))
  (is-private bool)
  (created-at uint)
  (last-active uint)
))
```

#### `get-follower-count`

Gets the number of followers for a user.

**Parameters:**
- `user` (principal): Address of the user

**Returns:**
```clarity
uint
```

#### `get-following-count`

Gets the number of users a user is following.

**Parameters:**
- `user` (principal): Address of the user

**Returns:**
```clarity
uint
```

#### `is-user-following`

Checks if one user is following another.

**Parameters:**
- `follower` (principal): Address of the potential follower
- `following` (principal): Address of the potential followee

**Returns:**
```clarity
(some uint) // Timestamp of when the follow occurred
```

## Reputation Contract

Handles user reputation scoring based on follower interactions and engagement.

### Reputation Management Functions

#### `initialize-user-reputation`

Initializes reputation tracking for a new user.

**Parameters:**
- `user` (principal): Address of the user to initialize

**Returns:**
```clarity
(ok (tuple 
  (user principal)
  (initial-score uint)
  (tier uint)
  (tier-name (string-ascii 20))
))
```

#### `calculate-reputation`

Calculates and updates a user's reputation score.

**Parameters:**
- `user` (principal): Address of the user

**Returns:**
```clarity
(ok (tuple 
  (score uint)
  (tier uint)
  (last-calculated uint)
  (active-days uint)
  (profile-completion-bonus bool)
  (total-followers-ever uint)
  (total-following-ever uint)
))
```

#### `add-reputation-points-manual`

Manually adds or subtracts reputation points (admin only).

**Parameters:**
- `user` (principal): Address of the user
- `points` (int): Points to add (positive) or subtract (negative)
- `reason` (string-ascii 100): Reason for the points change

**Returns:**
```clarity
(ok (tuple 
  (old-score uint)
  (new-score uint)
  (old-tier uint)
  (new-tier uint)
  (tier-name (string-ascii 20))
))
```

### Event Handling Functions

#### `handle-follow-event`

Handles follow events from the follow system (admin only).

**Parameters:**
- `follower` (principal): Address of the follower
- `following` (principal): Address of the user being followed

**Returns:**
```clarity
(ok bool)
```

#### `handle-unfollow-event`

Handles unfollow events from the follow system (admin only).

**Parameters:**
- `follower` (principal): Address of the follower
- `following` (principal): Address of the user being unfollowed

**Returns:**
```clarity
(ok bool)
```

#### `handle-block-event`

Handles block events from the follow system (admin only).

**Parameters:**
- `blocker` (principal): Address of the user doing the blocking
- `blocked` (principal): Address of the user being blocked

**Returns:**
```clarity
(ok bool)
```

### Read-Only Functions

#### `get-user-reputation`

Gets a user's complete reputation data.

**Parameters:**
- `user` (principal): Address of the user

**Returns:**
```clarity
(some (tuple 
  (score uint)
  (tier uint)
  (last-calculated uint)
  (active-days uint)
  (profile-completion-bonus bool)
  (total-followers-ever uint)
  (total-following-ever uint)
))
```

#### `get-reputation-score`

Gets just the reputation score for a user.

**Parameters:**
- `user` (principal): Address of the user

**Returns:**
```clarity
uint
```

#### `get-reputation-tier`

Gets the reputation tier for a user.

**Parameters:**
- `user` (principal): Address of the user

**Returns:**
```clarity
uint
```

#### `get-user-tier-name`

Gets the tier name as a string.

**Parameters:**
- `user` (principal): Address of the user

**Returns:**
```clarity
(string-ascii 20)
```

### Reputation Tiers

1. **Newcomer** (0-99 points): Default tier for new users
2. **Rising** (100-499 points): Users gaining traction
3. **Popular** (500-999 points): Well-known users
4. **Influencer** (1000-4999 points): High-impact users
5. **Legendary** (5000+ points): Exceptional users

## Privacy Contract

Manages user privacy settings and access controls.

### Privacy Settings Functions

#### `set-privacy-settings`

Sets comprehensive privacy settings for a user.

**Parameters:**
- `privacy-level` (uint): Privacy level (1=Public, 2=Followers Only, 3=Private)
- `allow-follow-requests` (bool): Whether to allow follow requests
- `show-follower-count` (bool): Whether to show follower count
- `show-following-count` (bool): Whether to show following count
- `show-profile-to-public` (bool): Whether to show profile to public
- `allow-direct-messages` (bool): Whether to allow direct messages
- `auto-approve-followers` (bool): Whether to auto-approve followers

**Returns:**
```clarity
(ok (tuple 
  (user principal)
  (privacy-level uint)
  (allow-follow-requests bool)
  (show-follower-count bool)
  (show-following-count bool)
  (show-profile-to-public bool)
  (allow-direct-messages bool)
  (auto-approve-followers bool)
))
```

### Access Control Functions

#### `can-access-profile`

Checks if a user can access another user's profile.

**Parameters:**
- `requester` (principal): Address of the user requesting access
- `target` (principal): Address of the user whose profile is being accessed

**Returns:**
```clarity
(ok bool)
```

#### `can-see-follower-count`

Checks if a user can see another user's follower count.

**Parameters:**
- `requester` (principal): Address of the user requesting access
- `target` (principal): Address of the user whose follower count is being accessed

**Returns:**
```clarity
(ok bool)
```

#### `can-see-following-count`

Checks if a user can see another user's following count.

**Parameters:**
- `requester` (principal): Address of the user requesting access
- `target` (principal): Address of the user whose following count is being accessed

**Returns:**
```clarity
(ok bool)
```

#### `can-send-direct-message`

Checks if a user can send a direct message to another user.

**Parameters:**
- `requester` (principal): Address of the user sending the message
- `target` (principal): Address of the user receiving the message

**Returns:**
```clarity
(ok bool)
```

### Whitelist Management

#### `add-to-whitelist`

Adds a user to the privacy whitelist.

**Parameters:**
- `target` (principal): Address of the user to whitelist

**Returns:**
```clarity
(ok (tuple 
  (user principal)
  (status (string-ascii 20))
))
```

#### `remove-from-whitelist`

Removes a user from the privacy whitelist.

**Parameters:**
- `target` (principal): Address of the user to remove from whitelist

**Returns:**
```clarity
(ok (tuple 
  (user principal)
  (status (string-ascii 20))
))
```

### Blacklist Management

#### `add-to-blacklist`

Adds a user to the privacy blacklist.

**Parameters:**
- `target` (principal): Address of the user to blacklist

**Returns:**
```clarity
(ok (tuple 
  (user principal)
  (status (string-ascii 20))
))
```

#### `remove-from-blacklist`

Removes a user from the privacy blacklist.

**Parameters:**
- `target` (principal): Address of the user to remove from blacklist

**Returns:**
```clarity
(ok (tuple 
  (user principal)
  (status (string-ascii 20))
))
```

### Read-Only Functions

#### `get-user-privacy-settings`

Gets a user's privacy settings.

**Parameters:**
- `user` (principal): Address of the user

**Returns:**
```clarity
(some (tuple 
  (privacy-level uint)
  (allow-follow-requests bool)
  (show-follower-count bool)
  (show-following-count bool)
  (show-profile-to-public bool)
  (allow-direct-messages bool)
  (auto-approve-followers bool)
  (last-updated uint)
))
```

#### `get-privacy-recommendations`

Gets privacy recommendations based on user's current settings and activity.

**Parameters:**
- `user` (principal): Address of the user

**Returns:**
```clarity
(ok (tuple 
  (user principal)
  (follower-count uint)
  (following-count uint)
  (privacy-level uint)
  (recommendations (list (string-ascii 200)))
))
```

## Contract Interactions

### Follow System → Reputation

When a follow event occurs, the follow system should call the reputation contract:

```clarity
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.reputation handle-follow-event
  follower-address
  following-address
)
```

### Follow System → Privacy

The follow system checks privacy settings before allowing operations:

```clarity
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.privacy can-access-profile
  requester-address
  target-address
)
```

### Reputation → Follow System

The reputation contract reads follow data to calculate scores:

```clarity
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.follow-system get-follower-count
  user-address
)
```

## Error Codes

### Follow System Errors
- `u1001`: User not found
- `u1002`: Already following
- `u1003`: Not following
- `u1004`: Cannot follow self
- `u1005`: User blocked
- `u1006`: Rate limit exceeded
- `u1007`: Max followers reached
- `u1008`: Max following reached
- `u1009`: Private account
- `u1010`: Follow request pending
- `u1011`: Follow request not found
- `u1012`: Unauthorized
- `u1013`: Invalid input

### Reputation Errors
- `u2001`: User not found
- `u2002`: Invalid points
- `u2003`: Unauthorized
- `u2004`: Already calculated
- `u2005`: Invalid tier

### Privacy Errors
- `u3001`: User not found
- `u3002`: Invalid privacy level
- `u3003`: Access denied
- `u3004`: Unauthorized
- `u3005`: Already whitelisted
- `u3006`: Already blacklisted
- `u3007`: Not whitelisted
- `u3008`: Not blacklisted
- `u3009`: Invalid access type

## Best Practices

### Security
1. Always validate input parameters
2. Check authorization before sensitive operations
3. Use rate limiting to prevent spam
4. Implement proper error handling
5. Test thoroughly before mainnet deployment

### Performance
1. Minimize contract calls in loops
2. Use efficient data structures
3. Batch operations when possible
4. Optimize gas usage

### User Experience
1. Provide clear error messages
2. Implement graceful degradation
3. Use sensible defaults
4. Consider privacy by design

### Development
1. Write comprehensive tests
2. Document all functions
3. Use consistent naming conventions
4. Follow Clarity best practices
5. Regular security audits 