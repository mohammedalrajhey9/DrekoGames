const fs = require('fs')
const s = fs.readFileSync('src/App.tsx','utf8')
const lines = s.split('\n')
let bal = 0
let min = Infinity
let minLine = 0
for (let i = 0; i < lines.length; i++) {
  for (const ch of lines[i]) {
    if (ch === '(') bal++
    else if (ch === ')') bal--
  }
  if (bal < min) { min = bal; minLine = i + 1 }
}
console.log('min bal', min, 'at line', minLine)
if (min < 0) {
  console.log('Snippet around min:')
  console.log(lines.slice(Math.max(0, minLine-4), minLine+2).map((l, idx) => `${Math.max(1, minLine-4)+idx}: ${l}`).join('\n'))
} else {
  console.log('paren balance OK overall, final bal', bal)
}
