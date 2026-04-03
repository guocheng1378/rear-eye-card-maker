// build.js — Combines template.html + dist/app.js → app/src/main/assets/index.html
const fs = require('fs');
const path = require('path');

const template = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');
const js = fs.readFileSync(path.join(__dirname, 'dist', 'app.js'), 'utf8');

const output = template.replace('/*__SCRIPT__*/', js);

const outPath = path.join(__dirname, 'app', 'src', 'main', 'assets', 'index.html');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, output, 'utf8');

console.log(`✅ Built: ${outPath} (${(output.length / 1024).toFixed(1)}KB)`);
