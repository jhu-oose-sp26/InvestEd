# Software Requirements Specification (SRS)

## Problem Statement

Hopkins students who have just started investing their money often have no idea where to begin. While they could invest passively in treasury bonds or the S&P 500, students who want to develop trading strategies or achieve higher returns often find stock-picking articles and market news overwhelming. Additionally, beginners who attempt to trade actively risk losing money because they are competing against experienced traders, trading firms, and automated algorithms. This application will allow Hopkins students to practice trading skills and develop intuition in a low-stakes, risk-free environment.

---

## Potential Clients

- College students who have just started investing  
- Students who want to learn more about investing  
- Initially targeting Hopkins students  

---

## Proposed Solution

The proposed solution is an interactive platform that helps students learn investing through simulated trading, guided strategy testing, and educational support. By combining analytics, AI assistance, and engaging features, the application helps users gradually build confidence and decision-making skills in a structured, low-pressure learning environment.

---

## Functional Requirements

### Must Have

- **Account Management**
  - As a new or returning trader, I want to create an account and log in securely so that my simulated trades, progress, and strategies are saved and tied to me across sessions.

- **Simulated Trading**
  - As someone learning how stock markets work, I want to simulate trading using real market data without real money so that I can practice strategies and understand market behavior without financial risk.

- **Portfolio Tracking**
  - As a user who wants to track improvement, I want to see my total portfolio value based on my simulated trades so that I can monitor performance and see how my decisions affect outcomes over time.

- **Educational Content**
  - As a learner with limited time, I want access to short lessons and quick tips so that I can understand key trading concepts without needing extensive prior knowledge.

- **Natural Language Strategy Input**
  - As a user with trading ideas but little or no programming experience, I want to describe trading strategies in plain English so that I can test ideas without learning how to code.

- **Strategy Translation**
  - As a user experimenting with strategy-based trading, I want my plain-English strategy to be automatically converted into executable code so that it can be tested rather than remaining theoretical.

- **Strategy Backtesting**
  - As a user trying to evaluate a trading strategy, I want to run my strategy against real historical market data and receive performance metrics so that I can understand how effective the strategy would have been.

- **Strategy Assessment**
  - As a user looking to improve decision-making, I want to receive an assessment of my strategy so that I can identify weaknesses and refine my approach.

---

### Nice to Have

- **Advanced Trading Simulation**
  - As a more advanced or curious user, I want to simulate high-frequency or algorithmic trading strategies so that I can explore more complex trading techniques in a risk-free environment.

- **AI Strategy Suggestions**
  - As a user seeking guidance, I want personalized, AI-powered trade and strategy suggestions based on my activity and market data so that I can make more informed decisions.

- **Leaderboard**
  - As a user motivated by comparison, I want to see a leaderboard ranking users by performance so that I can benchmark my results against others.

- **Social Features**
  - As a socially engaged user, I want to invite friends and earn rewards so that I am incentivized to stay active and unlock additional features.

- **Trading Challenges**
  - As a user who benefits from structure, I want to participate in weekly or monthly trading challenges so that I stay engaged and build consistent learning habits.

- **Stock Discovery Interface**
  - As a user exploring investment opportunities, I want to swipe through stocks or options with brief insights so that I can quickly discover and shortlist assets.

---

## Non-Functional Requirements

- **Performance**
  - As a user who frequently tests ideas, I want simulations and strategy tests to run quickly so that I receive immediate feedback and can iterate efficiently.

- **Scalability & Reliability**
  - As an active user, I want the app to remain responsive even during high traffic so that performance issues do not disrupt my experience.

- **Security & Privacy**
  - As a user who values privacy and trust, I want my personal data, strategies, and activity to be securely protected so that I feel confident using the platform.

- **Usability**
  - As a user new to trading tools, I want an intuitive and easy-to-navigate interface so that I can use the app effectively without feeling overwhelmed.

---

## Software Architecture & Technology Stack

### Application Type
Web-based client-server system (with potential mobile support depending on time constraints).

---

### Frontend

**Responsibilities**
- User interactions
- Account management
- Simulated trading interfaces
- Portfolio visualization

**Technologies**
- JavaScript
- React
- RESTful API communication with backend

---

### Backend

**Responsibilities**
- User authentication
- Strategy processing
- Trade simulation
- Data management
- AI-based strategy interpretation (natural language to trading logic)

**Technologies**
- Python
- FastAPI
- Service-oriented architecture

---

### Data Layer

**Market Data**
- Financial data APIs
- Possible web scraping

**Database**
- PostgreSQL for storing:
  - User accounts
  - Simulated trades
  - Strategy metadata

**Security**
- Encryption for sensitive data

---

### Infrastructure

- Cloud-based infrastructure to allow scalability and high availability

---

## Similar Applications

### QuantConnect
- Allows users to define trading strategies and backtest them using historical market data.
- Provides a pipeline from strategy definition to code execution.

**Difference:**  
Focuses on advanced users and lacks beginner-oriented educational features and simplified user experience.

---

### Investopedia Simulator
- Allows users to practice trading with virtual money using real market data.

**Difference:**  
Focuses primarily on manual trading and lacks automated backtesting, structured strategy testing, and AI-driven feedback.

---

### Kalshi Demo
- Provides a demo version of its trading/betting platform.

**Difference:**  
Lacks educational support and AI-driven feedback, and primarily focuses on trading functionality.

---
