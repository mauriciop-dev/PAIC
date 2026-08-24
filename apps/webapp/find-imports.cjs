const fs = require('fs');
const path = require('path');

function walk(dir) {
  let files = [];
  try {
    fs.readdirSync(dir).forEach(f => {
      const full = path.join(dir, f);
      if (fs.statSync(full).isDirectory()) files = files.concat(walk(full));
      else if (f.endsWith('.tsx')) files.push(full);
    });
  } catch(e) {}
  return files;
}

walk('components').forEach(f => {
  const c = fs.readFileSync(f, 'utf8');
  if (/from\s+['"](\.\.\/)+ui\//.test(c)) console.log(f);
});