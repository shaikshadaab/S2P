import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

const ROOT_DIR = process.cwd();
const BACKUP_DIR = 'C:/SOSPrint-Backups';

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
const zipName = `SOS-Print-Source-${timestamp}.zip`;
const zipPath = path.join(BACKUP_DIR, zipName);
const stagingDir = path.join(BACKUP_DIR, `staging-${timestamp}`);
const extractDir = path.join(BACKUP_DIR, `test-extract-${timestamp}`);

console.log(`Starting backup process for ${ROOT_DIR}...`);
console.log(`Destination: ${zipPath}`);

const EXCLUDE_DIRS = new Set([
  '.git',
  '.next',
  '.vercel',
  '.netlify',
  'node_modules',
  'bin',
  'obj',
  '.vs',
  'dist',
  'coverage',
  '.turbo'
]);

const EXCLUDE_FILES = new Set([
  '.env',
  '.env.local',
  '.env.production',
  '.env.development',
  'firestore-debug.log',
  'ui-debug.log',
  'S2P-Agent-Setup.exe'
]);

function shouldExclude(relPath) {
  const parts = relPath.split(path.sep);
  for (const part of parts) {
    if (EXCLUDE_DIRS.has(part)) return true;
  }
  const basename = path.basename(relPath);
  if (EXCLUDE_FILES.has(basename)) return true;
  if (basename.endsWith('.log')) return true;
  if (basename.endsWith('.tmp')) return true;
  return false;
}

const filesToCopy = [];

function walk(currentDir) {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);
    const relPath = path.relative(ROOT_DIR, fullPath);

    if (shouldExclude(relPath)) {
      continue;
    }

    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (entry.isFile()) {
      filesToCopy.push(relPath);
    }
  }
}

walk(ROOT_DIR);
console.log(`Found ${filesToCopy.length} files eligible for backup.`);

if (fs.existsSync(stagingDir)) {
  fs.rmSync(stagingDir, { recursive: true, force: true });
}
fs.mkdirSync(stagingDir, { recursive: true });

let warnings = 0;
for (const rel of filesToCopy) {
  const src = path.join(ROOT_DIR, rel);
  const dest = path.join(stagingDir, rel);
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  fs.copyFileSync(src, dest);

  const ext = path.extname(rel).toLowerCase();
  const textExts = ['.js', '.ts', '.tsx', '.jsx', '.json', '.md', '.cs', '.txt', '.html', '.css', '.mjs', '.rules'];
  if (textExts.includes(ext) && fs.statSync(dest).size < 1024 * 1024) {
    const content = fs.readFileSync(dest, 'utf8');
    if (/-----BEGIN (RSA )?PRIVATE KEY-----/.test(content)) {
      console.warn(`[SECURITY WARNING] Private key detected in ${rel}!`);
      warnings++;
    }
  }
}

console.log(`Files staged to ${stagingDir}.`);
if (warnings > 0) {
  console.error(`Abort: ${warnings} security warnings found.`);
  process.exit(1);
}

if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
}

console.log(`Compressing archive to ${zipPath}...`);
execSync(`powershell -Command "Compress-Archive -Path '${stagingDir}\\*' -DestinationPath '${zipPath}' -CompressionLevel Optimal"`, {
  stdio: 'inherit'
});

const zipBuffer = fs.readFileSync(zipPath);
const sha256 = crypto.createHash('sha256').update(zipBuffer).digest('hex').toUpperCase();
const zipSize = fs.statSync(zipPath).size;

console.log(`Archive created successfully!`);
console.log(`Size: ${(zipSize / (1024 * 1024)).toFixed(2)} MB (${zipSize} bytes)`);
console.log(`SHA-256: ${sha256}`);

if (fs.existsSync(extractDir)) {
  fs.rmSync(extractDir, { recursive: true, force: true });
}
fs.mkdirSync(extractDir, { recursive: true });

console.log(`Verifying archive extraction into ${extractDir}...`);
execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${extractDir}'"`, {
  stdio: 'inherit'
});

const REQUIRED_FILES = [
  'package.json',
  'package-lock.json',
  'firestore.rules',
  'storage.rules',
  'firestore.indexes.json',
  'docs/STATUS.md',
  'packages/shared/package.json',
  'apps/web/package.json',
  'apps/agent/src/S2P.Agent.Worker/Program.cs'
];

let allFound = true;
for (const req of REQUIRED_FILES) {
  const reqPath = path.join(extractDir, req);
  if (!fs.existsSync(reqPath)) {
    console.error(`Missing required file in extracted archive: ${req}`);
    allFound = false;
  }
}

if (!allFound) {
  console.error('Verification failed: some required files are missing from archive.');
  process.exit(1);
}

console.log('All required files verified in test extraction!');

fs.rmSync(stagingDir, { recursive: true, force: true });
fs.rmSync(extractDir, { recursive: true, force: true });

const gitCommit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();

console.log('=== BACKUP SUMMARY ===');
console.log(`Git Commit: ${gitCommit}`);
console.log(`Backup File: ${zipPath}`);
console.log(`Size: ${(zipSize / (1024 * 1024)).toFixed(2)} MB`);
console.log(`SHA-256: ${sha256}`);
