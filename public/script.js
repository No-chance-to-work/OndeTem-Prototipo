let lojaSelecionada = 'todas';

const imagemPorCategoria = {
    'leite': 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=200&auto=format&fit=crop&q=80',
    'arroz': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=200&auto=format&fit=crop&q=80',
    'detergente': 'https://images.unsplash.com/photo-1585832770485-e68a5fcfad52?w=200&auto=format&fit=crop&q=80',
    'café': 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=200&auto=format&fit=crop&q=80',
    'açúcar': 'https://images.unsplash.com/photo-1581441363689-1f3c3c414635?w=200&auto=format&fit=crop&q=80',
    'feijão': 'https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=200&auto=format&fit=crop&q=80',
    'óleo': 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=200&auto=format&fit=crop&q=80'
};

function obterImagemProduto(nome, marca) {
    const nomeLower = nome.toLowerCase();
    for (let chave in imagemPorCategoria) {
        if (nomeLower.includes(chave)) {
            return imagemPorCategoria[chave];
        }
    }
    
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
        <rect width="120" height="120" rx="12" fill="#055e4c"/>
        <circle cx="60" cy="50" r="28" fill="#00e676" opacity="0.2"/>
        <text x="50%" y="48%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="28" fill="#00e676">🛒</text>
        <text x="50%" y="82%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="bold" fill="#ffffff">${marca.toUpperCase()}</text>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

document.addEventListener('DOMContentLoaded', () => {
    buscarProdutosDoBanco();
});

async function buscarProdutosDoBanco() {
    const termoBusca = document.getElementById('searchInput')?.value.trim() || '';
    
    let url = `/api/produtos?loja=${encodeURIComponent(lojaSelecionada)}&busca=${encodeURIComponent(termoBusca)}`;

    try {
        const resposta = await fetch(url);
        const produtos = await resposta.json();
        renderizarProdutos(produtos);
    } catch (erro) {
        console.error('Erro ao conectar com o banco de dados:', erro);
    }
}

function renderizarProdutos(lista) {
    const grid = document.getElementById('productsGrid');
    const badgeCount = document.getElementById('productCount');
    
    grid.innerHTML = '';
    badgeCount.textContent = `${lista.length} produto${lista.length !== 1 ? 's' : ''}`;

    if (lista.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #a3c2b8; padding: 2rem;">Nenhum produto encontrado no banco de dados.</p>';
        return;
    }

    lista.forEach(produto => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.onclick = () => acaoBloqueada(`Visualizar produto: ${produto.nome}`);

        const imgUrl = obterImagemProduto(produto.nome, produto.marca);

        card.innerHTML = `
            <div class="product-img-wrapper">
                ${produto.esgotado ? '<span class="out-of-stock-badge">Esgotado</span>' : ''}
                <img src="${imgUrl}" alt="${produto.nome}" loading="lazy">
            </div>
            <div class="product-info">
                <h4>${produto.nome}</h4>
                <p class="product-brand">${produto.marca}</p>
                <p class="product-category">${produto.categoria}</p>
                <p class="product-price">R$ ${Number(produto.preco).toFixed(2).replace('.', ',')}</p>
            </div>
            <span class="store-name">🏬 ${produto.loja}</span>
        `;
        grid.appendChild(card);
    });
}

function filtrarProdutos() {
    buscarProdutosDoBanco();
}

function filtrarLoja(loja, elementoBtn) {
    lojaSelecionada = loja;

    document.querySelectorAll('.store-tags .tag').forEach(tag => tag.classList.remove('active'));
    if (elementoBtn) elementoBtn.classList.add('active');

    buscarProdutosDoBanco();
}

function acaoBloqueada(acao) {
    alert(`Ação bloqueada! Você precisa estar conectado para: "${acao}".`);
    abrirTelaLogin();
}

function abrirTelaLogin() {
    document.getElementById('loginView').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function fecharTelaLogin() {
    document.getElementById('loginView').classList.remove('active');
    document.body.style.overflow = 'auto';
}

async function realizarLogin(event) {
    event.preventDefault();
    const email = document.getElementById('email').value;

    try {
        const resposta = await fetch('/api/auth/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const dados = await resposta.json();
        
        if (resposta.ok) {
            alert(`Sucesso: ${dados.mensagem}`);
            fecharTelaLogin();
        }
    } catch (err) {
        alert('Erro ao realizar login no servidor.');
    }
}

async function handleCredentialResponse(response) {
    const data = parseJwt(response.credential);
    
    try {
        const resposta = await fetch('/api/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: data.email,
                nome: data.name
            })
        });

        const dados = await resposta.json();

        if (resposta.ok) {
            alert(`Bem-vindo, ${data.name}!`);
            fecharTelaLogin();
            document.querySelector('.auth-buttons').innerHTML = `
                <span style="color: #00e676; font-weight: 600;">👋 ${data.name}</span>
            `;
        } else {
            alert(dados.error || 'Erro ao autenticar com o Google.');
        }
    } catch (err) {
        console.error('Erro ao conectar com o servidor:', err);
    }
}

function parseJwt(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
}
