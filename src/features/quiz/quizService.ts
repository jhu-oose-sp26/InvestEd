import type { QuarterlyReportRecord } from '@/types'
import type { QuizQuestion } from '@/types/quiz'

import { loadDataset } from './quizDatasetLoader'

const QUESTIONS_PER_DAY = 5

function hashString(str: string): number {
  let h = 5381
  for (let i = 0; i < str.length; i++) {
    h = (h * 33) ^ str.charCodeAt(i)
  }
  return h >>> 0
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr]
  const random = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function formatBillions(val: number): string {
  if (val >= 1e9) return `$${(val / 1e9).toFixed(1)} billion`
  if (val >= 1e6) return `$${(val / 1e6).toFixed(0)} million`
  return `$${val.toLocaleString()}`
}

function getNumericValue(
  report: QuarterlyReportRecord,
  metricKey: string,
  source: 'income' | 'balance' | 'cashflow'
): number | null {
  const stmt = report.statements[source]
  const val = stmt[metricKey]
  if (val == null) return null
  const num = typeof val === 'number' ? val : parseFloat(String(val))
  return Number.isNaN(num) ? null : num
}

function reportsByQuarter(reports: QuarterlyReportRecord[]): Map<string, QuarterlyReportRecord[]> {
  const byQuarter = new Map<string, QuarterlyReportRecord[]>()
  for (const r of reports) {
    const list = byQuarter.get(r.quarter) || []
    list.push(r)
    byQuarter.set(r.quarter, list)
  }
  return byQuarter
}

/** Conceptual questions: given financial data or scenarios, interpret how companies are doing and what it means for stocks */
function buildDataInterpretationQuestions(reports: QuarterlyReportRecord[]): QuizQuestion[] {
  const questions: QuizQuestion[] = []
  const byQuarter = reportsByQuarter(reports)

  for (const [quarter, quarterReports] of byQuarter) {
    for (const report of quarterReports) {
      const revenue = getNumericValue(report, 'revenue', 'income')
      const grossProfit = getNumericValue(report, 'grossProfit', 'income')
      const netIncome = getNumericValue(report, 'netIncome', 'income')
      const operatingCashFlow = getNumericValue(report, 'operatingCashFlow', 'cashflow')
      const freeCashFlow = getNumericValue(report, 'freeCashFlow', 'cashflow')
      const grossMarginPct =
        revenue != null && grossProfit != null && revenue > 0
          ? Math.round((grossProfit / revenue) * 100)
          : null
      const profitMarginPct =
        revenue != null && netIncome != null && revenue > 0 ? Math.round((netIncome / revenue) * 100) : null

      // Profitability twist: high gross margin but low/negative net income
      if (grossMarginPct != null && profitMarginPct != null && grossMarginPct > 40 && profitMarginPct < 15) {
        questions.push({
          id: `twist-${report.symbol}-${quarter}-gmni-${hashString(`${quarter}${report.symbol}gmni`).toString(36)}`,
          category: 'profitability',
          type: 'interpretation',
          context: `In ${quarter}, ${report.symbol} had a gross margin of about ${grossMarginPct}% (strong pricing power on products) but a profit margin of only about ${profitMarginPct}% (net income ÷ revenue).`,
          prompt: 'What does this gap between gross margin and profit margin suggest about the company, and what might investors watch for?',
          options: [
            'Operating expenses (R&D, marketing, admin) are consuming most of the gross profit',
            'The company has no revenue growth',
            'Gross margin is irrelevant for stocks',
            'The stock is certain to rise',
          ],
          correctAnswer:
            'Operating expenses (R&D, marketing, admin) are consuming most of the gross profit',
          quarter,
        })
      }

      // Cash flow twist: positive OCF but negative FCF
      if (
        operatingCashFlow != null &&
        freeCashFlow != null &&
        operatingCashFlow > 0 &&
        freeCashFlow < 0
      ) {
        questions.push({
          id: `twist-${report.symbol}-${quarter}-ocffcf-${hashString(`${quarter}${report.symbol}ocffcf`).toString(36)}`,
          category: 'cash_flow',
          type: 'interpretation',
          context: `In ${quarter}, ${report.symbol} had positive operating cash flow of ${formatBillions(operatingCashFlow)} but negative free cash flow of ${formatBillions(Math.abs(freeCashFlow))}.`,
          prompt: 'What does this combination suggest, and how might investors view it?',
          options: [
            'The company is investing heavily (e.g. capex), which can support future growth or signal expansion',
            'The company is losing money on every sale',
            'Operating cash flow is not reliable',
            'The stock will definitely fall',
          ],
          correctAnswer:
            'The company is investing heavily (e.g. capex), which can support future growth or signal expansion',
          quarter,
        })
      }

      // Strong cash generation - what it means for the stock
      if (operatingCashFlow != null && operatingCashFlow > 5e9) {
        questions.push({
          id: `ocf-${report.symbol}-${quarter}-${hashString(`${quarter}${report.symbol}ocf`).toString(36)}`,
          category: 'cash_flow',
          type: 'interpretation',
          context: `In ${quarter}, ${report.symbol} generated ${formatBillions(operatingCashFlow)} in operating cash flow.`,
          prompt: 'Why might investors care about strong operating cash flow when evaluating a stock?',
          options: [
            'It suggests the business generates real cash (not just accounting profit), which can fund growth, dividends, or buybacks',
            'It guarantees the stock will go up',
            'It only matters for bonds, not stocks',
            'It indicates the company has no debt',
          ],
          correctAnswer:
            'It suggests the business generates real cash (not just accounting profit), which can fund growth, dividends, or buybacks',
          quarter,
        })
      }

      // Revenue vs net income: revenue growing but income flat or down
      if (revenue != null && netIncome != null && revenue > 1e9) {
        questions.push({
          id: `revni-${report.symbol}-${quarter}-${hashString(`${quarter}${report.symbol}revni`).toString(36)}`,
          category: 'profitability',
          type: 'interpretation',
          context: `In ${quarter}, ${report.symbol} had revenue of ${formatBillions(revenue)} and net income of ${formatBillions(netIncome)} (profit margin about ${profitMarginPct ?? Math.round((netIncome / revenue) * 100)}%).`,
          prompt: 'If a company like this reported revenue beating expectations but net income missing, how might the stock typically react and why?',
          options: [
            'The stock could drop — investors care about profitability, not just top-line revenue',
            'The stock would always rise because revenue is up',
            'Net income never affects stock price',
            'It would have no effect',
          ],
          correctAnswer:
            'The stock could drop — investors care about profitability, not just top-line revenue',
          quarter,
        })
      }
    }

    // Two-company comparison: what does profit margin tell you that revenue doesn't?
    if (quarterReports.length >= 2) {
      const withMargin = quarterReports
        .map((r) => {
          const rev = getNumericValue(r, 'revenue', 'income')
          const ni = getNumericValue(r, 'netIncome', 'income')
          if (rev == null || ni == null || rev <= 0) return null
          return { report: r, margin: (ni / rev) * 100, revenue: rev }
        })
        .filter((x): x is { report: QuarterlyReportRecord; margin: number; revenue: number } => x != null)
      if (withMargin.length >= 2) {
        const byRev = [...withMargin].sort((a, b) => b.revenue - a.revenue)
        const byMargin = [...withMargin].sort((a, b) => b.margin - a.margin)
        const higherRev = byRev[0]
        const higherMargin = byMargin[0]
        if (higherRev.report.symbol !== higherMargin.report.symbol) {
          questions.push({
            id: `cmp-${quarter}-${hashString(`cmp${quarter}`).toString(36)}`,
            category: 'comparison',
            type: 'interpretation',
            context: `In ${quarter}, ${higherRev.report.symbol} had higher revenue (${formatBillions(higherRev.revenue)}) while ${higherMargin.report.symbol} had a higher profit margin (about ${Math.round(higherMargin.margin)}% vs ${Math.round(higherRev.margin)}%).`,
            prompt: 'What does profit margin tell an investor that revenue alone does not?',
            options: [
              'How efficiently a company turns sales into profit — two companies can have similar revenue but very different profitability',
              'Which company has more employees',
              'Which stock will outperform',
              'Revenue is always more important than profit',
            ],
            correctAnswer:
              'How efficiently a company turns sales into profit — two companies can have similar revenue but very different profitability',
            quarter,
          })
        }
      }
    }

    // Performance after earnings - stock implications
    const withPerf = quarterReports.filter(
      (r) => r.performance && typeof r.performance.percentReturn === 'number'
    )
    if (withPerf.length >= 2) {
      const sorted = [...withPerf].sort((a, b) => b.performance.percentReturn - a.performance.percentReturn)
      const winner = sorted[0]
      const loser = sorted[sorted.length - 1]
      if (winner.symbol !== loser.symbol) {
        questions.push({
          id: `perf-${quarter}-${hashString(`perf${quarter}`).toString(36)}`,
          category: 'stock_implications',
          type: 'interpretation',
          context: `In the 5 days after ${quarter} earnings, ${winner.symbol}’s stock rose about ${Math.round(winner.performance.percentReturn * 10) / 10}% while ${loser.symbol}’s fell about ${Math.round(Math.abs(loser.performance.percentReturn) * 10) / 10}%.`,
          prompt: 'Stock moves after earnings often reflect how results compared to expectations. What does a sharp move (up or down) typically suggest?',
          options: [
            'Investors were surprised — results or outlook differed from what the market had priced in',
            'Earnings reports have no effect on stock prices',
            'The stock price is set only by the CEO',
            'Only the absolute numbers matter, not expectations',
          ],
          correctAnswer:
            'Investors were surprised — results or outlook differed from what the market had priced in',
          quarter,
        })
      }
    }
  }

  return questions
}

/** Conceptual questions: twists, stock implications, interpretation */
const CONCEPTUAL_QUESTIONS: QuizQuestion[] = [
  {
    id: 'concept-earnings-surprise',
    category: 'concept',
    type: 'concept',
    prompt: 'A company beats revenue expectations but misses on earnings. The stock drops. What might explain this?',
    options: [
      'Investors focus on profitability; missing earnings suggests costs or margins are worse than expected',
      'Revenue is the only metric that matters',
      'Stocks never drop on earnings news',
      'The CEO resigned',
    ],
    correctAnswer:
      'Investors focus on profitability; missing earnings suggests costs or margins are worse than expected',
  },
  {
    id: 'concept-rev-up-ni-down',
    category: 'concept',
    type: 'concept',
    prompt: 'Revenue is growing 15% but net income is declining. As an investor, what would you want to investigate?',
    options: [
      'Rising costs (COGS, R&D, marketing) or one-time charges eating into profit',
      'Whether the company has a nice logo',
      'Only the stock price',
      'Nothing — revenue growth is always good',
    ],
    correctAnswer:
      'Rising costs (COGS, R&D, marketing) or one-time charges eating into profit',
  },
  {
    id: 'concept-positive-ni-negative-cf',
    category: 'concept',
    type: 'concept',
    prompt: 'A company reports positive net income but negative operating cash flow. What could this signal?',
    options: [
      'Earnings may be boosted by non-cash items; cash flow shows the real picture of money in/out',
      'The company is lying about earnings',
      'Cash flow does not matter for stocks',
      'The company will definitely go bankrupt',
    ],
    correctAnswer:
      'Earnings may be boosted by non-cash items; cash flow shows the real picture of money in/out',
  },
  {
    id: 'concept-gross-margin-drops',
    category: 'concept',
    type: 'concept',
    prompt: 'Gross margin has declined for three straight quarters. What might an investor conclude?',
    options: [
      'Pricing pressure or rising input costs — profitability per sale is eroding',
      'The company is selling more products',
      'Gross margin does not affect stock price',
      'Everything is fine',
    ],
    correctAnswer: 'Pricing pressure or rising input costs — profitability per sale is eroding',
  },
  {
    id: 'concept-high-fcf',
    category: 'concept',
    type: 'concept',
    prompt: 'A company consistently generates strong free cash flow. What might investors expect it to do with that cash?',
    options: [
      'Reinvest in growth, pay dividends, buy back stock, or pay down debt',
      'Only hold it in the bank',
      'Free cash flow cannot be used for anything',
      'It must pay higher taxes',
    ],
    correctAnswer: 'Reinvest in growth, pay dividends, buy back stock, or pay down debt',
  },
  {
    id: 'concept-forward-guidance',
    category: 'concept',
    type: 'concept',
    prompt: 'A company beats earnings but lowers its full-year guidance. Why might the stock still fall?',
    options: [
      'Guidance shapes future expectations; a cut suggests the outlook has worsened',
      'Guidance does not matter',
      'Beating earnings always means the stock rises',
      'Only past results matter',
    ],
    correctAnswer: 'Guidance shapes future expectations; a cut suggests the outlook has worsened',
  },
  {
    id: 'concept-same-sector-margins',
    category: 'concept',
    type: 'concept',
    prompt: 'Two companies in the same sector: Company A has a 25% profit margin, Company B has 5%. What might this suggest?',
    options: [
      'A may have stronger pricing power, scale, or cost control; B may be in a tougher competitive position',
      'Revenue is the only thing that matters',
      'Margins do not differ by company',
      'B is definitely the better investment',
    ],
    correctAnswer:
      'A may have stronger pricing power, scale, or cost control; B may be in a tougher competitive position',
  },
  {
    id: 'concept-ocf-vs-ni',
    category: 'concept',
    type: 'concept',
    prompt: 'Why might a value investor prefer to look at operating cash flow alongside net income?',
    options: [
      'Net income can include non-cash items; operating cash flow shows actual cash from the business',
      'They are always the same number',
      'Only net income matters',
      'Cash flow is only for accountants',
    ],
    correctAnswer:
      'Net income can include non-cash items; operating cash flow shows actual cash from the business',
  },
  {
    id: 'concept-earnings-whisper',
    category: 'concept',
    type: 'concept',
    prompt: 'Stocks often move on "earnings beats" or "misses" vs analyst estimates. What does this reflect?',
    options: [
      'The market had priced in certain expectations; results vs those expectations drive the reaction',
      'Analyst estimates do not affect stock prices',
      'Only the raw numbers matter',
      'Earnings never move stocks',
    ],
    correctAnswer:
      'The market had priced in certain expectations; results vs those expectations drive the reaction',
  },
  {
    id: 'concept-declining-fcf',
    category: 'concept',
    type: 'concept',
    prompt: 'Free cash flow has turned negative after several quarters of being positive. What might this indicate?',
    options: [
      'Heavy investment (capex), acquisitions, or weakening operations — worth investigating further',
      'The company is doing great',
      'Free cash flow is irrelevant',
      'The stock is guaranteed to rise',
    ],
    correctAnswer:
      'Heavy investment (capex), acquisitions, or weakening operations — worth investigating further',
  },
]

const CATEGORIES: QuizQuestion['category'][] = [
  'profitability',
  'cash_flow',
  'comparison',
  'stock_implications',
  'concept',
]

export async function getDailyQuestions(dateStr: string): Promise<{ date: string; questions: QuizQuestion[] }> {
  let allQuestions: QuizQuestion[] = []

  try {
    const dataset = await loadDataset()
    const dataQuestions = buildDataInterpretationQuestions(dataset.reports)
    allQuestions = [...dataQuestions, ...CONCEPTUAL_QUESTIONS]
  } catch {
    allQuestions = [...CONCEPTUAL_QUESTIONS]
  }

  if (allQuestions.length === 0) {
    return { date: dateStr, questions: [] }
  }

  const seed = hashString(dateStr)
  const byCategory = new Map<QuizQuestion['category'], QuizQuestion[]>()
  for (const q of allQuestions) {
    const list = byCategory.get(q.category) || []
    list.push(q)
    byCategory.set(q.category, list)
  }

  const orderedCategories = seededShuffle([...CATEGORIES], seed)
  const selected: QuizQuestion[] = []
  const usedPerCategory = new Map<QuizQuestion['category'], number>()

  for (const cat of orderedCategories) {
    if (selected.length >= QUESTIONS_PER_DAY) break
    const pool = byCategory.get(cat)
    if (!pool || pool.length === 0) continue
    const used = usedPerCategory.get(cat) ?? 0
    const shuffled = seededShuffle(pool, seed + hashString(cat))
    const pick = shuffled[used]
    if (pick) {
      selected.push(pick)
      usedPerCategory.set(cat, used + 1)
    }
  }

  const selectedIds = new Set(selected.map((q) => q.id))
  while (selected.length < QUESTIONS_PER_DAY) {
    let added = false
    for (const cat of orderedCategories) {
      if (selected.length >= QUESTIONS_PER_DAY) break
      const pool = byCategory.get(cat)
      const used = usedPerCategory.get(cat) ?? 0
      if (!pool || used >= pool.length) continue
      const shuffled = seededShuffle(pool, seed + hashString(cat) + used * 999)
      const pick = shuffled[used]
      if (pick && !selectedIds.has(pick.id)) {
        selected.push(pick)
        selectedIds.add(pick.id)
        usedPerCategory.set(cat, used + 1)
        added = true
      }
    }
    if (!added) break
  }

  const result = selected.map((q, i) => ({
    ...q,
    id: `d-${dateStr}-${i}`,
    options: seededShuffle(q.options, seed + i + 1000),
  }))

  return { date: dateStr, questions: result }
}
