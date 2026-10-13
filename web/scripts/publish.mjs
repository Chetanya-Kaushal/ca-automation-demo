// Copy the static export into the Worker's asset folder without touching the staff app files.
import { cpSync, rmSync, existsSync } from 'node:fs';
const out = new URL('../out/', import.meta.url), pub = new URL('../../backend/public/', import.meta.url);
if (!existsSync(out)) throw new Error('Run next build first');
rmSync(new URL('_next/', pub), { recursive: true, force: true });
cpSync(out, pub, { recursive: true });
console.log('Published web/out → backend/public');
