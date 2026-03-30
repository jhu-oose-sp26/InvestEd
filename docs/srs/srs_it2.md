# Software Requirement Specification: InvestEd


## Problem Statement

Many Hopkins students who are beginning to invest lack structured guidance on how to develop and evaluate trading strategies. While passive investing is accessible, students who want to actively understand markets often feel overwhelmed by financial news and technical jargon. Beginners who attempt real trading also face significant financial risk while competing against experienced and algorithmic traders, creating a high barrier to learning through experimentation. InvestEd addresses this by offering a simulated, low-risk trading environment where students can test strategies, analyze performance, and learn through engaging features like leaderboards, daily challenges, and social competition.

## Potential Clients

Primary Users: Undergraduate and graduate students at Johns Hopkins University who are new to investing or want structured practice.
Secondary Users: College students at other universities seeking a competitive, simulation-based investing platform. Beginners interested in a fun, engaging and practical way to learn investing.
Future Stakeholders: Finance clubs, professors teaching investment-related courses, and student organizations

## Proposed Solution 
Our proposed solution is InvestEd, a web-based simulated trading platform that combines real market data, friend-based and global leaderboards, performance tracking and portfolio manager. This platform enables students to practice manual simulated trading using real market data, test rule-based strategies, compare performance through structured ranking systems and compete within friend groups or campus-wide leaderboards. By focusing on strategy evaluation and structured competition, InvestEd creates a safe but engaging learning environment that encourages experimentation and disciplined investing.

## Functional Requirements 

### Must haves:
- As a new or returning trader, I want to create an account and log in securely so that my simulated trades, progress, and strategies are saved and tied to me across sessions.
- As a beginner investor, I want to buy and sell stocks using real market data with virtual money so that I can practice trading without financial risk.
    - As a user, I want stock prices to automatically update from a live market data source so that my trades reflect real market conditions.
    - As a user, I want historical stock prices to be stored and consistently updated so that my portfolio valuation and price history charts are accurate over time.
    - As a user, I want a real-time quote display and basic price history visualization so that I can easily understand recent market trends before placing trades.
- As a user who wants to track improvement, I want to see my total portfolio value based on my simulated trades so that I can monitor performance and see how my decisions affect outcomes over time.
- As a socially engaged user, I want to create or join private friend groups with separate leaderboards so that I can compete directly with people I know to make learning more engaging.
- As a competitive user, I want to see global leaderboard ranking users by various performance metrics (such as total return percentage, annualized return, portfolio growth rate, etc.) so that rankings reward smart strategy.
- As a user motivated by comparison, I want to see a leaderboard ranking users by performance so that I can benchmark my results against others.
- As a socially engaged user, I want to invite friends and engage in educational competition.
    - As a socially engaged learner, I want to participate in financial statement multiple-choice quiz rounds so that I can improve my financial analysis skills through structured competition.

### Nice to have:
- As a user who benefits from structure, I want to participate in daily trading challenges with predefined constraints (ex: tech stocks only, long-only, low-volatility strategy) so that I can explore focused learning goals.
- As a user analyzing performance, I want to view historical charts and transaction logs so that I can reflect on my trading behavior and identify patterns.
- As a user, I want a personalized “Stocks Wrapped” summary at the end of each semester or year so that I can see highlights of my trading activity, performance trends, and growth over time in a fun, engaging format.
- As a user exploring investment opportunities, I want to swipe through stocks or options with brief insights so that I can quickly discover and shortlist assets.
- As a user with trading ideas but little or no programming experience, I want to describe trading strategies in plain English so that I can test ideas without learning how to code.
- As a user experimenting with strategy-based trading, I want my plain-English strategy to be automatically converted into executable code so that it can be tested rather than remaining theoretical.

### Non-functional requirements:

- The system must support concurrent users without significant latency.
- Strategy logic and portfolio data must be securely stored.
- Users must have control over public vs. anonymous visibility.
- Interface must be intuitive for first-time investors.
- Portfolio dashboards and leaderboards must present information clearly without overwhelming financial jargon.
- Market data must be accurate and consistent.

## Software Architecture & Technology Stack 

###### Web-based (possibly mobile depending on time constraint) client-server system

###### Frontend: 
- Responsible for user interactions, account management, simulated trading interfaces, portfolio visualization, etc. 
- Javascript React
- Communicate with the backend using RESTful APIs.

###### Backend: 
- Handles core application logic like user authentication, strategy processing, trade simulation, data management, etc using service-oriented architecture
- Python (Good for data, analytics)
- FastAPI

###### Data:
- Market data extracted from financial data APIs (Alpaca, Yahoo Finance, Finnhub, Alpha Vantage) and possible scraping 
- Relational databases like PostgreSQL used to store user accounts, simulated trades and strategy metadata, etc for structured queries.
- Encryption for sensitive data 

###### Cloud-Based Infrastructure to allow for scaling and responsiveness for demand and traffic. 

## Similar Apps: 

- QuantConnect - allows users to define strategies and backtest them against historical market data. has the pipeline (plain english strategy -> python code -> historic data backtest) implemented. Difference: focuses on advanced users and offers a pipeline from strategy definition to code execution. Differs from our educational features targeting beginners. 

- Investopedia Simulator - allows users to practice trading with virtual money using real market data. However, it focuses mainly on manual trading and lacks structured strategy testing, automated backtesting, or AI-driven feedback.