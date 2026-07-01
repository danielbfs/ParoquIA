// Publica firestore.rules no banco Firestore NOMEADO do projeto.
//
// Por que este script existe (e não `firebase deploy`):
// o editor de Rules do Firebase Console e o CLI publicam no release do banco
// `(default)`. Este app usa um banco NOMEADO (VITE_FIREBASE_DATABASE_ID), cujo
// release é `cloud.firestore/<DBID>` — publicar no default não tem efeito.
// Aqui usamos a Rules API mirando o release nomeado explicitamente, com o corpo
// correto `{ release: { name, rulesetName }, updateMask: 'rulesetName' }`.
//
// Roda DENTRO do container (tem firebase-admin + GOOGLE_APPLICATION_CREDENTIALS):
//   docker exec paroquia-ai node /app/scripts/publish-firestore-rules.mjs
//
// Configurável por env (com defaults de produção):
//   FIREBASE_PROJECT_ID   (default: leafy-galaxy-188612)
//   FIREBASE_DATABASE_ID  (default: ai-studio-05329c89-e451-4ea7-8871-828379e9e884)
//   FIRESTORE_RULES_PATH  (default: /app/firestore.rules)

import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const proj = process.env.FIREBASE_PROJECT_ID || 'leafy-galaxy-188612';
const dbId = process.env.FIREBASE_DATABASE_ID || 'ai-studio-05329c89-e451-4ea7-8871-828379e9e884';
const rulesPath = process.env.FIRESTORE_RULES_PATH || '/app/firestore.rules';

admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId: proj });
const token = (await admin.credential.applicationDefault().getAccessToken()).access_token;
const H = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };

const RULES = readFileSync(rulesPath, 'utf8');
if (!RULES.trim()) {
  console.error('firestore.rules vazio — abortando.');
  process.exit(1);
}

const relName = `projects/${proj}/releases/cloud.firestore/${dbId}`;

// 1. Cria o ruleset a partir do conteúdo atual das regras.
let r = await fetch(`https://firebaserules.googleapis.com/v1/projects/${proj}/rulesets`, {
  method: 'POST',
  headers: H,
  body: JSON.stringify({ source: { files: [{ name: 'firestore.rules', content: RULES }] } }),
});
const rs = await r.json();
console.log('ruleset HTTP', r.status, rs.name || JSON.stringify(rs.error || rs).slice(0, 200));
if (!rs.name) process.exit(1);

// 2. Aponta o release do banco NOMEADO para o novo ruleset.
r = await fetch(`https://firebaserules.googleapis.com/v1/${relName}`, {
  method: 'PATCH',
  headers: H,
  body: JSON.stringify({ release: { name: relName, rulesetName: rs.name }, updateMask: 'rulesetName' }),
});
const out = await r.json();
console.log('release PATCH HTTP', r.status, out.rulesetName || JSON.stringify(out.error || out).slice(0, 250));
if (r.status !== 200) process.exit(1);
console.log('Regras publicadas no banco nomeado com sucesso.');
