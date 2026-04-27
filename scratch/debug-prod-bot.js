const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');
dotenv.config();

async function main() {
  const prisma = new PrismaClient({
    datasources: { db: { url: process.env.PROD_DATABASE_URL } },
  });

  const bot = await prisma.user.findUnique({
    where: { email: 'bot@invested.com' },
    include: { portfolios: true }
  });

  console.log('Bot User:', JSON.stringify(bot, null, 2));

  await prisma.$disconnect();
}

main();
