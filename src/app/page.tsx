import Link from "next/link"
import { LandingMarketTicker } from "@/components/LandingMarketTicker"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm">
        <h1 className="text-6xl font-semibold text-center mb-8">InvestEd</h1>
        <p className="text-center text-lg mb-8 text-muted-foreground">
          Mock Trading Experience For JHU Students
        </p>
        <div className="mb-8 flex justify-center">
          <Link
            href="/auth/login"
            className="px-6 py-3 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
          >
            Get Started
          </Link>
        </div>
        <LandingMarketTicker />
      </div>
    </main>
  )
}
