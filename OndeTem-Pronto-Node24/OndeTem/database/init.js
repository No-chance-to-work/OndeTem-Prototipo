const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, '../database.db');
const db = new sqlite3.Database(dbPath);

const adminPasswordHash = bcrypt.hashSync('Admin123!', 10);

db.serialize(() => {
  db.run("PRAGMA foreign_keys = ON;");
  db.run("PRAGMA journal_mode = WAL;");

  db.run(`
    CREATE TABLE IF NOT EXISTS categorias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL UNIQUE,
      descricao TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      senha_hash TEXT NOT NULL,
      perfil TEXT CHECK(perfil IN ('OPERADOR', 'ADMIN')) NOT NULL DEFAULT 'OPERADOR',
      ativo INTEGER CHECK(ativo IN (0, 1)) DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS locais (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      categoria_id INTEGER NOT NULL,
      endereco TEXT NOT NULL,
      descricao TEXT,
      telefone TEXT,
      email_contato TEXT,
      status TEXT CHECK(status IN ('Pendente', 'Em Andamento', 'Concluido', 'Inativo')) DEFAULT 'Pendente',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE RESTRICT ON UPDATE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER,
      acao TEXT NOT NULL,
      entidade TEXT NOT NULL,
      entidade_id INTEGER,
      detalhes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
    );
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_locais_status ON locais(status);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_locais_categoria ON locais(categoria_id);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_locais_nome ON locais(nome);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);`);

  db.run(`INSERT OR IGNORE INTO categorias (id, nome, descricao) VALUES (1, 'Saúde', 'Postos e hospitais'), (2, 'Educação', 'Escolas e bibliotecas');`);

  db.run(`
    INSERT OR IGNORE INTO usuarios (id, nome, email, senha_hash, perfil)
    VALUES (1, 'Administrador', 'admin@ondetem.gov.br', ?, 'ADMIN');
  `, [adminPasswordHash]);

  console.log("Banco de dados SQLite inicializado com sucesso!");
});

module.exports = db;