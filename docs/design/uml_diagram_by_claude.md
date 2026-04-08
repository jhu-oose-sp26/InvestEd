# InvestEd — UML Class Diagram

## Data Models (Prisma Schema)

```mermaid
classDiagram
    direction TB

    class TradeType {
        <<enumeration>>
        BUY
        SELL
    }

    class User {
        +String id
        +String email
        +String? name
        +Decimal cashBalance
        +DateTime createdAt
        +DateTime updatedAt
        +Trade[] trades
        +Position[] positions
        +CustomQuiz[] customQuizzes
    }

    class Trade {
        +String id
        +String userId
        +String symbol
        +TradeType type
        +Int quantity
        +Decimal price
        +Decimal totalValue
        +DateTime executedAt
    }

    class Position {
        +String id
        +String userId
        +String symbol
        +Int quantity
        +Decimal averageBuyPrice
        +DateTime updatedAt
    }

    class MarketPrice {
        +String id
        +String symbol
        +DateTime timestamp
        +String timeframe
        +Decimal open
        +Decimal high
        +Decimal low
        +Decimal close
        +BigInt? volume
        +Decimal? vwap
        +Int? tradeCount
    }

    class QuarterlyReport {
        +String id
        +String symbol
        +String quarter
        +String statementDate
        +String releaseDate
        +Json statements
        +Json performance
        +DateTime createdAt
        +DateTime updatedAt
    }

    class CustomQuiz {
        +String id
        +String title
        +String? description
        +String userId
        +Boolean isPublic
        +DateTime createdAt
        +DateTime updatedAt
        +CustomQuizQuestion[] questions
    }

    class CustomQuizQuestion {
        +String id
        +String quizId
        +String prompt
        +Json options
        +String correctAnswer
        +String? context
        +Int order
        +DateTime createdAt
        +DateTime updatedAt
    }

    User "1" --> "*" Trade : has
    User "1" --> "*" Position : has
    User "1" --> "*" CustomQuiz : creates
    CustomQuiz "1" --> "*" CustomQuizQuestion : contains
    Trade --> TradeType : type
```

## Service Layer & Interfaces

```mermaid
classDiagram
    direction TB

    class MarketDataProvider {
        <<interface>>
        +getQuote(symbol: string) Promise~Quote~
        +getQuotes(symbols: string[]) Promise~Quote[]~
    }

    class Quote {
        <<interface>>
        +String symbol
        +Number price
        +Number timestamp
    }

    class PostgresMarketDataProvider {
        +getQuote(symbol: string) Promise~Quote~
        +getQuotes(symbols: string[]) Promise~Quote[]~
    }

    class ExecuteTradeInput {
        <<type>>
        +String userId
        +String symbol
        +String type
        +Number quantity
        +Number price
    }

    class TradeResult {
        <<interface>>
        +Boolean success
        +String? tradeId
        +String? error
        +Decimal? newCashBalance
        +Number? positionQuantity
    }

    class TradeService {
        +executeTrade(input: ExecuteTradeInput) Promise~TradeResult~
        +getUserTrades(userId: string, symbol?: string) Promise~Trade[]~
        +getUserPositions(userId: string) Promise~Position[]~
    }

    class PositionValue {
        <<interface>>
        +String symbol
        +Number quantity
        +Number averageBuyPrice
        +Number currentPrice
        +Number totalCost
        +Number currentValue
        +Number unrealizedPnL
        +Number unrealizedPnLPercent
        +String? sector
    }

    class PortfolioSummary {
        <<interface>>
        +Number totalCash
        +Number totalInvested
        +Number totalCurrentValue
        +Number totalPortfolioValue
        +Number totalUnrealizedPnL
        +Number totalUnrealizedPnLPercent
        +PositionValue[] positions
    }

    class PortfolioService {
        +getPortfolioSummary(userId: string) Promise~PortfolioSummary~
    }

    class PortfolioHistoryPoint {
        <<type>>
        +String at
        +Number value
    }

    class PortfolioHistoryService {
        <<module>>
        +getPortfolioValueHistory(userId: string) Promise~PortfolioHistoryPoint[]~
    }

    MarketDataProvider <|.. PostgresMarketDataProvider : implements
    MarketDataProvider --> Quote : returns

    TradeService --> ExecuteTradeInput : input
    TradeService --> TradeResult : returns
    TradeService ..> "PrismaClient" : uses

    PortfolioService --> PortfolioSummary : returns
    PortfolioService --> MarketDataProvider : uses
    PortfolioSummary *-- PositionValue : contains

    PortfolioHistoryService --> PortfolioHistoryPoint : returns
    PortfolioHistoryService --> PortfolioService : uses
```

## Finnhub Integration

```mermaid
classDiagram
    direction TB

    class FinnhubQuoteResponse {
        <<interface>>
        +Number c
        +Number d
        +Number dp
        +Number h
        +Number l
        +Number o
        +Number pc
        +Number t
    }

    class FinnhubTradeItem {
        <<interface>>
        +String s
        +Number p
        +Number t
        +Number v
        +String[]? c
    }

    class FinnhubTradeMessage {
        <<interface>>
        +String type
        +FinnhubTradeItem[] data
    }

    class FinnhubLiveQuote {
        <<interface>>
        +String symbol
        +Number price
        +Number timestamp
        +Number? volume
        +Number? change
        +Number? percentChange
    }

    class FinnhubQuoteSnapshot {
        <<interface>>
        +String symbol
        +String observedAtIso
        +Number lastPrice
        +Number? dayOpen
        +Number? dayHigh
        +Number? dayLow
        +Number? prevClose
        +Number? changeAbs
        +Number? changePct
    }

    class FinnhubCompanyProfile {
        <<interface>>
        +String symbol
        +String sector
    }

    class FinnhubRestClient {
        <<module>>
        +fetchFinnhubQuote(symbol, apiKey) Promise~FinnhubLiveQuote~
        +fetchFinnhubQuoteSnapshot(symbol, apiKey) Promise~FinnhubQuoteSnapshot~
        +fetchFinnhubCompanyProfile(symbol, apiKey) Promise~FinnhubCompanyProfile?~
    }

    class FinnhubWebSocketClient {
        <<module>>
        -Map quoteCache
        -Set subscribedSymbols
        -WebSocket? ws
        +ensureSubscribed(symbol, apiKey) void
        +ensureWatchlistSubscribed(apiKey) void
        +getSubscribedSymbols() String[]
        +getCachedQuote(symbol) FinnhubLiveQuote?
        +closeWebSocket() void
    }

    class FinnhubLiveQuoteService {
        <<module>>
        +getLiveQuote(symbol, apiKey, staleMs?) Promise~FinnhubLiveQuote?~
        +getLiveQuotes(symbols, apiKey, staleMs?) Promise~FinnhubLiveQuote[]~
    }

    class ExecutionPriceResolver {
        <<module>>
        +resolveTradeExecutionPrice(symbol) Promise~price, source~
    }

    FinnhubRestClient --> FinnhubQuoteResponse : parses
    FinnhubRestClient --> FinnhubLiveQuote : returns
    FinnhubRestClient --> FinnhubQuoteSnapshot : returns
    FinnhubRestClient --> FinnhubCompanyProfile : returns

    FinnhubWebSocketClient --> FinnhubTradeMessage : receives
    FinnhubWebSocketClient --> FinnhubLiveQuote : caches
    FinnhubTradeMessage *-- FinnhubTradeItem : contains

    FinnhubLiveQuoteService --> FinnhubWebSocketClient : cache lookup
    FinnhubLiveQuoteService --> FinnhubRestClient : REST fallback
    FinnhubLiveQuoteService --> FinnhubLiveQuote : returns

    ExecutionPriceResolver --> FinnhubLiveQuoteService : primary
    ExecutionPriceResolver --> PostgresMarketDataProvider : fallback

    class PostgresMarketDataProvider {
        <<fallback>>
    }
```

## Quiz & Report Matchup

```mermaid
classDiagram
    direction TB

    class QuizQuestionCategory {
        <<type>>
        profitability
        cash_flow
        comparison
        stock_implications
        concept
        statement_reading
    }

    class QuizQuestion {
        <<interface>>
        +String id
        +QuizQuestionCategory category
        +String type
        +String? context
        +String prompt
        +String[] options
        +String correctAnswer
        +String? quarter
    }

    class QuizQuestionsResponse {
        <<interface>>
        +String date
        +QuizQuestion[] questions
    }

    class QuizService {
        <<module>>
        +getDailyQuestions(dateStr) Promise~QuizQuestionsResponse~
        -buildDataInterpretationQuestions(reports) QuizQuestion[]
        -buildStatementReadingQuestions(reports) QuizQuestion[]
        -buildGrossMarginQuestion(report) QuizQuestion?
        -buildFcfSignQuestion(report) QuizQuestion?
        -buildQoqRevenueQuestions(reports) QuizQuestion[]
    }

    class QuizDatasetLoader {
        <<module>>
        +loadDataset() Promise~ReportMatchupDataset~
    }

    class DailyClosePoint {
        <<interface>>
        +String date
        +Number close
    }

    class PerformanceWindow {
        <<interface>>
        +String startDate
        +String endDate
        +Number startClose
        +Number endClose
        +Number absoluteChange
        +Number percentReturn
        +DailyClosePoint[] dailyCloses
    }

    class QuarterlyStatements {
        <<interface>>
        +Record income
        +Record balance
        +Record cashflow
    }

    class QuarterlyReportRecord {
        <<interface>>
        +String symbol
        +String quarter
        +String statementDate
        +String releaseDate
        +QuarterlyStatements statements
        +PerformanceWindow performance
    }

    class ReportMatchupDataset {
        <<interface>>
        +String generatedAt
        +QuarterlyReportRecord[] reports
    }

    class ReportMatchupResponse {
        <<interface>>
        +String quarter
        +QuarterlyReportRecord left
        +QuarterlyReportRecord right
        +String winnerSymbol
    }

    class ReportOptionsResponse {
        <<interface>>
        +String[] symbols
        +String[] quarters
        +Record quartersBySymbol
    }

    class ReportMatchupService {
        <<module>>
        +getReportOptions() Promise~ReportOptionsResponse~
        +getReportMatchup(left, right, quarter?) Promise~ReportMatchupResponse~
    }

    QuizService --> QuizQuestion : generates
    QuizService --> QuizQuestionsResponse : returns
    QuizService --> QuizDatasetLoader : loads data
    QuizService --> QuarterlyReportRecord : processes
    QuizQuestion --> QuizQuestionCategory : categorized by

    QuizDatasetLoader --> ReportMatchupDataset : returns

    ReportMatchupDataset *-- QuarterlyReportRecord : contains
    QuarterlyReportRecord *-- QuarterlyStatements : has
    QuarterlyReportRecord *-- PerformanceWindow : has
    PerformanceWindow *-- DailyClosePoint : has

    ReportMatchupService --> ReportMatchupResponse : returns
    ReportMatchupService --> ReportOptionsResponse : returns
    ReportMatchupResponse --> QuarterlyReportRecord : references
```

## Full System Overview

```mermaid
classDiagram
    direction LR

    class NextJS_API_Routes {
        <<API Layer>>
        /api/trades
        /api/portfolio
        /api/live-quote
        /api/live-quotes
        /api/quiz
        /api/bars
        /api/candles
        /api/quote
        /api/quote-snapshots
        /api/quarterly-reports
        /api/report-matchup
        /api/report-options
        /api/custom-quizzes
    }

    class TradeService {
        <<Service>>
    }
    class PortfolioService {
        <<Service>>
    }
    class PortfolioHistoryService {
        <<Service>>
    }
    class PostgresMarketDataProvider {
        <<Service>>
    }
    class FinnhubLiveQuoteService {
        <<Service>>
    }
    class ExecutionPriceResolver {
        <<Service>>
    }
    class QuizService {
        <<Service>>
    }
    class ReportMatchupService {
        <<Service>>
    }

    class PrismaORM {
        <<Data Access>>
        User
        Trade
        Position
        MarketPrice
        QuarterlyReport
        CustomQuiz
        CustomQuizQuestion
    }

    class FinnhubAPI {
        <<External>>
        REST /quote
        REST /stock/profile2
        WebSocket trades
    }

    class PostgreSQL {
        <<Database>>
    }

    NextJS_API_Routes --> TradeService
    NextJS_API_Routes --> PortfolioService
    NextJS_API_Routes --> PortfolioHistoryService
    NextJS_API_Routes --> FinnhubLiveQuoteService
    NextJS_API_Routes --> QuizService
    NextJS_API_Routes --> ReportMatchupService
    NextJS_API_Routes --> PostgresMarketDataProvider

    TradeService --> PrismaORM
    TradeService --> ExecutionPriceResolver
    PortfolioService --> PrismaORM
    PortfolioService --> PostgresMarketDataProvider
    PortfolioHistoryService --> PrismaORM
    PortfolioHistoryService --> PortfolioService
    PostgresMarketDataProvider --> PrismaORM
    QuizService --> PrismaORM
    ReportMatchupService --> PrismaORM

    ExecutionPriceResolver --> FinnhubLiveQuoteService
    ExecutionPriceResolver --> PostgresMarketDataProvider
    FinnhubLiveQuoteService --> FinnhubAPI

    PrismaORM --> PostgreSQL
```
