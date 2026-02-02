const fs = require('fs');
const lcov = fs.readFileSync('coverage/lcov.info', 'utf8');
let total = 0;
let covered = 0;
let currentFile = '';

// Web-only files that require browser to test (legitimate exclusions)
const webOnlyFiles = [
  'export_service_web.dart',
  'browser_origin_web.dart',
  'browser_utils_web.dart',
];

const isWebOnlyFile = (path) => webOnlyFiles.some(f => path.includes(f));

for (const line of lcov.split('\n')) {
  if (line.startsWith('SF:')) {
    currentFile = line.substring(3);
  }
  if (line.startsWith('DA:') && !isWebOnlyFile(currentFile)) {
    total++;
    // Line is covered if count > 0 (not ending in ,0)
    if (!line.endsWith(',0')) {
      covered++;
    }
  }
}

const pct = (covered / total * 100).toFixed(2);
const uncovered = total - covered;
const needed80 = Math.ceil(total * 0.80) - covered;
const needed85 = Math.ceil(total * 0.85) - covered;

console.log('=== COVERAGE SUMMARY ===');
console.log('Coverage: ' + pct + '% (' + covered + '/' + total + ' lines)');
console.log('Uncovered: ' + uncovered + ' lines');
console.log('Need ' + (needed80 > 0 ? needed80 : 0) + ' more lines for 80%');
console.log('Need ' + (needed85 > 0 ? needed85 : 0) + ' more lines for 85%');
