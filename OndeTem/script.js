// Armazena a lista de produtos vinda da API
let produtosBD = [];

document.addEventListener('DOMContentLoaded', () => {
    buscarProdutosDoBanco();
});

// Busca os produtos no endpoint Node.js/PostgreSQL
async function buscarProdutosDoBanco() {
    try {
        const resposta = await fetch('/api/produtos');
        if (!resposta.ok) throw new Error('Erro ao carregar produtos');
        
        produtosBD = await resposta.json();
        carregarProdutos(produtosBD);
    } catch (erro) {
        console.error('Erro na API:', erro);
        const grid = document.getElementById('productsGrid');
        if (grid) grid.innerHTML = '<p>Erro ao carregar dados do servidor.</p>';
    }
}

function carregarProdutos(lista) {
    const grid = document.getElementById('productsGrid');
    const badgeCount = document.getElementById('productCount');
    grid.innerHTML = '';
    
    badgeCount.textContent = `${lista.length} produtos`;

    if (lista.length === 0) {
        grid.innerHTML = '<p>Nenhum produto encontrado.</p>';
        return;
    }

    lista.forEach(produto => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.onclick = () => acaoBloqueada(`Visualizar produto: ${produto.nome}`);

        // O backend retorna `imagem` (imagem_url) e `loja` via JOIN
        const imagemUrl = produto.imagem || 'https://via.placeholder.com/150';
        const precoFormatado = Number(produto.preco).toFixed(2).replace('.', ',');

        card.innerHTML = `
            <div class="product-img-wrapper">
                <img src="${imagemUrl}" alt="${produto.nome}">
            </div>
            <div class="product-info">
                <h4>${produto.nome}</h4>
                <p class="product-category">${produto.descricao || ''}</p>
                <p class="product-price">R$ ${precoFormatado}</p>
            </div>
            <span class="store-name">🏬 ${produto.loja}</span>
        `;
        grid.appendChild(card);
    });
}

function filtrarProdutos() {
    const texto = document.getElementById('searchInput').value.toLowerCase();
    const filtrados = produtosBD.filter(p => 
        p.nome.toLowerCase().includes(texto) || 
        (p.descricao && p.descricao.toLowerCase().includes(texto)) ||
        (p.loja && p.loja.toLowerCase().includes(texto))
    );
    carregarProdutos(filtrados);
}

function filtrarLoja(loja, elementoBtn) {
    document.querySelectorAll('.store-tags .tag').forEach(tag => tag.classList.remove('active'));
    elementoBtn.classList.add('active');

    if (loja === 'todas') {
        carregarProdutos(produtosBD);
    } else {
        const filtrados = produtosBD.filter(p => p.loja === loja);
        carregarProdutos(filtrados);
    }
}

function acaoBloqueada(acao) {
    alert(`Ação bloqueada! Você precisa estar conectado para: "${acao}". Redirecionando para a tela de login...`);
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

function realizarLogin(event) {
    event.preventDefault();
    const email = document.getElementById('email').value;

    if (email) {
        alert(`Login efetuado com sucesso para o email: ${email}`);
        fecharTelaLogin();
    }
}

function autenticarGoogle() {
    alert('Autenticação via Google realizada com sucesso!');
    fecharTelaLogin();
}
