process.env.TS_NODE_COMPILER_OPTIONS = '{"module":"CommonJS"}';
require('ts-node').register();
require('tsconfig-paths').register();
require('./scratch/merge_positions.ts');
