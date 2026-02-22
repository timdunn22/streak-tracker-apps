// Generate assetlinks.json for each app
// SHA-256 fingerprint from our signing key
const SHA256 = "E2:25:9F:D3:D9:A5:98:A1:B3:B3:26:23:C1:B0:C2:9A:4F:EF:4A:58:74:70:81:AE:0B:08:6D:83:C8:21:A6:13";

const apps = [
  'vapefree', 'sober', 'rewire', 'clearlungs', 'decaf',
  'sugarfree', 'fasttrack', 'greenday', 'iceplunge', 'primal'
];

const fs = require('fs');
const path = require('path');

const publicDir = path.resolve(__dirname, '../rewire/public/.well-known');

// Since all apps share the same public directory and build process,
// we create one assetlinks.json that includes ALL package IDs.
// Each Vercel deployment will serve this same file, and Android
// only checks for the matching package ID.
const assetlinks = apps.map(app => ({
  relation: ["delegate_permission/common.handle_all_urls"],
  target: {
    namespace: "android_app",
    package_name: `app.vercel.${app}`,
    sha256_cert_fingerprints: [SHA256]
  }
}));

fs.writeFileSync(
  path.join(publicDir, 'assetlinks.json'),
  JSON.stringify(assetlinks, null, 2)
);

console.log(`Written assetlinks.json with ${assetlinks.length} entries to ${publicDir}/assetlinks.json`);
