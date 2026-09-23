const fs = require('fs');
const p = 'C:\\Users\\Administrator\\Desktop\\DrekoGames\\src\\App.tsx';
const text = fs.readFileSync(p, 'utf8');
const stack = [];
let quote = null;
let escape = false;
let inLineComment = false;
let inBlockComment = false;
let mismatchIndex = null;
for (let i = 0; i < text.length; i++) {
  const ch = text[i];
  if (inLineComment) {
    if (ch === '\n') inLineComment = false;
    continue;
  }
  if (inBlockComment) {
    if (ch === '*' && text[i + 1] === '/') {
      inBlockComment = false;
      i++;
    }
    continue;
  }
  if (quote) {
    if (escape) { escape = false; }
    else if (ch === '\\') { escape = true; }
    else if (ch === quote) { quote = null; }
    continue;
  }
  if (ch === '/' && text[i + 1] === '/') {
    inLineComment = true;
    i++;
    continue;
  }
  if (ch === '/' && text[i + 1] === '*') {
    inBlockComment = true;
    i++;
    continue;
  }
  if (ch === '"' || ch === "'" || ch === '`') {
    quote = ch;
    continue;
  }
  if ('([{'.includes(ch)) {
    stack.push({ ch, i });
  } else if (')]}'.includes(ch)) {
    if (!stack.length) {
      console.log('extra close', ch, 'at', i);
      console.log(text.slice(Math.max(0, i - 300), i + 300));
      process.exit(0);
    }
    const opener = stack.pop();
    const pairs = { '(': ')', '[': ']', '{': '}' };
    if (pairs[opener.ch] !== ch) {
      console.log('mismatch', opener.ch, ch, 'at', i, 'opened_at', opener.i);
      console.log('--- around ---');
      console.log(text.slice(Math.max(0, i - 300), i + 300));
      process.exit(0);
    }
  }
}
console.log('balanced?', !stack.length);
console.log('remaining', stack.slice(-10));
