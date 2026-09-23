import { one, run } from '../server/db.mjs';
const email=process.argv[2];
if(!email){console.error('Usage: npm run admin -- you@example.com\nRegister an account in the app first.');process.exit(1);}
const u=one('SELECT id,name FROM users WHERE email=?',email.toLowerCase());
if(!u){console.error('No registered user with that email.');process.exit(1);}
run("UPDATE users SET role='admin' WHERE id=?",u.id);
console.log(`${u.name} is now an admin. Refresh the browser to open /admin.`);
