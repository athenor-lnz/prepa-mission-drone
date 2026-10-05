// Génère le vérificateur du mot de passe commun.
// Usage : node scripts/make-verifier.mjs "votre phrase de passe"
// Colle le résultat dans src/config.js (clé `verifier`). Le mot de passe lui-même n'est jamais écrit.
import { makeVerifier } from '../src/lib/gate.js';

const pw = process.argv[2];
if (!pw || pw.length < 12) {
  console.error('Donne un mot de passe (12 caractères minimum, de préférence une phrase) :\n  node scripts/make-verifier.mjs "ma phrase de passe"');
  process.exit(1);
}
const v = await makeVerifier(pw);
console.log(`export const verifier = ${JSON.stringify(v, null, 2)};`);
