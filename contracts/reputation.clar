;; Stacks Follow System - Reputation Contract
;; Handles user reputation scoring based on follower interactions and engagement

(define-constant CONTRACT_OWNER tx-sender)
(define-constant FOLLOW-SYSTEM-CONTRACT 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.follow-system)

;; Reputation tiers and thresholds
(define-constant REPUTATION_TIER_NEWCOMER 0)
(define-constant REPUTATION_TIER_RISING 100)
(define-constant REPUTATION_TIER_POPULAR 500)
(define-constant REPUTATION_TIER_INFLUENCER 1000)
(define-constant REPUTATION_TIER_LEGENDARY 5000)

;; Reputation point values
(define-constant POINTS_FOR_FOLLOWER 10)
(define-constant POINTS_FOR_FOLLOWING 1)
(define-constant POINTS_FOR_ACTIVE_DAYS 5)
(define-constant POINTS_FOR_PROFILE_COMPLETION 50)
(define-constant POINTS_DEDUCTION_FOR_UNFOLLOW -2)
(define-constant POINTS_DEDUCTION_FOR_BLOCK -5)

;; Data structures
(define-data-var total-reputation-points uint 0)

;; User reputation data
(define-map user-reputation (principal) (tuple 
  (score uint)
  (tier uint)
  (last-calculated uint)
  (active-days uint)
  (profile-completion-bonus bool)
  (total-followers-ever uint)
  (total-following-ever uint)
))

;; Reputation calculation history
(define-map reputation-history (principal uint) (tuple 
  (score uint)
  (tier uint)
  (reason (string-ascii 100))
))

;; Reputation events for tracking
(define-map reputation-events (principal uint) (tuple 
  (event-type (string-ascii 50))
  (points int)
  (timestamp uint)
  (description (string-ascii 200))
))

;; Events
(define-event (reputation-updated-event (user principal) (old-score uint) (new-score uint) (tier uint))
(define-event (reputation-tier-upgraded-event (user principal) (old-tier uint) (new-tier uint))
(define-event (reputation-points-added-event (user principal) (points int) (reason (string-ascii 100)))

;; Error codes
(define-constant ERR-USER-NOT-FOUND (err u2001))
(define-constant ERR-INVALID-POINTS (err u2002))
(define-constant ERR-UNAUTHORIZED (err u2003))
(define-constant ERR-ALREADY-CALCULATED (err u2004))
(define-constant ERR-INVALID-TIER (err u2005))

;; Helper functions

;; Calculate reputation tier based on score
(define-private (calculate-tier (score uint))
  (cond
    ((>= score REPUTATION_TIER_LEGENDARY) 5)
    ((>= score REPUTATION_TIER_INFLUENCER) 4)
    ((>= score REPUTATION_TIER_POPULAR) 3)
    ((>= score REPUTATION_TIER_RISING) 2)
    (true 1)
  )
)

;; Get tier name as string
(define-private (get-tier-name (tier uint))
  (cond
    ((= tier 5) "Legendary")
    ((= tier 4) "Influencer")
    ((= tier 3) "Popular")
    ((= tier 2) "Rising")
    (true "Newcomer")
  )
)

;; Check if user has reputation data
(define-private (has-reputation (user principal))
  (map-get? user-reputation user)
)

;; Get user reputation data or create default
(define-private (get-or-create-reputation (user principal))
  (if (has-reputation user)
    (unwrap! (map-get? user-reputation user))
    (tuple 
      (score 0)
      (tier 1)
      (last-calculated 0)
      (active-days 0)
      (profile-completion-bonus false)
      (total-followers-ever 0)
      (total-following-ever 0)
    )
  )
)

;; Add reputation points to user
(define-private (add-reputation-points (user principal) (points int) (reason (string-ascii 100)))
  (let ((current-reputation (get-or-create-reputation user))
        (current-score (get score current-reputation))
        (new-score (if (> points 0) (+ current-score points) (max 0 (- current-score (abs points)))))
        (old-tier (get tier current-reputation))
        (new-tier (calculate-tier new-score))
        (event-id (+ (default-to 0 (map-get? reputation-events user)) 1)))
    
    ;; Update reputation data
    (map-set user-reputation user (tuple 
      new-score
      new-tier
      (block-height)
      (get active-days current-reputation)
      (get profile-completion-bonus current-reputation)
      (get total-followers-ever current-reputation)
      (get total-following-ever current-reputation)
    ))
    
    ;; Record reputation history
    (map-set reputation-history (tuple user (block-height)) (tuple 
      new-score
      new-tier
      reason
    ))
    
    ;; Record reputation event
    (map-set reputation-events (tuple user event-id) (tuple 
      (if (> points 0) "points-added" "points-deducted")
      points
      (block-height)
      reason
    ))
    
    ;; Update total reputation points
    (var-set total-reputation-points (+ (var-get total-reputation-points) points))
    
    ;; Emit events
    (emit-event (reputation-updated-event user current-score new-score new-tier))
    (emit-event (reputation-points-added-event user points reason))
    
    ;; Emit tier upgrade event if applicable
    (if (> new-tier old-tier)
      (emit-event (reputation-tier-upgraded-event user old-tier new-tier))
    )
    
    (ok (tuple 
      (old-score current-score)
      (new-score new-score)
      (old-tier old-tier)
      (new-tier new-tier)
      (tier-name (get-tier-name new-tier))
    ))
  )
)

;; Calculate reputation based on follow system data
(define-private (calculate-reputation-from-follows (user principal))
  (let ((follower-count (try! (contract-call? FOLLOW-SYSTEM-CONTRACT get-follower-count user)))
        (following-count (try! (contract-call? FOLLOW-SYSTEM-CONTRACT get-following-count user)))
        (current-reputation (get-or-create-reputation user))
        (total-followers-ever (get total-followers-ever current-reputation))
        (total-following-ever (get total-following-ever current-reputation)))
    
    ;; Calculate points from new followers
    (let ((new-followers (- follower-count total-followers-ever)))
      (if (> new-followers 0)
        (add-reputation-points user (* new-followers POINTS_FOR_FOLLOWER) "new-followers")
      )
    )
    
    ;; Calculate points from new following
    (let ((new-following (- following-count total-following-ever)))
      (if (> new-following 0)
        (add-reputation-points user (* new-following POINTS_FOR_FOLLOWING) "new-following")
      )
    )
    
    ;; Update total followers/following ever
    (let ((updated-reputation (get-or-create-reputation user)))
      (map-set user-reputation user (tuple 
        (get score updated-reputation)
        (get tier updated-reputation)
        (get last-calculated updated-reputation)
        (get active-days updated-reputation)
        (get profile-completion-bonus updated-reputation)
        follower-count
        following-count
      ))
    )
    
    (ok (tuple 
      (follower-count follower-count)
      (following-count following-count)
      (reputation (get-or-create-reputation user))
    ))
  )
)

;; Public functions

;; Initialize user reputation (called when user registers)
(define-public (initialize-user-reputation (user principal))
  (begin
    (asserts (not (has-reputation user)) ERR-USER-NOT-FOUND)
    
    ;; Create initial reputation record
    (map-set user-reputation user (tuple 
      0 ;; score
      1 ;; tier
      (block-height) ;; last-calculated
      0 ;; active-days
      false ;; profile-completion-bonus
      0 ;; total-followers-ever
      0 ;; total-following-ever
    ))
    
    ;; Add profile completion bonus
    (add-reputation-points user POINTS_FOR_PROFILE_COMPLETION "profile-completion")
    
    (ok (tuple 
      (user user)
      (initial-score POINTS_FOR_PROFILE_COMPLETION)
      (tier 1)
      (tier-name "Newcomer")
    ))
  )
)

;; Calculate and update user reputation
(define-public (calculate-reputation (user principal))
  (begin
    (asserts (has-reputation user) ERR-USER-NOT-FOUND)
    
    ;; Calculate reputation from follow system
    (try! (calculate-reputation-from-follows user))
    
    ;; Add active days bonus (if user has been active)
    (let ((current-reputation (get-or-create-reputation user))
          (last-calculated (get last-calculated current-reputation))
          (active-days (get active-days current-reputation))
          (days-since-last (quotient (- (block-height) last-calculated) 144))) ;; 144 blocks per day
      
      (if (and (> days-since-last 0) (<= days-since-last 30)) ;; Max 30 days bonus
        (add-reputation-points user (* days-since-last POINTS_FOR_ACTIVE_DAYS) "active-days")
      )
    )
    
    (ok (get-or-create-reputation user))
  )
)

;; Add reputation points manually (admin function)
(define-public (add-reputation-points-manual (user principal) (points int) (reason (string-ascii 100)))
  (begin
    (asserts (eq? tx-sender CONTRACT_OWNER) ERR-UNAUTHORIZED)
    (asserts (has-reputation user) ERR-USER-NOT-FOUND)
    (asserts (not (= points 0)) ERR-INVALID-POINTS)
    
    (add-reputation-points user points reason)
  )
)

;; Handle follow event (called by follow system)
(define-public (handle-follow-event (follower principal) (following principal))
  (begin
    (asserts (eq? tx-sender CONTRACT_OWNER) ERR-UNAUTHORIZED)
    
    ;; Add points to the person being followed
    (if (has-reputation following)
      (add-reputation-points following POINTS_FOR_FOLLOWER "gained-follower")
    )
    
    (ok true)
  )
)

;; Handle unfollow event (called by follow system)
(define-public (handle-unfollow-event (follower principal) (following principal))
  (begin
    (asserts (eq? tx-sender CONTRACT_OWNER) ERR-UNAUTHORIZED)
    
    ;; Deduct points from the person being unfollowed
    (if (has-reputation following)
      (add-reputation-points following POINTS_DEDUCTION_FOR_UNFOLLOW "lost-follower")
    )
    
    (ok true)
  )
)

;; Handle block event (called by follow system)
(define-public (handle-block-event (blocker principal) (blocked principal))
  (begin
    (asserts (eq? tx-sender CONTRACT_OWNER) ERR-UNAUTHORIZED)
    
    ;; Deduct points from the person being blocked
    (if (has-reputation blocked)
      (add-reputation-points blocked POINTS_DEDUCTION_FOR_BLOCK "user-blocked")
    )
    
    (ok true)
  )
)

;; Award profile completion bonus
(define-public (award-profile-completion-bonus (user principal))
  (begin
    (asserts (has-reputation user) ERR-USER-NOT-FOUND)
    
    (let ((current-reputation (get-or-create-reputation user)))
      (if (not (get profile-completion-bonus current-reputation))
        (begin
          (add-reputation-points user POINTS_FOR_PROFILE_COMPLETION "profile-completion-bonus")
          (map-set user-reputation user (tuple 
            (get score current-reputation)
            (get tier current-reputation)
            (get last-calculated current-reputation)
            (get active-days current-reputation)
            true ;; profile-completion-bonus
            (get total-followers-ever current-reputation)
            (get total-following-ever current-reputation)
          ))
          (ok true)
        )
        (ok false) ;; Already awarded
      )
    )
  )
)

;; Read-only functions

;; Get user reputation data
(define-read-only (get-user-reputation (user principal))
  (map-get? user-reputation user)
)

;; Get user reputation score
(define-read-only (get-reputation-score (user principal))
  (if (has-reputation user)
    (get score (unwrap! (map-get? user-reputation user)))
    0
  )
)

;; Get user reputation tier
(define-read-only (get-reputation-tier (user principal))
  (if (has-reputation user)
    (get tier (unwrap! (map-get? user-reputation user)))
    1
  )
)

;; Get tier name for user
(define-read-only (get-user-tier-name (user principal))
  (get-tier-name (get-reputation-tier user))
)

;; Get reputation history for user
(define-read-only (get-reputation-history (user principal) (limit uint))
  (let ((history '()))
    (fold (map-get? reputation-history user) 
      (lambda (entry history-list)
        (if (< (len history-list) limit)
          (append history-list (list entry))
          history-list
        )
      )
      history
    )
  )
)

;; Get reputation events for user
(define-read-only (get-reputation-events (user principal) (limit uint))
  (let ((events '()))
    (fold (map-get? reputation-events user)
      (lambda (event events-list)
        (if (< (len events-list) limit)
          (append events-list (list event))
          events-list
        )
      )
      events
    )
  )
)

;; Get total reputation points in system
(define-read-only (get-total-reputation-points)
  (var-get total-reputation-points)
)

;; Get reputation statistics
(define-read-only (get-reputation-stats)
  (tuple 
    (total-points (var-get total-reputation-points))
    (contract-owner CONTRACT_OWNER)
    (follow-system-contract FOLLOW-SYSTEM-CONTRACT)
  )
)

;; Get tier thresholds
(define-read-only (get-tier-thresholds)
  (tuple 
    (newcomer REPUTATION_TIER_NEWCOMER)
    (rising REPUTATION_TIER_RISING)
    (popular REPUTATION_TIER_POPULAR)
    (influencer REPUTATION_TIER_INFLUENCER)
    (legendary REPUTATION_TIER_LEGENDARY)
  )
)

;; Get point values
(define-read-only (get-point-values)
  (tuple 
    (follower POINTS_FOR_FOLLOWER)
    (following POINTS_FOR_FOLLOWING)
    (active-days POINTS_FOR_ACTIVE_DAYS)
    (profile-completion POINTS_FOR_PROFILE_COMPLETION)
    (unfollow-deduction POINTS_DEDUCTION_FOR_UNFOLLOW)
    (block-deduction POINTS_DEDUCTION_FOR_BLOCK)
  )
)

;; Admin functions

;; Update point values (admin only)
(define-public (update-point-values (follower-points uint) (following-points uint) (active-days-points uint) (profile-completion-points uint) (unfollow-deduction int) (block-deduction int))
  (begin
    (asserts (eq? tx-sender CONTRACT_OWNER) ERR-UNAUTHORIZED)
    (ok "Point value updates not yet implemented")
  )
)

;; Emergency reset user reputation (admin only)
(define-public (reset-user-reputation (user principal))
  (begin
    (asserts (eq? tx-sender CONTRACT_OWNER) ERR-UNAUTHORIZED)
    (asserts (has-reputation user) ERR-USER-NOT-FOUND)
    
    (map-delete user-reputation user)
    (ok (tuple (user user) (status "reset")))
  )
) 