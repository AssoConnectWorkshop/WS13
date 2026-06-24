export const APP_VERSION = '1.0.13';

export function incrementVersion(version: string): string {
  const parts = version.split('.');
  const patch = parseInt(parts[2]) + 1;
  return `${parts[0]}.${parts[1]}.${patch}`;
}
