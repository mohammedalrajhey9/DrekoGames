const fs=require('fs')
const s=fs.readFileSync('src/App.tsx','utf8')
let bal=0
const lines=s.split('\n')
for(let i=0;i<lines.length;i++){
  for(const ch of lines[i]){
    if(ch==='(') bal++
    else if(ch===')') bal--
    if(bal<0){
      console.log('Paren negative at line', i+1, 'col', lines[i].indexOf(')')+1)
      console.log(lines.slice(Math.max(0,i-4),i+2).map((l,idx)=>`${Math.max(1,i-4)+idx}: ${l}`).join('\n'))
      process.exit(0)
    }
  }
}
console.log('No negative paren, final bal',bal)
