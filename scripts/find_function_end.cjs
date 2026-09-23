const fs=require('fs')
const s=fs.readFileSync('src/App.tsx','utf8')
const needle='function App() {'
const idx=s.indexOf(needle)
if(idx===-1){console.log('function not found');process.exit(1)}
let start = s.indexOf('{', idx)
let bal=0
for(let i=start;i<s.length;i++){
  if(s[i]==='{')bal++
  else if(s[i]==='}')bal--
  if(bal===0){
    const lines = s.slice(0,i+1).split('\n')
    console.log('function App ends at line', lines.length)
    console.log(s.split('\n').slice(Math.max(0,lines.length-5),lines.length+1).map((l,idx)=>`${Math.max(1,lines.length-5)+idx}: ${l}`).join('\n'))
    break
  }
}
