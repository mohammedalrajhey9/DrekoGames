const fs = require('fs')
const s = fs.readFileSync('src/App.tsx','utf8')
let bal = 0
for (let i=0;i<s.length;i++){
  const ch = s[i]
  if (ch === '{') bal++
  else if (ch === '}') bal--
  if (bal < 0){
    const lines = s.slice(0,i).split('\n')
    const line = lines.length
    const col = lines[lines.length-1].length + 1
    console.log('Negative at index', i, 'line', line, 'col', col)
    const snippet = s.split('\n').slice(Math.max(0,line-6), line+4).map((l,idx)=>`${Math.max(1,line-6)+idx}: ${l}`).join('\n')
    console.log('--- SNIPPET ---')
    console.log(snippet)
    process.exit(0)
  }
}
console.log('No negative balance. final bal', bal)
if (bal > 0) {
  const lines = s.split('\n')
  console.log('Last open brace maybe at line', lines.length)
}
