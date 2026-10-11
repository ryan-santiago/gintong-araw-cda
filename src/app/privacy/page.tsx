import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"

// Informational privacy notice (Data Privacy Act of 2012, RA 10173). Officers should review the
// wording, retention period and contact details before launch.
export const metadata: Metadata = { title: "Data Privacy Notice" }

const LAST_UPDATED = "October 12, 2026"

export default function PrivacyPage() {
  return (
    <main className="min-h-svh bg-background px-4 py-8 sm:py-12">
      <article className="mx-auto max-w-2xl">
        <header className="mb-8 flex items-center gap-3">
          <Image src="/brand/logo.png" alt="" width={48} height={44} className="size-12 object-contain" />
          <div className="leading-tight">
            <p className="font-extrabold">Gintong Araw</p>
            <p className="text-xs text-muted-foreground">Community Development Association, Inc.</p>
          </div>
        </header>

        <div className="rounded-3xl bg-card p-6 shadow-card sm:p-10">
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Data Privacy Notice</h1>
          <p className="mt-1 text-sm text-muted-foreground">Last updated {LAST_UPDATED}</p>

          <div className="mt-6 grid gap-6 text-[15px] leading-relaxed [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_li]:ml-5 [&_li]:list-disc [&_ul]:grid [&_ul]:gap-1">
            <p>
              Gintong Araw Community Development Association, Inc. (“the Association”) respects your privacy. This
              notice explains what personal information we keep in our member records system, why, and how we protect
              it, in line with the Data Privacy Act of 2012 (Republic Act No. 10173).
            </p>

            <section>
              <h2>What we collect</h2>
              <ul>
                <li>
                  <b>Member households:</b> name, position, tracking number, block and lot, photo, and — if provided —
                  date of birth, contact number, email and current address.
                </li>
                <li>
                  <b>Attendance:</b> the date and time each member checked in at a meeting, and how (ID scan or manual).
                </li>
                <li>
                  <b>Officer and staff accounts:</b> name, email, password (stored encrypted), sign-in times, and a log
                  of changes made in the system, including the device and IP address used.
                </li>
              </ul>
            </section>

            <section>
              <h2>Why we use it</h2>
              <ul>
                <li>To keep an accurate list of member households and their lot assignments.</li>
                <li>To issue member ID cards and verify members at meetings.</li>
                <li>To record meeting attendance and see which members need follow-up.</li>
                <li>To keep the records secure and accountable (who changed what, and when).</li>
              </ul>
              <p className="mt-2">We do not sell your information or use it for advertising.</p>
            </section>

            <section>
              <h2>Who can see it</h2>
              <p>
                Only authorized officers and staff, and only what their role needs — for example, attendance staff can
                record check-ins but cannot change member records. Every change is logged.
              </p>
              <p className="mt-2">
                <b>Your member card page:</b> scanning the QR code on your ID opens a page showing only your photo,
                name, position, tracking number, block and lot, membership status and the dates you attended. It never
                shows your contact number, email, address or date of birth. If your card is lost, ask the HOA office to
                cancel it — the old QR code stops working immediately.
              </p>
            </section>

            <section>
              <h2>How we protect it</h2>
              <ul>
                <li>Encrypted connections (HTTPS) for every page.</li>
                <li>Photos are stored privately and shown only through short-lived links.</li>
                <li>Role-based access, approval of new accounts, and limits on repeated sign-in attempts.</li>
                <li>
                  Data is stored with service providers that apply industry-standard security: Neon (database),
                  Cloudflare R2 (photos) and Vercel (hosting).
                </li>
              </ul>
            </section>

            <section>
              <h2>How long we keep it</h2>
              <p>
                We keep member records for as long as the household is a member of the Association. When a household
                leaves, the record is marked inactive and kept only as long as needed for the Association&apos;s records
                and legal obligations, after which it is deleted.
              </p>
            </section>

            <section>
              <h2>Your rights</h2>
              <p>Under the Data Privacy Act, you have the right to:</p>
              <ul>
                <li>be informed about how your data is used;</li>
                <li>access your data and get a copy of it;</li>
                <li>have incorrect or outdated data corrected;</li>
                <li>object to processing, or ask that your data be blocked or erased, where the law allows;</li>
                <li>file a complaint with the National Privacy Commission (privacy.gov.ph).</li>
              </ul>
            </section>

            <section>
              <h2>Contact us</h2>
              <p>
                For questions, corrections or requests, contact the HOA office: <b>+63 961 513 1328</b>, or visit the
                office in person.
              </p>
            </section>
          </div>
        </div>

        <p className="mt-6 text-center text-sm">
          <Link
            href="/login"
            className="font-semibold text-accent-foreground underline-offset-4 hover:underline dark:text-primary"
          >
            Back to sign in
          </Link>
        </p>
      </article>
    </main>
  )
}
