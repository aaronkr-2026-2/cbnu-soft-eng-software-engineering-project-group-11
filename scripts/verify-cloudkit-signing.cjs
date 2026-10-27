const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

// Read-only inspection of a built application. Never edits identifiers, signatures or profiles.
const app = process.argv[2];
if (!app || !fs.existsSync(path.join(app, 'Info.plist'))) {
  console.error('Usage: node scripts/verify-cloudkit-signing.cjs /path/to/FILMER.app');
  process.exit(1);
}
const parse = xml => JSON.parse(execFileSync('plutil', ['-convert', 'json', '-o', '-', '-'], { input: xml, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }));
const run = (command, args) => execFileSync(command, args, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
try {
  const info = parse(fs.readFileSync(path.join(app, 'Info.plist')));
  run('codesign', ['--verify', '--strict', app]);
  const signed = parse(run('codesign', ['-d', '--entitlements', ':-', app]));
  const container = info.FILMERCloudContainer;
  const environment = info.FILMERCloudEnvironment;
  const errors = [];
  if (!signed['com.apple.developer.icloud-services']?.includes('CloudKit')) errors.push('Signed app is missing com.apple.developer.icloud-services = CloudKit.');
  if (!signed['com.apple.developer.icloud-container-identifiers']?.includes(container)) errors.push('Signed app does not include the configured container.');
  if (!['Development', 'Production'].includes(environment) || signed['com.apple.developer.icloud-container-environment'] !== environment) errors.push('Signed CloudKit environment does not match Info.plist.');
  const profilePath = path.join(app, 'embedded.mobileprovision');
  if (fs.existsSync(profilePath)) {
    const profile = parse(run('security', ['cms', '-D', '-i', profilePath]));
    const allowed = profile.Entitlements ?? {};
    if (new Date(profile.ExpirationDate).getTime() <= Date.now()) errors.push('Provisioning profile has expired.');
    if (!allowed['com.apple.developer.icloud-services']?.includes('CloudKit')) errors.push('Provisioning profile does not authorize CloudKit.');
    const containers = allowed['com.apple.developer.icloud-container-identifiers'] ?? [];
    if (!containers.includes(container) && !containers.includes('*')) errors.push('Provisioning profile does not authorize this container.');
    const environments = allowed['com.apple.developer.icloud-container-environment'];
    if (!(Array.isArray(environments) ? environments.includes(environment) : environments === environment)) errors.push('Provisioning profile does not authorize this environment.');
    const application = allowed['application-identifier'];
    if (typeof application !== 'string' || !application.endsWith('.' + info.CFBundleIdentifier)) errors.push('Provisioning profile does not match the bundle identifier.');
  } else {
    errors.push('No embedded provisioning profile: device authorization cannot be verified by this check.');
  }
  console.log('Bundle:', info.CFBundleIdentifier, '| Container:', container, '| Environment:', environment);
  if (errors.length) { errors.forEach(error => console.error(error)); process.exitCode = 1; }
  else console.log('Signature, CloudKit entitlements and embedded profile match. Live account/container access and auto-restore still require device testing.');
} catch (error) {
  console.error('CloudKit signing could not be verified:', error.message.split('\n')[0]);
  console.error('Unsigned/local-only builds remain supported; they must not initialize CloudKit.');
  process.exitCode = 1;
}
