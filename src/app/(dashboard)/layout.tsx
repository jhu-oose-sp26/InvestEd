import Link from "next/link"
import { LiveMarketsStrip } from "@/components/LiveMarketsStrip"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold">
              InvestEd
            </Link>
            <div className="flex gap-4">
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
            </div>
          </div>
        </div>
      </nav>
      <LiveMarketsStrip />
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  )
}

