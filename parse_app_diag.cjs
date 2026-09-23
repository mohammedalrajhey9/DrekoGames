const fs = require('fs');
const ts = require('typescript');
const p = 'C:\\Users\\Administrator\\Desktop\\DrekoGames\\src\\App.tsx';
const src = fs.readFileSync(p, 'utf8');
const sf = ts.createSourceFile(p, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
console.log('diagnostic count', sf.parseDiagnostics.length);
for (const d of sf.parseDiagnostics.slice(0, 20)) {
  const { line, character } = ts.getLineAndCharacterOfPosition(sf, d.start);
  console.log('---');
  console.log('code', d.code, 'pos', d.start, 'len', d.length, 'line', line + 1, 'char', character + 1);
  console.log(ts.flattenDiagnosticMessageText(d.messageText, '\n'));
  const start = Math.max(0, d.start - 300);
  const end = Math.min(src.length, d.start + 300);
  console.log(src.slice(start, end));
}
