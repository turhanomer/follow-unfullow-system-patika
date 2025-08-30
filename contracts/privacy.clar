;; Stacks Follow System - Privacy Contract
;; Manages user privacy settings and access controls

(define-constant CONTRACT_OWNER tx-sender)
(define-constant FOLLOW-SYSTEM-CONTRACT 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.follow-system)

;; Privacy levels
(define-constant PRIVACY_LEVEL_PUBLIC 1)
(define-constant PRIVACY_LEVEL_FOLLOWERS_ONLY 2)
(define-constant PRIVACY_LEVEL_PRIVATE 3)

;; Data structures
(define-data-var total-private-accounts uint 0)

;; User privacy settings
(define-map user-privacy-settings (principal) (tuple 
  (privacy-level uint)
  (allow-follow-requests bool)
  (show-follower-count bool)
  (show-following-count bool)
  (show-profile-to-public bool)
  (allow-direct-messages bool)
  (auto-approve-followers bool)
  (last-updated uint)
))

;; Privacy access logs
(define-map privacy-access-logs (principal principal) (tuple 
  (access-type (string-ascii 50))
  (timestamp uint)
  (granted bool)
  (reason (string-ascii 100))
))

;; Privacy whitelist (users who can always see private content)
(define-map privacy-whitelist (principal principal) uint)

;; Privacy blacklist (users who are blocked from seeing content)
(define-map privacy-blacklist (principal principal) uint)

;; Privacy events
(define-map privacy-events (principal uint) (tuple 
  (event-type (string-ascii 50))
  (target principal)
  (timestamp uint)
  (details (string-ascii 200))
))

;; Events
(define-event (privacy-settings-updated-event (user principal) (privacy-level uint) (timestamp uint))
(define-event (privacy-access-granted-event (requester principal) (target principal) (access-type (string-ascii 50)) (timestamp uint))
(define-event (privacy-access-denied-event (requester principal) (target principal) (access-type (string-ascii 50)) (timestamp uint))
(define-event (privacy-whitelist-added-event (user principal) (whitelisted principal) (timestamp uint))
(define-event (privacy-whitelist-removed-event (user principal) (whitelisted principal) (timestamp uint))
(define-event (privacy-blacklist-added-event (user principal) (blacklisted principal) (timestamp uint))
(define-event (privacy-blacklist-removed-event (user principal) (blacklisted principal) (timestamp uint))

;; Error codes
(define-constant ERR-USER-NOT-FOUND (err u3001))
(define-constant ERR-INVALID-PRIVACY-LEVEL (err u3002))
(define-constant ERR-ACCESS-DENIED (err u3003))
(define-constant ERR-UNAUTHORIZED (err u3004))
(define-constant ERR-ALREADY-WHITELISTED (err u3005))
(define-constant ERR-ALREADY-BLACKLISTED (err u3006))
(define-constant ERR-NOT-WHITELISTED (err u3007))
(define-constant ERR-NOT-BLACKLISTED (err u3008))
(define-constant ERR-INVALID-ACCESS-TYPE (err u3009))

;; Helper functions

;; Check if user has privacy settings
(define-private (has-privacy-settings (user principal))
  (map-get? user-privacy-settings user)
)

;; Get user privacy settings or create default
(define-private (get-or-create-privacy-settings (user principal))
  (if (has-privacy-settings user)
    (unwrap! (map-get? user-privacy-settings user))
    (tuple 
      PRIVACY_LEVEL_PUBLIC ;; privacy-level
      true ;; allow-follow-requests
      true ;; show-follower-count
      true ;; show-following-count
      true ;; show-profile-to-public
      true ;; allow-direct-messages
      false ;; auto-approve-followers
      (block-height) ;; last-updated
    )
  )
)

;; Check if user is whitelisted
(define-private (is-whitelisted (user principal) (target principal))
  (map-get? privacy-whitelist (tuple user target))
)

;; Check if user is blacklisted
(define-private (is-blacklisted (user principal) (target principal))
  (map-get? privacy-blacklist (tuple user target))
)

;; Check if user can access target's content
(define-private (can-access-content (requester principal) (target principal) (access-type (string-ascii 50)))
  (let ((target-settings (get-or-create-privacy-settings target))
        (privacy-level (get privacy-level target-settings)))
    
    ;; Check if requester is blacklisted
    (if (is-blacklisted requester target)
      (false)
      ;; Check if requester is whitelisted
      (if (is-whitelisted requester target)
        (true)
        ;; Check privacy level
        (cond
          ((= privacy-level PRIVACY_LEVEL_PUBLIC) (true))
          ((= privacy-level PRIVACY_LEVEL_FOLLOWERS_ONLY) 
           (and (not (eq? requester target)) 
                (try! (contract-call? FOLLOW-SYSTEM-CONTRACT is-user-following requester target))))
          ((= privacy-level PRIVACY_LEVEL_PRIVATE) (eq? requester target))
          (true (false))
        )
      )
    )
  )
)

;; Log privacy access attempt
(define-private (log-privacy-access (requester principal) (target principal) (access-type (string-ascii 50)) (granted bool) (reason (string-ascii 100)))
  (map-set privacy-access-logs (tuple requester target) (tuple 
    access-type
    (block-height)
    granted
    reason
  ))
)

;; Record privacy event
(define-private (record-privacy-event (user principal) (event-type (string-ascii 50)) (target principal) (details (string-ascii 200)))
  (let ((event-id (+ (default-to 0 (map-get? privacy-events user)) 1)))
    (map-set privacy-events (tuple user event-id) (tuple 
      event-type
      target
      (block-height)
      details
    ))
  )
)

;; Public functions

;; Set privacy settings
(define-public (set-privacy-settings (privacy-level uint) (allow-follow-requests bool) (show-follower-count bool) (show-following-count bool) (show-profile-to-public bool) (allow-direct-messages bool) (auto-approve-followers bool))
  (begin
    (asserts (or (= privacy-level PRIVACY_LEVEL_PUBLIC) 
                 (= privacy-level PRIVACY_LEVEL_FOLLOWERS_ONLY) 
                 (= privacy-level PRIVACY_LEVEL_PRIVATE)) ERR-INVALID-PRIVACY-LEVEL)
    
    (let ((current-settings (get-or-create-privacy-settings tx-sender))
          (old-privacy-level (get privacy-level current-settings)))
      
      ;; Update privacy settings
      (map-set user-privacy-settings tx-sender (tuple 
        privacy-level
        allow-follow-requests
        show-follower-count
        show-following-count
        show-profile-to-public
        allow-direct-messages
        auto-approve-followers
        (block-height)
      ))
      
      ;; Update total private accounts count
      (if (and (= old-privacy-level PRIVACY_LEVEL_PUBLIC) (= privacy-level PRIVACY_LEVEL_PRIVATE))
        (var-set total-private-accounts (+ (var-get total-private-accounts) 1))
        (if (and (= old-privacy-level PRIVACY_LEVEL_PRIVATE) (= privacy-level PRIVACY_LEVEL_PUBLIC))
          (var-set total-private-accounts (- (var-get total-private-accounts) 1))
        )
      )
      
      (emit-event (privacy-settings-updated-event tx-sender privacy-level (block-height)))
      (record-privacy-event tx-sender "settings-updated" tx-sender "Privacy settings updated")
      
      (ok (tuple 
        (user tx-sender)
        (privacy-level privacy-level)
        (allow-follow-requests allow-follow-requests)
        (show-follower-count show-follower-count)
        (show-following-count show-following-count)
        (show-profile-to-public show-profile-to-public)
        (allow-direct-messages allow-direct-messages)
        (auto-approve-followers auto-approve-followers)
      ))
    )
  )
)

;; Check if user can access target's profile
(define-public (can-access-profile (requester principal) (target principal))
  (let ((can-access (can-access-content requester target "profile"))
        (target-settings (get-or-create-privacy-settings target))
        (show-profile (get show-profile-to-public target-settings)))
    
    (log-privacy-access requester target "profile" can-access 
      (if can-access "Access granted" "Access denied"))
    
    (if can-access
      (emit-event (privacy-access-granted-event requester target "profile" (block-height)))
      (emit-event (privacy-access-denied-event requester target "profile" (block-height)))
    )
    
    (ok (and can-access show-profile))
  )
)

;; Check if user can see target's follower count
(define-public (can-see-follower-count (requester principal) (target principal))
  (let ((can-access (can-access-content requester target "follower-count"))
        (target-settings (get-or-create-privacy-settings target))
        (show-count (get show-follower-count target-settings)))
    
    (log-privacy-access requester target "follower-count" can-access 
      (if can-access "Access granted" "Access denied"))
    
    (ok (and can-access show-count))
  )
)

;; Check if user can see target's following count
(define-public (can-see-following-count (requester principal) (target principal))
  (let ((can-access (can-access-content requester target "following-count"))
        (target-settings (get-or-create-privacy-settings target))
        (show-count (get show-following-count target-settings)))
    
    (log-privacy-access requester target "following-count" can-access 
      (if can-access "Access granted" "Access denied"))
    
    (ok (and can-access show-count))
  )
)

;; Check if user can send direct message to target
(define-public (can-send-direct-message (requester principal) (target principal))
  (let ((can-access (can-access-content requester target "direct-message"))
        (target-settings (get-or-create-privacy-settings target))
        (allow-dm (get allow-direct-messages target-settings)))
    
    (log-privacy-access requester target "direct-message" can-access 
      (if can-access "Access granted" "Access denied"))
    
    (ok (and can-access allow-dm))
  )
)

;; Add user to privacy whitelist
(define-public (add-to-whitelist (target principal))
  (begin
    (asserts (not (eq? tx-sender target)) ERR-USER-NOT-FOUND)
    (asserts (not (is-whitelisted target tx-sender)) ERR-ALREADY-WHITELISTED)
    
    (map-set privacy-whitelist (tuple target tx-sender) (block-height))
    (emit-event (privacy-whitelist-added-event tx-sender target (block-height)))
    (record-privacy-event tx-sender "whitelist-added" target "User added to whitelist")
    
    (ok (tuple (user target) (status "whitelisted")))
  )
)

;; Remove user from privacy whitelist
(define-public (remove-from-whitelist (target principal))
  (begin
    (asserts (not (eq? tx-sender target)) ERR-USER-NOT-FOUND)
    (asserts (is-whitelisted target tx-sender) ERR-NOT-WHITELISTED)
    
    (map-delete privacy-whitelist (tuple target tx-sender))
    (emit-event (privacy-whitelist-removed-event tx-sender target (block-height)))
    (record-privacy-event tx-sender "whitelist-removed" target "User removed from whitelist")
    
    (ok (tuple (user target) (status "unwhitelisted")))
  )
)

;; Add user to privacy blacklist
(define-public (add-to-blacklist (target principal))
  (begin
    (asserts (not (eq? tx-sender target)) ERR-USER-NOT-FOUND)
    (asserts (not (is-blacklisted target tx-sender)) ERR-ALREADY-BLACKLISTED)
    
    (map-set privacy-blacklist (tuple target tx-sender) (block-height))
    (emit-event (privacy-blacklist-added-event tx-sender target (block-height)))
    (record-privacy-event tx-sender "blacklist-added" target "User added to blacklist")
    
    (ok (tuple (user target) (status "blacklisted")))
  )
)

;; Remove user from privacy blacklist
(define-public (remove-from-blacklist (target principal))
  (begin
    (asserts (not (eq? tx-sender target)) ERR-USER-NOT-FOUND)
    (asserts (is-blacklisted target tx-sender) ERR-NOT-BLACKLISTED)
    
    (map-delete privacy-blacklist (tuple target tx-sender))
    (emit-event (privacy-blacklist-removed-event tx-sender target (block-height)))
    (record-privacy-event tx-sender "blacklist-removed" target "User removed from blacklist")
    
    (ok (tuple (user target) (status "unblacklisted")))
  )
)

;; Get privacy recommendations based on user's current settings
(define-public (get-privacy-recommendations (user principal))
  (let ((settings (get-or-create-privacy-settings user))
        (follower-count (try! (contract-call? FOLLOW-SYSTEM-CONTRACT get-follower-count user)))
        (following-count (try! (contract-call? FOLLOW-SYSTEM-CONTRACT get-following-count user))))
    
    (let ((recommendations '()))
      ;; Recommend private account if user has many followers
      (if (> follower-count 1000)
        (set! recommendations (append recommendations (list "Consider private account due to high follower count")))
      )
      
      ;; Recommend showing follower count if user has good ratio
      (if (and (> follower-count 100) (> (quotient follower-count following-count) 2))
        (set! recommendations (append recommendations (list "Consider showing follower count - good follower/following ratio")))
      )
      
      ;; Recommend limiting direct messages if user has many followers
      (if (> follower-count 500)
        (set! recommendations (append recommendations (list "Consider limiting direct messages due to high follower count")))
      )
      
      (ok (tuple 
        (user user)
        (follower-count follower-count)
        (following-count following-count)
        (privacy-level (get privacy-level settings))
        (recommendations recommendations)
      ))
    )
  )
)

;; Read-only functions

;; Get user privacy settings
(define-read-only (get-user-privacy-settings (user principal))
  (map-get? user-privacy-settings user)
)

;; Check if user is whitelisted by target
(define-read-only (is-user-whitelisted (user principal) (target principal))
  (is-whitelisted user target)
)

;; Check if user is blacklisted by target
(define-read-only (is-user-blacklisted (user principal) (target principal))
  (is-blacklisted user target)
)

;; Get privacy access log for user
(define-read-only (get-privacy-access-log (requester principal) (target principal))
  (map-get? privacy-access-logs (tuple requester target))
)

;; Get privacy events for user
(define-read-only (get-privacy-events (user principal) (limit uint))
  (let ((events '()))
    (fold (map-get? privacy-events user)
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

;; Get total private accounts
(define-read-only (get-total-private-accounts)
  (var-get total-private-accounts)
)

;; Get privacy statistics
(define-read-only (get-privacy-stats)
  (tuple 
    (total-private-accounts (var-get total-private-accounts))
    (contract-owner CONTRACT_OWNER)
    (follow-system-contract FOLLOW-SYSTEM-CONTRACT)
  )
)

;; Get privacy level names
(define-read-only (get-privacy-level-names)
  (tuple 
    (public PRIVACY_LEVEL_PUBLIC)
    (followers-only PRIVACY_LEVEL_FOLLOWERS_ONLY)
    (private PRIVACY_LEVEL_PRIVATE)
  )
)

;; Admin functions

;; Emergency privacy reset (admin only)
(define-public (emergency-privacy-reset (user principal))
  (begin
    (asserts (eq? tx-sender CONTRACT_OWNER) ERR-UNAUTHORIZED)
    (asserts (has-privacy-settings user) ERR-USER-NOT-FOUND)
    
    (map-delete user-privacy-settings user)
    (record-privacy-event user "emergency-reset" user "Privacy settings emergency reset by admin")
    
    (ok (tuple (user user) (status "reset")))
  )
)

;; Update privacy parameters (admin only)
(define-public (update-privacy-parameters (new-max-whitelist uint) (new-max-blacklist uint))
  (begin
    (asserts (eq? tx-sender CONTRACT_OWNER) ERR-UNAUTHORIZED)
    (ok "Privacy parameter updates not yet implemented")
  )
) 