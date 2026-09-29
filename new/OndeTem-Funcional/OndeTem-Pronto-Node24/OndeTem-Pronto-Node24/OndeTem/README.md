# OndeTem - versão funcional

Protótipo funcional com Node.js nativo + SQLite, sem `npm install`.

## Rodar

```bash
node server.js
```

Abra: http://localhost:3000

## Conta administrativa local

- E-mail: `admin@ondetem.local`
- Senha: `Admin@123`

Para trocar em produção, defina `ADMIN_EMAIL` e `ADMIN_PASSWORD` antes de iniciar o servidor. As senhas são armazenadas com scrypt + salt aleatório.

## Funcionalidades

- Busca de produtos e lojas
- Cadastro de usuário
- Login e logout com cookie HTTP-Only
- Senha com hash scrypt
- Perfil `usuario` e `admin`
- Painel administrativo
- Cadastro, exclusão e alteração de status de produtos
- SQLite com prepared statements, constraints e índices
- Proteção básica contra XSS no frontend por escape de HTML

O projeto continua propositalmente sem dependências externas para funcionar no Node.js 22+ / 24.
