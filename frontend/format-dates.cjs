const fs = require('fs');

function processFile(path) {
  let content = fs.readFileSync(path, 'utf8');

  // Inject formatDate if it doesn't exist
  if (!content.includes('function formatDate(')) {
    content = content.replace(
      'export default function',
      `// Helper to format date explicitly as dd-mm-yyyy
function formatDate(d) {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return typeof d === "string" ? d : "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return \`\${day}-\${month}-\${year}\`;
}

export default function`
    );
  }

  // Common UI replacements where date gets displayed
  content = content.replace(/\{([A-Za-z0-9_]+)\.date\?\.(slice|substring)\(0,\s*10\)\}/g, '{formatDate($1.date)}');
  content = content.replace(/\{([A-Za-z0-9_]+)\.date\}/g, '{formatDate($1.date)}');
  content = content.replace(/\{showRecord\.date\}/g, '{formatDate(showRecord.date)}');
  content = content.replace(/\{new Date\(([^)]+)\)\.toLocaleDateString\([^}]+\)\}/g, '{formatDate($1)}');
  content = content.replace(/\$\{([A-Za-z0-9_]+)\.date\}/g, '${formatDate($1.date)}');

  // Fix the doctor dashboard that formats the today date explicitly
  content = content.replace(/\{new Date\(\)\.toLocaleDateString\([^}]+\)\}/g, '{formatDate(new Date())}');
  
  // Custom case for week dates in doctor dashboard
  content = content.replace(/\{weekDates\[0\] \? \`\$\{weekDates\[0\]\.toLocaleDateString\([^}]+\)\} – \$\{weekDates\[6\]\?\.(toLocaleDateString|toLocaleDateString)\([^}]+\)\}\` : ""\}/g, 
  '{weekDates[0] ? `${formatDate(weekDates[0])} – ${formatDate(weekDates[6])}` : ""}');
  
  // For {date.toLocaleDateString(...)}
  content = content.replace(/\{date\.toLocaleDateString\([^}]+\)\}/g, '{formatDate(date)}');

  fs.writeFileSync(path, content);
  console.log('Updated ' + path);
}

try {
  processFile('src/app/patient/dashboard/page.tsx');
} catch (e) { console.error('Error patient/dashboard/page.tsx', e); }

try {
  processFile('src/app/doctor/dashboard/page.tsx');
} catch (e) { console.error('Error doctor/dashboard/page.tsx', e); }

try {
  processFile('src/app/patient/book-appointment/page.tsx');
} catch (e) { console.error('Error patient/book-appointment/page.tsx', e); }
