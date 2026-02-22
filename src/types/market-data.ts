export interface Quote {
    symbol: string
    price: number
    timestamp: number
}

export interface MarketDataProvider {
    // Returns the latest stored price for a symbol from the configured data source.
    getQuote(symbol: string): Promise<Quote>
    // Returns the latest stored prices for the requested symbols.
    getQuotes(symbols: string[]): Promise<Quote[]>
}
