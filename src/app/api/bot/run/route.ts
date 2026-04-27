import { NextResponse } from 'next/server';
import { runMarketMaker } from '@/../bots/amm';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const authHeader = request.headers.get('authorization');

  // Security check: Verify CRON_SECRET to prevent unauthorized access
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    console.log('Cron Job: Triggering Market Maker bot...');
    await runMarketMaker();
    return NextResponse.json({ success: true, message: 'AMM cycle complete' });
  } catch (error) {
    console.error('Cron Job Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
