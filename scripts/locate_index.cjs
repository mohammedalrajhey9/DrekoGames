const fs = require('fs')
const s = fs.readFileSync('src/App.tsx','utf8')
const idx = 25628
let line = 1, col = 1
for (let i = 0; i < idx && i < s.length; i++){
  if (s[i] === '\n') { line++; col = 1 } else col++
}
console.log('Index', idx, 'Line', line, 'Col', col)
const start = Math.max(0, idx-200)
const end = Math.min(s.length, idx+200)
const snippet = s.slice(start,end)
console.log('--- SNIPPET ---')
console.log(snippet)
