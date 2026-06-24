import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const versionFilePath = path.join(__dirname, '../src/lib/version.ts');

function incrementVersion(version) {
  const parts = version.split('.');
  const patch = parseInt(parts[2]) + 1;
  return `${parts[0]}.${parts[1]}.${patch}`;
}

function getVersionFromFile(content) {
  const match = content.match(/export const APP_VERSION = '([^']+)'/);
  return match ? match[1] : null;
}

try {
  const content = fs.readFileSync(versionFilePath, 'utf8');
  const currentVersion = getVersionFromFile(content);

  if (!currentVersion) {
    console.error('Could not find APP_VERSION in version.ts');
    process.exit(1);
  }

  const newVersion = incrementVersion(currentVersion);
  const newContent = content.replace(
    /export const APP_VERSION = '[^']+'/,
    `export const APP_VERSION = '${newVersion}'`
  );

  fs.writeFileSync(versionFilePath, newContent);
  console.log(`✓ Version bumped from ${currentVersion} to ${newVersion}`);
} catch (error) {
  console.error('Error bumping version:', error.message);
  process.exit(1);
}
