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

// 2️⃣ Find all JS/TS files in src/
const files = glob.sync('src/**/*.{js,ts,jsx,tsx}', { nodir: true });

// 3️⃣ Scan files for process.env.VARIABLE usage
const usedVarsSet = new Set();
const envRegex = /process\.env\.([A-Z0-9_]+)/g;

files.forEach((file) => {
  const content = fs.readFileSync(file, 'utf-8');
  let match;
  while ((match = envRegex.exec(content)) !== null) {
    usedVarsSet.add(match[1]);
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
    🤫Congratulations! Now keep this a secret like you .env  
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
