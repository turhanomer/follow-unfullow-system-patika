# Basit Takip Sistemi - Stacks Blockchain

Bu proje, Stacks blockchain üzerinde çalışan basit bir takip etme/takipçi sayısı sistemidir.

## 🎯 Özellikler

- ✅ Kullanıcı kaydı
- ✅ Kullanıcı takip etme
- ✅ Takipten çıkarma
- ✅ Takipçi sayısı
- ✅ Takip edilen sayısı
- ✅ Takip durumu kontrolü

## 📁 Dosya Yapısı

```
├── contracts/
│   └── simple-follow.clar    # Ana smart contract
├── tests/
│   └── simple-follow_test.ts # Test dosyası
├── scripts/
│   └── deploy-simple.ts      # Deploy scripti
└── README-SIMPLE.md          # Bu dosya
```

## 🚀 Hızlı Başlangıç

### 1. Gereksinimler

- Node.js (v16 veya üzeri)
- Clarinet CLI
- Stacks wallet (testnet için)

### 2. Kurulum

```bash
# Bağımlılıkları yükle
npm install

# Clarinet'i başlat
clarinet start

# Testleri çalıştır
clarinet test
```

### 3. Testnet'e Deploy Etme

```bash
# .env dosyası oluştur
echo "PRIVATE_KEY=your_private_key_here" > .env
echo "STACKS_ADDRESS=your_stacks_address_here" >> .env

# Deploy et
npm run deploy:simple
```

## 📖 Kullanım

### Kullanıcı Kaydı
```clarity
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.simple-follow register-user "alice" "Merhaba dünya!")
```

### Kullanıcı Takip Etme
```clarity
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.simple-follow follow-user 'ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND)
```

### Takipten Çıkarma
```clarity
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.simple-follow unfollow-user 'ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND)
```

### Takipçi Sayısını Görme
```clarity
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.simple-follow get-follower-count 'ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND)
```

### Takip Edilen Sayısını Görme
```clarity
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.simple-follow get-following-count 'ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND)
```

### Takip Durumu Kontrolü
```clarity
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.simple-follow is-user-following 'TAKIP_EDEN 'TAKIP_EDILEN)
```

## 🧪 Testler

Testleri çalıştırmak için:

```bash
clarinet test
```

Testler şunları kontrol eder:
- ✅ Kullanıcı kaydı
- ✅ Takip etme/takipten çıkarma
- ✅ Takipçi sayıları
- ✅ Hata durumları (kendini takip etme, kayıtlı olmayan kullanıcı)

## 🔧 Fonksiyonlar

### Public Fonksiyonlar

| Fonksiyon | Açıklama |
|-----------|----------|
| `register-user` | Kullanıcı kaydı |
| `follow-user` | Kullanıcı takip etme |
| `unfollow-user` | Takipten çıkarma |

### Read-Only Fonksiyonlar

| Fonksiyon | Açıklama |
|-----------|----------|
| `get-user-profile` | Kullanıcı profilini getir |
| `get-follower-count` | Takipçi sayısını getir |
| `get-following-count` | Takip edilen sayısını getir |
| `is-user-following` | Takip durumunu kontrol et |

## 🚨 Hata Kodları

| Kod | Açıklama |
|-----|----------|
| 1000 | Kullanıcı bulunamadı |
| 1001 | Kendini takip edemezsin |
| 1002 | Zaten takip ediyorsun |
| 1003 | Takip etmiyorsun |

## 📝 Örnek Kullanım Senaryosu

1. **Alice kullanıcı kaydı yapar:**
   ```clarity
   (register-user "alice" "Blockchain meraklısı")
   ```

2. **Bob kullanıcı kaydı yapar:**
   ```clarity
   (register-user "bob" "Geliştirici")
   ```

3. **Alice Bob'u takip eder:**
   ```clarity
   (follow-user 'bob-address)
   ```

4. **Bob'un takipçi sayısı 1 olur:**
   ```clarity
   (get-follower-count 'bob-address) ;; Returns: 1
   ```

5. **Alice'in takip ettiği sayısı 1 olur:**
   ```clarity
   (get-following-count 'alice-address) ;; Returns: 1
   ```

## 🎯 Sonraki Adımlar

Bu basit sistem üzerine ekleyebileceğiniz özellikler:
- 🔒 Gizlilik ayarları
- ⭐ Reputation sistemi
- 🚫 Engelleme sistemi
- 📝 Post paylaşma
- 💬 Yorum sistemi

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/yeni-ozellik`)
3. Commit yapın (`git commit -am 'Yeni özellik eklendi'`)
4. Push yapın (`git push origin feature/yeni-ozellik`)
5. Pull Request oluşturun

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## 🆘 Yardım

Sorun yaşıyorsanız:
1. Testleri çalıştırın
2. Hata mesajlarını kontrol edin
3. Issue açın

---

**Basit ve etkili takip sistemi! 🚀** 