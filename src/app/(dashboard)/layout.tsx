import Link from "next/link"
import { LiveMarketsStrip } from "@/components/LiveMarketsStrip"
import { PortfolioNewsSidebar } from "@/components/PortfolioNewsSidebar"
import { PaperTradingAuthProvider } from "@/contexts/PaperTradingAuthContext"
import { DashboardAuthNav } from "@/components/auth/DashboardAuthNav"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <PaperTradingAuthProvider>
      <div className="flex min-h-screen flex-col bg-background">
        <nav className="border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between gap-4">
              <Link href="/account" className="text-2xl font-bold shrink-0">
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
                <DashboardAuthNav />
              </div>
            </div>
          </div>
        </nav>
        <LiveMarketsStrip />
        <div className="flex min-h-0 flex-1">
          <main className="container mx-auto min-w-0 flex-1 px-4 py-8">{children}</main>
          <aside className="hidden w-80 shrink-0 overflow-y-auto border-l bg-muted/5 lg:sticky lg:top-0 lg:self-start lg:block lg:max-h-[calc(100dvh-9rem)]">
            <PortfolioNewsSidebar />
          </aside>
        </div>
      </div>
    </PaperTradingAuthProvider>
  )
}
