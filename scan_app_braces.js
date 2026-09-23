const fs = require('fs');
const p = 'C:\\Users\\Administrator\\Desktop\\DrekoGames\\src\\App.tsx';
const text = fs.readFileSync(p, 'utf8');
const stack = [];
let quote = null;
let escape = false;
let inLineComment = false;
let inBlockComment = false;
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
    if (escape) {
      escape = false;
    } else if (ch === '\\') {
      escape = true;
    } else if (ch === quote) {
      quote = null;
    }
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
    stack.push(ch);
  } else if (')]}'.includes(ch)) {
    if (!stack.length) {
      console.log('extra close', ch, 'at', i);
      process.exit(1);
    }
    const opener = stack.pop();
    const pairs = { '(': ')', '[': ']', '{': '}' };
    if (pairs[opener] !== ch) {
      console.log('mismatch', opener, ch, 'at', i);
      process.exit(1);
    }
  }
}
console.log('balanced?', !stack.length);
if (stack.length) {
  console.log('remaining', stack.slice(-20));
}
