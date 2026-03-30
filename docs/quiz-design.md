# Quiz Feature Design

## Overview
A **daily challenge** quiz that tests knowledge of financial statements and historical stock performance. Uses the report matchup dataset (quarterly reports for MAG7: AAPL, MSFT, AMZN, GOOGL, META, NVDA, TSLA).

### Daily Challenge Mechanics
- **Question bank:** Questions are generated from the dataset (no pre-stored bank file).
- **Daily selection:** Each day, a deterministic subset of questions is chosen using the date as a seed (e.g. `YYYY-MM-DD`). Same date → same questions for all users.
- **Cycling:** Over time, users see different questions; as the seed changes daily, the pool rotates and eventually repeats.

## Data Requirements
- Dataset: `mag7_fmp_financials/_derived/quarterly_report_matchups.json`
- Must be generated first. From the project root:
  ```bash
  export FMP_API_KEY=your_fmp_key
  python3 market_data_pipeline/financial_stmts.py
  python3 market_data_pipeline/download_yfinance_prices.py
  python3 market_data_pipeline/build_report_matchup_data.py
  ```


---

## Question Types

The quiz teaches how to interpret financial statements and invest. Questions provide context (real data or a scenario) then test understanding.

### 1. Data Interpretation (uses real quarterly data)
- **Context:** e.g. "In 2024-Q2, AAPL reported revenue of $85B and gross profit of $38B."
- **Prompt:** "Gross margin = (Gross Profit ÷ Revenue) × 100. Approximately what was their gross margin?"
- **Options:** Numeric or interpretive choices
- Other examples: operating cash flow meaning, free cash flow use, profit margin comparison

### 2. Conceptual (teaches fundamentals)
- **Prompt:** "Which financial statement shows how much cash a company generated from its core business operations?"
- **Options:** Income Statement, Balance Sheet, Cash Flow Statement, etc.
- Covers: statement purposes, ratios, red flags, earnings interpretation

---

## How Questions Are Generated

### 1. Data-Driven Questions (from financial statements)
Generated at runtime from `quarterly_report_matchups.json`:
- Reports are grouped by quarter (e.g. 2024-Q1, 2024-Q2).
- For each quarter and company, the code pulls metrics (revenue, gross profit, net income, operating cash flow, free cash flow).
- Templates are applied based on conditions:
  - High gross margin but low profit margin → profitability twist
  - Positive OCF but negative FCF → cash flow twist
  - Strong operating cash flow → why investors care
  - Valid revenue/net income → revenue vs earnings stock reaction
- Two-company questions: finds quarters where different companies lead on revenue vs. profit margin.
- Performance questions: uses `performance.percentReturn` for post-earnings stock moves.
- Each match produces a question with `context` (the numbers) and `prompt` (interpretation/stock implications).

### 2. Conceptual Questions (static)
- Hardcoded list in `quizService.ts` (`CONCEPTUAL_QUESTIONS`).
- No dataset needed; always available.
- Scenarios: revenue up / net income down, positive income but negative cash flow, guidance cuts, margin comparisons, etc.

### 3. Daily Selection (diverse, deterministic)
1. **Categories:** Each question has a category: `profitability`, `cash_flow`, `comparison`, `stock_implications`, `concept`.
2. **Pool:** All data-driven + conceptual questions are combined and grouped by category.
3. **Seed:** The date string (e.g. `2025-03-07`) is hashed → produces a seed (same date = same seed).
4. **Shuffle categories:** Category order is shuffled with that seed.
5. **Pick one per category:** For each category (in shuffled order), pick one question (seeded shuffle within category). Ensures at most one gross-margin-style question, one cash-flow question, etc.
6. **Fill to 5:** If fewer than 5 categories have questions, pull more from categories that have extras until we have 5.
7. **Shuffle options:** Within each question, answer options are shuffled (seeded by date + question index).

**Result:** Same date → same 5 questions, diverse by category, no manual question writing beyond templates.

---

## API Design

### GET /api/quiz/options
Returns available quiz configuration (same as report-options).
```json
{ "symbols": ["AAPL", "MSFT", ...], "quarters": ["2024-Q2", "2024-Q1", ...], "quartersBySymbol": {...} }
```

### GET /api/quiz/questions?date=2025-03-07
Returns today's daily challenge questions. Uses `date` (YYYY-MM-DD) as seed for deterministic selection. Defaults to server's current date.
```json
{
  "date": "2025-03-07",
  "questions": [
    {
      "id": "q1",
      "type": "comparison",
      "prompt": "Which company had higher revenue in 2024-Q2?",
      "options": ["AAPL", "MSFT", "AMZN", "GOOGL"],
      "correctAnswer": "AAPL",
      "metric": "revenue",
      "quarter": "2024-Q2"
    },
    ...
  ]
}
```

- **date** (optional): `YYYY-MM-DD` — controls which questions are selected (same date = same questions)
- Fixed count per day (e.g. 5 questions)
- Seeded shuffle: hash(date) → pick indices from full question pool → cycle through over time

---

## Frontend Flow

1. **Daily Challenge Start** (`/quiz`)
   - "Today's Challenge" + date
   - Brief intro
   - "Start" → fetch today's questions, begin quiz

2. **Question View** (`/quiz` or in-page)
   - Show question prompt
   - Show 2–4 clickable options (A, B, C, D or symbol labels)
   - "Next" / "Submit" → record answer, move to next or results

3. **Results View**
   - Score: X / Y correct
   - List of questions with correct/incorrect and correct answer
   - "Come back tomorrow for a new challenge"

---

