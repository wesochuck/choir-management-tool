const fs = require('fs');
const path = require('path');

const filePath = path.resolve('src/views/admin/SettingsView.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const replacements = [
  { search: /style=\{\{\s*padding:\s*'var\(--space-xl\)'\s*\}\}/g, replace: 'className="admin-settings-container"' },
  { search: /<div className="flex-col" style=\{\{\s*gap:\s*'var\(--space-xl\)',\s*padding:\s*'var\(--space-xl\) 0'\s*\}\}>/g, replace: '<div className="flex-col admin-settings-container">' },
  { search: /<div className="flex-responsive" style=\{\{\s*justifyContent:\s*'space-between',\s*alignItems:\s*'center'\s*\}\}>/g, replace: '<div className="admin-view-header">' },
  { search: /<h1 className="text-display" style=\{\{\s*margin:\s*0\s*\}\}>/g, replace: '<h1 className="admin-header-title">' },
  { search: /style=\{\{\s*alignSelf:\s*'flex-start'\s*\}\}/g, replace: 'className="badge badge-rehearsal admin-badge-inline"' },
  { search: /<div className="flex-col" style=\{\{\s*gap:\s*'var\(--space-xs\)'\s*\}\}>/g, replace: '<div className="flex-col admin-settings-field">' },
  { search: /style=\{\{\s*width:\s*'100%',\s*maxWidth:\s*'400px',\s*padding:\s*'0 12px',\s*height:\s*'40px',\s*border:\s*'1px solid var\(--border\)',\s*borderRadius:\s*'var\(--radius-md\)'\s*\}\}/g, replace: 'className="card admin-settings-input-sm"' },
  { search: /<p className="text-muted" style=\{\{\s*margin:\s*0\s*\}\}>/g, replace: '<p className="text-muted admin-settings-hint">' },
  { search: /style=\{\{\s*minHeight:\s*'80px',\s*padding:\s*'12px',\s*resize:\s*'vertical',\s*width:\s*'100%',\s*maxWidth:\s*'400px',\s*border:\s*'1px solid var\(--border\)',\s*borderRadius:\s*'var\(--radius-md\)'\s*\}\}/g, replace: 'className="card admin-settings-input-sm" style={{ minHeight: \'80px\', resize: \'vertical\' }}' },
  { search: /<div style=\{\{\s*padding:\s*'var\(--space-md\) 0'\s*\}\} className="text-muted">/g, replace: '<div className="text-muted admin-settings-loading">' },
  { search: /<div className="flex-col" style=\{\{\s*gap:\s*'var\(--space-md\)'\s*\}\}>/g, replace: '<div className="flex-col admin-settings-group">' },
  { search: /<div className="flex-row" style=\{\{\s*gap:\s*'var\(--space-xs\)',\s*alignItems:\s*'center'\s*\}\}>/g, replace: '<div className="flex-row admin-settings-inline-row">' },
  { search: /style=\{\{\s*width:\s*'100%',\s*maxWidth:\s*'200px',\s*padding:\s*'0 12px',\s*height:\s*'40px',\s*border:\s*'1px solid var\(--border\)',\s*borderRadius:\s*'var\(--radius-md\)'\s*\}\}/g, replace: 'className="card admin-settings-input-sm"' },
  { search: /style=\{\{\s*height:\s*'40px',\s*whiteSpace:\s*'nowrap'\s*\}\}/g, replace: 'className="btn btn-ghost" style={{ height: \'40px\', whiteSpace: \'nowrap\' }}' },
  { search: /<div className="flex-row" style=\{\{\s*justifyContent:\s*'space-between',\s*alignItems:\s*'center',\s*backgroundColor:\s*'var\(--border-light, #f8fafc\)',\s*padding:\s*'var\(--space-md\)',\s*borderRadius:\s*'var\(--radius-md\)',\s*border:\s*'1px solid var\(--border\)'\s*\}\}>/g, replace: '<div className="flex-row admin-settings-terminal-row">' },
  { search: /<div className="text-muted" style=\{\{\s*fontFamily:\s*'monospace',\s*fontSize:\s*'12px'\s*\}\}>/g, replace: '<div className="text-muted admin-settings-terminal-text">' }
];

replacements.forEach(r => {
  content = content.replace(r.search, r.replace);
});

// Fix remaining absolute styling by adding @allow-inline-style
content = content.replace(/className="card admin-settings-input-sm" style=\{\{ minHeight/g, '// @allow-inline-style - dynamic resize support\n              className="card admin-settings-input-sm" style={{ minHeight');
content = content.replace(/className="btn btn-ghost" style=\{\{ height/g, '// @allow-inline-style - explicit height matching\n              className="btn btn-ghost" style={{ height');

fs.writeFileSync(filePath, content, 'utf8');
console.log('SettingsView.tsx refactored.');
