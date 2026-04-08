# Updated Architectural UML Diagram

Based on the review of the current codebase (`schema.prisma`, `FOLDER_STRUCTURE.md`, and business logic features), the architecture has been modernized compared to the old diagram. The application now uses direct database models via Prisma (`User`, `Trade`, `Position`, `MarketPrice`), modular services (`TradeService`, `PortfolioService`), and distinguishes between the `PostgresMarketDataProvider` (storing historical/latest ticks) and `Finnhub` live data.

Below is the Mermaid class diagram documenting the updated structure:

```mermaid
classDiagram
    class MarketPrice {
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
    
    class FinnhubService {
        <<module>>
        + getLiveQuote(symbol: String, apiKey: String): FinnhubQuote
        + getLiveQuotes(symbols: String[], apiKey: String): FinnhubQuote[]
    }

    class TradeService {
        + executeTrade(input: ExecuteTradeInput): TradeResult
        + getUserTrades(userId: String, symbol: String~optional~): Trade[]
        + getUserPositions(userId: String): Position[]
    }
    
    class PortfolioService {
        + getPortfolioSummary(userId: String): PortfolioSummary
    }
    
    class Position {
        id: String
        userId: String
        symbol: String
        quantity: Int
        averageBuyPrice: Decimal
        updatedAt: DateTime
    }
    
    class User {
        id: String
        email: String
        cashBalance: Decimal
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

    %% Inheritance
    MarketDataProvider <|.. PostgresMarketDataProvider

    %% Relations (Use)
    PortfolioService ..> MarketDataProvider : Use
    PortfolioService ..> User : Use
    PortfolioService ..> Position : Use

    TradeService ..> User : Use
    TradeService ..> Position : Use
    TradeService ..> Trade : Use
    
    PostgresMarketDataProvider ..> MarketPrice : Use
    
    ExecutionPriceModule ..> MarketDataProvider : Fallback
    ExecutionPriceModule ..> FinnhubService : Use

    %% Structural Relationships
    User "1" o-- "0..*" Position : owns
    User "1" o-- "0..*" Trade : executes
    Trade ..> TradeType : uses
```
