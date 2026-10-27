import { Router } from 'express';
import type { Request, Response } from 'express';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../config/database';
import type { Aluno, NovoAluno } from '../types/aluno';

const router = Router();

// Uma linha do driver também possui os campos definidos em Aluno.
interface AlunoRow extends RowDataPacket, Aluno {}

function emailValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function emailDuplicado(erro: unknown): boolean {
  return typeof erro === 'object' && erro !== null
    && 'code' in erro
    && erro.code === 'ER_DUP_ENTRY';
}

// POST /api/alunos: o navegador envia JSON com os três campos.
router.post('/alunos', async (req: Request, res: Response): Promise<void> => {
  const { nome, email, curso } = req.body ?? {};

  if (typeof nome !== 'string' || typeof email !== 'string'
      || typeof curso !== 'string') {
    res.status(400).json({ mensagem: 'Informe nome, e-mail e curso.' });
    return;
  }

  const novo: NovoAluno = {
    nome: nome.trim(),
    email: email.trim(),
    curso: curso.trim()
  };

  if (!novo.nome || !novo.curso || !emailValido(novo.email)
      || novo.nome.length > 120 || novo.email.length > 160
      || novo.curso.length > 120) {
    res.status(400).json({ mensagem: 'Preencha campos válidos, respeitando os limites.' });
    return;
  }

  try {
    // Cada ? recebe um valor separado: não concatenamos entrada no SQL.
    const [resultado] = await pool.execute<ResultSetHeader>(
      'INSERT INTO alunos (nome, email, curso) VALUES (?, ?, ?)',
      [novo.nome, novo.email, novo.curso]
    );
    res.status(201).json({
      mensagem: 'Aluno cadastrado.',
      aluno: { id: resultado.insertId, ...novo }
    });
  } catch (erro) {
    console.error('Erro ao cadastrar aluno:', erro);
    if (emailDuplicado(erro)) {
      res.status(409).json({ mensagem: 'Este e-mail já está cadastrado.' });
      return;
    }
    res.status(500).json({ mensagem: 'Não foi possível cadastrar o aluno.' });
  }
});

// GET /api/alunos ou /api/alunos?nome=Ana: filtro opcional.
router.get('/alunos', async (req: Request, res: Response): Promise<void> => {
  if (req.query.nome !== undefined && typeof req.query.nome !== 'string') {
    res.status(400).json({ mensagem: 'A busca por nome deve ser texto.' });
    return;
  }

  const nome = typeof req.query.nome === 'string' ? req.query.nome.trim() : '';
  if (nome.length > 120) {
    res.status(400).json({ mensagem: 'Busca muito longa.' });
    return;
  }

  try {
    // O valor buscado é parâmetro, nunca parte concatenada ao SQL.
    const [linhas] = nome
      ? await pool.execute<AlunoRow[]>(
          'SELECT id, nome, email, curso FROM alunos WHERE nome LIKE ? ORDER BY id DESC',
          ['%' + nome + '%']
        )
      : await pool.execute<AlunoRow[]>(
          'SELECT id, nome, email, curso FROM alunos ORDER BY id DESC'
        );
    res.status(200).json({ alunos: linhas });
  } catch (erro) {
    console.error('Erro ao consultar alunos:', erro);
    res.status(500).json({ mensagem: 'Não foi possível consultar os alunos.' });
  }
});

// DELETE /api/alunos/:id: valida antes de consultar o banco.
router.delete('/alunos/:id', async (req: Request, res: Response): Promise<void> => {
  const textoId = req.params.id;
  if (!/^[1-9]\d*$/.test(textoId)) {
    res.status(400).json({ mensagem: 'Identificador inválido.' });
    return;
  }

  const id = Number(textoId);
  if (!Number.isSafeInteger(id) || id > 4294967295) {
    res.status(400).json({ mensagem: 'Identificador inválido.' });
    return;
  }

  try {
    const [resultado] = await pool.execute<ResultSetHeader>(
      'DELETE FROM alunos WHERE id = ?',
      [id]
    );
    if (resultado.affectedRows === 0) {
      res.status(404).json({ mensagem: 'Aluno não encontrado.' });
      return;
    }
    res.status(200).json({ mensagem: 'Aluno excluído.' });
  } catch (erro) {
    console.error('Erro ao excluir aluno:', erro);
    res.status(500).json({ mensagem: 'Não foi possível excluir o aluno.' });
  }
});

export default router;
