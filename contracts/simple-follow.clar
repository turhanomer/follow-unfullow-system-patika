;; Simple Follow System - Basit Takip Sistemi
;; Sadece takip etme/takipçi sayısı için

(define-constant CONTRACT_OWNER tx-sender)

;; Hata kodları
(define-constant ERR-USER-NOT-FOUND 1000)
(define-constant ERR-CANNOT-FOLLOW-SELF 1001)
(define-constant ERR-ALREADY-FOLLOWING 1002)
(define-constant ERR-NOT-FOLLOWING 1003)

;; Veri yapıları
(define-map user-profiles (principal) (tuple (username (string-ascii 50)) (bio (string-ascii 200))))
(define-map follow-relationships (tuple (follower principal) (following principal)) bool)
(define-map follower-counts (principal) uint)
(define-map following-counts (principal) uint)

;; Olaylar
(define-event user-registered-event (user principal) (username (string-ascii 50)) (block uint))
(define-event follow-event (follower principal) (following principal) (block uint))
(define-event unfollow-event (follower principal) (following principal) (block uint))

;; Yardımcı fonksiyonlar
(define-private (is-user-registered (user principal))
  (is-some (map-get? user-profiles user))
)

(define-private (is-following (follower principal) (following principal))
  (default-to false (map-get? follow-relationships (tuple follower following)))
)

(define-private (update-follower-count (user principal) (increment int))
  (let ((current-count (default-to 0 (map-get? follower-counts user)))
        (new-count (if (> increment 0) (+ current-count increment) (max 0 (- current-count (abs increment))))))
    (map-set follower-counts user new-count)
  )
)

(define-private (update-following-count (user principal) (increment int))
  (let ((current-count (default-to 0 (map-get? following-counts user)))
        (new-count (if (> increment 0) (+ current-count increment) (max 0 (- current-count (abs increment))))))
    (map-set following-counts user new-count)
  )
)

;; Ana fonksiyonlar

;; Kullanıcı kaydı
(define-public (register-user (username (string-ascii 50)) (bio (string-ascii 200)))
  (begin
    (asserts (not (is-user-registered tx-sender)) ERR-USER-NOT-FOUND)
    (asserts (> (len username) 0) ERR-USER-NOT-FOUND)
    (asserts (<= (len username) 50) ERR-USER-NOT-FOUND)
    
    (map-set user-profiles tx-sender (tuple username bio))
    (map-set follower-counts tx-sender 0)
    (map-set following-counts tx-sender 0)
    
    (emit-event (user-registered-event tx-sender username (block-height)))
    (ok true)
  )
)

;; Kullanıcı takip etme
(define-public (follow-user (target principal))
  (begin
    (asserts (is-user-registered target) ERR-USER-NOT-FOUND)
    (asserts (not (eq? tx-sender target)) ERR-CANNOT-FOLLOW-SELF)
    (asserts (not (is-following tx-sender target)) ERR-ALREADY-FOLLOWING)
    
    (map-set follow-relationships (tuple tx-sender target) true)
    (update-follower-count target 1)
    (update-following-count tx-sender 1)
    
    (emit-event (follow-event tx-sender target (block-height)))
    (ok true)
  )
)

;; Kullanıcı takipten çıkarma
(define-public (unfollow-user (target principal))
  (begin
    (asserts (is-user-registered target) ERR-USER-NOT-FOUND)
    (asserts (is-following tx-sender target) ERR-NOT-FOLLOWING)
    
    (map-delete follow-relationships (tuple tx-sender target))
    (update-follower-count target -1)
    (update-following-count tx-sender -1)
    
    (emit-event (unfollow-event tx-sender target (block-height)))
    (ok true)
  )
)

;; Okuma fonksiyonları

;; Kullanıcı profilini getir
(define-read-only (get-user-profile (user principal))
  (map-get? user-profiles user)
)

;; Takipçi sayısını getir
(define-read-only (get-follower-count (user principal))
  (default-to 0 (map-get? follower-counts user))
)

;; Takip edilen sayısını getir
(define-read-only (get-following-count (user principal))
  (default-to 0 (map-get? following-counts user))
)

;; Takip ediyor mu kontrol et
(define-read-only (is-user-following (follower principal) (following principal))
  (is-following follower following)
)

;; Kullanıcı kayıtlı mı kontrol et
(define-read-only (is-user-registered-read (user principal))
  (is-user-registered user)
) 