'use client'

import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

const MESAJ = 'BORSAYI BIRAKSAYDIN ZENGİNDİN'

const RENKLER = [
  '#e34948', // kırmızı
  '#eb6834', // turuncu
  '#eda100', // sarı
  '#1baf7a', // yeşil
  '#2a78d6', // mavi
  '#4a3aa7', // mor
  '#e87ba4', // pembe
]

const BALON_SAYISI = 28
const SURE_MS = 6500

type Balon = {
  sol: number
  genislik: number
  renk: string
  gecikme: number
  sure: number
  salinimSuresi: number
  ipUzunlugu: number
}

/** Balonlar tıklama anında üretilir — sunucuda çalışmadığı için hidrasyon sorunu olmaz. */
function balonlariUret(): Balon[] {
  return Array.from({ length: BALON_SAYISI }, (_, i) => {
    const genislik = 26 + Math.random() * 34
    return {
      sol: Math.random() * 94,
      genislik,
      renk: RENKLER[i % RENKLER.length],
      gecikme: Math.random() * 1.6,
      sure: 3.6 + Math.random() * 2.4,
      salinimSuresi: 1.4 + Math.random() * 1.4,
      ipUzunlugu: genislik * (0.9 + Math.random() * 0.7),
    }
  })
}

export function LogoEasterEgg({ children }: { children: React.ReactNode }) {
  const [balonlar, setBalonlar] = useState<Balon[] | null>(null)
  const [monte, setMonte] = useState(false)

  useEffect(() => setMonte(true), [])

  const kapat = useCallback(() => setBalonlar(null), [])

  useEffect(() => {
    if (!balonlar) return
    const zamanlayici = setTimeout(kapat, SURE_MS)
    const escDinleyici = (e: KeyboardEvent) => e.key === 'Escape' && kapat()
    window.addEventListener('keydown', escDinleyici)
    return () => {
      clearTimeout(zamanlayici)
      window.removeEventListener('keydown', escDinleyici)
    }
  }, [balonlar, kapat])

  return (
    <>
      <button
        type="button"
        onClick={() => setBalonlar(balonlariUret())}
        aria-label="Sürpriz"
        title="Bir tıkla bakalım…"
        className="cursor-pointer rounded-full transition-transform duration-150 hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
      >
        {children}
      </button>

      {monte && balonlar
        ? createPortal(
            <div
              className="surpriz-perde fixed inset-0 z-[100] overflow-hidden bg-black/25 backdrop-blur-[2px]"
              onClick={kapat}
              role="dialog"
              aria-live="polite"
              aria-label={MESAJ}
            >
              {balonlar.map((b, i) => (
                <span
                  key={i}
                  className="balon"
                  style={{
                    left: `${b.sol}%`,
                    color: b.renk,
                    animationDelay: `${b.gecikme}s`,
                    animationDuration: `${b.sure}s`,
                  }}
                >
                  <span
                    className="balon-salinim block"
                    style={{ animationDuration: `${b.salinimSuresi}s` }}
                  >
                    <span
                      className="balon-govde"
                      style={{
                        width: b.genislik,
                        height: b.genislik * 1.22,
                        background: b.renk,
                      }}
                    />
                    <span className="balon-ip" style={{ height: b.ipUzunlugu }} />
                  </span>
                </span>
              ))}

              <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6">
                <div className="surpriz-yazi">
                  <div className="surpriz-yazi-ic rounded-2xl border-4 border-black bg-[#eda100] px-7 py-6 text-center shadow-2xl sm:px-12 sm:py-9">
                    <p className="text-3xl font-black leading-tight tracking-tight text-black sm:text-5xl lg:text-6xl">
                      {MESAJ}
                    </p>
                    <p className="mt-3 text-sm font-medium text-black/70">
                      ama olsun, biz yine de takip edelim 📈
                    </p>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
