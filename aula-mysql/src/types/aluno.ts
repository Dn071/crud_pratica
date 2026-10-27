// Contrato de uma linha retornada pela tabela alunos.
export interface Aluno {
  id: number;       // Identificador criado pelo MySQL.
  nome: string;     // Nome exibido na interface.
  email: string;    // E-mail único do aluno.
  curso: string;    // Curso informado no cadastro.
}

// Dados necessários antes de existir um identificador.
export interface NovoAluno {
  nome: string;
  email: string;
  curso: string;
}
