#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const glob = require('glob');
const dotenv = require('dotenv');
const chalk = require('chalk');

// 1️⃣ Load .env file
const envFile = path.resolve(process.cwd(), '.env');
if (!fs.existsSync(envFile)) {
  console.error(chalk.red('❌ .env file not found!'));
  process.exit(1);
}

const env = dotenv.parse(fs.readFileSync(envFile));
const definedVars = Object.keys(env);

// 2️⃣ Find JS/TS files in common locations (src, pages, components, app, root)
const globs = [
  'src/**/*.{js,ts,jsx,tsx}',
  'pages/**/*.{js,ts,jsx,tsx}',
  'components/**/*.{js,ts,jsx,tsx}',
  'app/**/*.{js,ts,jsx,tsx}',
  '*.{js,ts,jsx,tsx}'
];
const files = Array.from(
  new Set(globs.flatMap((g) => glob.sync(g, { nodir: true })))
);

// 3️⃣ Scan files for various env access patterns:
//   - process.env.VAR
//   - process.env['VAR'] or process.env["VAR"]
//   - import.meta.env.VAR
//   - import.meta.env['VAR']
//   - destructuring: const { VAR, OTHER } = process.env  (or import.meta.env)
const usedVarsSet = new Set();

const simpleRegexes = [
  /process\.env\.([A-Z0-9_]+)/g,
  /process\.env\[['"]([A-Z0-9_]+)['"]\]/g,
  /import\.meta\.env\.([A-Z0-9_]+)/g,
  /import\.meta\.env\[['"]([A-Z0-9_]+)['"]\]/g
];

// destructuring from process.env or import.meta.env
const destructureRegex = /(?:const|let|var)\s*\{\s*([A-Za-z0-9_,\s]+)\s*\}\s*=\s*(?:process\.env|import\.meta\.env)/g;

files.forEach((file) => {
  const content = fs.readFileSync(file, 'utf-8');

  simpleRegexes.forEach((re) => {
    let match;
    while ((match = re.exec(content)) !== null) {
      if (match[1]) usedVarsSet.add(match[1]);
    }
  });

  let dmatch;
  while ((dmatch = destructureRegex.exec(content)) !== null) {
    const names = dmatch[1]
      .split(',')
      .map((n) => n.trim().replace(/[:=].*$/, '')) // remove possible renames like "A: B" or default assignments
      .filter(Boolean);
    names.forEach((n) => {
      // accept typical env-style names and also exported keys used in apps (keep it permissive)
      if (/^[A-Za-z0-9_]+$/.test(n)) usedVarsSet.add(n);
    });
  }
});

// 4️⃣ Compare used vs defined
const usedVars = Array.from(usedVarsSet);
const missing = usedVars.filter((v) => !definedVars.includes(v));
const unused = definedVars.filter((v) => !usedVars.includes(v));

// 5️⃣ Print report beautifully
console.log(chalk.blue.bold('\n✅ Env Usage Report\n'));
console.log(chalk.gray('──────────────────────────────\n'));

// Easter egg
if (process.env.EASTER_EGG === 'true') {
  console.log(chalk.magenta.bold(`
    🤫Congratulations! Now keep this a secret like your .env  
  `));
}

if (missing.length > 0) {
  console.log(chalk.red.bold('❌ Used but not defined in .env:'));
  missing.forEach((v) => console.log(chalk.red(`   • ${v}`)));
} else {
  console.log(chalk.green('✔ No missing variables!'));
}

console.log(); // empty line

if (unused.length > 0) {
  console.log(chalk.yellow.bold('⚠ Defined but not used in code:'));
  unused.forEach((v) => console.log(chalk.yellow(`   • ${v}`)));
} else {
  console.log(chalk.green('✔ No unused variables!'));
}

console.log(chalk.gray('\n──────────────────────────────\n'));