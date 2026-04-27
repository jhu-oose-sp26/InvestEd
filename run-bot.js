process.env.TS_NODE_COMPILER_OPTIONS = '{"module":"CommonJS"}';
require('ts-node').register();
require('tsconfig-paths').register();
const amm = require('./bots/amm.ts');

const loop = process.argv.includes('--loop');

if (loop) {
  console.log('Running in continuous mode...');
  setInterval(() => {
    amm.runMarketMaker().catch(console.error);
  }, 10000);
  amm.runMarketMaker().catch(console.error);
} else {
  amm.runMarketMaker()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
