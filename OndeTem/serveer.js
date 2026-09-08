const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
// Se estiver no Render, ele usa a porta que o Render definir. Se estiver no PC, usa a porta 3000.
const PORT = process.env.PORT || 3000;

// Configurar o Express para ler JSON e servir os arquivos da pasta "public" (HTML, CSS, JS)
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Criar e conectar ao banco de dados SQLite (arquivo 'ondetem.db')
const db = new sqlite3.Database(path.join(__dirname, 'ondetem.db'), (err) => {
    if (err) {
        console.error('Erro ao abrir o banco de dados:', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite com sucesso.');
    }
});

// Criar as tabelas e popular com os dados iniciais automaticamente se estiverem vazias
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS lojas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        endereco TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS produtos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        descricao TEXT,
        preco REAL NOT NULL,
        loja_id INTEGER,
        imagem_url TEXT,
        FOREIGN KEY (loja_id) REFERENCES lojas(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT,
        email TEXT UNIQUE NOT NULL,
        google_id TEXT UNIQUE
    )`);

    // Inserir dados iniciais apenas se a tabela de lojas estiver vazia
    db.get("SELECT COUNT(*) as count FROM lojas", (err, row) => {
        if (row && row.count === 0) {
            console.log('Populando banco de dados com dados iniciais...');
            
            const lojas = [
                ['Supermercado BomPreço', 'Av. Principal, 100'],
                ['Extra Hiper', 'Rodovia BR-070, 500'],
                ['Pão de Açúcar', 'Rua das Flores, 300'],
                ['Atacadão', 'Av. Industrial, 1500'],
                ['Carrefour Hiper', 'Shopping Center Local, Loja 1']
            ];

            const stmtLoja = db.prepare("INSERT INTO lojas (nome, endereco) VALUES (?, ?)");
            lojas.forEach(loja => stmtLoja.run(loja[0], loja[1]));
            stmtLoja.finalize();

            const produtos = [
                ['Leite Integral 1L', 'Caixa 1 Litro - Parmalat ou Itambé', 5.49, 1, 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=500&q=80'],
                ['Arroz Branco 5kg', 'Tipo 1 - Pacote de 5 quilos', 24.90, 4, 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=500&q=80'],
                ['Detergente Líquido 500ml', 'Neutro ou Limão - Ypê', 2.29, 2, 'https://images.unsplash.com/photo-1585837135231-d273a5f3f458?auto=format&fit=crop&w=500&q=80'],
                ['Açúcar Cristal 5kg', 'Refinado especial', 18.50, 5, 'https://images.unsplash.com/photo-1581441363689-1f3c3c62ba22?auto=format&fit=crop&w=500&q=80'],
                ['Café em Pó 500g', 'Torrado e moído - Melitta ou Pilão', 16.90, 3, 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=500&q=80']
            ];

            const stmtProd = db.prepare("INSERT INTO produtos (nome, descricao, preco, loja_id, imagem_url) VALUES (?, ?, ?, ?, ?)");
            produtos.forEach(prod => stmtProd.run(prod[0], prod[1], prod[2], prod[3], prod[4]));
            stmtProd.finalize();
        }
    });
});

// --- ROTA DA API ---
// O seu script.js vai chamar esse endereço para pegar os produtos do banco
app.get('/api/produtos', (req, res) => {
    const query = `
        SELECT 
            p.id, 
            p.nome, 
            p.descricao, 
            p.preco, 
            p.imagem_url AS imagem, 
            l.nome AS loja 
        FROM produtos p
        JOIN lojas l ON p.loja_id = l.id
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Iniciar o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
