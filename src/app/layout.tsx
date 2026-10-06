import type { Metadata } from "next";
import Link from "next/link";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { hasSubscription } from "@/lib/access";
import { logout } from "@/lib/auth-actions";
import { currentUser } from "@/lib/session";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "ExamPrep — Cambridge IGCSE, AS & A Level practice", template: "%s · ExamPrep" },
  description: "Work through your Cambridge syllabus topic by topic with exam-style questions, mark schemes and examiner feedback.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();

  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="border-b border-slate-200 bg-white">
          <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
            <Link href={user ? "/dashboard" : "/"} className="text-lg font-bold text-brand-700">
              ExamPrep
            </Link>
            {user && (
              <>
                <Link href="/dashboard" className="text-sm text-slate-700 hover:text-brand-600">Dashboard</Link>
                <Link href="/subjects" className="text-sm text-slate-700 hover:text-brand-600">Subjects</Link>
                <Link href="/billing" className="text-sm text-slate-700 hover:text-brand-600">
                  {hasSubscription(user) ? "Subscription" : "Upgrade"}
                </Link>
              </>
            )}
            <div className="ml-auto flex items-center gap-3">
              {user ? (
                <>
                  <span className="hidden text-sm text-slate-500 sm:inline">{user.name}</span>
                  <form action={logout}>
                    <button className="btn-secondary">Log out</button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/login" className="btn-secondary">Log in</Link>
                  <Link href="/signup" className="btn-primary">Start free</Link>
                </>
              )}
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <footer className="border-t border-slate-200">
          <p className="mx-auto max-w-6xl px-4 py-6 text-center text-xs text-slate-500">
            ExamPrep is independent and is not affiliated with, endorsed by or connected to Cambridge University Press
            &amp; Assessment or Cambridge International Education. Cambridge IGCSE and Cambridge International AS &amp; A
            Level are their trademarks. All practice questions are original.
          </p>
        </footer>
        <SpeedInsights />
      </body>
    </html>
  );
}
