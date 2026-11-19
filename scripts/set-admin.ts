/**
 * Grants (or revokes) the `admin` custom claim for a SetupOps user.
 *
 * The Firestore rules treat `request.auth.token.admin == true` as a
 * break-glass administrator, so no personal e-mail address has to be
 * hard-coded in the rules or the client.
 *
 * Usage (requires a service-account key, never commit it):
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json npm run set-admin -- user@example.com
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json npm run set-admin -- user@example.com --revoke
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };

const [email, flag] = process.argv.slice(2);
if (!email || !email.includes('@')) {
  console.error('Usage: npm run set-admin -- <email> [--revoke]');
  process.exit(1);
}

initializeApp({ credential: applicationDefault(), projectId: firebaseConfig.projectId });

const auth = getAuth();
const user = await auth.getUserByEmail(email);
const revoke = flag === '--revoke';
await auth.setCustomUserClaims(user.uid, { ...(user.customClaims ?? {}), admin: !revoke });

console.log(`${revoke ? 'Revoked' : 'Granted'} admin claim for ${user.uid}. The user must sign out and in again.`);
