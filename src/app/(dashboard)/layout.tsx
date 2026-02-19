import Link from "next/link"

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
            </div>
          </div>
        </div>
      </nav>
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  )
}

