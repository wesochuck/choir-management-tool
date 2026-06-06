const fs = require('fs');

const files = [
  'src/views/PublicAuditionView.tsx',
  'src/views/PublicTicketPurchaseView.tsx',
  'src/views/PublicTicketListView.tsx',
  'src/views/PublicTicketSuccessView.tsx',
  'src/views/PublicBundlePurchaseView.tsx'
];

let cssContent = `/* Extracted styles for Public Forms */\n\n`;
let classCounter = 1;
const styleToClassMap = new Map();

function toKebabCase(str) {
  return str.replace(/([A-Z])/g, '-$1').toLowerCase();
}

function processStyleString(styleStr) {
  if (styleStr.includes('?') || styleStr.includes('`') || styleStr.includes('window.innerWidth') || styleStr.includes('isChecked') || styleStr.includes('isScheduleExpanded')) {
    return null;
  }

  const styles = {};
  // match prop: 'val' or prop: 123 or prop: var(--x) or prop: "val"
  // split by comma, then split by colon
  const parts = styleStr.split(',');
  let hasValidProps = false;
  for (const part of parts) {
    const kv = part.split(':');
    if (kv.length >= 2) {
      const prop = kv[0].trim();
      let val = kv.slice(1).join(':').trim();
      // Remove surrounding quotes
      val = val.replace(/^['"](.*)['"]$/, '$1');
      styles[prop] = val;
      hasValidProps = true;
    }
  }

  if (!hasValidProps) return null;

  const styleKey = JSON.stringify(styles);
  if (styleToClassMap.has(styleKey)) {
    return styleToClassMap.get(styleKey);
  }

  const className = `pub-style-${classCounter++}`;
  styleToClassMap.set(styleKey, className);

  let cssRule = `.${className} {\n`;
  for (const [prop, val] of Object.entries(styles)) {
    cssRule += `  ${toKebabCase(prop)}: ${val};\n`;
  }
  cssRule += `}\n\n`;
  
  cssContent += cssRule;
  return className;
}

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Add import if not present
  if (!content.includes('PublicForms.css')) {
    const importStr = "import './PublicForms.css';\n";
    const lastImportIndex = content.lastIndexOf('import ');
    if (lastImportIndex !== -1) {
      const endOfLine = content.indexOf('\n', lastImportIndex);
      content = content.slice(0, endOfLine + 1) + importStr + content.slice(endOfLine + 1);
    } else {
      content = importStr + content;
    }
  }

  // Find all <... style={{...}} ...>
  // We'll replace style={{...}} with nothing and add className, or inject comment.
  content = content.replace(/(<[A-Za-z0-9_]+[^>]*?)\s*style=\{\{([^}]+)\}\}/g, (match, prefix, styleStr) => {
    // Dynamic?
    if (styleStr.includes('?') || styleStr.includes('`') || styleStr.includes('isScheduleExpanded') || styleStr.includes('isChecked')) {
      return `${prefix} /* @allow-inline-style - dynamic */ style={{${styleStr}}}`;
    }

    const newClass = processStyleString(styleStr);
    if (!newClass) {
      return `${prefix} /* @allow-inline-style - could not parse */ style={{${styleStr}}}`;
    }

    // if prefix already has className
    if (prefix.includes('className=')) {
      // Add to existing className
      return prefix.replace(/className=(['"])([^'"]+)\1/, `className=$1$2 ${newClass}$1`);
    } else {
      // Add className attribute
      return `${prefix} className="${newClass}"`;
    }
  });

  fs.writeFileSync(file, content);
});

fs.writeFileSync('src/views/PublicForms.css', cssContent);
console.log('Refactoring complete.');
