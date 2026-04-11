import Link from "next/link"
import { LiveMarketsStrip } from "@/components/LiveMarketsStrip"
import { PaperTradingAuthProvider } from "@/contexts/PaperTradingAuthContext"
import { DashboardAuthNav } from "@/components/auth/DashboardAuthNav"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <PaperTradingAuthProvider>
      <div className="min-h-screen bg-background">
        <nav className="border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between gap-4">
              <Link href="/" className="text-2xl font-bold shrink-0">
                InvestEd
              </Link>
              <div className="flex items-center gap-4 flex-wrap justify-end">
                <Link
                  href="/markets"
                  className="text-sm font-medium hover:text-primary transition-colors"
                >
                  Markets
                </Link>
                <Link
                  href="/trade"
                  className="text-sm font-medium hover:text-primary transition-colors"
                >
                  Trade
                </Link>
                <Link
                  href="/portfolio"
                  className="text-sm font-medium hover:text-primary transition-colors"
                >
                  Portfolio
                </Link>
                <Link
                  href="/quiz"
                  className="text-sm font-medium hover:text-primary transition-colors"
                >
                  Daily Challenge
                </Link>
                <Link
                  href="/quiz/custom"
                  className="text-sm font-medium hover:text-primary transition-colors"
                >
                  Custom Quizzes
                </Link>
                <DashboardAuthNav />
              </div>
            </div>
          </div>
        </nav>
        <LiveMarketsStrip />
        <main className="container mx-auto px-4 py-8">{children}</main>
      </div>
    </PaperTradingAuthProvider>
  )
}
