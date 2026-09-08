const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// O Render vai ler a URL automaticamente da variável DATABASE_URL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Inicializar tabelas e dados
async function initDB() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS lojas (
                id SERIAL PRIMARY KEY,
                nome VARCHAR(255) NOT NULL,
                endereco TEXT
            );

            CREATE TABLE IF NOT EXISTS produtos (
                id SERIAL PRIMARY KEY,
                nome VARCHAR(255) NOT NULL,
                descricao TEXT,
                preco NUMERIC(10, 2) NOT NULL,
                loja_id INTEGER REFERENCES lojas(id),
                imagem_url TEXT
            );

            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                nome VARCHAR(255),
                email VARCHAR(255) UNIQUE NOT NULL,
                google_id VARCHAR(255) UNIQUE
            );
        `);

        const countRes = await pool.query('SELECT COUNT(*) FROM lojas');
        if (parseInt(countRes.rows[0].count) === 0) {
            console.log('Populando banco de dados com dados iniciais...');
            
            await pool.query(`
                INSERT INTO lojas (nome, endereco) VALUES 
                ('Supermercado BomPreço', 'Av. Principal, 100'),
                ('Extra Hiper', 'Rodovia BR-070, 500'),
                ('Pão de Açúcar', 'Rua das Flores, 300'),
                ('Atacadão', 'Av. Industrial, 1500'),
                ('Carrefour Hiper', 'Shopping Center Local, Loja 1');
            `);

            await pool.query(`
                INSERT INTO produtos (nome, descricao, preco, loja_id, imagem_url) VALUES 
                ('Leite Integral 1L', 'Caixa 1 Litro - Parmalat ou Itambé', 5.49, 1, 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=500&q=80'),
                ('Arroz Branco 5kg', 'Tipo 1 - Pacote de 5 quilos', 24.90, 4, 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=500&q=80'),
                ('Detergente Líquido 500ml', 'Neutro ou Limão - Ypê', 2.29, 2, 'https://images.unsplash.com/photo-1585837135231-d273a5f3f458?auto=format&fit=crop&w=500&q=80'),
                ('Açúcar Cristal 5kg', 'Refinado especial', 18.50, 5, 'https://images.unsplash.com/photo-1581441363689-1f3c3c62ba22?auto=format&fit=crop&w=500&q=80'),
                ('Café em Pó 500g', 'Torrado e moído - Melitta ou Pilão', 16.90, 3, 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=500&q=80');
            `);
        }
    } catch (err) {
        console.error('Erro ao inicializar o banco:', err.message);
    }
}

initDB();

// Rota da API
app.get('/api/produtos', async (req, res) => {
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
    
    try {
        const { rows } = await pool.query(query);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
