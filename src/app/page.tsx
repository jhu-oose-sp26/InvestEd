import Link from "next/link"
import { LandingMarketTicker } from "@/components/LandingMarketTicker"

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pb-24 pt-32 sm:px-24 sm:pb-24 sm:pt-40">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[min(50vh,28rem)] bg-gradient-to-b from-sky-200/80 via-sky-100/45 to-transparent dark:from-sky-500/15 dark:via-sky-400/8 dark:to-transparent"
        aria-hidden
      />
      <div className="relative z-10 max-w-5xl w-full items-center justify-center font-mono text-sm">
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
