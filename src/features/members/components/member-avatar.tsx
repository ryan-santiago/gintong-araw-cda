import Image from "next/image"

import { cn } from "@/lib/utils"

const tones = [
  "bg-[#d5eedd] text-[#154d34]",
  "bg-[#fef3c7] text-[#7a5005]",
  "bg-[#dbeafe] text-[#1e40af]",
  "bg-[#fde2e2] text-[#8a1c1c]",
]

/** Photo thumbnail, or initials on a stable colour when there is no photo. */
export function MemberAvatar({
  src,
  initials,
  seed,
  className,
}: {
  src: string | null
  initials: string
  seed: string
  className?: string
}) {
  const tone = tones[[...seed].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % tones.length]
  return (
    <span
      className={cn(
        "relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-full text-xs font-bold ring-1 ring-border",
        !src && tone,
        className
      )}
    >
      {src ? <Image src={src} alt="" fill unoptimized sizes="64px" className="object-cover" /> : initials}
    </span>
  )
}
