
interface Aluno {
  id: number;
  nome: string;
  email: string;
  curso: string;
}
interface RespostaApi {
  mensagem?: string;
  aluno?: Aluno;
  alunos?: Aluno[];
}
type TipoMensagem = 'sucesso' | 'erro' | 'aviso';

// Seletores tipados facilitam encontrar erros ainda na compilação.
const formulario = document.querySelector<HTMLFormElement>('#form-cadastro')!;
const busca = document.querySelector<HTMLFormElement>('#form-busca')!;
const campoNome = document.querySelector<HTMLInputElement>('#nome')!;
const campoEmail = document.querySelector<HTMLInputElement>('#email')!;
const campoCurso = document.querySelector<HTMLInputElement>('#curso')!;
const campoBusca = document.querySelector<HTMLInputElement>('#busca-nome')!;
const corpo = document.querySelector<HTMLTableSectionElement>('#lista-alunos')!;
const mensagem = document.querySelector<HTMLParagraphElement>('#mensagem')!;
const estadoLista = document.querySelector<HTMLParagraphElement>('#estado-lista')!;
const confirmacao = document.querySelector<HTMLDivElement>('#confirmacao')!;
const confirmar = document.querySelector<HTMLButtonElement>('#confirmar-exclusao')!;
let idPendente: number | null = null;
let numeroConsulta = 0;

function mostrar(elemento: HTMLParagraphElement, texto: string, tipo: TipoMensagem): void {
  elemento.textContent = texto;
  elemento.className = `mensagem ${tipo}`;
}

async function lerResposta(resposta: Response): Promise<RespostaApi> {
  let dados: RespostaApi;
  try {
    dados = (await resposta.json()) as RespostaApi;
  } catch {
    throw new Error('Resposta inesperada do servidor.');
  }
  if (!resposta.ok) {
    throw new Error(dados.mensagem || `Erro HTTP ${resposta.status}.`);
  }
  return dados;
}

function renderizarAlunos(alunos: Aluno[]): void {
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
  mostrar(
    estadoLista,
    alunos.length ? `${alunos.length} aluno(s) encontrado(s).` : 'Nenhum registro encontrado.',
    'aviso'
  );
}

async function carregarAlunos(nome?: string): Promise<void> {
  const consultaAtual = ++numeroConsulta;
  mostrar(estadoLista, 'Carregando alunos...', 'aviso');
  const url = nome ? `/api/alunos?nome=${encodeURIComponent(nome)}` : '/api/alunos';
  try {
    const resposta = await fetch(url); // GET, com filtro opcional.
    const dados = await lerResposta(resposta);
    if (consultaAtual === numeroConsulta) renderizarAlunos(dados.alunos ?? []);
  } catch (erro) {
    if (consultaAtual === numeroConsulta) {
      mostrar(estadoLista, erro instanceof Error ? erro.message : 'Falha de rede.', 'erro');
    }
  }
}


formulario.addEventListener('submit', async (evento: SubmitEvent) => {
  evento.preventDefault();
  const nome = campoNome.value.trim();
  const email = campoEmail.value.trim();
  const curso = campoCurso.value.trim();
  if (!nome || !curso || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    mostrar(mensagem, 'Informe nome, e-mail válido e curso.', 'erro');
    return;
  }

  const botao = evento.submitter as HTMLButtonElement | null;
  if (botao) botao.disabled = true;
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
  } catch (erro) {
    mostrar(mensagem, erro instanceof Error ? erro.message : 'Falha de rede.', 'erro');
  } finally {
    if (botao) botao.disabled = false;
  }
});

busca.addEventListener('submit', (evento: SubmitEvent) => {
  evento.preventDefault();
  void carregarAlunos(campoBusca.value.trim());
});
document.querySelector<HTMLButtonElement>('#limpar-busca')!
  .addEventListener('click', () => {
    campoBusca.value = '';
    void carregarAlunos();
  });


corpo.addEventListener('click', (evento: MouseEvent) => {
  const alvo = evento.target;
  if (!(alvo instanceof HTMLElement)) return;
  const botao = alvo.closest<HTMLButtonElement>('button[data-id]');
  if (!botao) return;
  const id = Number(botao.dataset.id);
  if (!Number.isSafeInteger(id) || id < 1) return;
  idPendente = id;
  confirmacao.hidden = false;
  confirmar.focus();
});

document.querySelector<HTMLButtonElement>('#cancelar-exclusao')!
  .addEventListener('click', () => {
    idPendente = null;
    confirmacao.hidden = true;
  });

confirmar.addEventListener('click', async (evento: MouseEvent) => {
  if (idPendente === null) return;
  const id = idPendente;
  const botao = evento.currentTarget as HTMLButtonElement;
  botao.disabled = true;
  try {
    const resposta = await fetch(`/api/alunos/${id}`, { method: 'DELETE' });
    const dados = await lerResposta(resposta);
    mostrar(mensagem, dados.mensagem ?? 'Aluno excluído.', 'sucesso');
    idPendente = null;
    confirmacao.hidden = true;
    await carregarAlunos(campoBusca.value.trim());
  } catch (erro) {
    mostrar(mensagem, erro instanceof Error ? erro.message : 'Falha de rede.', 'erro');
  } finally {
    botao.disabled = false;
  }
});

void carregarAlunos();
