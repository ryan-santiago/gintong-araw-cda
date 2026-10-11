import Image from "next/image"
import Link from "next/link"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-gradient-gold p-10 text-[#1c1b17] lg:flex lg:flex-col">
        <div
          aria-hidden
          className="absolute -top-40 -right-40 size-130 rounded-full bg-[radial-gradient(circle,rgb(255_255_255/0.55),transparent_65%)]"
        />
        <SunRays />
        <div className="relative flex items-center gap-3">
          <div className="grid size-14 place-items-center rounded-2xl bg-white/70 shadow-sm">
            <Image src="/brand/logo.png" alt="" width={48} height={44} className="size-11 object-contain" priority />
          </div>
          <div className="leading-tight">
            <p className="text-lg font-extrabold">Gintong Araw</p>
            <p className="text-sm opacity-75">Community Development Association, Inc.</p>
          </div>
        </div>

        <div className="relative mt-auto max-w-md">
          <h1 className="text-4xl leading-tight font-extrabold tracking-tight xl:text-5xl">
            Isang komunidad,
            <br />
            isang talaan.
          </h1>
          <p className="mt-4 text-base opacity-80">
            One community, one record — members, ID cards and meeting attendance in one place.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-3 text-sm">
            {[
              ["Members", "Household records"],
              ["ID Cards", "With QR codes"],
              ["Attendance", "Scan at meetings"],
            ].map(([title, sub]) => (
              <div key={title} className="rounded-2xl bg-white/45 p-3 backdrop-blur-sm">
                <p className="font-bold">{title}</p>
                <p className="text-xs opacity-75">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Form panel */}
      <main className="flex flex-col px-4 py-8 sm:px-8">
        <div className="flex items-center gap-2.5 lg:hidden">
          <Image src="/brand/logo.png" alt="" width={40} height={37} className="size-10 object-contain" />
          <span className="font-extrabold">Gintong Araw CDA</span>
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">{children}</div>
        <p className="text-center text-xs text-muted-foreground">
          Gintong Araw Community Development Association, Inc. ·{" "}
          <Link href="/privacy" className="underline-offset-4 hover:underline">
            Data Privacy Notice
          </Link>
        </p>
      </main>
    </div>
  )
}

function SunRays() {
  return (
    <svg aria-hidden viewBox="0 0 400 400" className="absolute -right-24 -bottom-24 size-105 opacity-25" fill="none">
      <circle cx="200" cy="200" r="70" stroke="#1c1b17" strokeWidth="3" />
      {Array.from({ length: 16 }, (_, i) => (
        <line
          key={i}
          x1="200"
          y1="100"
          x2="200"
          y2="40"
          stroke="#1c1b17"
          strokeWidth="3"
          strokeLinecap="round"
          transform={`rotate(${i * 22.5} 200 200)`}
        />
      ))}
    </svg>
  )
}
