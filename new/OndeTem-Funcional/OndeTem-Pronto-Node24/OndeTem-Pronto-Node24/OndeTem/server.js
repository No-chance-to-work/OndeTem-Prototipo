const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { URL } = require('node:url');
const { DatabaseSync } = require('node:sqlite');

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DB_PATH = path.join(__dirname, 'database.db');
const db = new DatabaseSync(DB_PATH);
const sessions = new Map();

db.exec('PRAGMA foreign_keys = ON;');
try { db.exec('PRAGMA journal_mode = WAL;'); } catch (_) {}

function hasColumn(table, column) {
  return db.prepare(`PRAGMA table_info(${table})`).all().some(c => c.name === column);
}
function addColumn(table, column, definition) {
  if (!hasColumn(table, column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${derived}`;
}
function verifyPassword(password, stored) {
  if (!stored || !stored.startsWith('scrypt:')) return false;
  const [, salt, expected] = stored.split(':');
  const actual = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));
}
function createSession(user) {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { ...user, expiresAt: Date.now() + 1000 * 60 * 60 * 8 });
  return token;
}
function cookieToken(req) {
  const cookies = String(req.headers.cookie || '').split(';').map(v => v.trim());
  const item = cookies.find(v => v.startsWith('ondetem_session='));
  return item ? decodeURIComponent(item.slice('ondetem_session='.length)) : null;
}
function currentUser(req) {
  const token = cookieToken(req);
  const session = token ? sessions.get(token) : null;
  if (!session || session.expiresAt < Date.now()) {
    if (token) sessions.delete(token);
    return null;
  }
  return session;
}
function requireAuth(req, res, admin = false) {
  const user = currentUser(req);
  if (!user) { sendJson(res, 401, { error: 'Faça login para continuar.' }); return null; }
  if (admin && user.role !== 'admin') { sendJson(res, 403, { error: 'Acesso administrativo necessário.' }); return null; }
  return user;
}
function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > 1024 * 1024) req.destroy(); });
    req.on('end', () => { try { resolve(JSON.parse(body || '{}')); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}
function sendJson(res, status, data, extraHeaders = {}) {
  const body = JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Length': Buffer.byteLength(body), ...extraHeaders });
  res.end(body);
}
function validEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
function safeUser(user) { return user ? { id: user.id, nome: user.nome, email: user.email, role: user.role } : null; }

function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS lojas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      endereco TEXT
    );
    CREATE TABLE IF NOT EXISTS produtos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      descricao TEXT,
      preco NUMERIC NOT NULL CHECK (preco >= 0),
      loja_id INTEGER,
      imagem_url TEXT,
      status TEXT NOT NULL DEFAULT 'disponivel' CHECK (status IN ('disponivel','indisponivel')),
      FOREIGN KEY (loja_id) REFERENCES lojas(id)
    );
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT,
      email TEXT NOT NULL UNIQUE,
      google_id TEXT UNIQUE,
      senha_hash TEXT,
      role TEXT NOT NULL DEFAULT 'usuario' CHECK (role IN ('usuario','admin')),
      criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  addColumn('produtos', 'status', "TEXT NOT NULL DEFAULT 'disponivel'");
  addColumn('usuarios', 'senha_hash', 'TEXT');
  addColumn('usuarios', 'role', "TEXT NOT NULL DEFAULT 'usuario'");
  addColumn('usuarios', 'criado_em', "TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP");
  db.exec(`CREATE INDEX IF NOT EXISTS idx_produtos_nome ON produtos(nome); CREATE INDEX IF NOT EXISTS idx_produtos_loja ON produtos(loja_id); CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);`);

  if (db.prepare('SELECT COUNT(*) AS total FROM lojas').get().total === 0) {
    const insert = db.prepare('INSERT INTO lojas (nome, endereco) VALUES (?, ?)');
    for (const loja of [['Supermercado BomPreço','Av. Principal, 100'],['Extra Hiper','Rodovia BR-070, 500'],['Pão de Açúcar','Rua das Flores, 300'],['Atacadão','Av. Industrial, 1500'],['Carrefour Hiper','Shopping Center Local, Loja 1']]) insert.run(...loja);
  }
  if (db.prepare('SELECT COUNT(*) AS total FROM produtos').get().total === 0) {
    const insert = db.prepare('INSERT INTO produtos (nome, descricao, preco, loja_id, imagem_url, status) VALUES (?, ?, ?, ?, ?, ?)');
    const produtos = [
      ['Leite Integral 1L','Caixa 1 Litro - Parmalat ou Itambé',5.49,1,'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=500&q=80','disponivel'],
      ['Arroz Branco 5kg','Tipo 1 - Pacote de 5 quilos',24.90,4,'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=500&q=80','disponivel'],
      ['Detergente Líquido 500ml','Neutro ou Limão - Ypê',2.29,2,'https://images.unsplash.com/photo-1585837135231-d273a5f3f458?auto=format&fit=crop&w=500&q=80','disponivel'],
      ['Açúcar Cristal 5kg','Refinado especial',18.50,5,'https://images.unsplash.com/photo-1581441363689-1f3c3c62ba22?auto=format&fit=crop&w=500&q=80','disponivel'],
      ['Café em Pó 500g','Torrado e moído - Melitta ou Pilão',16.90,3,'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=500&q=80','disponivel']
    ];
    for (const p of produtos) insert.run(...p);
  }
  // Admin local para testes. A senha é armazenada somente como hash.
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@ondetem.local';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
  const existing = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(adminEmail);
  if (!existing) db.prepare('INSERT INTO usuarios (nome,email,senha_hash,role) VALUES (?,?,?,?)').run('Administrador', adminEmail, hashPassword(adminPassword), 'admin');
  else db.prepare("UPDATE usuarios SET role='admin' WHERE email=?").run(adminEmail);
}
initDB();

const mimeTypes = { '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon' };
function getProducts(url) {
  const termo = (url.searchParams.get('q') || '').trim();
  const lojaId = Number(url.searchParams.get('loja_id') || 0);
  let sql = `SELECT p.id,p.nome,p.descricao,p.preco,p.imagem_url AS imagem,p.loja_id,p.status,l.nome AS loja,l.endereco FROM produtos p LEFT JOIN lojas l ON p.loja_id=l.id WHERE 1=1`;
  const params = {};
  if (termo) { sql += ` AND (LOWER(p.nome) LIKE LOWER(@termo) OR LOWER(COALESCE(p.descricao,'')) LIKE LOWER(@termo) OR LOWER(COALESCE(l.nome,'')) LIKE LOWER(@termo))`; params.termo = `%${termo}%`; }
  if (Number.isInteger(lojaId) && lojaId > 0) { sql += ' AND p.loja_id=@lojaId'; params.lojaId = lojaId; }
  sql += ' ORDER BY p.nome COLLATE NOCASE,p.preco ASC';
  return db.prepare(sql).all(params);
}
function serveStatic(req,res,pathname) {
  let relative = decodeURIComponent(pathname); if (relative === '/') relative='/index.html';
  const filePath = path.resolve(PUBLIC_DIR,'.'+relative);
  if (!filePath.startsWith(PUBLIC_DIR+path.sep)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.stat(filePath,(err,stat)=>{ if(!err&&stat.isFile()){res.writeHead(200,{'Content-Type':mimeTypes[path.extname(filePath).toLowerCase()]||'application/octet-stream'});return fs.createReadStream(filePath).pipe(res);} fs.readFile(path.join(PUBLIC_DIR,'index.html'),(e,data)=>{if(e){res.writeHead(500);return res.end('Aplicação não encontrada.');}res.writeHead(200,{'Content-Type':mimeTypes['.html']});res.end(data);}); });
}

const server=http.createServer(async (req,res)=>{
  try {
    const url=new URL(req.url,`http://${req.headers.host||'localhost'}`);
    if(req.method==='GET'&&url.pathname==='/api/health') return sendJson(res,200,{ok:true,service:'OndeTem',database:'sqlite'});
    if(req.method==='GET'&&url.pathname==='/api/produtos') return sendJson(res,200,getProducts(url));
    if(req.method==='GET'&&url.pathname==='/api/lojas') return sendJson(res,200,db.prepare('SELECT id,nome,endereco FROM lojas ORDER BY nome').all());
    if(req.method==='GET'&&url.pathname==='/api/me') return sendJson(res,200,{user:safeUser(currentUser(req))});

    if(req.method==='POST'&&url.pathname==='/api/auth/register'){
      const d=await readJson(req),nome=String(d.nome||'').trim(),email=String(d.email||'').trim().toLowerCase(),senha=String(d.senha||'');
      if(nome.length<2)return sendJson(res,400,{error:'Informe seu nome.'}); if(!validEmail(email))return sendJson(res,400,{error:'E-mail inválido.'}); if(senha.length<6)return sendJson(res,400,{error:'A senha deve ter pelo menos 6 caracteres.'});
      if(db.prepare('SELECT id FROM usuarios WHERE email=?').get(email))return sendJson(res,409,{error:'Este e-mail já está cadastrado.'});
      const r=db.prepare('INSERT INTO usuarios (nome,email,senha_hash,role) VALUES (?,?,?,?)').run(nome,email,hashPassword(senha),'usuario');
      const user=db.prepare('SELECT id,nome,email,role FROM usuarios WHERE id=?').get(r.lastInsertRowid); const token=createSession(user);
      return sendJson(res,201,{user:safeUser(user)},{'Set-Cookie':`ondetem_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800`});
    }
    if(req.method==='POST'&&url.pathname==='/api/auth/login'){
      const d=await readJson(req),email=String(d.email||'').trim().toLowerCase(),senha=String(d.senha||'');
      const user=db.prepare('SELECT id,nome,email,senha_hash,role FROM usuarios WHERE email=?').get(email);
      if(!user||!verifyPassword(senha,user.senha_hash))return sendJson(res,401,{error:'E-mail ou senha incorretos.'});
      const token=createSession(user); return sendJson(res,200,{user:safeUser(user)},{'Set-Cookie':`ondetem_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800`});
    }
    if(req.method==='POST'&&url.pathname==='/api/auth/logout'){
      const token=cookieToken(req); if(token)sessions.delete(token); return sendJson(res,200,{ok:true},{'Set-Cookie':'ondetem_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'});
    }
    if(req.method==='POST'&&url.pathname==='/api/usuarios'){
      const d=await readJson(req),nome=String(d.nome||'').trim(),email=String(d.email||'').trim().toLowerCase(); if(!validEmail(email))return sendJson(res,400,{error:'E-mail inválido.'});
      const existente=db.prepare('SELECT id,nome,email,role FROM usuarios WHERE email=?').get(email); if(existente)return sendJson(res,200,existente);
      const r=db.prepare('INSERT INTO usuarios (nome,email) VALUES (?,?)').run(nome||null,email); return sendJson(res,201,db.prepare('SELECT id,nome,email,role FROM usuarios WHERE id=?').get(r.lastInsertRowid));
    }

    if(req.method==='POST'&&url.pathname==='/api/admin/produtos'){
      if(!requireAuth(req,res,true))return; const d=await readJson(req),nome=String(d.nome||'').trim(),descricao=String(d.descricao||'').trim(),preco=Number(d.preco),lojaId=Number(d.loja_id)||null,status=d.status==='indisponivel'?'indisponivel':'disponivel',imagem=String(d.imagem_url||'').trim()||null;
      if(!nome||!Number.isFinite(preco)||preco<0)return sendJson(res,400,{error:'Nome e preço válidos são obrigatórios.'});
      const r=db.prepare('INSERT INTO produtos (nome,descricao,preco,loja_id,imagem_url,status) VALUES (?,?,?,?,?,?)').run(nome,descricao,preco,lojaId,imagem,status); return sendJson(res,201,{id:r.lastInsertRowid});
    }
    if(req.method==='PUT'&&url.pathname.startsWith('/api/admin/produtos/')){
      if(!requireAuth(req,res,true))return; const id=Number(url.pathname.split('/').pop()); const d=await readJson(req); const p=db.prepare('SELECT * FROM produtos WHERE id=?').get(id); if(!p)return sendJson(res,404,{error:'Produto não encontrado.'});
      const nome=String(d.nome??p.nome).trim(),descricao=String(d.descricao??p.descricao??'').trim(),preco=Number(d.preco??p.preco),lojaId=Number(d.loja_id??p.loja_id)||null,status=d.status==='indisponivel'?'indisponivel':'disponivel',imagem=String(d.imagem_url??p.imagem_url??'').trim()||null;
      if(!nome||!Number.isFinite(preco)||preco<0)return sendJson(res,400,{error:'Dados inválidos.'});
      db.prepare('UPDATE produtos SET nome=?,descricao=?,preco=?,loja_id=?,imagem_url=?,status=? WHERE id=?').run(nome,descricao,preco,lojaId,imagem,status,id); return sendJson(res,200,{ok:true});
    }
    if(req.method==='DELETE'&&url.pathname.startsWith('/api/admin/produtos/')){
      if(!requireAuth(req,res,true))return; const id=Number(url.pathname.split('/').pop()); const p=db.prepare('SELECT id FROM produtos WHERE id=?').get(id); if(!p)return sendJson(res,404,{error:'Produto não encontrado.'}); db.prepare('DELETE FROM produtos WHERE id=?').run(id); return sendJson(res,200,{ok:true});
    }
    if(req.method==='PATCH'&&url.pathname.startsWith('/api/admin/produtos/')&&url.pathname.endsWith('/status')){
      if(!requireAuth(req,res,true))return; const parts=url.pathname.split('/'),id=Number(parts[parts.length-2]),d=await readJson(req),status=d.status==='indisponivel'?'indisponivel':'disponivel'; db.prepare('UPDATE produtos SET status=? WHERE id=?').run(status,id); return sendJson(res,200,{ok:true,status});
    }
    if(req.method==='GET')return serveStatic(req,res,url.pathname);
    res.writeHead(405,{'Content-Type':'text/plain; charset=utf-8'});res.end('Método não permitido');
  }catch(err){console.error(err);sendJson(res,500,{error:'Erro interno do servidor.'});}
});
server.listen(PORT,'127.0.0.1',()=>console.log(`OndeTem rodando em http://localhost:${PORT}`));
function shutdown(){server.close(()=>{db.close();process.exit(0);});}
process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
