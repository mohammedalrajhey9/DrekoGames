const fs = require('fs');
const path = process.argv[2];
if (!path) { console.error('Usage: node check_braces.cjs <file>'); process.exit(2) }
const s = fs.readFileSync(path, 'utf8');
const pairs = { '{': '}', '(': ')', '[': ']' };
const opens = Object.keys(pairs);
const closes = Object.values(pairs);
const stack = [];
let inSingle = false, inDouble = false, inBacktick = false, inRegex = false, escaped = false;
const isRegexStarter = (prev) => {
  if (!prev) return true;
  return /[=\(\[,!:?&|{};\n]/.test(prev);
}
for (let i = 0; i < s.length; i++) {
  const ch = s[i];
  const prev = s[i-1] || '';
  const line = s.slice(0, i).split('\n').length;
  const col = i - s.lastIndexOf('\n', i - 1);

  if (escaped) { escaped = false; continue }
  if (ch === '\\') { escaped = true; continue }

  if (!inSingle && !inDouble && !inBacktick && ch === '/' && isRegexStarter(s.slice(0, i).trim().slice(-1))) {
    // Heuristic - start of regex
    inRegex = true;
    continue
  }

  if (inRegex) {
    if (ch === '/' && prev !== '\\') {
      inRegex = false;
    }
    continue
  }

  if (!inSingle && !inDouble && !inRegex && ch === '`') { inBacktick = !inBacktick; continue }
  if (!inSingle && !inBacktick && !inRegex && ch === '"') { inDouble = !inDouble; continue }
  if (!inDouble && !inBacktick && !inRegex && ch === "'") { inSingle = !inSingle; continue }

  if (inSingle || inDouble || inBacktick) continue

  if (opens.includes(ch)) {
    stack.push({ ch, i, line, col });
  } else if (closes.includes(ch)) {
    const expected = opens[closes.indexOf(ch)];
    const last = stack[stack.length - 1];
    if (!last || last.ch !== expected) {
      console.error('Mismatch at', { index: i, line, col, found: ch, expected_for_top: last ? pairs[last.ch] : null });
      console.error('Current stack (top last):', stack.map(s=>({opener:s.ch,line:s.line,col:s.col}))); 
      const start = Math.max(0, i-80); const end = Math.min(s.length, i+80);
      console.error('Context:\n' + s.slice(start,end));
      process.exit(1);
    }
    stack.pop();
  }
}
if (inSingle || inDouble || inBacktick || inRegex) {
  console.error('Unclosed string/regex at end of file', { inSingle, inDouble, inBacktick, inRegex });
  process.exit(1);
}
if (stack.length) {
  const last = stack[stack.length - 1];
  console.error('Unclosed opener at', { index: last.i, line: last.line, col: last.col, opener: last.ch });
  process.exit(1);
}
console.log('All braces balanced');
