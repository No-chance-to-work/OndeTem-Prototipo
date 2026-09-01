const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;


app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));


const db = new sqlite3.Database('./database.db', (err) => {
    if (err) console.error('Erro ao conectar ao banco:', err.message);
    else console.log('Conectado ao banco de dados SQLite.');
});

db.serialize(() => {

    db.run(`CREATE TABLE IF NOT EXISTS lojas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        endereco TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS produtos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        marca TEXT NOT NULL,
        categoria TEXT NOT NULL,
        preco REAL NOT NULL,
        loja_id INTEGER NOT NULL,
        esgotado INTEGER DEFAULT 0,
        FOREIGN KEY (loja_id) REFERENCES lojas(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        senha_hash TEXT NOT NULL,
        nome TEXT,
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    const stmtLoja = db.prepare(`INSERT OR IGNORE INTO lojas (id, nome, endereco) VALUES (?, ?, ?)`);
    stmtLoja.run(1, 'Supermercado BomPreço', 'Av. Central, 100');
    stmtLoja.run(2, 'Extra Hiper', 'Rua das Flores, 500');
    stmtLoja.run(3, 'Pão de Açúcar', 'Av. T-63, 1200');
    stmtLoja.run(4, 'Atacadão', 'Rodovia BR-153, Km 5');
    stmtLoja.run(5, 'Carrefour Hiper', 'Av. Jamel Cícero, 3000');
    stmtLoja.finalize();

    const stmtProd = db.prepare(`INSERT OR IGNORE INTO produtos (id, nome, marca, categoria, preco, loja_id, esgotado) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    stmtProd.run(1, 'Leite Integral Italac', 'Italac', 'Laticínios', 4.99, 1, 0);
    stmtProd.run(2, 'Arroz Branco Camil', 'Camil', 'Grãos e Cereais', 22.90, 1, 0);
    stmtProd.run(3, 'Feijão Carioca Camil', 'Camil', 'Grãos e Cereais', 8.49, 1, 0);
    stmtProd.run(4, 'Óleo de Soja Liza', 'Liza', 'Óleos e Gorduras', 5.89, 1, 0);
    stmtProd.run(5, 'Café Pilão Torrado e Moído', 'Pilão', 'Bebidas', 14.99, 1, 0);
    stmtProd.run(6, 'Sabão em Pó OMO', 'OMO', 'Limpeza', 32.90, 1, 1);
    stmtProd.run(7, 'Leite Integral Italac', 'Italac', 'Laticínios', 4.79, 2, 0);
    stmtProd.run(8, 'Arroz Branco Camil', 'Camil', 'Grãos e Cereais', 21.50, 2, 0);
    stmtProd.run(9, 'Macarrão Penne Barilla', 'Barilla', 'Massas e Farinhas', 6.99, 2, 0);
    stmtProd.run(10, 'Açúcar Refinado União', 'União', 'Mercearia', 4.19, 3, 0);
    stmtProd.run(11, 'Sabão em Pó OMO', 'OMO', 'Limpeza', 29.90, 4, 0);
    stmtProd.finalize();

    console.log("Tabelas e dados iniciais verificados/carregados.");
});


app.get('/api/produtos', (req, res) => {
    const { loja, busca } = req.query;
    let sql = `SELECT p.id, p.nome, p.marca, p.categoria, p.preco, p.esgotado, l.nome AS loja 
               FROM produtos p JOIN lojas l ON p.loja_id = l.id WHERE 1=1`;
    const params = [];

    if (loja && loja !== 'todas') {
        sql += ` AND l.nome = ?`;
        params.push(loja);
    }
    if (busca) {
        sql += ` AND (p.nome LIKE ? OR p.marca LIKE ? OR p.categoria LIKE ?)`;
        params.push(`%${busca}%`, `%${busca}%`, `%${busca}%`);
    }

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});


app.post('/api/auth/email', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email é obrigatório.' });

    db.get(`SELECT * FROM usuarios WHERE email = ?`, [email], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });

        if (user) {
            return res.json({ mensagem: 'Login realizado com sucesso!', usuario: { id: user.id, email: user.email, tipo: 'email' } });
        } else {
            db.run(`INSERT INTO usuarios (email, senha_hash) VALUES (?, 'hash_demo')`, [email], function (err) {
                if (err) return res.status(500).json({ error: err.message });
                return res.status(201).json({
                    mensagem: 'Conta criada e login realizado!',
                    usuario: { id: this.lastID, email, tipo: 'email' }
                });
            });
        }
    });
});

app.post('/api/auth/google', (req, res) => {
    const { email, nome } = req.body;
    if (!email) return res.status(400).json({ error: 'Dados do Google inválidos.' });

    db.get(`SELECT * FROM usuarios WHERE email = ?`, [email], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });

        if (user) {
            return res.json({ mensagem: 'Autenticado via Google com sucesso!', usuario: { id: user.id, email: user.email, nome, tipo: 'google' } });
        } else {
            db.run(`INSERT INTO usuarios (email, senha_hash, nome) VALUES (?, 'google_auth', ?)`, [email, nome], function (err) {
                if (err) return res.status(500).json({ error: err.message });
                return res.status(201).json({
                    mensagem: 'Conta Google criada com sucesso!',
                    usuario: { id: this.lastID, email, nome, tipo: 'google' }
                });
            });
        }
    });
});


app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
