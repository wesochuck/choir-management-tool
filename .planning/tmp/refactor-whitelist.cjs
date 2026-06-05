const fs = require('fs');
const path = require('path');

const filePath = path.resolve('test/codebaseIntegrity.test.ts');
let content = fs.readFileSync(filePath, 'utf8');

const toRemove = [
  "'src/components/admin/StatusAutomationSettings.tsx',",
  "'src/components/admin/VoicePartEditor.tsx',",
  "'src/components/admin/SeasonManagementSettings.tsx',",
  "'src/components/admin/RosterSettingsTab.tsx',",
  "'src/components/admin/RosterDisplayOptionsSettings.tsx',",
  "'src/components/admin/SectionBucketEditor.tsx',",
  "'src/components/admin/RosterSummary.tsx',",
  "'src/views/admin/SettingsView.tsx',"
];

toRemove.forEach(str => {
  content = content.replace(new RegExp(`\\s*${str}`, 'g'), '');
});

fs.writeFileSync(filePath, content, 'utf8');
console.log('Whitelist updated.');
