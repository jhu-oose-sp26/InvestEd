const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');
dotenv.config();

async function main() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.PROD_DATABASE_URL,
      },
    },
  });

  const BOT_EMAIL = 'bot@invested.com';
  const INITIAL_CASH = 10000000;

  console.log('Checking for bot user on production...');
  let bot = await prisma.user.findUnique({
    where: { email: BOT_EMAIL }
  });

  if (!bot) {
    console.log('Bot user not found. Creating bot user and portfolio...');
    bot = await prisma.user.create({
      data: {
        email: BOT_EMAIL,
        username: 'AMMBot',
        name: 'Automated Market Maker',
        accountNumber: `BOT-PROD-${Date.now()}`,
        portfolios: {
          create: {
            name: 'Market Maker Portfolio',
            cashBalance: INITIAL_CASH
          }
        }
      }
    });
    console.log(`Created bot user with ID: ${bot.id}`);
  } else {
    console.log(`Bot user found (ID: ${bot.id}). Checking for portfolio...`);
    const portfolio = await prisma.portfolio.findFirst({
      where: { userId: bot.id }
    });

    if (!portfolio) {
      console.log('No portfolio found. Creating one...');
      const newPortfolio = await prisma.portfolio.create({
        data: {
          userId: bot.id,
          name: 'Market Maker Portfolio',
          cashBalance: INITIAL_CASH
        }
      });
      console.log(`Created portfolio with ID: ${newPortfolio.id}`);
    } else {
      console.log(`Bot already has a portfolio (ID: ${portfolio.id}).`);
    }
  }

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
