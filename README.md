# BIST Portföy

BIST hisselerindeki gerçek yatırımlarınızı tek yerden takip etmek için kişisel portföy defteri.
İşlemlerinizi elle girersiniz; sistem cüzdanınızı, ortalama maliyetinizi ve kâr/zararınızı hesaplar.

> **Bu bir aracı kurum yazılımı değildir.** Emir iletimi yoktur, canlı fiyat akışı yoktur.
> Fiyatları siz girersiniz — bu sayede veri sağlayıcı aboneliği veya API anahtarı gerekmez.

## Özellikler

- **Cüzdan** — nakit giriş/çıkış hareketleri; banka detayı ve not alanlarıyla
- **İşlemler** — alış/satış kaydı: hisse, adet, birim fiyat, işleme özel komisyon, tarih, not
- **Hisse listesi** — KAP'tan alınan **800 BIST sembolü**; `sa` yazınca `SASA` ilk çıkar.
  Listede olmayan bir sembolü kendiniz ekleyebilirsiniz
- **Portföy** — açık pozisyonlar, ortalama maliyet, gerçekleşmemiş kâr/zarar, portföy ağırlığı
- **Fiyatlar** — portföydeki hisseler için toplu manuel fiyat girişi (her giriş grafikte bir nokta bırakır)
- **Gösterge paneli** — toplam varlık, nakit, toplam yatırım, gerçekleşen ve gerçekleşmemiş K/Z,
  toplam ve aylık işlem sayısı, hisse bazlı K/Z özeti, varlık değeri zaman serisi
- **Raporlar** — günlük / haftalık / aylık gerçekleşen K/Z ve işlem sayısı kırılımı
- **Çok kullanıcılı** — e-posta + şifre ile giriş; her kullanıcı yalnızca kendi verisini görür (RLS)

## Kâr/zarar nasıl hesaplanır?

**Ağırlıklı ortalama maliyet** yöntemi kullanılır (Türkiye'de aracı kurumların standardı).

| Aşama | Hesap |
|---|---|
| Alış | `ortalama maliyet = toplam maliyet / toplam adet` |
| Satış | `brüt K/Z = (satış fiyatı − ortalama maliyet) × adet` |
| Net | `net K/Z = brüt K/Z − komisyonlar` |

Komisyon **ayrı gider** olarak gösterilir; maliyete karıştırılmaz. Panelde hem brüt hem net rakam görünür.

Geçmiş tarihli bir işlem eklediğinizde, sildiğinizde veya düzelttiğinizde o hissenin **tüm işlemleri
tarih sırasına göre yeniden oynatılır** — sonraki satışların maliyeti ve kârı otomatik düzeltilir.
Bu mantık Postgres tarafında `recalc_symbol()` fonksiyonunda yaşar; arayüz yalnızca okur.

## Teknoloji

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Recharts · Supabase (Postgres + Auth + RLS) · Vercel

## Yerel kurulum

Gereksinimler: Node 20+, Docker Desktop, [Supabase CLI](https://supabase.com/docs/guides/cli)

```bash
npm install
supabase start          # yerel Postgres + Auth ayağa kalkar, migration'lar uygulanır
npm run dev
```

`supabase start` çıktısındaki `API_URL` ve `ANON_KEY` değerlerini `.env.local` dosyasına yazın:

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY>
```

Örnek veriyle denemek için:

```bash
npm run db:demo         # deneme@ornek.com / deneme1234 hesabı + örnek işlemler
```

## Üretime alma

### 1. Supabase projesi

1. [supabase.com/dashboard](https://supabase.com/dashboard) üzerinden yeni proje oluşturun
2. Migration'ları gönderin:
   ```bash
   supabase link --project-ref <proje-ref>
   supabase db push
   ```
3. **Authentication → Providers → Email** açık olsun.
   E-posta doğrulaması istemiyorsanız "Confirm email" seçeneğini kapatın.

### 2. Vercel

1. Bu repoyu Vercel'e import edin
2. Ortam değişkenleri (Project Settings → Environment Variables):
   | Değişken | Değer |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | aynı sayfadaki `anon` `public` anahtarı |
3. Deploy

## Komutlar

| Komut | Açıklama |
|---|---|
| `npm run dev` | Geliştirme sunucusu |
| `npm run build` | Üretim derlemesi |
| `npm run typecheck` | TypeScript kontrolü |
| `npm run db:reset` | Yerel veritabanını sıfırla, migration'ları yeniden uygula |
| `npm run db:test` | Kâr/zarar motorunun doğrulama testleri |
| `npm run db:demo` | Örnek kullanıcı + veri yükle |
| `npm run db:demo:clear` | Örnek veriyi temizle |
| `npm run seed:symbols` | BIST sembol listesini KAP'tan yeniden çek |

## BIST sembol listesini güncelleme

Yeni halka arzlar veya borsadan çıkışlar sonrası:

```bash
npm run seed:symbols    # supabase/migrations/0005_seed_stocks.sql yeniden üretilir
supabase db push        # (veya yerelde: npm run db:reset)
```

Dosya idempotenttir (`ON CONFLICT DO UPDATE`) — mevcut sembollerin unvanları güncellenir,
kullanıcıların elle eklediği semboller etkilenmez.

## Proje yapısı

```
supabase/
  migrations/   0001 şema+RLS · 0002 K/Z motoru · 0003 view'lar · 0004 raporlar · 0005 sembol seed'i
  scripts/      KAP sembol çekici, demo kullanıcı oluşturucu
  tests/        K/Z doğrulama testleri, demo veri
src/
  app/(auth)/   giriş · kayıt
  app/(app)/    panel · işlemler · portföy · cüzdan · fiyatlar · raporlar
  components/   ui · nav · stock-picker · charts
  lib/          supabase istemcileri · server action'lar · biçimlendirme (tr-TR)
```
