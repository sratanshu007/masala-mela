// Gives a Firebase user admin rights for the Masala Mela admin panel.
// 1. Firebase console → Authentication → add the admin's email/password user.
// 2. Project settings → Service accounts → Generate new private key → save as tools/service-account.json (never commit it).
// 3. npm i firebase-admin   then   node tools/set-admin.js admin@deificdigital.com
const admin = require('firebase-admin');
const email = process.argv[2];
if (!email) { console.error('Usage: node tools/set-admin.js <email>'); process.exit(1); }
admin.initializeApp({ credential: admin.credential.cert(require('./service-account.json')) });
admin.auth().getUserByEmail(email)
  .then(u => admin.auth().setCustomUserClaims(u.uid, { admin: true }).then(() => u))
  .then(u => { console.log('Admin access given to', email, '(' + u.uid + '). Sign out and in again on the admin panel.'); process.exit(0); })
  .catch(e => { console.error(e.message); process.exit(1); });
