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


app.get('/api/produtos', (req, res) => {
    const { loja, busca } = req.query;
    let sql = `
        SELECT p.id, p.nome, p.marca, p.categoria, p.preco, p.esgotado, l.nome AS loja 
        FROM produtos p 
        JOIN lojas l ON p.loja_id = l.id
        WHERE 1=1
    `;
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
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});


app.get('/api/lojas', (req, res) => {
    db.all(`SELECT * FROM lojas`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/login', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email é obrigatório' });


    db.run(`INSERT OR IGNORE INTO usuarios (email, senha_hash) VALUES (?, 'hash_demo')`, [email], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ mensagem: 'Login realizado com sucesso!', user: { id: this.lastID || 1, email } });
    });
});


app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}: http://localhost:${PORT}`);
});
