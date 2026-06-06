const fs = require('fs');
const path = require('path');

const targetFile = path.resolve(__dirname, 'src/views/admin/SetListView.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

// Add CSS import
if (!content.includes("import './SetList.css';")) {
  content = content.replace(
    "import { formatInTimezone } from '../../lib/timezone';",
    "import { formatInTimezone } from '../../lib/timezone';\nimport './SetList.css';"
  );
}

// 1. replace `<div className="flex-col" style={{ gap: 'var(--space-md)' }}>`
content = content.replace(
  /<div className="flex-col" style={{ gap: 'var(--space-md)' }}>/g,
  '<div className="flex-col sl-view-container">'
);

// 2. replace `<div className="card" style={{ padding: 'var(--space-sm)', backgroundColor: 'var(--bg)', border: '1px solid var(--border)', wordBreak: 'break-all', fontSize: '0.85rem' }}>`
content = content.replace(
  /<div className="card" style={{ padding: 'var\(--space-sm\)', backgroundColor: 'var\(--bg\)', border: '1px solid var\(--border\)', wordBreak: 'break-all', fontSize: '0\.85rem' }}>/g,
  '<div className="card sl-stats-card">'
);

// 3. `<div className="flex-row" style={{ gap: 'var(--space-sm)' }}>`
content = content.replace(
  /<div className="flex-row" style={{ gap: 'var(--space-sm)' }}>/g,
  '<div className="flex-row sl-stats-row">'
);

// 4. `<div className="flex-col" style={{ gap: 'var(--space-lg)' }}>`
content = content.replace(
  /<div className="flex-col" style={{ gap: 'var(--space-lg)' }}>/g,
  '<div className="flex-col sl-header-container">'
);

// 5. `<div className="flex-row" style={{ alignItems: 'center', gap: 'var(--space-md)' }}>`
content = content.replace(
  /<div className="flex-row" style={{ alignItems: 'center', gap: 'var(--space-md)' }}>/g,
  '<div className="flex-row sl-header-row">'
);

// 6. `<div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>`
content = content.replace(
  /<div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: 'var\(--text-muted\)' }}>/g,
  '<div className="sl-warning-text">'
);

// 7. `<span style={{ color: 'var(--primary-deep)', fontWeight: 500 }}>`
content = content.replace(
  /<span style={{ color: 'var\(--primary-deep\)', fontWeight: 500 }}>/g,
  '<span className="sl-text-primary-deep">'
);

// 8. `<span style={{ color: 'var(--danger)', fontWeight: 500 }}>`
content = content.replace(
  /<span style={{ color: 'var\(--danger\)', fontWeight: 500 }}>/g,
  '<span className="sl-text-danger">'
);

// 9. `style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '42px' }}`
content = content.replace(
  /style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '42px' }}/g,
  'className="sl-primary-action-btn"'
);

// 10. `<div className="roster-filters-bar" style={{ alignItems: 'stretch' }}>`
content = content.replace(
  /<div className="roster-filters-bar" style={{ alignItems: 'stretch' }}>/g,
  '<div className="roster-filters-bar sl-filters-bar">'
);

// 11. `<div className="flex-col" style={{ gap: 'var(--space-xs)', flex: 1, minWidth: '260px' }}>`
content = content.replace(
  /<div className="flex-col" style={{ gap: 'var\(--space-xs\)', flex: 1, minWidth: '260px' }}>/g,
  '<div className="flex-col sl-filter-col">'
);

// 12. `style={{ width: '100%', minWidth: '260px' }}`
content = content.replace(
  /style={{ width: '100%', minWidth: '260px' }}/g,
  'className="sl-filter-input"'
);

// 13. `<div className="flex-col" style={{ gap: 'var(--space-xs)', minWidth: '260px', flex: 1 }}>`
content = content.replace(
  /<div className="flex-col" style={{ gap: 'var\(--space-xs\)', minWidth: '260px', flex: 1 }}>/g,
  '<div className="flex-col sl-filter-col">'
);

// 14. `<div className="flex-col" style={{ gap: 'var(--space-xs)', minWidth: '200px' }}>`
content = content.replace(
  /<div className="flex-col" style={{ gap: 'var\(--space-xs\)', minWidth: '200px' }}>/g,
  '<div className="flex-col sl-filter-select-col">'
);

// 15. `style={{\s*whiteSpace: 'nowrap',\s*maxWidth: '100%'\s*}}`
content = content.replace(
  /style={{\s*whiteSpace: 'nowrap',\s*maxWidth: '100%'\s*}}/g,
  'className="sl-filter-select"'
);

// 16. `<div className="flex-col" style={{ gap: 'var(--space-lg)', width: '100%' }}>`
content = content.replace(
  /<div className="flex-col" style={{ gap: 'var\(--space-lg\)', width: '100%' }}>/g,
  '<div className="flex-col sl-main-content">'
);

// 17. `style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}`
content = content.replace(
  /style={{\s*display: 'flex',\s*flexDirection: 'column',\s*gap: 'var\(--space-sm\)'\s*}}/g,
  'className="sl-dnd-container"'
);

// 18. `style={{ whiteSpace: 'nowrap' }}`
content = content.replace(
  /style={{ whiteSpace: 'nowrap' }}/g,
  'className="sl-filter-select"'
);

// 19. `<div className="flex-col" style={{ gap: 'var(--space-sm)' }}>`
content = content.replace(
  /<div className="flex-col" style={{ gap: 'var\(--space-sm\)' }}>/g,
  '<div className="flex-col sl-dnd-container">'
);

// 20. `<div className="flex-responsive" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>`
content = content.replace(
  /<div className="flex-responsive" style={{ display: 'flex', flexDirection: 'column', gap: 'var\(--space-xs\)' }}>/g,
  '<div className="flex-responsive sl-sortable-context">'
);

// 21. `<div className="flex-col" style={{ gap: 'var(--space-md)' }}>`
// This was already replaced with sl-view-container for line 315, but let's check line 803 and 829
// Oh wait, 803 is `className="flex-row" style={{ gap: 'var(--space-md)' }}>`, wait, that's sl-stats-row? No, it's a section row. Let's call it sl-list-section.
content = content.replace(
  /<div className="flex-row" style={{ gap: 'var\(--space-md\)' }}>/g,
  '<div className="flex-row sl-list-section">'
);

// 22. `<span style={{ fontSize: '0.9rem', color: 'var(--primary-deep)', borderLeft: '1px solid rgba(74, 124, 89, 0.3)', paddingLeft: 'var(--space-md)' }}>`
content = content.replace(
  /<span style={{ fontSize: '0.9rem', color: 'var\(--primary-deep\)', borderLeft: '1px solid rgba\(74, 124, 89, 0.3\)', paddingLeft: 'var\(--space-md\)' }}>/g,
  '<span className="sl-list-section-title">'
);

// 23. `<div style={{ marginBottom: 'var(--space-md)', paddingBottom: 'var(--space-md)', borderBottom: '1px solid var(--border)' }}>`
content = content.replace(
  /<div style={{ marginBottom: 'var\(--space-md\)', paddingBottom: 'var\(--space-md\)', borderBottom: '1px solid var\(--border\)' }}>/g,
  '<div className="sl-list-divider">'
);

// 24. `<div className="text-muted" style={{ textAlign: 'center', padding: 'var(--space-lg)' }}>`
content = content.replace(
  /<div className="text-muted" style={{ textAlign: 'center', padding: 'var\(--space-lg\)' }}>/g,
  '<div className="text-muted sl-empty-list">'
);

// 25. `<p className="text-muted text-sm" style={{ marginTop: 'var(--space-md)', padding: '0 var(--space-md) var(--space-md)' }}>`
content = content.replace(
  /<p className="text-muted text-sm" style={{ marginTop: 'var\(--space-md\)', padding: '0 var\(--space-md\) var\(--space-md\)' }}>/g,
  '<p className="text-muted text-sm sl-hint-text">'
);

// 26. `style={{ padding: 'var(--space-xl)', textAlign: 'center' }}`
content = content.replace(
  /style={{ padding: 'var\(--space-xl\)', textAlign: 'center' }}/g,
  'className="sl-empty-state-card"'
);

// 27. `style={{ display: 'flex', alignItems: 'center', gap: '6px' }}`
content = content.replace(
  /style={{ display: 'flex', alignItems: 'center', gap: '6px' }}/g,
  'className="sl-icon-btn"'
);

// 28. Print view styles: `<div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', fontFamily: 'var(--font-sans)', color: '#000' }}>`
content = content.replace(
  /<div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', fontFamily: 'var\(--font-sans\)', color: '#000' }}>/g,
  '<div className="sl-print-container">'
);

// 29. `<div style={{ textAlign: 'center', marginBottom: 'var(--space-md)' }}>`
content = content.replace(
  /<div style={{ textAlign: 'center', marginBottom: 'var\(--space-md\)' }}>/g,
  '<div className="sl-print-header">'
);

// 30. `<h3 style={{ margin: '0 0 var(--space-xxs) 0', fontSize: '1.4rem', color: '#111', fontFamily: 'var(--font-sans)', fontWeight: 700 }}>`
content = content.replace(
  /<h3 style={{ margin: '0 0 var\(--space-xxs\) 0', fontSize: '1.4rem', color: '#111', fontFamily: 'var\(--font-sans\)', fontWeight: 700 }}>/g,
  '<h3 className="sl-print-title">'
);

// 31. `<div style={{ fontSize: '0.85rem', color: '#666', fontFamily: 'var(--font-sans)', fontWeight: 500 }}>`
content = content.replace(
  /<div style={{ fontSize: '0.85rem', color: '#666', fontFamily: 'var\(--font-sans\)', fontWeight: 500 }}>/g,
  '<div className="sl-print-subtitle">'
);

// 32. `<div style={{ borderBottom: '1px solid #eee', marginBottom: 'var(--space-md)' }}><\/div>`
content = content.replace(
  /<div style={{ borderBottom: '1px solid #eee', marginBottom: 'var\(--space-md\)' }}><\/div>/g,
  '<div className="sl-print-divider"></div>'
);

// 33. `<div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>`
content = content.replace(
  /<div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>/g,
  '<div className="sl-print-list">'
);

// 34. `style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '6px 0' }}`
content = content.replace(
  /style={{\s*display: 'flex',\s*justifyContent: 'space-between',\s*alignItems: 'baseline',\s*padding: '6px 0'\s*}}/g,
  'className="sl-print-item"'
);

// 35. `style={{ padding: '8px 0', margin: '4px 0', borderTop: '1px dashed #eee', borderBottom: '1px dashed #eee', color: '#666' }}`
content = content.replace(
  /style={{\s*padding: '8px 0',\s*margin: '4px 0',\s*borderTop: '1px dashed #eee',\s*borderBottom: '1px dashed #eee',\s*color: '#666'\s*}}/g,
  'className="sl-print-intermission"'
);

// 36. `<span style={{ fontWeight: 500 }}>`
content = content.replace(
  /<span style={{ fontWeight: 500 }}>/g,
  '<span className="sl-print-item-title">'
);

// 37. `<span style={{ fontSize: '0.9rem', color: '#666', fontStyle: 'italic', textAlign: 'right' }}>`
content = content.replace(
  /<span style={{ fontSize: '0.9rem', color: '#666', fontStyle: 'italic', textAlign: 'right' }}>/g,
  '<span className="sl-print-item-duration">'
);

fs.writeFileSync(targetFile, content);
console.log('Done refactoring SetListView.tsx');
