const fs = require('fs')
const s = fs.readFileSync('src/App.tsx','utf8')
const opens = { '{': '}', '(': ')', '[': ']' }
const closes = { '}': '{', ')': '(', ']': '[' }
const stack = []
for (let i=0;i<s.length;i++){
  const ch = s[i]
  if (opens[ch]) stack.push({ch, i})
  else if (closes[ch]){
    const last = stack[stack.length-1]
    if (!last || last.ch !== closes[ch]){
      // mismatch
      const lines = s.slice(0,i).split('\n')
      const line = lines.length
      const col = lines[lines.length-1].length+1
      console.log('Mismatch at index', i, 'char', ch, 'expected', last?opens[last.ch]:undefined)
      console.log('Line',line,'Col',col)
      const startLine = Math.max(1,line-6)
      const snippet = s.split('\n').slice(startLine-1, line+4).map((l,idx)=>`${startLine+idx}: ${l}`).join('\n')
      console.log('--- SNIPPET ---')
      console.log(snippet)
      process.exit(0)
    } else {
      stack.pop()
    }
  }
}
console.log('No mismatch found. Stack size', stack.length)
if (stack.length>0){
  const last = stack[stack.length-1]
  const lines = s.slice(0,last.i).split('\n')
  console.log('Last open at', last.ch, 'index', last.i, 'line', lines.length)
}
