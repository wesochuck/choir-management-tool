const fs = require('fs');
const path = require('path');

const filePath = path.resolve('src/views/admin/SettingsView.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const replacements = [
  { search: /className="badge badge-rehearsal" className="badge badge-rehearsal admin-badge-inline"/g, replace: 'className="badge badge-rehearsal admin-badge-inline"' },
  { search: /className="card"\s*className="card admin-settings-input-sm"/g, replace: 'className="card admin-settings-input-sm"' },
  { search: /className="btn btn-ghost"\s*className="btn btn-ghost"/g, replace: 'className="btn btn-ghost"' }
];

replacements.forEach(r => {
  content = content.replace(r.search, r.replace);
});

fs.writeFileSync(filePath, content, 'utf8');
console.log('SettingsView.tsx fixed.');
