const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('\x1b[31m%s\x1b[0m', 'Error: Please provide a dataset size N.');
  console.log('Usage: npm run benchmark:efficiency <N>');
  console.log('Example: npm run benchmark:efficiency 3000000\n');
  process.exit(1);
}

const nInput = args[0];
// Remove commas if the user passed something like 3,000,000
const N = parseInt(nInput.replace(/,/g, ''), 10);

if (isNaN(N) || N <= 0) {
  console.error('\x1b[31m%s\x1b[0m', 'Error: N must be a valid positive integer greater than 0.');
  process.exit(1);
}

console.log('\n===================================================');
console.log('         ALGORITHMIC EFFICIENCY BENCHMARK');
console.log('======================================================');

const sequentialComplexity = N;
const hybridComplexity = Math.log2(N);

const performanceRatio = sequentialComplexity / hybridComplexity;

const formatter = new Intl.NumberFormat('en-US');

console.log(`\nDataset Size (N): \x1b[36m${formatter.format(N)}\x1b[0m records`);
console.log(`\nTheoretical Complexities:`);
console.log(`  Sequential Approach O(N):       ${formatter.format(sequentialComplexity)} operations`);
console.log(`  Hybrid Approach O(log2 N):      ~${formatter.format(Math.round(hybridComplexity * 100) / 100)} operations`);

console.log('\n------------------------------------------------------');
console.log(`Performance Ratio S(N) = O(N) / O(log2 N)`);
console.log(`------------------------------------------------------`);
console.log(`\nFor a dataset of ${formatter.format(N)} records, the hybrid approach is theoretically:`);
console.log(`\x1b[32m~${formatter.format(Math.floor(performanceRatio))} times faster\x1b[0m than the sequential approach.\n`);
console.log('======================================================\n');
