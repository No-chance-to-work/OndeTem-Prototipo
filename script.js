function gerarImagemSVG(nome, corFundo = "#e2e8f0", corTexto = "#475569") {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
        <rect width="100" height="100" fill="${corFundo}"/>
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="bold" fill="${corTexto}">${nome}</text>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const produtosBD = [
    {
        id: 1,
        nome: "Leite Integral Italac",
        marca: "Italac",
        categoria: "Laticínios",
        preco: 4.99,
        loja: "Supermercado BomPreço",
        imagem: gerarImagemSVG("Italac", "#f1f5f9", "#1e293b"),
        esgotado: false
    },
    {
        id: 2,
        nome: "Arroz Branco Camil",
        marca: "Camil",
        categoria: "Grãos e Cereais",
        preco: 22.90,
        loja: "Supermercado BomPreço",
        imagem: gerarImagemSVG("Camil", "#fef3c7", "#78350f"),
        esgotado: false
    },
    {
        id: 3,
        nome: "Feijão Carioca Camil",
        marca: "Camil",
        categoria: "Grãos e Cereais",
        preco: 8.49,
        loja: "Supermercado BomPreço",
        imagem: gerarImagemSVG("Camil", "#fee2e2", "#991b1b"),
        esgotado: false
    },
    {
        id: 4,
        nome: "Óleo de Soja Liza",
        marca: "Liza",
        categoria: "Óleos e Gorduras",
        preco: 5.89,
        loja: "Supermercado BomPreço",
        imagem: gerarImagemSVG("Liza", "#fef9c3", "#854d0e"),
        esgotado: false
    },
    {
        id: 5,
        nome: "Café Pilão Torrado e Moído",
        marca: "Pilão",
        categoria: "Bebidas",
        preco: 14.99,
        loja: "Supermercado BomPreço",
        imagem: gerarImagemSVG("Pilão", "#e7e5e4", "#292524"),
        esgotado: false
    },
    {
        id: 6,
        nome: "Sabão em Pó OMO",
        marca: "OMO",
        categoria: "Limpeza",
        preco: 32.90,
        loja: "Supermercado BomPreço",
        imagem: gerarImagemSVG("OMO", "#dbeafe", "#1e40af"),
        esgotado: true
    },
    {
        id: 7,
        nome: "Leite Integral Italac",
        marca: "Italac",
        categoria: "Laticínios",
        preco: 4.79,
        loja: "Extra Hiper",
        imagem: gerarImagemSVG("Italac", "#f1f5f9", "#1e293b"),
        esgotado: false
    },
    {
        id: 8,
        nome: "Arroz Branco Camil",
        marca: "Camil",
        categoria: "Grãos e Cereais",
        preco: 21.50,
        loja: "Extra Hiper",
        imagem: gerarImagemSVG("Camil", "#fef3c7", "#78350f"),
        esgotado: false
    },
    {
        id: 9,
        nome: "Macarrão Penne Barilla",
        marca: "Barilla",
        categoria: "Massas e Farinhas",
        preco: 6.99,
        loja: "Extra Hiper",
        imagem: gerarImagemSVG("Barilla", "#ffedd5", "#c2410c"),
        esgotado: false
    }
];

document.addEventListener('DOMContentLoaded', () => {
    carregarProdutos(produtosBD);
});

function carregarProdutos(lista) {
    const grid = document.getElementById('productsGrid');
    const badgeCount = document.getElementById('productCount');
    grid.innerHTML = '';
    
    badgeCount.textContent = `${lista.length} produtos`;

    lista.forEach(produto => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.onclick = () => acaoBloqueada(`Visualizar produto: ${produto.nome}`);

        card.innerHTML = `
            <div class="product-img-wrapper">
                ${produto.esgotado ? '<span class="out-of-stock-badge">Esgotado</span>' : ''}
                <img src="${produto.imagem}" alt="${produto.nome}">
            </div>
            <div class="product-info">
                <h4>${produto.nome}</h4>
                <p class="product-brand">${produto.marca}</p>
                <p class="product-category">${produto.categoria}</p>
                <p class="product-price">R$ ${produto.preco.toFixed(2)}</p>
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
        p.categoria.toLowerCase().includes(texto) ||
        p.marca.toLowerCase().includes(texto)
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
