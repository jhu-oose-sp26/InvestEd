export interface Quote {
    symbol: string
    price: number
    timestamp: number
}

export interface MarketDataProvider {
    getQuote(symbol: string): Promise<Quote>
    getQuotes(symbols: string[]): Promise<Quote[]>
}
