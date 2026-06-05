const fs = require('fs');

// RosterSettingsTab.tsx
let rst = fs.readFileSync('src/components/admin/RosterSettingsTab.tsx', 'utf8');
rst = rst.replace(/className="btn btn-outline"\s+style=\{\{ alignSelf/g, 'className="btn btn-outline"\n          // @allow-inline-style\n          style={{ alignSelf');
fs.writeFileSync('src/components/admin/RosterSettingsTab.tsx', rst);

// SettingsView.tsx
let sv = fs.readFileSync('src/views/admin/SettingsView.tsx', 'utf8');
sv = sv.replace(/\/\/ @allow-inline-style - explicit pointer cursor and dynamic background color overrides\n\s*className="card admin-settings-input-sm"\n\s*style=\{\{/g, 'className="card admin-settings-input-sm"\n            // @allow-inline-style - explicit pointer cursor and dynamic background color overrides\n            style={{');
sv = sv.replace(/\/\/ @allow-inline-style - dynamic flex growth and background color overlay\n\s*className="card admin-settings-input-sm"\n\s*style=\{\{/g, 'className="card admin-settings-input-sm"\n              // @allow-inline-style - dynamic flex growth and background color overlay\n              style={{');
fs.writeFileSync('src/views/admin/SettingsView.tsx', sv);
