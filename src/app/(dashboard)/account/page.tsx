'use client'

import { Suspense, useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  ArrowRight,
  CalendarDays,
  ChevronRight,
  Layers,
  Loader2,
  Sparkles,
  UserRound,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { usePaperTradingAuth } from '@/contexts/PaperTradingAuthContext'
import type { PortfolioSummary, QuizQuestionsResponse } from '@/types'
import { PORTFOLIO_ERRORS, softenPublicErrorMessage } from '@/lib/userFacingMessages'
import { cn } from '@/lib/utils'

/** Icon color for all symbols on this page */
const iconBlue = 'text-blue-600 dark:text-blue-400'
const iconTile = 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400'

function AccountHeroEyebrow() {
  const searchParams = useSearchParams()
  const showWelcome = searchParams.get('welcome') === '1'
  if (showWelcome) {
    return <p className={cn('text-sm font-semibold tracking-tight', iconBlue)}>Welcome!</p>
  }
  return (
    <p className={cn('text-xs font-semibold uppercase tracking-widest', iconBlue)}>Your account</p>
  )
}

function formatUsd(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

function formatMemberSince(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function formatQuizDate(iso: string) {
  const [y, m, day] = iso.split('-')
  const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(day, 10))
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

/** Label above value — clearer spacing in narrow card columns */
function StatBlock({
  label,
  value,
  emphasis,
  className,
}: {
  label: string
  value: ReactNode
  emphasis?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        'border-b border-border/60 px-4 py-3.5 last:border-b-0 sm:px-5 sm:py-4',
        className
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p
        className={cn(
          'mt-2 text-sm font-medium text-foreground leading-snug',
          emphasis && 'text-lg font-semibold tracking-tight tabular-nums sm:text-xl'
        )}
      >
        {value}
      </p>
    </div>
  )
}

function SectionCard({
  icon: Icon,
  iconClassName,
  title,
  subtitle,
  children,
  footer,
}: {
  icon: LucideIcon
  iconClassName?: string
  title: string
  subtitle: string
  children: ReactNode
  footer: ReactNode
}) {
  return (
    <section className="group relative flex min-w-0 flex-col rounded-2xl border border-border/80 bg-card shadow-sm transition-shadow duration-300 hover:shadow-md overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/30 to-transparent opacity-0 transition-opacity group-hover:opacity-100 dark:via-blue-500/25" />
      <div className="p-6 sm:p-7 flex flex-col flex-1">
        <div className="flex items-start gap-4 mb-5">
          <div
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
              iconTile,
              iconClassName
            )}
          >
            <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
          </div>
          <div className="min-w-0 pt-0.5">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mt-0.5">{subtitle}</p>
          </div>
        </div>
        <div className="flex-1 min-h-[7rem]">{children}</div>
        <div className="mt-6 pt-5 border-t border-border/70 space-y-4">{footer}</div>
      </div>
    </section>
  )
}

function LinkCta({
  href,
  children,
  variant = 'primary',
}: {
  href: string
  children: ReactNode
  variant?: 'primary' | 'outline'
}) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex w-full min-h-8 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
        variant === 'primary' &&
          'bg-blue-600 text-white shadow-sm hover:bg-blue-700 hover:shadow dark:bg-blue-600 dark:hover:bg-blue-500',
        variant === 'outline' &&
          'border border-blue-200 bg-background/80 text-blue-700 hover:bg-blue-50/80 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950/40'
      )}
    >
      {children}
      <ArrowRight
        className={cn(
          'h-3.5 w-3.5 shrink-0 opacity-90',
          variant === 'primary' ? 'text-blue-50' : iconBlue
        )}
        aria-hidden
      />
    </Link>
  )
}

export default function AccountPage() {
  const { user, ready, sessionSyncing } = usePaperTradingAuth()
  const [summariesLoading, setSummariesLoading] = useState(false)
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null)
  const [portfolioErr, setPortfolioErr] = useState<string | null>(null)
  const [quizMeta, setQuizMeta] = useState<{ date: string; count: number } | null>(null)
  const [quizUnavailable, setQuizUnavailable] = useState(false)

  useEffect(() => {
    if (!user) return

    let cancelled = false
    setSummariesLoading(true)
    setPortfolio(null)
    setPortfolioErr(null)
    setQuizMeta(null)
    setQuizUnavailable(false)

    const today = new Date().toISOString().slice(0, 10)

    ;(async () => {
      try {
        const [pRes, qRes] = await Promise.all([
          fetch('/api/portfolio', { credentials: 'include' }),
          fetch(`/api/quiz/questions?date=${today}`),
        ])

        if (cancelled) return

        if (pRes.ok) {
          const data = (await pRes.json()) as PortfolioSummary
          setPortfolio(data)
          setPortfolioErr(null)
        } else {
          const j = (await pRes.json().catch(() => ({}))) as { error?: string }
          setPortfolio(null)
          setPortfolioErr(
            typeof j?.error === 'string' ? softenPublicErrorMessage(j.error) : PORTFOLIO_ERRORS.loadFailed
          )
        }

        if (qRes.ok) {
          const q = (await qRes.json()) as QuizQuestionsResponse
          setQuizMeta({ date: q.date, count: q.questions?.length ?? 0 })
          setQuizUnavailable(false)
        } else {
          setQuizMeta(null)
          setQuizUnavailable(true)
        }
      } catch {
        if (!cancelled) {
          setPortfolioErr(PORTFOLIO_ERRORS.loadFailed)
          setQuizUnavailable(true)
        }
      } finally {
        if (!cancelled) setSummariesLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [user])

  if (!ready || sessionSyncing) {
    return (
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Loader2 className={cn('h-8 w-8 animate-spin mb-3', iconBlue)} aria-hidden />
        <p className="text-sm">Loading your account…</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto">
        <div className="rounded-2xl border border-border/80 bg-card p-10 text-center shadow-sm">
          <div className={cn('mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl', iconTile)}>
            <UserRound className="h-7 w-7" strokeWidth={1.5} aria-hidden />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Sign in to continue</h1>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            View your profile, portfolio snapshot, and daily challenge from your account page.
          </p>
          <Link
            href="/auth/login"
            className={cn(
              'mt-8 inline-flex items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-medium text-blue-700 shadow-sm transition-colors hover:bg-blue-100/80 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-950/70'
            )}
          >
            Sign in
            <ChevronRight className={cn('h-3.5 w-3.5 shrink-0', iconBlue)} aria-hidden />
          </Link>
        </div>
      </div>
    )
  }

  const displayName = user.name?.trim() || user.email.split('@')[0]

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-8">
      {/* Profile hero */}
      <header className="relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-blue-500/[0.07] via-card to-muted/40 px-6 py-8 sm:px-10 sm:py-10 shadow-sm dark:from-blue-500/10">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blue-400/10 blur-3xl dark:bg-blue-500/15" />
        <div className="pointer-events-none absolute -bottom-20 -left-12 h-40 w-40 rounded-full bg-muted/80 blur-2xl" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-8">
          <div
            className={cn(
              'flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl shadow-inner ring-1 ring-blue-200/60 dark:ring-blue-800/50',
              iconTile
            )}
          >
            <UserRound className="h-10 w-10" strokeWidth={1.5} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <Suspense
              fallback={
                <p className={cn('text-xs font-semibold uppercase tracking-widest', iconBlue)}>Your account</p>
              }
            >
              <AccountHeroEyebrow />
            </Suspense>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground sm:text-4xl capitalize">
              {displayName}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground break-all">{user.email}</p>
            <p className="mt-1 text-xs text-muted-foreground/80">
              Member since {formatMemberSince(user.createdAt)}
            </p>
          </div>
        </div>
      </header>

      {/* Summary grid — two columns from sm screens up */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 sm:items-stretch">
        <SectionCard
          icon={Wallet}
          title="Portfolio"
          subtitle="Paper trading snapshot"
          footer={
            <>
              <LinkCta href="/portfolio">View full portfolio</LinkCta>
            </>
          }
        >
          {summariesLoading && !portfolio && !portfolioErr ? (
            <div className="space-y-3 animate-pulse pt-1">
              <div className="h-4 rounded-md bg-muted w-4/5" />
              <div className="h-4 rounded-md bg-muted w-3/5" />
              <div className="h-4 rounded-md bg-muted w-2/3" />
            </div>
          ) : portfolioErr ? (
            <p className="text-sm text-destructive leading-relaxed">{portfolioErr}</p>
          ) : portfolio ? (
            <div className="overflow-hidden rounded-xl border border-border/50 bg-muted/40">
              <StatBlock label="Portfolio" value={portfolio.portfolioName} />
              <StatBlock label="Total value" value={formatUsd(portfolio.totalPortfolioValue)} emphasis />
              <StatBlock
                label="Cash"
                value={<span className="tabular-nums">{formatUsd(portfolio.totalCash)}</span>}
              />
              <StatBlock
                label="Open positions"
                value={<span className="tabular-nums">{portfolio.positions.length}</span>}
              />
            </div>
          ) : null}
        </SectionCard>

        <SectionCard
          icon={CalendarDays}
          title="Daily Challenge"
          subtitle="Today&apos;s quiz"
          footer={
            <div className="space-y-4">
              <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-4">
                <div className={cn('flex items-center gap-2 mb-2', iconBlue)}>
                  <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="text-xs font-medium uppercase tracking-wider text-blue-700 dark:text-blue-300">
                    Custom quizzes
                  </span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Build quizzes from your own reports.
                </p>
              </div>
              <LinkCta href="/quiz/custom" variant="outline">
                <span className="inline-flex items-center gap-1.5">
                  <Layers className={cn('h-3.5 w-3.5 shrink-0', iconBlue)} aria-hidden />
                  Custom Quizzes
                </span>
              </LinkCta>
            </div>
          }
        >
          <div className="flex flex-col gap-5 flex-1">
            {summariesLoading && !quizMeta && !quizUnavailable ? (
              <div className="space-y-3 animate-pulse pt-1">
                <div className="h-4 rounded-md bg-muted w-3/5" />
                <div className="h-4 rounded-md bg-muted w-2/5" />
              </div>
            ) : quizUnavailable ? (
              <p className="text-sm text-muted-foreground leading-relaxed">
                Today&apos;s questions aren&apos;t available yet. Open the challenge to try again, or check back
                later.
              </p>
            ) : quizMeta ? (
              <div className="overflow-hidden rounded-xl border border-border/50 bg-muted/40">
                <StatBlock label="Scheduled for" value={formatQuizDate(quizMeta.date)} />
                <StatBlock label="Questions" value={quizMeta.count} emphasis />
              </div>
            ) : null}
            <LinkCta href="/quiz">Go to Daily Challenge</LinkCta>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
