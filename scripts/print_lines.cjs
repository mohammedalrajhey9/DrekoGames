const fs = require('fs')
const s = fs.readFileSync('src/App.tsx','utf8')
const lines = s.split('\n')
const start = 2520
const end = 2560
for (let i = start; i <= end && i <= lines.length; i++) {
  const num = String(i).padStart(5,' ')
  console.log(num + ': ' + (lines[i-1]||''))
}
