const fs = require('fs')
const s = fs.readFileSync('src/App.tsx','utf8')
const stack = []
const pairs = { '{': '}', '(': ')', '[': ']' }
for (let i = 0; i < s.length; i++) {
  const ch = s[i]
  if (ch === '{' || ch === '(' || ch === '[') stack.push({ch,i})
  if (ch === '}' || ch === ')' || ch === ']') {
    const last = stack.pop()
    if (!last) { console.log('Unmatched closing', ch, 'at', i); process.exit(0)}
    const expected = pairs[last.ch]
    if (expected !== ch) { console.log('Mismatched at', i, 'expected', expected, 'got', ch); process.exit(0)}
  }
}
if (stack.length) { console.log('Unclosed openings:', stack.map(x=>x.ch+'@'+x.i).slice(0,10)); process.exit(0)}
console.log('All braces balanced')
