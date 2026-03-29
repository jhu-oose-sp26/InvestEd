"use client"

import { useEffect, useState } from "react"

interface ReportSummary {
  id: string
  symbol: string
  quarter: string
  statementDate: string
  releaseDate: string
  statements: {
    income: Record<string, string | number | null>
    balance: Record<string, string | number | null>
    cashflow: Record<string, string | number | null>
  }
}

type StatementType = "income" | "balance" | "cashflow"

const STATEMENT_LABELS: Record<StatementType, string> = {
  income: "Income Statement",
  balance: "Balance Sheet",
  cashflow: "Cash Flow Statement",
}

const METRIC_LABELS: Record<string, string> = {
  revenue: "Revenue",
  costOfRevenue: "Cost of Revenue",
  grossProfit: "Gross Profit",
  grossProfitRatio: "Gross Margin",
  operatingIncome: "Operating Income",
  operatingIncomeRatio: "Operating Margin",
  netIncome: "Net Income",
  netIncomeRatio: "Net Margin",
  ebitda: "EBITDA",
  eps: "EPS",
  epsdiluted: "EPS (Diluted)",
  operatingCashFlow: "Operating Cash Flow",
  capitalExpenditure: "Capital Expenditure",
  freeCashFlow: "Free Cash Flow",
  totalAssets: "Total Assets",
  totalLiabilities: "Total Liabilities",
  totalEquity: "Total Equity",
  totalDebt: "Total Debt",
  cashAndShortTermInvestments: "Cash & Short-Term Investments",
}

function formatValue(key: string, val: string | number | null): string {
  if (val == null) return "N/A"
  const num = typeof val === "number" ? val : parseFloat(String(val))
  if (Number.isNaN(num)) return String(val)
  if (key.endsWith("Ratio") || key.endsWith("ratio")) return `${(num * 100).toFixed(1)}%`
  if (key === "eps" || key === "epsdiluted") return `$${num.toFixed(2)}`
  if (Math.abs(num) >= 1e9) return `$${(num / 1e9).toFixed(2)}B`
  if (Math.abs(num) >= 1e6) return `$${(num / 1e6).toFixed(0)}M`
  return `$${num.toLocaleString()}`
}

function buildMarkdownTable(
  report: ReportSummary,
  statementType: StatementType
): string {
  const data = report.statements[statementType]
  const entries = Object.entries(data).filter(([, v]) => v != null)
  if (entries.length === 0) return ""

  const header = `**${report.symbol} — ${report.quarter} ${STATEMENT_LABELS[statementType]}**\n`
  const lines = [
    "| Metric | Value |",
    "|--------|------:|",
    ...entries.map(([key, val]) => {
      const label = METRIC_LABELS[key] ?? key
      return `| ${label} | ${formatValue(key, val)} |`
    }),
  ]
  return header + lines.join("\n")
}

interface ReportPickerProps {
  onInsertContext: (markdown: string) => void
}

export function ReportPicker({ onInsertContext }: ReportPickerProps) {
  const [reports, setReports] = useState<ReportSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedSymbol, setSelectedSymbol] = useState<string>("")
  const [selectedQuarter, setSelectedQuarter] = useState<string>("")
  const [selectedStatement, setSelectedStatement] = useState<StatementType>("income")
  const [preview, setPreview] = useState<string>("")

  useEffect(() => {
    fetch("/api/quarterly-reports")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setReports(data)
          if (data.length > 0) setSelectedSymbol(data[0].symbol)
        } else {
          setError("No reports available")
        }
      })
      .catch(() => setError("Failed to load reports"))
      .finally(() => setLoading(false))
  }, [])

  const symbols = [...new Set(reports.map((r) => r.symbol))].sort()
  const quarters = reports
    .filter((r) => r.symbol === selectedSymbol)
    .map((r) => r.quarter)
    .sort()
    .reverse()

  // Auto-select first quarter when symbol changes
  useEffect(() => {
    if (quarters.length > 0 && !quarters.includes(selectedQuarter)) {
      setSelectedQuarter(quarters[0])
    }
  }, [selectedSymbol, quarters, selectedQuarter])

  const selectedReport = reports.find(
    (r) => r.symbol === selectedSymbol && r.quarter === selectedQuarter
  )

  // Build preview whenever selection changes
  useEffect(() => {
    if (selectedReport) {
      setPreview(buildMarkdownTable(selectedReport, selectedStatement))
    } else {
      setPreview("")
    }
  }, [selectedReport, selectedStatement])

  if (loading) return <p className="text-xs text-muted-foreground">Loading reports...</p>
  if (error) return <p className="text-xs text-red-600">{error}</p>
  if (reports.length === 0) return <p className="text-xs text-muted-foreground">No financial reports in database.</p>

  return (
    <div className="border rounded-lg p-3 bg-blue-50/50 space-y-3">
      <p className="text-xs font-semibold text-blue-800">Insert Financial Report Data</p>

      <div className="flex gap-2 flex-wrap">
        <select
          value={selectedSymbol}
          onChange={(e) => setSelectedSymbol(e.target.value)}
          className="border rounded px-2 py-1 text-sm bg-white"
        >
          {symbols.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select
          value={selectedQuarter}
          onChange={(e) => setSelectedQuarter(e.target.value)}
          className="border rounded px-2 py-1 text-sm bg-white"
        >
          {quarters.map((q) => (
            <option key={q} value={q}>{q}</option>
          ))}
        </select>

        <select
          value={selectedStatement}
          onChange={(e) => setSelectedStatement(e.target.value as StatementType)}
          className="border rounded px-2 py-1 text-sm bg-white"
        >
          {(Object.keys(STATEMENT_LABELS) as StatementType[]).map((st) => (
            <option key={st} value={st}>{STATEMENT_LABELS[st]}</option>
          ))}
        </select>
      </div>

      {preview && (
        <div className="bg-white border rounded p-2 text-xs font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
          {preview}
        </div>
      )}

      <button
        type="button"
        onClick={() => { if (preview) onInsertContext(preview) }}
        disabled={!preview}
        className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40"
      >
        Insert as Context
      </button>
    </div>
  )
}
