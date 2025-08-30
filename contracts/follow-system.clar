;; Stacks Follow System - Main Contract
;; Handles follow/unfollow operations, follower counting, and relationship management

(define-constant CONTRACT_OWNER tx-sender)
(define-constant MAX_FOLLOWERS_PER_USER 10000)
(define-constant MAX_FOLLOWING_PER_USER 5000)
(define-constant RATE_LIMIT_WINDOW 100) ;; blocks
(define-constant MAX_ACTIONS_PER_WINDOW 50)

;; Data structures
(define-data-var total-users uint 0)
(define-data-var total-follows uint 0)

;; User profile data
(define-map user-profiles (principal) (tuple 
  (username (string-ascii 50))
  (display-name (string-utf8 100))
  (bio (string-utf8 500))
  (avatar-url (string-ascii 200))
  (is-private bool)
  (created-at uint)
  (last-active uint)
))

;; Follow relationships: follower -> following -> timestamp
(define-map follow-relationships (principal principal) uint)

;; Follower counts: user -> follower count
(define-map follower-counts (principal) uint)

;; Following counts: user -> following count
(define-map following-counts (principal) uint)

;; Rate limiting: user -> (last-action-block, action-count)
(define-map rate-limits (principal) (tuple (last-block uint) (action-count uint)))

;; Blocked users: blocker -> blocked -> timestamp
(define-map blocked-users (principal principal) uint)

;; Follow requests for private accounts: requester -> target -> timestamp
(define-map follow-requests (principal principal) uint)

;; Events
(define-event (follow-event (follower principal) (following principal) (timestamp uint))
(define-event (unfollow-event (follower principal) (following principal) (timestamp uint))
(define-event (profile-updated-event (user principal) (timestamp uint))
(define-event (user-blocked-event (blocker principal) (blocked principal) (timestamp uint))
(define-event (user-unblocked-event (blocker principal) (blocked principal) (timestamp uint))
(define-event (follow-request-sent-event (requester principal) (target principal) (timestamp uint))
(define-event (follow-request-approved-event (requester principal) (target principal) (timestamp uint))
(define-event (follow-request-rejected-event (requester principal) (target principal) (timestamp uint))

;; Error codes
(define-constant ERR-USER-NOT-FOUND (err u1001))
(define-constant ERR-ALREADY-FOLLOWING (err u1002))
(define-constant ERR-NOT-FOLLOWING (err u1003))
(define-constant ERR-CANNOT-FOLLOW-SELF (err u1004))
(define-constant ERR-USER-BLOCKED (err u1005))
(define-constant ERR-RATE-LIMIT-EXCEEDED (err u1006))
(define-constant ERR-MAX-FOLLOWERS-REACHED (err u1007))
(define-constant ERR-MAX-FOLLOWING-REACHED (err u1008))
(define-constant ERR-PRIVATE-ACCOUNT (err u1009))
(define-constant ERR-FOLLOW-REQUEST-PENDING (err u1010))
(define-constant ERR-FOLLOW-REQUEST-NOT-FOUND (err u1011))
(define-constant ERR-UNAUTHORIZED (err u1012))
(define-constant ERR-INVALID-INPUT (err u1013))

;; Helper functions
(define-private (is-user-registered (user principal))
  (map-get? user-profiles user)
)

(define-private (is-following (follower principal) (following principal))
  (map-get? follow-relationships (tuple follower following))
)

(define-private (is-blocked (blocker principal) (blocked principal))
  (map-get? blocked-users (tuple blocker blocked))
)

(define-private (has-pending-request (requester principal) (target principal))
  (map-get? follow-requests (tuple requester target))
)

(define-private (check-rate-limit (user principal))
  (let ((current-block (block-height))
        (rate-limit (map-get? rate-limits user)))
    (if (is-none rate-limit)
      (map-set rate-limits user (tuple current-block 1))
      (let ((last-block (get last-block (unwrap! rate-limit)))
            (action-count (get action-count (unwrap! rate-limit))))
        (if (>= (- current-block last-block) RATE_LIMIT_WINDOW)
          (map-set rate-limits user (tuple current-block 1))
          (if (>= action-count MAX_ACTIONS_PER_WINDOW)
            (ok ERR-RATE-LIMIT-EXCEEDED)
            (map-set rate-limits user (tuple last-block (+ action-count 1)))
          )
        )
      )
    )
  )
)

(define-private (update-follower-count (user principal) (increment int))
  (let ((current-count (default-to 0 (map-get? follower-counts user))))
    (map-set follower-counts user (+ current-count increment))
  )
)

(define-private (update-following-count (user principal) (increment int))
  (let ((current-count (default-to 0 (map-get? following-counts user))))
    (map-set following-counts user (+ current-count increment))
  )
)

;; Public functions

;; Register a new user profile
(define-public (register-user (username (string-ascii 50)) (display-name (string-utf8 100)) (bio (string-utf8 500)) (avatar-url (string-ascii 200)) (is-private bool))
  (begin
    (asserts (not (is-user-registered tx-sender)) ERR-USER-NOT-FOUND)
    (asserts (> (len username) 0) ERR-INVALID-INPUT)
    (asserts (> (len display-name) 0) ERR-INVALID-INPUT)
    
    (map-set user-profiles tx-sender (tuple 
      username 
      display-name 
      bio 
      avatar-url 
      is-private 
      (block-height) 
      (block-height)
    ))
    
    (var-set total-users (+ (var-get total-users) 1))
    
    (ok (tuple 
      (user tx-sender)
      (username username)
      (display-name display-name)
      (is-private is-private)
    ))
  )
)

;; Follow another user
(define-public (follow-user (target principal))
  (begin
    (asserts (is-user-registered tx-sender) ERR-USER-NOT-FOUND)
    (asserts (is-user-registered target) ERR-USER-NOT-FOUND)
    (asserts (not (eq? tx-sender target)) ERR-CANNOT-FOLLOW-SELF)
    (asserts (not (is-following tx-sender target)) ERR-ALREADY-FOLLOWING)
    (asserts (not (is-blocked tx-sender target)) ERR-USER-BLOCKED)
    (asserts (not (is-blocked target tx-sender)) ERR-USER-BLOCKED)
    
    ;; Check rate limiting
    (try! (check-rate-limit tx-sender))
    
    ;; Check following limit
    (let ((current-following (default-to 0 (map-get? following-counts tx-sender))))
      (asserts (< current-following MAX_FOLLOWING_PER_USER) ERR-MAX-FOLLOWING-REACHED)
    )
    
    ;; Check target's follower limit
    (let ((target-followers (default-to 0 (map-get? follower-counts target))))
      (asserts (< target-followers MAX_FOLLOWERS_PER_USER) ERR-MAX-FOLLOWERS-REACHED)
    )
    
    ;; Get target's privacy settings
    (let ((target-profile (unwrap! (map-get? user-profiles target))))
      (if (get is-private target-profile)
        ;; Private account - create follow request
        (begin
          (asserts (not (has-pending-request tx-sender target)) ERR-FOLLOW-REQUEST-PENDING)
          (map-set follow-requests (tuple tx-sender target) (block-height))
          (emit-event (follow-request-sent-event tx-sender target (block-height)))
          (ok (tuple (status "request-sent") (target target)))
        )
        ;; Public account - follow immediately
        (begin
          (map-set follow-relationships (tuple tx-sender target) (block-height))
          (update-follower-count target 1)
          (update-following-count tx-sender 1)
          (var-set total-follows (+ (var-get total-follows) 1))
          (emit-event (follow-event tx-sender target (block-height)))
          (ok (tuple (status "followed") (target target)))
        )
      )
    )
  )
)

;; Unfollow a user
(define-public (unfollow-user (target principal))
  (begin
    (asserts (is-user-registered tx-sender) ERR-USER-NOT-FOUND)
    (asserts (is-user-registered target) ERR-USER-NOT-FOUND)
    (asserts (is-following tx-sender target) ERR-NOT-FOLLOWING)
    
    ;; Check rate limiting
    (try! (check-rate-limit tx-sender))
    
    (map-delete follow-relationships (tuple tx-sender target))
    (update-follower-count target -1)
    (update-following-count tx-sender -1)
    (var-set total-follows (- (var-get total-follows) 1))
    
    (emit-event (unfollow-event tx-sender target (block-height)))
    (ok (tuple (status "unfollowed") (target target)))
  )
)

;; Approve a follow request (for private accounts)
(define-public (approve-follow-request (requester principal))
  (begin
    (asserts (is-user-registered tx-sender) ERR-USER-NOT-FOUND)
    (asserts (is-user-registered requester) ERR-USER-NOT-FOUND)
    (asserts (has-pending-request requester tx-sender) ERR-FOLLOW-REQUEST-NOT-FOUND)
    
    ;; Check rate limiting
    (try! (check-rate-limit tx-sender))
    
    ;; Check follower limit
    (let ((current-followers (default-to 0 (map-get? follower-counts tx-sender))))
      (asserts (< current-followers MAX_FOLLOWERS_PER_USER) ERR-MAX-FOLLOWERS-REACHED)
    )
    
    ;; Check requester's following limit
    (let ((requester-following (default-to 0 (map-get? following-counts requester))))
      (asserts (< requester-following MAX_FOLLOWING_PER_USER) ERR-MAX-FOLLOWING-REACHED)
    )
    
    (map-delete follow-requests (tuple requester tx-sender))
    (map-set follow-relationships (tuple requester tx-sender) (block-height))
    (update-follower-count tx-sender 1)
    (update-following-count requester 1)
    (var-set total-follows (+ (var-get total-follows) 1))
    
    (emit-event (follow-request-approved-event requester tx-sender (block-height)))
    (emit-event (follow-event requester tx-sender (block-height)))
    (ok (tuple (status "approved") (requester requester)))
  )
)

;; Reject a follow request
(define-public (reject-follow-request (requester principal))
  (begin
    (asserts (is-user-registered tx-sender) ERR-USER-NOT-FOUND)
    (asserts (is-user-registered requester) ERR-USER-NOT-FOUND)
    (asserts (has-pending-request requester tx-sender) ERR-FOLLOW-REQUEST-NOT-FOUND)
    
    (map-delete follow-requests (tuple requester tx-sender))
    (emit-event (follow-request-rejected-event requester tx-sender (block-height)))
    (ok (tuple (status "rejected") (requester requester)))
  )
)

;; Block a user
(define-public (block-user (target principal))
  (begin
    (asserts (is-user-registered tx-sender) ERR-USER-NOT-FOUND)
    (asserts (is-user-registered target) ERR-USER-NOT-FOUND)
    (asserts (not (eq? tx-sender target)) ERR-CANNOT-FOLLOW-SELF)
    (asserts (not (is-blocked tx-sender target)) ERR-USER-BLOCKED)
    
    ;; If currently following, unfollow first
    (if (is-following tx-sender target)
      (begin
        (map-delete follow-relationships (tuple tx-sender target))
        (update-follower-count target -1)
        (update-following-count tx-sender -1)
        (var-set total-follows (- (var-get total-follows) 1))
        (emit-event (unfollow-event tx-sender target (block-height)))
      )
    )
    
    ;; If target is following, remove that relationship too
    (if (is-following target tx-sender)
      (begin
        (map-delete follow-relationships (tuple target tx-sender))
        (update-follower-count tx-sender -1)
        (update-following-count target -1)
        (var-set total-follows (- (var-get total-follows) 1))
        (emit-event (unfollow-event target tx-sender (block-height)))
      )
    )
    
    ;; Remove any pending follow requests
    (map-delete follow-requests (tuple target tx-sender))
    (map-delete follow-requests (tuple tx-sender target))
    
    (map-set blocked-users (tuple tx-sender target) (block-height))
    (emit-event (user-blocked-event tx-sender target (block-height)))
    (ok (tuple (status "blocked") (target target)))
  )
)

;; Unblock a user
(define-public (unblock-user (target principal))
  (begin
    (asserts (is-user-registered tx-sender) ERR-USER-NOT-FOUND)
    (asserts (is-user-registered target) ERR-USER-NOT-FOUND)
    (asserts (is-blocked tx-sender target) ERR-USER-BLOCKED)
    
    (map-delete blocked-users (tuple tx-sender target))
    (emit-event (user-unblocked-event tx-sender target (block-height)))
    (ok (tuple (status "unblocked") (target target)))
  )
)

;; Update user profile
(define-public (update-profile (username (string-ascii 50)) (display-name (string-utf8 100)) (bio (string-utf8 500)) (avatar-url (string-ascii 200)) (is-private bool))
  (begin
    (asserts (is-user-registered tx-sender) ERR-USER-NOT-FOUND)
    (asserts (> (len username) 0) ERR-INVALID-INPUT)
    (asserts (> (len display-name) 0) ERR-INVALID-INPUT)
    
    (let ((current-profile (unwrap! (map-get? user-profiles tx-sender))))
      (map-set user-profiles tx-sender (tuple 
        username 
        display-name 
        bio 
        avatar-url 
        is-private 
        (get created-at current-profile)
        (block-height)
      ))
    )
    
    (emit-event (profile-updated-event tx-sender (block-height)))
    (ok (tuple (status "updated") (user tx-sender)))
  )
)

;; Read-only functions

;; Get user profile
(define-read-only (get-user-profile (user principal))
  (map-get? user-profiles user)
)

;; Get follower count
(define-read-only (get-follower-count (user principal))
  (default-to 0 (map-get? follower-counts user))
)

;; Get following count
(define-read-only (get-following-count (user principal))
  (default-to 0 (map-get? following-counts user))
)

;; Check if user A is following user B
(define-read-only (is-user-following (follower principal) (following principal))
  (map-get? follow-relationships (tuple follower following))
)

;; Check if user A is blocked by user B
(define-read-only (is-user-blocked (blocker principal) (blocked principal))
  (map-get? blocked-users (tuple blocker blocked))
)

;; Check if there's a pending follow request
(define-read-only (has-follow-request (requester principal) (target principal))
  (map-get? follow-requests (tuple requester target))
)

;; Get total users count
(define-read-only (get-total-users)
  (var-get total-users)
)

;; Get total follows count
(define-read-only (get-total-follows)
  (var-get total-follows)
)

;; Get contract owner
(define-read-only (get-contract-owner)
  CONTRACT_OWNER
)

;; Admin functions (only contract owner)

;; Emergency pause (placeholder for future implementation)
(define-public (emergency-pause)
  (begin
    (asserts (eq? tx-sender CONTRACT_OWNER) ERR-UNAUTHORIZED)
    (ok "Emergency pause not yet implemented")
  )
)

;; Update contract parameters (placeholder for future implementation)
(define-public (update-parameters (new-max-followers uint) (new-max-following uint))
  (begin
    (asserts (eq? tx-sender CONTRACT_OWNER) ERR-UNAUTHORIZED)
    (ok "Parameter updates not yet implemented")
  )
) 