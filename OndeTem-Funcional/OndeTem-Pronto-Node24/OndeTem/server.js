const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./database/init');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'secreto_ondetem_2026';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Middlewares de Autenticação
function authJWTMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Acesso negado. Token não fornecido.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ success: false, error: 'Token inválido ou expirado.' });
    req.user = user;
    next();
  });
}

function checkRole(roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.perfil)) {
      return res.status(403).json({ success: false, error: 'Permissão insuficiente.' });
    }
    next();
  };
}

// GET /api/locais - Pesquisa pública
app.get('/api/locais', (req, res) => {
  const { q, categoria_id, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  let query = `
    SELECT l.*, c.nome as categoria_nome 
    FROM locais l 
    JOIN categorias c ON l.categoria_id = c.id 
    WHERE 1=1
  `;
  const params = [];

  if (q) {
    query += ` AND (l.nome LIKE ? OR l.descricao LIKE ?)`;
    params.push(`%${q}%`, `%${q}%`);
  }

  if (categoria_id) {
    query += ` AND l.categoria_id = ?`;
    params.push(categoria_id);
  }

  query += ` ORDER BY l.created_at DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), parseInt(offset));

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, data: rows });
  });
});

// POST /api/locais - Cadastro público
app.post('/api/locais', (req, res) => {
  const { nome, categoria_id, endereco, descricao, telefone, email_contato } = req.body;

  if (!nome || !categoria_id || !endereco) {
    return res.status(400).json({ success: false, error: 'Campos obrigatórios ausentes.' });
  }

  const sql = `
    INSERT INTO locais (nome, categoria_id, endereco, descricao, telefone, email_contato, status)
    VALUES (?, ?, ?, ?, ?, ?, 'Pendente')
  `;
  
  db.run(sql, [nome, categoria_id, endereco, descricao, telefone, email_contato], function(err) {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.status(201).json({ success: true, id: this.lastID, message: 'Local cadastrado e aguardando moderação.' });
  });
});

// POST /api/auth/login - Login administrativo
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  db.get(`SELECT * FROM usuarios WHERE email = ? AND ativo = 1`, [email], async (err, user) => {
    if (err || !user) return res.status(401).json({ success: false, error: 'Credenciais inválidas.' });

    const validPassword = await bcrypt.compare(password, user.senha_hash);
    if (!validPassword) return res.status(401).json({ success: false, error: 'Credenciais inválidas.' });

    const token = jwt.sign(
      { id: user.id, email: user.email, perfil: user.perfil },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      success: true,
      token,
      user: { id: user.id, nome: user.nome, perfil: user.perfil }
    });
  });
});

// PATCH /api/locais/:id/status - Alteração de status (Protegida)
app.patch('/api/locais/:id/status', authJWTMiddleware, checkRole(['OPERADOR', 'ADMIN']), (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['Pendente', 'Em Andamento', 'Concluido', 'Inativo'];
  if (!validStatuses.includes(status)) {
    return res.status(422).json({ success: false, error: 'Status de transição inválido.' });
  }

  const sql = `UPDATE locais SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
  db.run(sql, [status, id], function(err) {
    if (err) return res.status(500).json({ success: false, error: err.message });
    if (this.changes === 0) return res.status(404).json({ success: false, error: 'Registro não encontrado.' });

    // Auditoria
    db.run(
      `INSERT INTO audit_logs (usuario_id, acao, entidade, entidade_id, detalhes) VALUES (?, 'STATUS_UPDATE', 'locais', ?, ?)`,
      [req.user.id, id, `Status alterado para ${status}`]
    );

    res.json({ success: true, message: 'Status atualizado com sucesso.' });
  });
});

// DELETE /api/locais/:id - Exclusão segura (Protegida Admin)
app.delete('/api/locais/:id', authJWTMiddleware, checkRole(['ADMIN']), (req, res) => {
  const { id } = req.params;

  db.run(`DELETE FROM locais WHERE id = ?`, [id], function(err) {
    if (err) return res.status(500).json({ success: false, error: err.message });
    if (this.changes === 0) return res.status(404).json({ success: false, error: 'Registro não encontrado.' });

    // Auditoria
    db.run(
      `INSERT INTO audit_logs (usuario_id, acao, entidade, entidade_id, detalhes) VALUES (?, 'DELETE', 'locais', ?, 'Registro excluído')`,
      [req.user.id, id]
    );

    res.json({ success: true, message: 'Registro excluído com sucesso.' });
  });
});

app.listen(PORT, () => {
  console.log(`Servidor OndeTem rodando na porta ${PORT}`);
});