const fs = require('fs');
const path = process.argv[2];
if (!path) { console.error('Usage: node check_braces.js <file>'); process.exit(2) }
const s = fs.readFileSync(path, 'utf8');
const pairs = { '{': '}', '(': ')', '[': ']' };
const opens = Object.keys(pairs);
const closes = Object.values(pairs);
const stack = [];
for (let i = 0; i < s.length; i++) {
  const ch = s[i];
  const line = s.slice(0, i).split('\n').length;
  const col = i - s.lastIndexOf('\n', i - 1);
  if (opens.includes(ch)) {
    stack.push({ ch, i, line, col });
  } else if (closes.includes(ch)) {
    const expected = opens[closes.indexOf(ch)];
    const last = stack[stack.length - 1];
    if (!last || last.ch !== expected) {
      console.error('Mismatch at', { index: i, line, col, found: ch, expected_for_top: last ? pairs[last.ch] : null });
      process.exit(1);
    }
    stack.pop();
  }
}
if (stack.length) {
  const last = stack[stack.length - 1];
  console.error('Unclosed opener at', { index: last.i, line: last.line, col: last.col, opener: last.ch });
  process.exit(1);
}
console.log('All braces balanced');
