// Joins the game's source files in src/ (in name order) into public/app.js.
// Run `npm run build` after editing src/, or just start the server: it builds on start.
const fs = require('fs'), path = require('path');
function build() {
  const dir = path.join(__dirname, 'src');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js')).sort();
  const body = files.map((f) => fs.readFileSync(path.join(dir, f), 'utf8').replace(/\n$/, '')).join('\n');
  const out = '/* Built from src/ by build.js. Edit the files in src/, not this one. */\n(() => {' + body + '\n})();\n';
  fs.writeFileSync(path.join(__dirname, 'public', 'app.js'), out);
  return { files: files.length, bytes: out.length };
}
if (require.main === module) { const r = build(); console.log(`Built public/app.js from ${r.files} files (${r.bytes} bytes)`); }
module.exports = { build };
