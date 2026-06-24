// Server entrypoint. Picks Postgres when DATABASE_URL is set, otherwise in-memory.
// Optional Redis adapter for multi-instance fan-out when REDIS_URL is set.

import { createServer } from 'node:http';
import type { IncomingMessage } from 'node:http';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { Server } from 'socket.io';
import { hasDatabase } from './db/pool.js';
import { MemoryStore } from './repo/memoryStore.js';
import { PgStore } from './repo/pgStore.js';
import type { RoomStore } from './repo/store.js';
import { GameService } from './service/gameService.js';
import { startJanitor } from './server/janitor.js';
import { attachSockets, broadcastRoom } from './server/socket.js';

const PORT = Number(process.env.PORT ?? 3000);
const uploadDir = join(process.cwd(), 'uploads');

const assetSlots = [
  'game_logo',
  'stamp_nawab',
  'stamp_eic',
  'voting_yes',
  'voting_no',
  'mission_success',
  'mission_betrayer',
  'captain_card',
  'character_SIRAJ',
  'character_MIR_MODON',
  'character_NAWAB',
  'character_MOHAN_LAL',
  'character_SAINT_FRAIS',
  'character_DEBUSI',
  'character_LUTFUNNESSA',
  'character_MIR_ZAFAR',
  'character_GHASETI_BEGUM',
  'character_EIC',
  'character_RAI_DURLABH',
  'character_UMICHAND',
] as const;

const contentTypes: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

function adminPage(): string {
  const options = assetSlots.map((s) => `<option value="${s}">${s}</option>`).join('');
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Polashi Assets</title>
<style>
body{font-family:system-ui,sans-serif;margin:32px;max-width:760px;background:#f6edd8;color:#28190f}
label{display:block;margin:14px 0 6px;font-weight:700}select,input,button{font:inherit;padding:10px}
button{background:#226b3a;color:white;border:0;border-radius:6px;margin-top:16px;cursor:pointer}
#msg{margin-top:18px;font-weight:700}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-top:24px}
.card{border:1px solid #b08b43;border-radius:8px;padding:10px;background:#fff8e8}.card img{max-width:100%;height:96px;object-fit:contain}
</style></head>
<body>
<h1>Polashi Asset Admin</h1>
<form id="f">
<label>Asset slot</label><select id="slot">${options}</select>
<label>Image file</label><input id="file" type="file" accept="image/png,image/jpeg,image/webp" required>
<button>Upload</button>
</form>
<div id="msg"></div><div id="grid" class="grid"></div>
<script>
async function refresh(){
 const res=await fetch('/assets/catalog'); const cat=await res.json();
 grid.innerHTML=Object.entries(cat.assets).map(([k,v])=>'<div class="card"><b>'+k+'</b><br>'+(v?'<img src="'+v+'?t='+Date.now()+'">':'No image')+'</div>').join('');
}
f.onsubmit=async e=>{
 e.preventDefault(); const file=document.getElementById('file').files[0];
 const dataUrl=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file);});
 const out=await fetch('/admin/assets',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({slot:slot.value,dataUrl})});
 msg.textContent=out.ok?'Uploaded':'Upload failed: '+await out.text(); refresh();
};
refresh();
</script></body></html>`;
}

async function readJsonBody(req: IncomingMessage): Promise<any> {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 12 * 1024 * 1024) throw new Error('body too large');
  }
  return JSON.parse(body);
}

async function assetCatalog(): Promise<Record<string, string | null>> {
  const assets: Record<string, string | null> = {};
  for (const slot of assetSlots) {
    let found: string | null = null;
    for (const ext of Object.keys(contentTypes)) {
      try {
        await readFile(join(uploadDir, `${slot}${ext}`));
        found = `/uploads/${slot}${ext}`;
        break;
      } catch {
        // Try the next extension.
      }
    }
    assets[slot] = found;
  }
  return assets;
}

const store: RoomStore = hasDatabase() ? new PgStore() : new MemoryStore();
if (!hasDatabase()) {
  console.warn('[polashi] DATABASE_URL not set — using in-memory store (state lost on restart).');
}

const service = new GameService(store);

const httpServer = createServer(async (req, res) => {
  if (req.url === '/') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(`<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Polashi Backend</title>
<style>
body{font-family:system-ui,sans-serif;margin:0;min-height:100vh;display:grid;place-items:center;background:#201812;color:#fff3d7}
main{max-width:680px;padding:32px;text-align:center}h1{font-size:44px;margin:0 0 12px;color:#f3c767}
p{font-size:18px;line-height:1.5;color:#dfd0b1}a{color:#f3c767;font-weight:700}
.links{display:flex;gap:16px;justify-content:center;flex-wrap:wrap;margin-top:24px}
</style></head>
<body><main>
<h1>Polashi Game Backend</h1>
<p>The multiplayer backend is running. Android clients connect here with Socket.IO over HTTPS.</p>
<div class="links"><a href="/health">Health</a><a href="/admin">Asset Admin</a></div>
</main></body></html>`);
    return;
  }
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, store: hasDatabase() ? 'pg' : 'memory' }));
    return;
  }
  if (req.method === 'GET' && req.url === '/admin') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(adminPage());
    return;
  }
  if (req.method === 'GET' && req.url === '/assets/catalog') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ assets: await assetCatalog() }));
    return;
  }
  if (req.method === 'GET' && req.url?.startsWith('/uploads/')) {
    const name = decodeURIComponent(req.url.slice('/uploads/'.length));
    const allowed = assetSlots.flatMap((slot) => Object.keys(contentTypes).map((ext) => `${slot}${ext}`));
    const directName = allowed.includes(name) ? name : null;
    const slotName = assetSlots.includes(name as (typeof assetSlots)[number]) ? name : null;
    if (!directName && !slotName) {
      res.writeHead(404);
      res.end();
      return;
    }
    try {
      let fileName = directName;
      if (!fileName && slotName) {
        for (const ext of Object.keys(contentTypes)) {
          try {
            await readFile(join(uploadDir, `${slotName}${ext}`));
            fileName = `${slotName}${ext}`;
            break;
          } catch {
            // Try next extension.
          }
        }
      }
      if (!fileName) throw new Error('missing asset');
      const file = await readFile(join(uploadDir, fileName));
      res.writeHead(200, { 'content-type': contentTypes[extname(fileName)] ?? 'application/octet-stream' });
      res.end(file);
    } catch {
      res.writeHead(404);
      res.end();
    }
    return;
  }
  if (req.method === 'POST' && req.url === '/admin/assets') {
    try {
      const { slot, dataUrl } = await readJsonBody(req);
      if (!assetSlots.includes(slot) || typeof dataUrl !== 'string') throw new Error('bad input');
      const match = /^data:image\/(png|jpeg|webp);base64,([a-z0-9+/=]+)$/i.exec(dataUrl);
      if (!match) throw new Error('bad image');
      const imageType = match[1]!;
      const base64 = match[2]!;
      const ext = imageType === 'jpeg' ? '.jpg' : `.${imageType}`;
      await mkdir(uploadDir, { recursive: true });
      await Promise.all(
        Object.keys(contentTypes).map((oldExt) =>
          oldExt === ext ? Promise.resolve() : unlink(join(uploadDir, `${slot}${oldExt}`)).catch(() => undefined),
        ),
      );
      await writeFile(join(uploadDir, `${slot}${ext}`), Buffer.from(base64, 'base64'));
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true, url: `/uploads/${slot}${ext}` }));
    } catch (e) {
      res.writeHead(400, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : 'bad request' }));
    }
    return;
  }
  res.writeHead(404);
  res.end();
});

const io = new Server(httpServer, {
  cors: { origin: process.env.CORS_ORIGIN ?? '*' },
});

// Optional horizontal scaling: share Socket.IO events across instances via Redis.
async function maybeAttachRedis(): Promise<void> {
  if (!process.env.REDIS_URL) return;
  const [{ createAdapter }, { createClient }] = await Promise.all([
    import('@socket.io/redis-adapter'),
    import('redis'),
  ]);
  const pub = createClient({ url: process.env.REDIS_URL });
  const sub = pub.duplicate();
  await Promise.all([pub.connect(), sub.connect()]);
  io.adapter(createAdapter(pub, sub));
  console.log('[polashi] Redis adapter attached (multi-instance mode).');
}

attachSockets(io, service);

// Durable, restart-safe turn timeouts + stale-room cleanup.
startJanitor(service, {
  onRoomChanged: (roomId) => broadcastRoom(io, service, roomId),
});

maybeAttachRedis().catch((e) => console.error('[polashi] Redis adapter failed', e));

httpServer.listen(PORT, () => {
  console.log(`[polashi] server listening on :${PORT}`);
});
