# Stacks Follow System - API Reference

This document provides a comprehensive API reference for all smart contracts in the Stacks Follow System.

## Table of Contents

1. [Follow System Contract](#follow-system-contract)
2. [Reputation Contract](#reputation-contract)
3. [Privacy Contract](#privacy-contract)
4. [Error Codes](#error-codes)
5. [Events](#events)
6. [Data Types](#data-types)

## Follow System Contract

**Contract ID**: `ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.follow-system`

### Public Functions

#### `register-user`

Registers a new user in the system.

**Signature**:
```clarity
(define-public (register-user (username (string-ascii 50)) (bio (string-ascii 200)) (avatar-url (string-ascii 255)))
```

**Parameters**:
- `username` (string-ascii 50): User's display name (1-50 characters)
- `bio` (string-ascii 200): User's biography (0-200 characters)
- `avatar-url` (string-ascii 255): URL to user's avatar image (0-255 characters)

**Returns**: `(response bool uint)`
- Success: `(ok true)`
- Error: `(err error-code)`

**Example**:
```clarity
(contract-call? follow-system register-user "alice" "Blockchain enthusiast" "https://example.com/avatar.jpg")
```

**Error Codes**:
- `ERR-USER-ALREADY-EXISTS`: User is already registered
- `ERR-INVALID-INPUT`: Invalid input parameters

---

#### `follow-user`

Follows another user.

**Signature**:
```clarity
(define-public (follow-user (target principal))
```

**Parameters**:
- `target` (principal): Address of the user to follow

**Returns**: `(response bool uint)`
- Success: `(ok true)`
- Error: `(err error-code)`

**Example**:
```clarity
(contract-call? follow-system follow-user 'ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND)
```

**Error Codes**:
- `ERR-USER-NOT-FOUND`: Target user not found
- `ERR-CANNOT-FOLLOW-SELF`: Cannot follow yourself
- `ERR-ALREADY-FOLLOWING`: Already following target user
- `ERR-USER-BLOCKED`: User is blocked
- `ERR-RATE-LIMIT-EXCEEDED`: Rate limit exceeded

---

#### `unfollow-user`

Unfollows another user.

**Signature**:
```clarity
(define-public (unfollow-user (target principal))
```

**Parameters**:
- `target` (principal): Address of the user to unfollow

**Returns**: `(response bool uint)`
- Success: `(ok true)`
- Error: `(err error-code)`

**Example**:
```clarity
(contract-call? follow-system unfollow-user 'ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND)
```

**Error Codes**:
- `ERR-USER-NOT-FOUND`: Target user not found
- `ERR-NOT-FOLLOWING`: Not following target user

---

#### `approve-follow-request`

Approves a pending follow request.

**Signature**:
```clarity
(define-public (approve-follow-request (requester principal))
```

**Parameters**:
- `requester` (principal): Address of the user who sent the request

**Returns**: `(response bool uint)`
- Success: `(ok true)`
- Error: `(err error-code)`

**Example**:
```clarity
(contract-call? follow-system approve-follow-request 'ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND)
```

**Error Codes**:
- `ERR-USER-NOT-FOUND`: Requester not found
- `ERR-NO-PENDING-REQUEST`: No pending request from requester

---

#### `reject-follow-request`

Rejects a pending follow request.

**Signature**:
```clarity
(define-public (reject-follow-request (requester principal))
```

**Parameters**:
- `requester` (principal): Address of the user who sent the request

**Returns**: `(response bool uint)`
- Success: `(ok true)`
- Error: `(err error-code)`

**Example**:
```clarity
(contract-call? follow-system reject-follow-request 'ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND)
```

**Error Codes**:
- `ERR-USER-NOT-FOUND`: Requester not found
- `ERR-NO-PENDING-REQUEST`: No pending request from requester

---

#### `block-user`

Blocks another user.

**Signature**:
```clarity
(define-public (block-user (target principal))
```

**Parameters**:
- `target` (principal): Address of the user to block

**Returns**: `(response bool uint)`
- Success: `(ok true)`
- Error: `(err error-code)`

**Example**:
```clarity
(contract-call? follow-system block-user 'ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND)
```

**Error Codes**:
- `ERR-USER-NOT-FOUND`: Target user not found
- `ERR-CANNOT-BLOCK-SELF`: Cannot block yourself
- `ERR-ALREADY-BLOCKED`: Already blocked target user

---

#### `unblock-user`

Unblocks another user.

**Signature**:
```clarity
(define-public (unblock-user (target principal))
```

**Parameters**:
- `target` (principal): Address of the user to unblock

**Returns**: `(response bool uint)`
- Success: `(ok true)`
- Error: `(err error-code)`

**Example**:
```clarity
(contract-call? follow-system unblock-user 'ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND)
```

**Error Codes**:
- `ERR-USER-NOT-FOUND`: Target user not found
- `ERR-NOT-BLOCKED`: Not blocking target user

---

#### `update-profile`

Updates user profile information.

**Signature**:
```clarity
(define-public (update-profile (username (string-ascii 50)) (bio (string-ascii 200)) (avatar-url (string-ascii 255)))
```

**Parameters**:
- `username` (string-ascii 50): New display name (1-50 characters)
- `bio` (string-ascii 200): New biography (0-200 characters)
- `avatar-url` (string-ascii 255): New avatar URL (0-255 characters)

**Returns**: `(response bool uint)`
- Success: `(ok true)`
- Error: `(err error-code)`

**Example**:
```clarity
(contract-call? follow-system update-profile "alice_updated" "Updated bio" "https://example.com/new-avatar.jpg")
```

**Error Codes**:
- `ERR-USER-NOT-FOUND`: User not found
- `ERR-INVALID-INPUT`: Invalid input parameters

### Read-Only Functions

#### `get-user-profile`

Retrieves user profile information.

**Signature**:
```clarity
(define-read-only (get-user-profile (user principal))
```

**Parameters**:
- `user` (principal): Address of the user

**Returns**: `(optional (tuple (username (string-ascii 50)) (bio (string-ascii 200)) (avatar-url (string-ascii 255)) (registration-block uint)))`

**Example**:
```clarity
(contract-call? follow-system get-user-profile 'ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND)
```

---

#### `get-follower-count`

Gets the number of followers for a user.

**Signature**:
```clarity
(define-read-only (get-follower-count (user principal))
```

**Parameters**:
- `user` (principal): Address of the user

**Returns**: `uint`

**Example**:
```clarity
(contract-call? follow-system get-follower-count 'ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND)
```

---

#### `get-following-count`

Gets the number of users a user is following.

**Signature**:
```clarity
(define-read-only (get-following-count (user principal))
```

**Parameters**:
- `user` (principal): Address of the user

**Returns**: `uint`

**Example**:
```clarity
(contract-call? follow-system get-following-count 'ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND)
```

---

#### `is-user-following`

Checks if one user is following another.

**Signature**:
```clarity
(define-read-only (is-user-following (follower principal) (following principal))
```

**Parameters**:
- `follower` (principal): Address of the follower
- `following` (principal): Address of the user being followed

**Returns**: `bool`

**Example**:
```clarity
(contract-call? follow-system is-user-following 'ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND 'ST3AM1A56AK2C1XAFJ4115ZSV26EB49BVQ10MGCS0)
```

---

#### `is-user-blocked`

Checks if one user is blocked by another.

**Signature**:
```clarity
(define-read-only (is-user-blocked (blocker principal) (blocked principal))
```

**Parameters**:
- `blocker` (principal): Address of the user doing the blocking
- `blocked` (principal): Address of the user being blocked

**Returns**: `bool`

**Example**:
```clarity
(contract-call? follow-system is-user-blocked 'ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND 'ST3AM1A56AK2C1XAFJ4115ZSV26EB49BVQ10MGCS0)
```

---

#### `has-pending-follow-request`

Checks if there's a pending follow request.

**Signature**:
```clarity
(define-read-only (has-pending-follow-request (requester principal) (target principal))
```

**Parameters**:
- `requester` (principal): Address of the user who sent the request
- `target` (principal): Address of the user who received the request

**Returns**: `bool`

**Example**:
```clarity
(contract-call? follow-system has-pending-follow-request 'ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND 'ST3AM1A56AK2C1XAFJ4115ZSV26EB49BVQ10MGCS0)
```

## Reputation Contract

**Contract ID**: `ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.reputation`

### Public Functions

#### `initialize-user-reputation`

Initializes reputation for a new user.

**Signature**:
```clarity
(define-public (initialize-user-reputation (user principal))
```

**Parameters**:
- `user` (principal): Address of the user

**Returns**: `(response bool uint)`
- Success: `(ok true)`
- Error: `(err error-code)`

**Example**:
```clarity
(contract-call? reputation initialize-user-reputation 'ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND)
```

**Error Codes**:
- `ERR-USER-ALREADY-HAS-REPUTATION`: User already has reputation
- `ERR-UNAUTHORIZED`: Only admin can initialize reputation

---

#### `calculate-reputation`

Calculates reputation for a user based on their activity.

**Signature**:
```clarity
(define-public (calculate-reputation (user principal))
```

**Parameters**:
- `user` (principal): Address of the user

**Returns**: `(response uint uint)`
- Success: `(ok reputation-score)`
- Error: `(err error-code)`

**Example**:
```clarity
(contract-call? reputation calculate-reputation 'ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND)
```

**Error Codes**:
- `ERR-USER-NOT-FOUND`: User not found

---

#### `add-reputation-points-manual`

Manually adds reputation points (admin only).

**Signature**:
```clarity
(define-public (add-reputation-points-manual (user principal) (points int) (reason (string-ascii 100)))
```

**Parameters**:
- `user` (principal): Address of the user
- `points` (int): Points to add (can be negative)
- `reason` (string-ascii 100): Reason for the points

**Returns**: `(response bool uint)`
- Success: `(ok true)`
- Error: `(err error-code)`

**Example**:
```clarity
(contract-call? reputation add-reputation-points-manual 'ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND 50 "Good behavior")
```

**Error Codes**:
- `ERR-UNAUTHORIZED`: Only admin can add points
- `ERR-USER-NOT-FOUND`: User not found

---

#### `handle-follow-event`

Handles follow event from follow system (admin only).

**Signature**:
```clarity
(define-public (handle-follow-event (follower principal) (following principal))
```

**Parameters**:
- `follower` (principal): Address of the follower
- `following` (principal): Address of the user being followed

**Returns**: `(response bool uint)`
- Success: `(ok true)`
- Error: `(err error-code)`

**Example**:
```clarity
(contract-call? reputation handle-follow-event 'ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND 'ST3AM1A56AK2C1XAFJ4115ZSV26EB49BVQ10MGCS0)
```

**Error Codes**:
- `ERR-UNAUTHORIZED`: Only follow system can call this
- `ERR-USER-NOT-FOUND`: User not found

---

#### `handle-unfollow-event`

Handles unfollow event from follow system (admin only).

**Signature**:
```clarity
(define-public (handle-unfollow-event (follower principal) (following principal))
```

**Parameters**:
- `follower` (principal): Address of the follower
- `following` (principal): Address of the user being unfollowed

**Returns**: `(response bool uint)`
- Success: `(ok true)`
- Error: `(err error-code)`

**Example**:
```clarity
(contract-call? reputation handle-unfollow-event 'ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND 'ST3AM1A56AK2C1XAFJ4115ZSV26EB49BVQ10MGCS0)
```

**Error Codes**:
- `ERR-UNAUTHORIZED`: Only follow system can call this
- `ERR-USER-NOT-FOUND`: User not found

---

#### `handle-block-event`

Handles block event from follow system (admin only).

**Signature**:
```clarity
(define-public (handle-block-event (blocker principal) (blocked principal))
```

**Parameters**:
- `blocker` (principal): Address of the user doing the blocking
- `blocked` (principal): Address of the user being blocked

**Returns**: `(response bool uint)`
- Success: `(ok true)`
- Error: `(err error-code)`

**Example**:
```clarity
(contract-call? reputation handle-block-event 'ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND 'ST3AM1A56AK2C1XAFJ4115ZSV26EB49BVQ10MGCS0)
```

**Error Codes**:
- `ERR-UNAUTHORIZED`: Only follow system can call this
- `ERR-USER-NOT-FOUND`: User not found

---

#### `award-profile-completion-bonus`

Awards bonus points for profile completion (admin only).

**Signature**:
```clarity
(define-public (award-profile-completion-bonus (user principal))
```

**Parameters**:
- `user` (principal): Address of the user

**Returns**: `(response bool uint)`
- Success: `(ok true)`
- Error: `(err error-code)`

**Example**:
```clarity
(contract-call? reputation award-profile-completion-bonus 'ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND)
```

**Error Codes**:
- `ERR-UNAUTHORIZED`: Only admin can award bonus
- `ERR-USER-NOT-FOUND`: User not found
- `ERR-ALREADY-AWARDED`: Bonus already awarded

### Read-Only Functions

#### `get-user-reputation`

Gets user reputation information.

**Signature**:
```clarity
(define-read-only (get-user-reputation (user principal))
```

**Parameters**:
- `user` (principal): Address of the user

**Returns**: `(optional (tuple (score int) (tier uint) (last-updated uint) (total-points-earned uint) (total-points-lost uint)))`

**Example**:
```clarity
(contract-call? reputation get-user-reputation 'ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND)
```

---

#### `get-reputation-score`

Gets user reputation score.

**Signature**:
```clarity
(define-read-only (get-reputation-score (user principal))
```

**Parameters**:
- `user` (principal): Address of the user

**Returns**: `int`

**Example**:
```clarity
(contract-call? reputation get-reputation-score 'ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND)
```

---

#### `get-reputation-tier`

Gets user reputation tier.

**Signature**:
```clarity
(define-read-only (get-reputation-tier (user principal))
```

**Parameters**:
- `user` (principal): Address of the user

**Returns**: `uint`

**Example**:
```clarity
(contract-call? reputation get-reputation-tier 'ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND)
```

---

#### `get-tier-name`

Gets the name of a reputation tier.

**Signature**:
```clarity
(define-read-only (get-tier-name (tier uint))
```

**Parameters**:
- `tier` (uint): Tier number

**Returns**: `(string-ascii 20)`

**Example**:
```clarity
(contract-call? reputation get-tier-name 2)
```

---

#### `get-reputation-history`

Gets user reputation history.

**Signature**:
```clarity
(define-read-only (get-reputation-history (user principal) (limit uint))
```

**Parameters**:
- `user` (principal): Address of the user
- `limit` (uint): Maximum number of history entries to return

**Returns**: `(list (tuple (points int) (reason (string-ascii 100)) (timestamp uint)))`

**Example**:
```clarity
(contract-call? reputation get-reputation-history 'ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND 10)
```

---

#### `get-reputation-stats`

Gets reputation system statistics.

**Signature**:
```clarity
(define-read-only (get-reputation-stats)
```

**Parameters**: None

**Returns**: `(tuple (total-users uint) (average-score int) (highest-score int) (lowest-score int))`

**Example**:
```clarity
(contract-call? reputation get-reputation-stats)
```

## Privacy Contract

**Contract ID**: `ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.privacy`

### Public Functions

#### `set-privacy-settings`

Sets user privacy settings.

**Signature**:
```clarity
(define-public (set-privacy-settings (privacy-level uint) (show-follower-count bool) (show-following-count bool) (allow-direct-messages bool))
```

**Parameters**:
- `privacy-level` (uint): Privacy level (1=Public, 2=Followers Only, 3=Private)
- `show-follower-count` (bool): Whether to show follower count
- `show-following-count` (bool): Whether to show following count
- `allow-direct-messages` (bool): Whether to allow direct messages

**Returns**: `(response bool uint)`
- Success: `(ok true)`
- Error: `(err error-code)`

**Example**:
```clarity
(contract-call? privacy set-privacy-settings 2 true false true)
```

**Error Codes**:
- `ERR-INVALID-PRIVACY-LEVEL`: Invalid privacy level
- `ERR-USER-NOT-FOUND`: User not found

---

#### `can-access-profile`

Checks if a user can access another user's profile.

**Signature**:
```clarity
(define-public (can-access-profile (requester principal) (target principal))
```

**Parameters**:
- `requester` (principal): Address of the requesting user
- `target` (principal): Address of the target user

**Returns**: `(response bool uint)`
- Success: `(ok can-access)`
- Error: `(err error-code)`

**Example**:
```clarity
(contract-call? privacy can-access-profile 'ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND 'ST3AM1A56AK2C1XAFJ4115ZSV26EB49BVQ10MGCS0)
```

**Error Codes**:
- `ERR-USER-NOT-FOUND`: User not found

---

#### `can-see-follower-count`

Checks if a user can see another user's follower count.

**Signature**:
```clarity
(define-public (can-see-follower-count (requester principal) (target principal))
```

**Parameters**:
- `requester` (principal): Address of the requesting user
- `target` (principal): Address of the target user

**Returns**: `(response bool uint)`
- Success: `(ok can-see)`
- Error: `(err error-code)`

**Example**:
```clarity
(contract-call? privacy can-see-follower-count 'ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND 'ST3AM1A56AK2C1XAFJ4115ZSV26EB49BVQ10MGCS0)
```

**Error Codes**:
- `ERR-USER-NOT-FOUND`: User not found

---

#### `can-see-following-count`

Checks if a user can see another user's following count.

**Signature**:
```clarity
(define-public (can-see-following-count (requester principal) (target principal))
```

**Parameters**:
- `requester` (principal): Address of the requesting user
- `target` (principal): Address of the target user

**Returns**: `(response bool uint)`
- Success: `(ok can-see)`
- Error: `(err error-code)`

**Example**:
```clarity
(contract-call? privacy can-see-following-count 'ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND 'ST3AM1A56AK2C1XAFJ4115ZSV26EB49BVQ10MGCS0)
```

**Error Codes**:
- `ERR-USER-NOT-FOUND`: User not found

---

#### `can-send-direct-message`

Checks if a user can send a direct message to another user.

**Signature**:
```clarity
(define-public (can-send-direct-message (sender principal) (recipient principal))
```

**Parameters**:
- `sender` (principal): Address of the sender
- `recipient` (principal): Address of the recipient

**Returns**: `(response bool uint)`
- Success: `(ok can-send)`
- Error: `(err error-code)`

**Example**:
```clarity
(contract-call? privacy can-send-direct-message 'ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND 'ST3AM1A56AK2C1XAFJ4115ZSV26EB49BVQ10MGCS0)
```

**Error Codes**:
- `ERR-USER-NOT-FOUND`: User not found

---

#### `add-to-whitelist`

Adds a user to the whitelist.

**Signature**:
```clarity
(define-public (add-to-whitelist (whitelisted principal))
```

**Parameters**:
- `whitelisted` (principal): Address of the user to whitelist

**Returns**: `(response bool uint)`
- Success: `(ok true)`
- Error: `(err error-code)`

**Example**:
```clarity
(contract-call? privacy add-to-whitelist 'ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND)
```

**Error Codes**:
- `ERR-USER-NOT-FOUND`: User not found
- `ERR-ALREADY-WHITELISTED`: User already whitelisted
- `ERR-CANNOT-WHITELIST-SELF`: Cannot whitelist yourself

---

#### `remove-from-whitelist`

Removes a user from the whitelist.

**Signature**:
```clarity
(define-public (remove-from-whitelist (whitelisted principal))
```

**Parameters**:
- `whitelisted` (principal): Address of the user to remove from whitelist

**Returns**: `(response bool uint)`
- Success: `(ok true)`
- Error: `(err error-code)`

**Example**:
```clarity
(contract-call? privacy remove-from-whitelist 'ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND)
```

**Error Codes**:
- `ERR-USER-NOT-FOUND`: User not found
- `ERR-NOT-WHITELISTED`: User not in whitelist

---

#### `add-to-blacklist`

Adds a user to the blacklist.

**Signature**:
```clarity
(define-public (add-to-blacklist (blacklisted principal))
```

**Parameters**:
- `blacklisted` (principal): Address of the user to blacklist

**Returns**: `(response bool uint)`
- Success: `(ok true)`
- Error: `(err error-code)`

**Example**:
```clarity
(contract-call? privacy add-to-blacklist 'ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND)
```

**Error Codes**:
- `ERR-USER-NOT-FOUND`: User not found
- `ERR-ALREADY-BLACKLISTED`: User already blacklisted
- `ERR-CANNOT-BLACKLIST-SELF`: Cannot blacklist yourself

---

#### `remove-from-blacklist`

Removes a user from the blacklist.

**Signature**:
```clarity
(define-public (remove-from-blacklist (blacklisted principal))
```

**Parameters**:
- `blacklisted` (principal): Address of the user to remove from blacklist

**Returns**: `(response bool uint)`
- Success: `(ok true)`
- Error: `(err error-code)`

**Example**:
```clarity
(contract-call? privacy remove-from-blacklist 'ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND)
```

**Error Codes**:
- `ERR-USER-NOT-FOUND`: User not found
- `ERR-NOT-BLACKLISTED`: User not in blacklist

---

#### `get-privacy-recommendations`

Gets privacy recommendations for a user.

**Signature**:
```clarity
(define-public (get-privacy-recommendations (user principal))
```

**Parameters**:
- `user` (principal): Address of the user

**Returns**: `(response (list (string-ascii 200)) uint)`
- Success: `(ok recommendations)`
- Error: `(err error-code)`

**Example**:
```clarity
(contract-call? privacy get-privacy-recommendations 'ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND)
```

**Error Codes**:
- `ERR-USER-NOT-FOUND`: User not found

### Read-Only Functions

#### `get-privacy-settings`

Gets user privacy settings.

**Signature**:
```clarity
(define-read-only (get-privacy-settings (user principal))
```

**Parameters**:
- `user` (principal): Address of the user

**Returns**: `(optional (tuple (privacy-level uint) (show-follower-count bool) (show-following-count bool) (allow-direct-messages bool)))`

**Example**:
```clarity
(contract-call? privacy get-privacy-settings 'ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND)
```

---

#### `is-whitelisted`

Checks if a user is whitelisted by another user.

**Signature**:
```clarity
(define-read-only (is-whitelisted (whitelister principal) (whitelisted principal))
```

**Parameters**:
- `whitelister` (principal): Address of the user doing the whitelisting
- `whitelisted` (principal): Address of the whitelisted user

**Returns**: `bool`

**Example**:
```clarity
(contract-call? privacy is-whitelisted 'ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND 'ST3AM1A56AK2C1XAFJ4115ZSV26EB49BVQ10MGCS0)
```

---

#### `is-blacklisted`

Checks if a user is blacklisted by another user.

**Signature**:
```clarity
(define-read-only (is-blacklisted (blacklister principal) (blacklisted principal))
```

**Parameters**:
- `blacklister` (principal): Address of the user doing the blacklisting
- `blacklisted` (principal): Address of the blacklisted user

**Returns**: `bool`

**Example**:
```clarity
(contract-call? privacy is-blacklisted 'ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND 'ST3AM1A56AK2C1XAFJ4115ZSV26EB49BVQ10MGCS0)
```

---

#### `get-privacy-access-logs`

Gets privacy access logs for a user.

**Signature**:
```clarity
(define-read-only (get-privacy-access-logs (user principal) (limit uint))
```

**Parameters**:
- `user` (principal): Address of the user
- `limit` (uint): Maximum number of log entries to return

**Returns**: `(list (tuple (requester principal) (action (string-ascii 50)) (timestamp uint)))`

**Example**:
```clarity
(contract-call? privacy get-privacy-access-logs 'ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND 10)
```

---

#### `get-privacy-stats`

Gets privacy system statistics.

**Signature**:
```clarity
(define-read-only (get-privacy-stats)
```

**Parameters**: None

**Returns**: `(tuple (total-private-accounts uint) (total-public-accounts uint) (total-followers-only uint))`

**Example**:
```clarity
(contract-call? privacy get-privacy-stats)
```

---

#### `get-privacy-level-name`

Gets the name of a privacy level.

**Signature**:
```clarity
(define-read-only (get-privacy-level-name (level uint))
```

**Parameters**:
- `level` (uint): Privacy level number

**Returns**: `(string-ascii 20)`

**Example**:
```clarity
(contract-call? privacy get-privacy-level-name 2)
```

## Error Codes

### Follow System Contract Errors

| Code | Name | Description |
|------|------|-------------|
| 1000 | `ERR-USER-NOT-FOUND` | User not found in the system |
| 1001 | `ERR-USER-ALREADY-EXISTS` | User is already registered |
| 1002 | `ERR-CANNOT-FOLLOW-SELF` | Cannot follow yourself |
| 1003 | `ERR-ALREADY-FOLLOWING` | Already following the target user |
| 1004 | `ERR-NOT-FOLLOWING` | Not following the target user |
| 1005 | `ERR-CANNOT-BLOCK-SELF` | Cannot block yourself |
| 1006 | `ERR-ALREADY-BLOCKED` | Already blocking the target user |
| 1007 | `ERR-NOT-BLOCKED` | Not blocking the target user |
| 1008 | `ERR-NO-PENDING-REQUEST` | No pending follow request |
| 1009 | `ERR-USER-BLOCKED` | User is blocked |
| 1010 | `ERR-INVALID-INPUT` | Invalid input parameters |
| 1011 | `ERR-RATE-LIMIT-EXCEEDED` | Rate limit exceeded |
| 1012 | `ERR-UNAUTHORIZED` | Unauthorized access |

### Reputation Contract Errors

| Code | Name | Description |
|------|------|-------------|
| 2000 | `ERR-USER-NOT-FOUND` | User not found in the system |
| 2001 | `ERR-USER-ALREADY-HAS-REPUTATION` | User already has reputation |
| 2002 | `ERR-UNAUTHORIZED` | Unauthorized access |
| 2003 | `ERR-INVALID-POINTS` | Invalid reputation points |
| 2004 | `ERR-ALREADY-AWARDED` | Bonus already awarded |

### Privacy Contract Errors

| Code | Name | Description |
|------|------|-------------|
| 3000 | `ERR-USER-NOT-FOUND` | User not found in the system |
| 3001 | `ERR-INVALID-PRIVACY-LEVEL` | Invalid privacy level |
| 3002 | `ERR-ALREADY-WHITELISTED` | User already whitelisted |
| 3003 | `ERR-NOT-WHITELISTED` | User not in whitelist |
| 3004 | `ERR-CANNOT-WHITELIST-SELF` | Cannot whitelist yourself |
| 3005 | `ERR-ALREADY-BLACKLISTED` | User already blacklisted |
| 3006 | `ERR-NOT-BLACKLISTED` | User not in blacklist |
| 3007 | `ERR-CANNOT-BLACKLIST-SELF` | Cannot blacklist yourself |

## Events

### Follow System Events

#### `user-registered-event`
```clarity
(define-event user-registered-event (user principal) (username (string-ascii 50)) (block uint))
```

#### `follow-event`
```clarity
(define-event follow-event (follower principal) (following principal) (block uint))
```

#### `unfollow-event`
```clarity
(define-event unfollow-event (follower principal) (following principal) (block uint))
```

#### `follow-request-event`
```clarity
(define-event follow-request-event (requester principal) (target principal) (block uint))
```

#### `follow-approved-event`
```clarity
(define-event follow-approved-event (requester principal) (target principal) (block uint))
```

#### `follow-rejected-event`
```clarity
(define-event follow-rejected-event (requester principal) (target principal) (block uint))
```

#### `block-event`
```clarity
(define-event block-event (blocker principal) (blocked principal) (block uint))
```

#### `unblock-event`
```clarity
(define-event unblock-event (blocker principal) (blocked principal) (block uint))
```

#### `profile-updated-event`
```clarity
(define-event profile-updated-event (user principal) (block uint))
```

### Reputation Events

#### `reputation-initialized-event`
```clarity
(define-event reputation-initialized-event (user principal) (block uint))
```

#### `reputation-updated-event`
```clarity
(define-event reputation-updated-event (user principal) (old-score int) (new-score int) (reason (string-ascii 100)) (block uint))
```

#### `tier-upgraded-event`
```clarity
(define-event tier-upgraded-event (user principal) (old-tier uint) (new-tier uint) (block uint))
```

#### `bonus-awarded-event`
```clarity
(define-event bonus-awarded-event (user principal) (points int) (block uint))
```

### Privacy Events

#### `privacy-settings-updated-event`
```clarity
(define-event privacy-settings-updated-event (user principal) (privacy-level uint) (block uint))
```

#### `whitelist-added-event`
```clarity
(define-event whitelist-added-event (whitelister principal) (whitelisted principal) (block uint))
```

#### `whitelist-removed-event`
```clarity
(define-event whitelist-removed-event (whitelister principal) (whitelisted principal) (block uint))
```

#### `blacklist-added-event`
```clarity
(define-event blacklist-added-event (blacklister principal) (blacklisted principal) (block uint))
```

#### `blacklist-removed-event`
```clarity
(define-event blacklist-removed-event (blacklister principal) (blacklisted principal) (block uint))
```

#### `privacy-access-event`
```clarity
(define-event privacy-access-event (requester principal) (target principal) (action (string-ascii 50)) (allowed bool) (block uint))
```

## Data Types

### User Profile
```clarity
(tuple 
  (username (string-ascii 50))
  (bio (string-ascii 200))
  (avatar-url (string-ascii 255))
  (registration-block uint)
)
```

### Reputation Data
```clarity
(tuple 
  (score int)
  (tier uint)
  (last-updated uint)
  (total-points-earned uint)
  (total-points-lost uint)
)
```

### Privacy Settings
```clarity
(tuple 
  (privacy-level uint)
  (show-follower-count bool)
  (show-following-count bool)
  (allow-direct-messages bool)
)
```

### Rate Limit Data
```clarity
(tuple 
  (last-block uint)
  (action-count uint)
)
```

### Reputation History Entry
```clarity
(tuple 
  (points int)
  (reason (string-ascii 100))
  (timestamp uint)
)
```

### Privacy Access Log Entry
```clarity
(tuple 
  (requester principal)
  (action (string-ascii 50))
  (timestamp uint)
)
```

## Usage Examples

### Complete User Registration Flow

```clarity
;; 1. Register user in follow system
(contract-call? follow-system register-user "alice" "Blockchain enthusiast" "https://example.com/avatar.jpg")

;; 2. Initialize reputation
(contract-call? reputation initialize-user-reputation tx-sender)

;; 3. Set privacy settings
(contract-call? privacy set-privacy-settings 2 true true true)
```

### Follow Another User

```clarity
;; Follow a user
(contract-call? follow-system follow-user 'ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND)

;; Check if following
(contract-call? follow-system is-user-following tx-sender 'ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND)

;; Get follower count
(contract-call? follow-system get-follower-count 'ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND)
```

### Privacy Control Example

```clarity
;; Set private account
(contract-call? privacy set-privacy-settings 3 false false false)

;; Add user to whitelist
(contract-call? privacy add-to-whitelist 'ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND)

;; Check if user can access profile
(contract-call? privacy can-access-profile 'ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND tx-sender)
```

### Reputation Management

```clarity
;; Get current reputation
(contract-call? reputation get-user-reputation tx-sender)

;; Get reputation tier name
(let ((tier (contract-call? reputation get-reputation-tier tx-sender)))
  (contract-call? reputation get-tier-name tier))

;; Get reputation history
(contract-call? reputation get-reputation-history tx-sender 10)
```

## Best Practices

### Error Handling
Always check the response of contract calls and handle errors appropriately:

```clarity
(match (contract-call? follow-system follow-user target)
  success (ok "Followed successfully")
  error (err "Failed to follow user")
)
```

### Input Validation
Validate inputs before making contract calls:

```clarity
(define-private (safe-follow (target principal))
  (begin
    (asserts (not (eq? tx-sender target)) "Cannot follow yourself")
    (contract-call? follow-system follow-user target)
  )
)
```

### Batch Operations
For multiple operations, consider using batch functions when available:

```clarity
;; Instead of multiple individual calls, use batch operations
(define-public (batch-follow (targets (list principal)))
  (fold follow-user targets)
)
```

### Gas Optimization
Optimize gas usage by minimizing contract calls:

```clarity
;; Cache frequently used data
(let ((profile (contract-call? follow-system get-user-profile user)))
  ;; Use cached profile data
)
```

## Conclusion

This API reference provides comprehensive documentation for all functions in the Stacks Follow System. Use this guide to understand function signatures, parameters, return values, and proper usage patterns. Always refer to the latest contract code for the most up-to-date information. 