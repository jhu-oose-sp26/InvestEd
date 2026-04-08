# Updated Architectural UML Diagram

Based on the review of the current codebase (`schema.prisma`, `FOLDER_STRUCTURE.md`, and business logic features), the architecture has been modernized compared to the old diagram. The application now uses direct database models via Prisma (`User`, `Trade`, `Position`, `MarketPrice`, `CustomQuiz`), modular services (`TradeService`, `PortfolioService`), and distinguishes between the `PostgresMarketDataProvider` (storing historical/latest ticks) and `Finnhub` / `Alpaca` pipelines for external data ingestion.

Below is the Mermaid class diagram documenting the updated structure, including Quizzes, Alpaca API, and Candlestick Data Pipelines:

```mermaid
classDiagram
    %% Core Trading and User Entities
    class User {
        id: String
        email: String
        cashBalance: Decimal
    }
    
    class Position {
        id: String
        userId: String
        symbol: String
        quantity: Int
        averageBuyPrice: Decimal
        updatedAt: DateTime
    }
    
    class Trade {
        id: String
        userId: String
        symbol: String
        type: TradeType
        quantity: Int
        price: Decimal
        totalValue: Decimal
        executedAt: DateTime
    }
    
    class TradeType {
        <<enum>>
        BUY
        SELL
    }

    %% Quizzes Module
    class CustomQuiz {
        id: String
        title: String
        description: String
        userId: String
        isPublic: Boolean
        createdAt: DateTime
        updatedAt: DateTime
    }

    class CustomQuizQuestion {
        id: String
        quizId: String
        prompt: String
        options: Json
        correctAnswer: String
        context: String
        order: Int
    }

    %% Market Data Models
    class MarketPrice {
        <<entity>>
        %% Represents OHLCV Candlestick charts
        symbol: String
        timestamp: DateTime
        timeframe: String
        open: Decimal
        high: Decimal
        low: Decimal
        close: Decimal
        volume: BigInt
        vwap: Decimal
    }
    
    %% Application Services
    class MarketDataProvider {
        <<interface>>
        + getQuote(symbol: String): Quote
        + getQuotes(symbols: String[]): Quote[]
    }
    
    class PostgresMarketDataProvider {
        + getQuote(symbol: String): Quote
        + getQuotes(symbols: String[]): Quote[]
    }
    
    class ExecutionPriceModule {
        <<module>>
        + resolveTradeExecutionPrice(symbol: String): ExecutionPrice
    }
    
    class TradeService {
        + executeTrade(input: ExecuteTradeInput): TradeResult
        + getUserTrades(userId: String, symbol: String~optional~): Trade[]
        + getUserPositions(userId: String): Position[]
    }
    
    class PortfolioService {
        + getPortfolioSummary(userId: String): PortfolioSummary
    }

    %% External APIs & Data Pipelines
    class FinnhubService {
        <<module>>
        + getLiveQuote(symbol: String, apiKey: String): FinnhubQuote
        + getLiveQuotes(symbols: String[], apiKey: String): FinnhubQuote[]
    }

    class AlpacaAPI {
        <<external>>
    }

    class AlpacaDataPipeline {
        <<module>>
        + fetchBars(symbol: String, start: DateTime, end: DateTime, timeframe: String)
    }

    class CandleSupabasePipeline {
        <<module>>
        + syncCandlesToSupabase(symbol: String, start: DateTime, end: DateTime)
        + syncSnapshotsToSupabase()
    }


    %% Inheritances
    MarketDataProvider <|.. PostgresMarketDataProvider

    %% App Service Use Relations
    PortfolioService ..> MarketDataProvider : Use
    PortfolioService ..> User : Use
    PortfolioService ..> Position : Use

    TradeService ..> User : Use
    TradeService ..> Position : Use
    TradeService ..> Trade : Use
    
    PostgresMarketDataProvider ..> MarketPrice : Use
    
    ExecutionPriceModule ..> MarketDataProvider : Fallback
    ExecutionPriceModule ..> FinnhubService : Use

    %% Structural Domain Relationships
    User "1" o-- "0..*" Position : owns
    User "1" o-- "0..*" Trade : executes
    Trade ..> TradeType : uses
    
    User "1" o-- "0..*" CustomQuiz : creates
    CustomQuiz "1" *-- "0..*" CustomQuizQuestion : contains

    %% Pipeline and External Data Flow (Candlesticks)
    AlpacaDataPipeline ..> AlpacaAPI : Fetches Bar Data
    CandleSupabasePipeline ..> AlpacaDataPipeline : Uses
    CandleSupabasePipeline ..> FinnhubService : Uses
    CandleSupabasePipeline ..> MarketPrice : Populates (Candlesticks)
```
