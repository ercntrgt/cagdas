import Image from 'next/image'
import { cn } from '@/components/ui'
import { APP_NAME } from '@/lib/brand'

/** Yuvarlak maskeli logo. Kaynak görsel kare; köşeler kırpılır. */
export function Logo({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt={APP_NAME}
      width={size}
      height={size}
      priority
      className={cn(
        'shrink-0 rounded-full bg-white object-cover ring-1 ring-black/10 dark:ring-white/15',
        className,
      )}
      style={{ width: size, height: size }}
    />
  )
}
