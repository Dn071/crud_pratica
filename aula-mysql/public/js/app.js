"use strict";
// Seletores tipados facilitam encontrar erros ainda na compilação.
const formulario = document.querySelector('#form-cadastro');
const busca = document.querySelector('#form-busca');
const campoNome = document.querySelector('#nome');
const campoEmail = document.querySelector('#email');
const campoCurso = document.querySelector('#curso');
const campoBusca = document.querySelector('#busca-nome');
const corpo = document.querySelector('#lista-alunos');
const mensagem = document.querySelector('#mensagem');
const estadoLista = document.querySelector('#estado-lista');
const confirmacao = document.querySelector('#confirmacao');
const confirmar = document.querySelector('#confirmar-exclusao');
let idPendente = null;
let numeroConsulta = 0;
function mostrar(elemento, texto, tipo) {
    elemento.textContent = texto;
    elemento.className = `mensagem ${tipo}`;
}
async function lerResposta(resposta) {
    let dados;
    try {
        dados = (await resposta.json());
    }
    catch {
        throw new Error('Resposta inesperada do servidor.');
    }
    if (!resposta.ok) {
        throw new Error(dados.mensagem || `Erro HTTP ${resposta.status}.`);
    }
    return dados;
}
function renderizarAlunos(alunos) {
    corpo.replaceChildren();
    for (const aluno of alunos) {
        const linha = document.createElement('tr');
        for (const valor of [aluno.id, aluno.nome, aluno.email, aluno.curso]) {
            const celula = document.createElement('td');
            celula.textContent = String(valor);
            linha.append(celula);
        }
        const acoes = document.createElement('td');
        const botao = document.createElement('button');
        botao.type = 'button';
        botao.className = 'perigo';
        botao.textContent = 'Excluir';
        botao.dataset.id = String(aluno.id);
        botao.setAttribute('aria-label', `Excluir ${aluno.nome}`);
        acoes.append(botao);
        linha.append(acoes);
        corpo.append(linha);
    }
    mostrar(estadoLista, alunos.length ? `${alunos.length} aluno(s) encontrado(s).` : 'Nenhum registro encontrado.', 'aviso');
}
async function carregarAlunos(nome) {
    const consultaAtual = ++numeroConsulta;
    mostrar(estadoLista, 'Carregando alunos...', 'aviso');
    const url = nome ? `/api/alunos?nome=${encodeURIComponent(nome)}` : '/api/alunos';
    try {
        const resposta = await fetch(url); // GET, com filtro opcional.
        const dados = await lerResposta(resposta);
        if (consultaAtual === numeroConsulta)
            renderizarAlunos(dados.alunos ?? []);
    }
    catch (erro) {
        if (consultaAtual === numeroConsulta) {
            mostrar(estadoLista, erro instanceof Error ? erro.message : 'Falha de rede.', 'erro');
        }
    }
}
formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const nome = campoNome.value.trim();
    const email = campoEmail.value.trim();
    const curso = campoCurso.value.trim();
    if (!nome || !curso || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        mostrar(mensagem, 'Informe nome, e-mail válido e curso.', 'erro');
        return;
    }
    const botao = evento.submitter;
    if (botao)
        botao.disabled = true;
    try {
        const resposta = await fetch('/api/alunos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, email, curso })
        });
        const dados = await lerResposta(resposta);
        mostrar(mensagem, dados.mensagem ?? 'Aluno cadastrado.', 'sucesso');
        formulario.reset();
        await carregarAlunos(campoBusca.value.trim());
    }
    catch (erro) {
        mostrar(mensagem, erro instanceof Error ? erro.message : 'Falha de rede.', 'erro');
    }
    finally {
        if (botao)
            botao.disabled = false;
    }
});
busca.addEventListener('submit', (evento) => {
    evento.preventDefault();
    void carregarAlunos(campoBusca.value.trim());
});
document.querySelector('#limpar-busca')
    .addEventListener('click', () => {
    campoBusca.value = '';
    void carregarAlunos();
});
corpo.addEventListener('click', (evento) => {
    const alvo = evento.target;
    if (!(alvo instanceof HTMLElement))
        return;
    const botao = alvo.closest('button[data-id]');
    if (!botao)
        return;
    const id = Number(botao.dataset.id);
    if (!Number.isSafeInteger(id) || id < 1)
        return;
    idPendente = id;
    confirmacao.hidden = false;
    confirmar.focus();
});
document.querySelector('#cancelar-exclusao')
    .addEventListener('click', () => {
    idPendente = null;
    confirmacao.hidden = true;
});
confirmar.addEventListener('click', async (evento) => {
    if (idPendente === null)
        return;
    const id = idPendente;
    const botao = evento.currentTarget;
    botao.disabled = true;
    try {
        const resposta = await fetch(`/api/alunos/${id}`, { method: 'DELETE' });
        const dados = await lerResposta(resposta);
        mostrar(mensagem, dados.mensagem ?? 'Aluno excluído.', 'sucesso');
        idPendente = null;
        confirmacao.hidden = true;
        await carregarAlunos(campoBusca.value.trim());
    }
    catch (erro) {
        mostrar(mensagem, erro instanceof Error ? erro.message : 'Falha de rede.', 'erro');
    }
    finally {
        botao.disabled = false;
    }
});
void carregarAlunos();
