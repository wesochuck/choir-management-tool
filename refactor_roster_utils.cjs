const fs = require('fs');
const path = require('path');

function refactorCheckInList() {
  const filePath = path.join(__dirname, 'src/components/admin/CheckInList.tsx');
  let content = fs.readFileSync(filePath, 'utf8');

  // FolderInput
  content = content.replace(
    /style={{\s*width:\s*'55px',\s*padding:\s*'0 6px',\s*textAlign:\s*'center',\s*height:\s*'32px',\s*fontSize:\s*'0\.85rem',\s*borderRadius:\s*'var\(--radius-md\)',\s*border:\s*'1px solid var\(--border\)',\s*boxShadow:\s*'none',\s*backgroundColor:\s*'var\(--surface\)'\s*}}/g,
    'className="card roster-ut-folder-input"'
  );

  // CheckInRow wrapper
  content = content.replace(
    /style={{\s*opacity:\s*isPresent\s*\?\s*0\.85\s*:\s*1,\s*border:\s*isPresent\s*\?\s*'1px solid var\(--primary\)'\s*:\s*isAbsent\s*\?\s*'1px solid #fca5a5'\s*:\s*'1px solid var\(--border\)',\s*backgroundColor:\s*isPresent\s*\?\s*'rgba\(74,\s*117,\s*89,\s*0\.06\)'\s*\/\/\s*soft,\s*premium\s*mint\s*green\s*tint\s*:\s*isAbsent\s*\?\s*'rgba\(153,\s*27,\s*27,\s*0\.04\)'\s*\/\/\s*soft,\s*premium\s*crimson\/red\s*tint\s*:\s*'var\(--surface\)',\s*}}/g,
    `style={{
        // @allow-inline-style - Dynamic row styling based on attendance state
        opacity: isPresent ? 0.85 : 1,
        border: isPresent
          ? '1px solid var(--primary)'
          : isAbsent
            ? '1px solid #fca5a5'
            : '1px solid var(--border)',
        backgroundColor: isPresent
          ? 'rgba(74, 117, 89, 0.06)' // soft, premium mint green tint
          : isAbsent
            ? 'rgba(153, 27, 27, 0.04)' // soft, premium crimson/red tint
            : 'var(--surface)',
      }}`
  );

  // Singer name
  content = content.replace(
    /style={{\s*color:\s*isPresent\s*\?\s*'var\(--primary-deep\)'\s*:\s*isAbsent\s*\?\s*'#991b1b'\s*:\s*'var\(--text-main\)',\s*cursor:\s*'pointer',\s*textDecoration:\s*'underline'\s*}}/g,
    `className="admin-checkin-name roster-ut-clickable-name"
              style={{
                // @allow-inline-style - Dynamic name color based on attendance state
                color: isPresent 
                  ? 'var(--primary-deep)' 
                  : isAbsent 
                    ? '#991b1b' 
                    : 'var(--text-main)',
              }}`
  );
  content = content.replace(/className="admin-checkin-name"\s*onClick/g, 'onClick'); // cleanup double className

  // Badge RSVP
  content = content.replace(
    /style={{\s*fontSize:\s*'9px',\s*padding:\s*'2px 6px',\s*borderRadius:\s*'4px'\s*}}/g,
    'className="badge badge-rehearsal roster-ut-badge-rsvp"'
  );
  content = content.replace(/className="badge badge-rehearsal"\s*className="badge badge-rehearsal roster-ut-badge-rsvp"/g, 'className="badge badge-rehearsal roster-ut-badge-rsvp"');

  // Badge voicepart
  content = content.replace(
    /style={{\s*fontSize:\s*'9px',\s*padding:\s*'2px 6px',\s*borderRadius:\s*'4px',\s*backgroundColor:\s*'var\(--primary-light\)',\s*color:\s*'var\(--primary-deep\)',\s*border:\s*'1px solid rgba\(74,\s*117,\s*89,\s*0\.2\)'\s*}}/g,
    'className="badge roster-ut-badge-voicepart"'
  );
  content = content.replace(/className="badge"\s*className="badge roster-ut-badge-voicepart"/g, 'className="badge roster-ut-badge-voicepart"');

  // Badge misses
  content = content.replace(
    /style={{\s*fontSize:\s*'9px',\s*padding:\s*'2px 6px',\s*borderRadius:\s*'4px',\s*backgroundColor:\s*missCounts\[item\.profileId\]\s*>\s*\(maxRehearsalMisses\s*\?\?\s*3\)\s*\?\s*'#fee2e2'\s*:\s*'#fef3c7',\s*color:\s*missCounts\[item\.profileId\]\s*>\s*\(maxRehearsalMisses\s*\?\?\s*3\)\s*\?\s*'#991b1b'\s*:\s*'#92400e',\s*border:\s*missCounts\[item\.profileId\]\s*>\s*\(maxRehearsalMisses\s*\?\?\s*3\)\s*\?\s*'1px solid #fca5a5'\s*:\s*'1px solid #fde68a',\s*fontWeight:\s*800\s*}}/g,
    `className="badge roster-ut-badge-misses"
                  style={{
                    // @allow-inline-style - Dynamic colors based on miss threshold
                    backgroundColor: missCounts[item.profileId] > (maxRehearsalMisses ?? 3) ? '#fee2e2' : '#fef3c7',
                    color: missCounts[item.profileId] > (maxRehearsalMisses ?? 3) ? '#991b1b' : '#92400e',
                    border: missCounts[item.profileId] > (maxRehearsalMisses ?? 3) ? '1px solid #fca5a5' : '1px solid #fde68a',
                  }}`
  );
  content = content.replace(/className="badge"\s*className="badge roster-ut-badge-misses"/g, 'className="badge roster-ut-badge-misses"');

  // RSVP note
  content = content.replace(
    /style={{ color: '#b91c1c', fontWeight: 600 }}/g,
    'className="roster-ut-rsvp-note"'
  );

  // Absent button
  content = content.replace(
    /style={{\s*backgroundColor:\s*isAbsent\s*\?\s*'#ef4444'\s*:\s*'var\(--surface\)',\s*color:\s*isAbsent\s*\?\s*'var\(--surface\)'\s*:\s*'#64748b',\s*borderColor:\s*isAbsent\s*\?\s*'#ef4444'\s*:\s*'var\(--border\)',\s*fontWeight:\s*isAbsent\s*\?\s*'700'\s*:\s*'500',\s*boxShadow:\s*isAbsent\s*\?\s*'0 1px 3px rgba\(0,0,0,0\.1\)'\s*:\s*'none',\s*}}/g,
    `style={{
              // @allow-inline-style - Dynamic styling based on absence state
              backgroundColor: isAbsent ? '#ef4444' : 'var(--surface)',
              color: isAbsent ? 'var(--surface)' : '#64748b',
              borderColor: isAbsent ? '#ef4444' : 'var(--border)',
              fontWeight: isAbsent ? '700' : '500',
              boxShadow: isAbsent ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}`
  );

  // Present button
  content = content.replace(
    /style={{\s*backgroundColor:\s*isPresent\s*\?\s*'var\(--primary\)'\s*:\s*'var\(--surface\)',\s*color:\s*isPresent\s*\?\s*'var\(--surface\)'\s*:\s*'var\(--primary-deep\)',\s*borderColor:\s*isPresent\s*\?\s*'var\(--primary\)'\s*:\s*'var\(--border\)',\s*fontWeight:\s*isPresent\s*\?\s*'700'\s*:\s*'600',\s*boxShadow:\s*isPresent\s*\?\s*'0 1px 3px rgba\(0,0,0,0\.1\)'\s*:\s*'none',\s*}}/g,
    `style={{
              // @allow-inline-style - Dynamic styling based on presence state
              backgroundColor: isPresent ? 'var(--primary)' : 'var(--surface)',
              color: isPresent ? 'var(--surface)' : 'var(--primary-deep)',
              borderColor: isPresent ? 'var(--primary)' : 'var(--border)',
              fontWeight: isPresent ? '700' : '600',
              boxShadow: isPresent ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}`
  );

  // RETURNED / NOT RETURNED text
  content = content.replace(
    /style={{\s*color:\s*item\.folderReturned\s*\?\s*'var\(--primary\)'\s*:\s*'var\(--text-muted\)'\s*}}/g,
    `style={{
                // @allow-inline-style - Dynamic text color based on returned state
                color: item.folderReturned ? 'var(--primary)' : 'var(--text-muted)'
              }}`
  );

  // CheckInList Headers
  content = content.replace(
    /style={{\s*display:\s*'flex',\s*alignItems:\s*'center',\s*margin:\s*'18px 0 8px 0',\s*gap:\s*'12px',\s*width:\s*'100%'\s*}}/g,
    'className="roster-ut-list-header-container"'
  );
  content = content.replace(
    /style={{\s*fontSize:\s*'0\.8rem',\s*fontWeight:\s*800,\s*color:\s*'var\(--primary-deep\)',\s*letterSpacing:\s*'0\.05em',\s*paddingRight:\s*'8px'\s*}}/g,
    'className="roster-ut-list-header-text"'
  );
  content = content.replace(
    /<div style={{ flex: 1, height: '1px', backgroundColor: 'rgba\(74, 117, 89, 0\.15\)' }}><\/div>/g,
    '<div className="roster-ut-list-header-line"></div>'
  );

  // CheckInList Wrapper
  content = content.replace(
    /<div className="flex-col" style={{ gap: '12px', width: '100%' }}>/g,
    '<div className="flex-col roster-ut-checkin-wrapper">'
  );

  // Beautiful Checked-In Divider
  content = content.replace(
    /style={{\s*alignItems:\s*'center',\s*margin:\s*'24px 0 12px 0',\s*gap:\s*'16px',\s*width:\s*'100%'\s*}}/g,
    'className="roster-ut-checked-in-divider-container"'
  );
  content = content.replace(
    /<div style={{ flex: 1, height: '1px', background: 'linear-gradient\(to right, transparent, var\(--border\)\)' }}><\/div>/g,
    '<div className="roster-ut-checked-in-divider-line-left"></div>'
  );
  content = content.replace(
    /style={{\s*fontSize:\s*'0\.8rem',\s*fontWeight:\s*800,\s*color:\s*'var\(--primary-deep\)',\s*textTransform:\s*'uppercase',\s*letterSpacing:\s*'0\.08em',\s*backgroundColor:\s*'var\(--surface\)',\s*padding:\s*'6px 16px',\s*borderRadius:\s*'20px',\s*border:\s*'1px solid rgba\(74, 117, 89, 0\.25\)',\s*boxShadow:\s*'0 2px 8px rgba\(0,0,0,0\.03\)',\s*display:\s*'flex',\s*alignItems:\s*'center',\s*gap:\s*'6px'\s*}}/g,
    'className="roster-ut-checked-in-divider-text"'
  );
  content = content.replace(
    /<div style={{ flex: 1, height: '1px', background: 'linear-gradient\(to left, transparent, var\(--border\)\)' }}><\/div>/g,
    '<div className="roster-ut-checked-in-divider-line-right"></div>'
  );

  // Empty State
  content = content.replace(
    /<div className="card" style={{ textAlign: 'center', padding: '32px' }}>/g,
    '<div className="card roster-ut-empty-state-card">'
  );

  // add import
  if (!content.includes('./RosterUtils.css')) {
      content = content.replace(/import '\.\/CheckInList\.css';/, "import './CheckInList.css';\nimport './RosterUtils.css';");
  }

  fs.writeFileSync(filePath, content, 'utf8');
}

function refactorRosterImportModal() {
  const filePath = path.join(__dirname, 'src/components/admin/RosterImportModal.tsx');
  let content = fs.readFileSync(filePath, 'utf8');

  // Restart Button
  content = content.replace(/className="btn btn-ghost" style={{ marginRight: 'auto' }}/g, 'className="btn btn-ghost roster-ut-mr-auto"');

  // UPLOAD
  content = content.replace(
    /<div className="flex-col" style={{ gap: 'var\(--space-md\)', textAlign: 'center', padding: '20px 0' }}>/g,
    '<div className="flex-col roster-ut-upload-container">'
  );
  content = content.replace(
    /<p className="text-muted text-sm" style={{ margin: 0 }}>/g,
    '<p className="text-muted text-sm roster-ut-margin-0">'
  );
  content = content.replace(
    /style={{\s*border:\s*'2px dashed var\(--border\)',\s*borderRadius:\s*'var\(--radius-lg\)',\s*padding:\s*'40px 20px',\s*cursor:\s*'pointer',\s*backgroundColor:\s*'rgba\(74, 124, 89, 0\.02\)',\s*transition:\s*'border-color 0\.2s, background-color 0\.2s',\s*display:\s*'flex',\s*flexDirection:\s*'column',\s*alignItems:\s*'center',\s*justifyContent:\s*'center',\s*gap:\s*'12px',\s*}}/g,
    'className="roster-ut-upload-dropzone"'
  );
  content = content.replace(
    /<span style={{ fontSize: '3rem' }}>📄<\/span>/g,
    '<span className="roster-ut-upload-icon">📄</span>'
  );
  content = content.replace(
    /<strong style={{ color: 'var\(--primary-deep\)', display: 'block', fontSize: '1rem' }}>/g,
    '<strong className="roster-ut-upload-title">'
  );
  content = content.replace(
    /<span className="text-muted text-xs" style={{ marginTop: '4px', display: 'block' }}>/g,
    '<span className="text-muted text-xs roster-ut-upload-subtitle">'
  );
  content = content.replace(
    /<div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center', fontSize: '0\.8rem', color: 'var\(--text-muted\)' }}>/g,
    '<div className="roster-ut-upload-hint">'
  );

  // MAP
  content = content.replace(
    /<div className="flex-col" style={{ gap: 'var\(--space-md\)' }}>/g,
    '<div className="flex-col roster-ut-map-container">'
  );
  content = content.replace(
    /<div className="flex-col" style={{ gap: 'var\(--space-sm\)', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>/g,
    '<div className="flex-col roster-ut-map-list">'
  );
  content = content.replace(
    /className="card"\s*style={{\s*padding:\s*'12px 16px',\s*display:\s*'flex',\s*flexDirection:\s*'row',\s*alignItems:\s*'center',\s*justifyContent:\s*'space-between',\s*gap:\s*'12px',\s*borderColor:\s*field\.required && selectedIndex === -1 \? 'var\(--red-light\)' : undefined,\s*}}/g,
    `className="card roster-ut-map-item" 
                  style={{ 
                    // @allow-inline-style - Dynamic border color for invalid required mapping
                    borderColor: field.required && selectedIndex === -1 ? 'var(--red-light)' : undefined,
                  }}`
  );
  content = content.replace(
    /<div className="flex-col" style={{ gap: '2px', flex: 1 }}>/g,
    '<div className="flex-col roster-ut-map-item-info">'
  );
  content = content.replace(
    /<div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>/g,
    '<div className="roster-ut-map-item-header">'
  );
  content = content.replace(
    /<strong style={{ fontSize: '0\.9rem', color: 'var\(--text\)' }}>/g,
    '<strong className="roster-ut-map-item-title">'
  );
  content = content.replace(
    /style={{\s*fontSize:\s*'0\.7rem',\s*backgroundColor:\s*'rgba\(153, 27, 27, 0\.1\)',\s*color:\s*'#991b1b',\s*padding:\s*'1px 6px',\s*borderRadius:\s*'4px',\s*fontWeight:\s*600,\s*}}/g,
    'className="roster-ut-map-item-required"'
  );
  content = content.replace(
    /className="card"\s*style={{\s*width:\s*'200px',\s*height:\s*'38px',\s*padding:\s*'0 10px',\s*border:\s*'1px solid var\(--border\)',\s*fontSize:\s*'0\.85rem',\s*borderColor:\s*selectedIndex !== -1 \? 'var\(--primary\)' : undefined,\s*boxShadow:\s*'none',\s*}}/g,
    `className="card roster-ut-map-select"
                    style={{ 
                      // @allow-inline-style - Dynamic border color when actively mapped
                      borderColor: selectedIndex !== -1 ? 'var(--primary)' : undefined,
                    }}`
  );

  // PREVIEW
  content = content.replace(
    /<div className="flex-responsive" style={{ justifyContent: 'space-between', alignItems: 'center' }}>/g,
    '<div className="flex-responsive roster-ut-preview-header">'
  );
  content = content.replace(
    /<div style={{ display: 'flex', gap: '12px' }}>/g,
    '<div className="roster-ut-preview-stats">'
  );
  content = content.replace(
    /<span className="text-xs card" style={{ padding: '4px 8px', background: 'rgba\(74, 124, 89, 0\.05\)', color: 'var\(--primary-deep\)', fontWeight: 600 }}>/g,
    '<span className="text-xs card roster-ut-preview-stat-mapped">'
  );
  content = content.replace(
    /<span className="text-xs card" style={{ padding: '4px 8px', background: 'rgba\(153, 27, 27, 0\.05\)', color: '#991b1b', fontWeight: 600 }}>/g,
    '<span className="text-xs card roster-ut-preview-stat-errors">'
  );
  content = content.replace(
    /<div style={{ overflowX: 'auto', border: '1px solid var\(--border\)', borderRadius: 'var\(--radius-md\)', maxHeight: '350px' }}>/g,
    '<div className="roster-ut-preview-table-container">'
  );
  content = content.replace(
    /<table className="table" style={{ width: '100%', minWidth: '600px', margin: 0 }}>/g,
    '<table className="table roster-ut-preview-table">'
  );
  content = content.replace(
    /<thead style={{ position: 'sticky', top: 0, backgroundColor: 'var\(--bg\)', zIndex: 1, boxShadow: '0 1px 0 var\(--border\)' }}>/g,
    '<thead className="roster-ut-preview-thead">'
  );
  content = content.replace(
    /<th style={{ width: '60px', textAlign: 'center' }}>/g,
    '<th className="roster-ut-preview-th-row">'
  );
  content = content.replace(
    /<th style={{ width: '100px' }}>/g,
    '<th className="roster-ut-preview-th-voicepart">'
  );
  content = content.replace(
    /<th style={{ width: '130px' }}>/g,
    '<th className="roster-ut-preview-th-status">'
  );
  content = content.replace(
    /<tr \n                      key={idx} \n                      style={{ \n                        backgroundColor: hasErrors \? 'rgba\(239, 83, 80, 0\.05\)' : hasWarnings \? 'rgba\(255, 202, 40, 0\.04\)' : undefined \n                      }}\n                    >/g,
    `<tr 
                      key={idx} 
                      style={{ 
                        // @allow-inline-style - Dynamic row color based on errors or warnings
                        backgroundColor: hasErrors ? 'rgba(239, 83, 80, 0.05)' : hasWarnings ? 'rgba(255, 202, 40, 0.04)' : undefined 
                      }}
                    >`
  );
  // Re-run with simpler regex if it failed:
  content = content.replace(
    /<tr\s*key=\{idx\}\s*style={{\s*backgroundColor:\s*hasErrors\s*\?\s*'rgba\(239, 83, 80, 0\.05\)'\s*:\s*hasWarnings\s*\?\s*'rgba\(255, 202, 40, 0\.04\)'\s*:\s*undefined\s*}}\s*>/g,
    `<tr 
                      key={idx} 
                      style={{ 
                        // @allow-inline-style - Dynamic row color based on errors or warnings
                        backgroundColor: hasErrors ? 'rgba(239, 83, 80, 0.05)' : hasWarnings ? 'rgba(255, 202, 40, 0.04)' : undefined 
                      }}
                    >`
  );

  content = content.replace(
    /<td style={{ textAlign: 'center', color: 'var\(--text-muted\)', fontSize: '0\.8rem' }}>/g,
    '<td className="roster-ut-preview-td-row">'
  );
  content = content.replace(
    /<strong style={{ color: hasErrors \? '#c62828' : 'inherit' }}>/g,
    `<strong style={{ 
                          // @allow-inline-style - Dynamic name color based on error state
                          color: hasErrors ? '#c62828' : 'inherit' 
                        }}>`
  );
  content = content.replace(
    /<td style={{ fontSize: '0\.85rem' }}>/g,
    '<td className="roster-ut-preview-td-email">'
  );
  content = content.replace(
    /<td style={{ textAlign: 'center' }}>/g,
    '<td className="roster-ut-preview-td-voicepart">'
  );
  content = content.replace(
    /<span className="text-xs" style={{ fontWeight: 600 }}>/g,
    '<span className="text-xs roster-ut-fw-600">'
  );
  content = content.replace(
    /<span className="text-xs card" style={{ padding: '2px 6px', display: 'inline-block' }}>/g,
    '<span className="text-xs card roster-ut-preview-status-badge">'
  );
  content = content.replace(
    /<div style={{ color: '#c62828', fontSize: '0\.8rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>/g,
    '<div className="roster-ut-preview-errors-list">'
  );
  content = content.replace(
    /<div style={{ color: '#b78103', fontSize: '0\.8rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>/g,
    '<div className="roster-ut-preview-warnings-list">'
  );
  content = content.replace(
    /<span style={{ color: 'var\(--primary-deep\)', fontSize: '0\.8rem' }}>/g,
    '<span className="roster-ut-preview-ready">'
  );

  // IMPORTING
  content = content.replace(
    /<div className="flex-col" style={{ gap: 'var\(--space-md\)', padding: '20px 0', alignItems: 'center' }}>/g,
    '<div className="flex-col roster-ut-importing-container">'
  );
  content = content.replace(
    /<span style={{ fontSize: '3rem', animation: 'spin 2s linear infinite' }}>/g,
    '<span className="roster-ut-importing-icon">'
  );
  content = content.replace(
    /<div className="flex-col" style={{ gap: '6px', width: '100%', alignItems: 'center' }}>/g,
    '<div className="flex-col roster-ut-importing-header">'
  );
  content = content.replace(
    /<strong style={{ fontSize: '1\.1rem', color: 'var\(--text\)' }}>/g,
    '<strong className="roster-ut-importing-title">'
  );
  content = content.replace(
    /<div style={{ width: '100%', height: '12px', backgroundColor: 'var\(--border\)', borderRadius: '6px', overflow: 'hidden', marginTop: '10px' }}>/g,
    '<div className="roster-ut-importing-progress-track">'
  );
  content = content.replace(
    /style={{\s*height:\s*'100%',\s*backgroundColor:\s*'var\(--primary\)',\s*width:\s*`\$\{importProgress\}%`,\s*transition:\s*'width 0\.1s ease-out',\s*}}/g,
    `className="roster-ut-importing-progress-bar"
              style={{ 
                // @allow-inline-style - Dynamic progress bar width
                width: \`\${importProgress}%\`,
              }}`
  );
  content = content.replace(
    /<div style={{ display: 'flex', gap: '20px', fontSize: '0\.9rem', color: 'var\(--text-muted\)' }}>/g,
    '<div className="roster-ut-importing-stats">'
  );
  content = content.replace(
    /<span>Successes: <strong style={{ color: 'var\(--primary-deep\)' }}>/g,
    '<span>Successes: <strong className="roster-ut-importing-success">'
  );
  content = content.replace(
    /<strong style={{ color: errorsList\.length > 0 \? '#991b1b' : 'inherit' }}>/g,
    `<strong style={{ 
                  // @allow-inline-style - Dynamic error count color
                  color: errorsList.length > 0 ? '#991b1b' : 'inherit' 
                }}>`
  );

  // COMPLETE
  content = content.replace(
    /<div className="flex-col" style={{ gap: 'var\(--space-lg\)', padding: '10px 0' }}>/g,
    '<div className="flex-col roster-ut-complete-container">'
  );
  content = content.replace(
    /<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', textAlign: 'center' }}>/g,
    '<div className="roster-ut-complete-header">'
  );
  content = content.replace(
    /<span style={{ fontSize: '3\.5rem' }}>/g,
    '<span className="roster-ut-complete-icon">'
  );
  content = content.replace(
    /<h3 style={{ margin: 0, fontSize: '1\.3rem', color: 'var\(--primary-deep\)' }}>/g,
    '<h3 className="roster-ut-complete-title">'
  );
  content = content.replace(
    /className="card"\s*style={{\s*backgroundColor:\s*'rgba\(74, 124, 89, 0\.06\)',\s*borderColor:\s*'rgba\(74, 124, 89, 0\.2\)',\s*padding:\s*'16px 20px',\s*borderRadius:\s*'var\(--radius-lg\)',\s*display:\s*'flex',\s*flexDirection:\s*'row',\s*alignItems:\s*'center',\s*justifyContent:\s*'space-between',\s*gap:\s*'16px',\s*}}/g,
    'className="card roster-ut-complete-creds-callout"'
  );
  content = content.replace(
    /<div className="flex-col" style={{ gap: '4px', flex: 1 }}>/g,
    '<div className="flex-col roster-ut-complete-creds-info">'
  );
  content = content.replace(
    /<strong style={{ color: 'var\(--primary-deep\)', fontSize: '0\.95rem' }}>/g,
    '<strong className="roster-ut-complete-creds-title">'
  );
  content = content.replace(
    /<span className="text-muted text-xs" style={{ lineHeight: 1\.4 }}>/g,
    '<span className="text-muted text-xs roster-ut-complete-creds-desc">'
  );
  content = content.replace(
    /className="btn btn-primary"\s*style={{\s*height:\s*'40px',\s*display:\s*'flex',\s*alignItems:\s*'center',\s*gap:\s*'6px',\s*whiteSpace:\s*'nowrap'\s*}}/g,
    'className="btn btn-primary roster-ut-complete-creds-btn"'
  );
  content = content.replace(
    /<div className="flex-col" style={{ gap: 'var\(--space-xs\)' }}>/g,
    '<div className="flex-col roster-ut-complete-errors">'
  );
  content = content.replace(
    /<strong style={{ fontSize: '0\.9rem', color: '#991b1b' }}>/g,
    '<strong className="roster-ut-complete-errors-title">'
  );
  content = content.replace(
    /<div \n                style={{ \n                  maxHeight: '150px', \n                  overflowY: 'auto', \n                  border: '1px solid var\(--border\)', \n                  borderRadius: 'var\(--radius-md\)',\n                  padding: '8px 12px',\n                  backgroundColor: '#fafafa',\n                  fontSize: '0\.8rem',\n                }}\n              >/g,
    '<div className="roster-ut-complete-errors-list">'
  );
  content = content.replace(
    /<div\s*style={{\s*maxHeight:\s*'150px',\s*overflowY:\s*'auto',\s*border:\s*'1px solid var\(--border\)',\s*borderRadius:\s*'var\(--radius-md\)',\s*padding:\s*'8px 12px',\s*backgroundColor:\s*'#fafafa',\s*fontSize:\s*'0\.8rem',\s*}}\s*>/g,
    '<div className="roster-ut-complete-errors-list">'
  );
  
  content = content.replace(
    /<div key=\{i\} style=\{\{ padding: '4px 0', borderBottom: i < errorsList\.length - 1 \? '1px solid var\(--border\)' : undefined, color: '#444' \}\}>/g,
    `<div key={i} className="roster-ut-complete-error-item" 
                    style={{ 
                      // @allow-inline-style - Dynamic border based on position in list
                      borderBottom: i < errorsList.length - 1 ? '1px solid var(--border)' : undefined 
                    }}>`
  );
  content = content.replace(
    /<span style={{ color: '#991b1b' }}>/g,
    '<span className="roster-ut-complete-error-text">'
  );

  // fileInput style
  content = content.replace(
    /style={{ display: 'none' }}/g,
    'className="roster-ut-d-none"'
  );

  if (!content.includes('./RosterUtils.css')) {
      content = content.replace(/import { useVoiceParts } from '\.\.\/\.\.\/hooks\/useVoiceParts';/, "import { useVoiceParts } from '../../hooks/useVoiceParts';\nimport './RosterUtils.css';");
  }

  fs.writeFileSync(filePath, content, 'utf8');
}

function updateCSS() {
  const filePath = path.join(__dirname, 'src/components/admin/RosterUtils.css');
  let css = fs.readFileSync(filePath, 'utf8');

  css += `
/* CheckInList.tsx Additions */
.roster-ut-folder-input {
  width: 55px;
  padding: 0 6px;
  text-align: center;
  height: 32px;
  font-size: 0.85rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  box-shadow: none;
  background-color: var(--surface);
}
.roster-ut-clickable-name {
  cursor: pointer;
  text-decoration: underline;
}
.roster-ut-badge-rsvp {
  font-size: 9px;
  padding: 2px 6px;
  border-radius: 4px;
}
.roster-ut-badge-voicepart {
  font-size: 9px;
  padding: 2px 6px;
  border-radius: 4px;
  background-color: var(--primary-light);
  color: var(--primary-deep);
  border: 1px solid rgba(74, 117, 89, 0.2);
}
.roster-ut-badge-misses {
  font-size: 9px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 800;
}
.roster-ut-rsvp-note {
  color: #b91c1c;
  font-weight: 600;
}
.roster-ut-list-header-container {
  display: flex;
  align-items: center;
  margin: 18px 0 8px 0;
  gap: 12px;
  width: 100%;
}
.roster-ut-list-header-text {
  font-size: 0.8rem;
  font-weight: 800;
  color: var(--primary-deep);
  letter-spacing: 0.05em;
  padding-right: 8px;
}
.roster-ut-list-header-line {
  flex: 1;
  height: 1px;
  background-color: rgba(74, 117, 89, 0.15);
}
.roster-ut-checkin-wrapper {
  gap: 12px;
  width: 100%;
}
.roster-ut-checked-in-divider-container {
  align-items: center;
  margin: 24px 0 12px 0;
  gap: 16px;
  width: 100%;
}
.roster-ut-checked-in-divider-line-left {
  flex: 1;
  height: 1px;
  background: linear-gradient(to right, transparent, var(--border));
}
.roster-ut-checked-in-divider-line-right {
  flex: 1;
  height: 1px;
  background: linear-gradient(to left, transparent, var(--border));
}
.roster-ut-checked-in-divider-text {
  font-size: 0.8rem;
  font-weight: 800;
  color: var(--primary-deep);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  background-color: var(--surface);
  padding: 6px 16px;
  border-radius: 20px;
  border: 1px solid rgba(74, 117, 89, 0.25);
  box-shadow: 0 2px 8px rgba(0,0,0,0.03);
  display: flex;
  align-items: center;
  gap: 6px;
}
.roster-ut-empty-state-card {
  text-align: center;
  padding: 32px;
}

/* RosterImportModal.tsx Additions */
.roster-ut-mr-auto {
  margin-right: auto;
}
.roster-ut-margin-0 {
  margin: 0;
}
.roster-ut-upload-container {
  gap: var(--space-md);
  text-align: center;
  padding: 20px 0;
}
.roster-ut-upload-dropzone {
  border: 2px dashed var(--border);
  border-radius: var(--radius-lg);
  padding: 40px 20px;
  cursor: pointer;
  background-color: rgba(74, 124, 89, 0.02);
  transition: border-color 0.2s, background-color 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
}
.roster-ut-upload-icon {
  font-size: 3rem;
}
.roster-ut-upload-title {
  color: var(--primary-deep);
  display: block;
  font-size: 1rem;
}
.roster-ut-upload-subtitle {
  margin-top: 4px;
  display: block;
}
.roster-ut-upload-hint {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  color: var(--text-muted);
}
.roster-ut-map-container {
  gap: var(--space-md);
}
.roster-ut-map-list {
  gap: var(--space-sm);
  max-height: 350px;
  overflow-y: auto;
  padding-right: 4px;
}
.roster-ut-map-item {
  padding: 12px 16px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.roster-ut-map-item-info {
  gap: 2px;
  flex: 1;
}
.roster-ut-map-item-header {
  display: flex;
  align-items: center;
  gap: 6px;
}
.roster-ut-map-item-title {
  font-size: 0.9rem;
  color: var(--text);
}
.roster-ut-map-item-required {
  font-size: 0.7rem;
  background-color: rgba(153, 27, 27, 0.1);
  color: #991b1b;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 600;
}
.roster-ut-map-select {
  width: 200px;
  height: 38px;
  padding: 0 10px;
  border: 1px solid var(--border);
  font-size: 0.85rem;
  box-shadow: none;
}
.roster-ut-preview-header {
  justify-content: space-between;
  align-items: center;
}
.roster-ut-preview-stats {
  display: flex;
  gap: 12px;
}
.roster-ut-preview-stat-mapped {
  padding: 4px 8px;
  background: rgba(74, 124, 89, 0.05);
  color: var(--primary-deep);
  font-weight: 600;
}
.roster-ut-preview-stat-errors {
  padding: 4px 8px;
  background: rgba(153, 27, 27, 0.05);
  color: #991b1b;
  font-weight: 600;
}
.roster-ut-preview-table-container {
  overflow-x: auto;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  max-height: 350px;
}
.roster-ut-preview-table {
  width: 100%;
  min-width: 600px;
  margin: 0;
}
.roster-ut-preview-thead {
  position: sticky;
  top: 0;
  background-color: var(--bg);
  z-index: 1;
  box-shadow: 0 1px 0 var(--border);
}
.roster-ut-preview-th-row {
  width: 60px;
  text-align: center;
}
.roster-ut-preview-th-voicepart {
  width: 100px;
}
.roster-ut-preview-th-status {
  width: 130px;
}
.roster-ut-preview-td-row {
  text-align: center;
  color: var(--text-muted);
  font-size: 0.8rem;
}
.roster-ut-preview-td-email {
  font-size: 0.85rem;
}
.roster-ut-preview-td-voicepart {
  text-align: center;
}
.roster-ut-fw-600 {
  font-weight: 600;
}
.roster-ut-preview-status-badge {
  padding: 2px 6px;
  display: inline-block;
}
.roster-ut-preview-errors-list {
  color: #c62828;
  font-size: 0.8rem;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.roster-ut-preview-warnings-list {
  color: #b78103;
  font-size: 0.8rem;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.roster-ut-preview-ready {
  color: var(--primary-deep);
  font-size: 0.8rem;
}
.roster-ut-importing-container {
  gap: var(--space-md);
  padding: 20px 0;
  align-items: center;
}
.roster-ut-importing-icon {
  font-size: 3rem;
  animation: spin 2s linear infinite;
}
.roster-ut-importing-header {
  gap: 6px;
  width: 100%;
  align-items: center;
}
.roster-ut-importing-title {
  font-size: 1.1rem;
  color: var(--text);
}
.roster-ut-importing-progress-track {
  width: 100%;
  height: 12px;
  background-color: var(--border);
  border-radius: 6px;
  overflow: hidden;
  margin-top: 10px;
}
.roster-ut-importing-progress-bar {
  height: 100%;
  background-color: var(--primary);
  transition: width 0.1s ease-out;
}
.roster-ut-importing-stats {
  display: flex;
  gap: 20px;
  font-size: 0.9rem;
  color: var(--text-muted);
}
.roster-ut-importing-success {
  color: var(--primary-deep);
}
.roster-ut-complete-container {
  gap: var(--space-lg);
  padding: 10px 0;
}
.roster-ut-complete-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
}
.roster-ut-complete-icon {
  font-size: 3.5rem;
}
.roster-ut-complete-title {
  margin: 0;
  font-size: 1.3rem;
  color: var(--primary-deep);
}
.roster-ut-complete-creds-callout {
  background-color: rgba(74, 124, 89, 0.06);
  border-color: rgba(74, 124, 89, 0.2);
  padding: 16px 20px;
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.roster-ut-complete-creds-info {
  gap: 4px;
  flex: 1;
}
.roster-ut-complete-creds-title {
  color: var(--primary-deep);
  font-size: 0.95rem;
}
.roster-ut-complete-creds-desc {
  line-height: 1.4;
}
.roster-ut-complete-creds-btn {
  height: 40px;
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}
.roster-ut-complete-errors {
  gap: var(--space-xs);
}
.roster-ut-complete-errors-title {
  font-size: 0.9rem;
  color: #991b1b;
}
.roster-ut-complete-errors-list {
  max-height: 150px;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 8px 12px;
  background-color: #fafafa;
  font-size: 0.8rem;
}
.roster-ut-complete-error-item {
  padding: 4px 0;
  color: #444;
}
.roster-ut-complete-error-text {
  color: #991b1b;
}
.roster-ut-d-none {
  display: none;
}
`;
  fs.writeFileSync(filePath, css, 'utf8');
}

refactorCheckInList();
refactorRosterImportModal();
updateCSS();
console.log('Done refactoring inline styles.');
