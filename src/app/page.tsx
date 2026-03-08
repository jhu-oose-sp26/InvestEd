import Link from "next/link"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8">InvestEd</h1>
        <p className="text-center text-lg mb-8 text-muted-foreground">
          Mock Trading Platform for JHU Students
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            href="/trade"
            className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Start Trading
          </Link>
          <Link
            href="/portfolio"
            className="px-6 py-3 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 transition-colors"
          >
            View Portfolio
          </Link>
          <Link
            href="/quiz"
            className="px-6 py-3 border border-primary text-primary rounded-md hover:bg-primary/10 transition-colors"
          >
            Daily Challenge
          </Link>
        </div>
      </div>
    </main>
  )
}

