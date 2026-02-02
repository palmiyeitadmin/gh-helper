# plmhelper 🚀

AI destekli commit mesaj önerileri ile interaktif Git CLI yardımcısı.

[![npm version](https://badge.fury.io/js/plmhelper.svg)](https://www.npmjs.com/package/plmhelper)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ Özellikler

### Temel Özellikler
- 📊 **Dashboard** - Branch, staged/modified dosyalar, son commit'ler
- 🤖 **AI Commit Mesajları** - Otomatik conventional commit önerileri
- 📝 **İnteraktif Commit** - Guided workflow ile stage ve commit
- 📤 **Push/Pull** - GitHub ile senkronizasyon
- 📋 **Geçmiş** - Son commit'leri görüntüle

### Gelişmiş Özellikler
- 🔀 **Branch Yönetimi** - Oluştur, sil, değiştir, yeniden adlandır
- 📦 **Stash Yönetimi** - Kaydet, uygula, sil, görüntüle
- 🏷️ **Tag Yönetimi** - Oluştur, push, sil
- ⚔️ **Merge/Rebase** - Branch merge, rebase, conflict çözücü
- 🔗 **Remote Yönetimi** - GitHub, GitLab, Bitbucket, Azure DevOps
- 📝 **.gitignore Yönetimi** - Şablonlar ve manuel düzenleme

## 📦 Kurulum

### npm ile (Önerilen)

```bash
npm install -g plmhelper
```

### Manuel Kurulum

```bash
# Klasöre git
cd C:\tools\git-helper

# Bağımlılıkları yükle
npm install

# Derle
npm run build

# Global kurulum
npm link
```

## 🎮 Kullanım

### İnteraktif Mod (Önerilen)

```bash
# Herhangi bir git repository'de
plm
```

Bu merkezi dashboard'u açar ve tüm özelliklere tek ekrandan erişebilirsiniz.

### Doğrudan Komutlar

```bash
plm status      # Detaylı durum
plm commit      # AI önerili commit
plm push        # GitHub'a push
plm history     # Commit geçmişi
plm history -n 20  # Son 20 commit

# Gelişmiş
plm branch      # veya plm b - Branch yönetimi
plm stash       # veya plm s - Stash yönetimi
plm tag         # veya plm t - Tag yönetimi
plm merge       # veya plm m - Merge/Rebase
plm init        # veya plm i - Repo başlat/remote bağla
plm gitignore   # veya plm g - .gitignore yönetimi
plm clone       # veya plm c - Repo klonla
```

## 🔀 Branch Yönetimi

```
plm branch
```

- 🔀 Branch değiştir
- ➕ Yeni branch oluştur
- ✏️ Branch yeniden adlandır
- 🗑️ Branch sil (yerel/remote)
- 📋 Tüm branch'ları listele

## 📦 Stash Yönetimi

```
gh stash
```

- 💾 Değişiklikleri stash'le (mesajlı)
- 📤 Stash'i uygula ve sil (pop)
- 📋 Stash'i uygula (apply)
- 👁️ Stash içeriğini görüntüle
- 🗑️ Stash'i sil
- 🧹 Tüm stash'leri temizle

## 🏷️ Tag Yönetimi

```
gh tag
```

- ➕ Yeni tag oluştur (annotated/lightweight)
- 📤 Tag push'la
- 📤 Tüm tag'leri push'la
- 🗑️ Tag sil (yerel/remote)

## ⚔️ Merge/Rebase

```
plm merge
```

- 🔀 Branch merge et (--no-ff seçeneği)
- 📐 Branch rebase et
- 🔄 Conflict'leri çöz (ours/theirs/manual)
- 🔙 Son commit'i geri al (revert)
- ↩️ Reset (soft/mixed/hard)

## 🔗 Remote Yönetimi

```
plm init
```

- Git repo başlat
- GitHub/GitLab/Bitbucket/Azure DevOps bağla
- Remote ekle/değiştir/sil
- HTTPS veya SSH desteği

## 📝 .gitignore Yönetimi

```
plm gitignore
```

- 📝 Şablondan ekle (Node.js, TypeScript, Python, Java, IDE, OS)
- ➕ Manuel kural ekle
- 🗑️ Kural sil
- 👁️ Tüm kuralları görüntüle
- 🔄 Sıfırla ve yeni oluştur

## 🤖 AI Commit Mesajları

Staged dosyalarınızı analiz ederek conventional commit formatında öneriler:

| Prefix | Açıklama |
|--------|----------|
| `feat` | Yeni özellik |
| `fix` | Hata düzeltme |
| `docs` | Dokümantasyon |
| `style` | Kod stili |
| `refactor` | Yeniden düzenleme |
| `test` | Test değişiklikleri |
| `chore` | Bakım görevleri |
| `perf` | Performans |
| `build` | Build sistemi |
| `ci` | CI/CD |

## 🚀 Hızlı Workflow

```bash
# 1. Kod değişiklikleri yap
# 2. Git Helper'ı aç
gh

# 3. "Dosyaları stage'le" seç
# 4. "Commit yap" seç
# 5. AI önerisini onayla
# 6. Push yap

# Bitti! 🎉
```

## 🛠️ Geliştirme

```bash
# Development mode
npm run dev

# Production build
npm run build
```

## 📄 Lisans

MIT
