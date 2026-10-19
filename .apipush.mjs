
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const TOKEN = process.env.GH_TOKEN;
const REPO = 'caiasas/knowledge-graph';
const API = 'https://api.github.com/repos/' + REPO;
const H = { Authorization: 'Bearer ' + TOKEN, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' };

const files = execSync('git diff --name-only origin/main..main', { cwd: process.cwd() }).toString().trim().split(/\r?\n/).filter(Boolean);
console.log('files:', files.join(', '));

const head = await (await fetch(API + '/git/ref/heads/main', { headers: H })).json();
const parentSha = head.object.sha;
const parent = await (await fetch(API + '/git/commits/' + parentSha, { headers: H })).json();
console.log('remote head:', parentSha.slice(0, 8));

const msg = execSync('git log -1 --pretty=%B', { cwd: process.cwd() }).toString().trim();
const authorName = execSync('git log -1 --pretty=%an', { cwd: process.cwd() }).toString().trim();
const authorEmail = execSync('git log -1 --pretty=%ae', { cwd: process.cwd() }).toString().trim();

const treeEntries = [];
for (const f of files) {
  const content = fs.readFileSync(f);
  const b64 = content.toString('base64');
  const r = await fetch(API + '/git/blobs', { method: 'POST', headers: H, body: JSON.stringify({ content: b64, encoding: 'base64' }) });
  const j = await r.json();
  if (!j.sha) { console.log('blob failed', f, JSON.stringify(j).slice(0, 200)); process.exit(1); }
  console.log('blob', f, j.sha.slice(0, 8));
  treeEntries.push({ path: f.replace(/\\/g, '/'), mode: '100644', type: 'blob', sha: j.sha });
}

const treeRes = await fetch(API + '/git/trees', { method: 'POST', headers: H, body: JSON.stringify({ base_tree: parent.tree.sha, tree: treeEntries }) });
const tree = await treeRes.json();
if (!tree.sha) { console.log('tree failed', JSON.stringify(tree).slice(0, 200)); process.exit(1); }

const commitRes = await fetch(API + '/git/commits', {
  method: 'POST', headers: H,
  body: JSON.stringify({ message: msg, tree: tree.sha, parents: [parentSha], author: { name: authorName, email: authorEmail } })
});
const commit = await commitRes.json();
if (!commit.sha) { console.log('commit failed', JSON.stringify(commit).slice(0, 300)); process.exit(1); }
console.log('new commit:', commit.sha.slice(0, 8));

const refRes = await fetch(API + '/git/refs/heads/main', { method: 'PATCH', headers: H, body: JSON.stringify({ sha: commit.sha, force: false }) });
const ref = await refRes.json();
console.log('ref updated:', ref.object ? ref.object.sha.slice(0, 8) : JSON.stringify(ref).slice(0, 200));
