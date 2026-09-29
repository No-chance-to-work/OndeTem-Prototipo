document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('search-input');
  const resultsContainer = document.getElementById('results-container');
  const cadastroForm = document.getElementById('cadastro-form');
  let debounceTimer;

  // Busca pública com Debounce (300ms)
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      const query = e.target.value.trim();

      debounceTimer = setTimeout(() => {
        carregarLocais(query);
      }, 300);
    });
  }

  async function carregarLocais(query = '') {
    try {
      const response = await fetch(`/api/locais?q=${encodeURIComponent(query)}`);
      const result = await response.json();

      if (result.success) {
        renderizarCartoes(result.data);
      }
    } catch (err) {
      exibirToast('Erro ao carregar locais.', 'error');
    }
  }

  function renderizarCartoes(locais) {
    if (!resultsContainer) return;
    resultsContainer.innerHTML = '';

    if (locais.length === 0) {
      resultsContainer.innerHTML = '<p class="no-results">Nenhum local ou serviço encontrado para os critérios pesquisados.</p>';
      return;
    }

    locais.forEach(local => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <h3>${local.nome}</h3>
        <span class="badge badge-${local.status.toLowerCase().replace(' ', '-')}">${local.status}</span>
        <p><strong>Categoria:</strong> ${local.categoria_nome || 'Geral'}</p>
        <p><strong>Endereço:</strong> ${local.endereco}</p>
        <p>${local.descricao || ''}</p>
        <p><strong>Contato:</strong> ${local.telefone || 'N/A'}</p>
      `;
      resultsContainer.appendChild(card);
    });
  }

  if (cadastroForm) {
    cadastroForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const payload = {
        nome: document.getElementById('nome').value.trim(),
        categoria_id: parseInt(document.getElementById('categoria_id').value),
        endereco: document.getElementById('endereco').value.trim(),
        descricao: document.getElementById('descricao').value.trim(),
        telefone: document.getElementById('telefone').value.trim()
      };

      try {
        const response = await fetch('/api/locais', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (result.success) {
          exibirToast('Cadastro submetido com sucesso e aguardando moderação!', 'success');
          cadastroForm.reset();
          carregarLocais();
        } else {
          exibirToast(result.error || 'Erro ao submeter cadastro.', 'error');
        }
      } catch (err) {
        exibirToast('Falha na comunicação com o servidor.', 'error');
      }
    });
  }

  // Exclusão Segura em Duas Etapas
  window.excluirRegistroComDuplaConfirmacao = async function(id) {
    const primeiraConfirmacao = confirm("Deseja realmente remover este registro?");
    if (!primeiraConfirmacao) return;

    const segundaConfirmacao = prompt("ATENÇÃO: Digite a palavra 'REMOVER' para confirmar a exclusão:");
    if (segundaConfirmacao !== 'REMOVER') {
      exibirToast("Texto de confirmação incorreto. Ação cancelada.", "error");
      return;
    }

    const token = localStorage.getItem('jwt_token');
    try {
      const response = await fetch(`/api/locais/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const result = await response.json();
      if (result.success) {
        exibirToast("Registro removido com sucesso!", "success");
        carregarLocais();
      } else {
        exibirToast(result.error || "Erro ao excluir registro.", "error");
      }
    } catch (err) {
      exibirToast("Erro de rede ao tentar excluir.", "error");
    }
  };

  function exibirToast(mensagem, tipo = 'info') {
    let toast = document.getElementById('toast-container');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast-container';
      document.body.appendChild(toast);
    }

    const toastItem = document.createElement('div');
    toastItem.className = `toast toast-${tipo}`;
    toastItem.innerText = mensagem;
    toast.appendChild(toastItem);

    setTimeout(() => {
      toastItem.remove();
    }, 4000);
  }

  carregarLocais();
});