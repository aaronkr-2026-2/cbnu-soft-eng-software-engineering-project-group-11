const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

// Read-only inspection of a built application. Never edits identifiers, signatures or profiles.
const app = process.argv[2];
if (!app || !fs.existsSync(path.join(app, 'Info.plist'))) {
  console.error('Usage: node scripts/verify-cloudkit-signing.cjs /path/to/FiLog.app');
  process.exit(1);
}
const parse = xml => JSON.parse(execFileSync('plutil', ['-convert', 'json', '-o', '-', '-'], { input: xml, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }));
const run = (command, args) => execFileSync(command, args, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
try {
  const info = parse(fs.readFileSync(path.join(app, 'Info.plist')));
  run('codesign', ['--verify', '--strict', app]);
  const signed = parse(run('codesign', ['-d', '--entitlements', ':-', app]));
  const container = info.FiLogCloudContainer;
  // Xcode omits the environment key when signing for development; CloudKit then uses Development.
  const environment = signed['com.apple.developer.icloud-container-environment'] ?? 'Development';
  const errors = [];
  if (!signed['com.apple.developer.icloud-services']?.includes('CloudKit')) errors.push('Signed app is missing com.apple.developer.icloud-services = CloudKit.');
  if (!signed['com.apple.developer.icloud-container-identifiers']?.includes(container)) errors.push('Signed app does not include the configured container.');
  if (!['Development', 'Production'].includes(environment)) errors.push('Signed CloudKit environment is not Development or Production.');
  const profilePath = path.join(app, 'embedded.mobileprovision');
  if (fs.existsSync(profilePath)) {
    // Profiles contain <data>/<date> values that JSON cannot hold, so extract only the keys checked here.
    const profile = run('security', ['cms', '-D', '-i', profilePath]);
    const extract = (key, format) => execFileSync('plutil', ['-extract', key, format, '-o', '-', '-'], { input: profile, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    const allowed = JSON.parse(extract('Entitlements', 'json'));
    if (new Date(extract('ExpirationDate', 'raw').trim()).getTime() <= Date.now()) errors.push('Provisioning profile has expired.');
    const services = allowed['com.apple.developer.icloud-services'];
    if (services !== '*' && !services?.includes('CloudKit')) errors.push('Provisioning profile does not authorize CloudKit.');
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
