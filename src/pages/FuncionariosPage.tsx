import { useState, useCallback } from 'react';
import { DB, nextId, fmtDate, syncGS, loadFromGS, type Funcionario, UF_OPTIONS, type Escala } from '@/lib/db';
import { useAuth } from '@/contexts/AuthContext';
import { logAcesso } from '@/lib/db';
import { PageHeader, StatCard, TableWrapper, Th, Td, Badge, Btn, Modal, FormCard, Field, Input, Select, CurrencyInput, ConfirmModal } from '@/components/ui-custom';
import { printFuncionarioPDF, printListaFuncionarios } from '@/lib/pdfFuncionario';

export default function FuncionariosPage() {
  const { session } = useAuth();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const allFunc = DB.get<Funcionario>('func');
  // Esconde demitidos do cadastro principal — eles ficam apenas no Relatório > Demitidos
  const ativosFunc = allFunc.filter(f => !f.demissao);
  const filtered = ativosFunc.filter(f => {
    if (!search) return true;
    const q = search.toLowerCase();
    return f.nome?.toLowerCase().includes(q) || f.cpf?.includes(q) || f.funcao?.toLowerCase().includes(q) || f.cel?.includes(q);
  }).sort((a, b) => a.nome?.localeCompare(b.nome));

  const ativos = ativosFunc.length;
  const demitidos = allFunc.filter(f => f.demissao).length;
  const hoje = new Date();
  const aniv = allFunc.filter(f => {
    if (!f.nasc) return false;
    return new Date(f.nasc).getMonth() === hoje.getMonth();
  }).length;

  const openNew = () => { setEditId(null); setModalOpen(true); };
  const openEdit = (id: number) => { setEditId(id); setModalOpen(true); };

  const deleteFunc = (id: number) => {
    if (!confirm('Excluir este funcionário? Será removido também da planilha.')) return;
    DB.set('func', DB.get<Funcionario>('func').filter(x => x.id !== id));
    logAcesso('Excluiu funcionário ID ' + id, session!.name, session!.user);
    syncGS(true); // sync imediato (além do auto-sync agendado)
    refresh();
  };

  return (
    <>
      <PageHeader title="Cadastro de Funcionários" icon="👤">
        <Btn variant="outline" onClick={() => syncGS()}>📤 Enviar para Planilha</Btn>
        <Btn variant="outline" onClick={() => loadFromGS()}>📥 Carregar da Planilha</Btn>
        <Btn variant="outline" onClick={() => printListaFuncionarios(filtered)}>🖨️ Imprimir Lista</Btn>
        <Btn onClick={openNew}>➕ Novo Funcionário</Btn>
      </PageHeader>
      <div className="flex-1 overflow-y-auto p-5">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-2.5 mb-4">
          <StatCard value={allFunc.length} label="Total" />
          <StatCard value={ativos} label="Ativos" color="text-success" />
          <StatCard value={demitidos} label="Demitidos" color="text-destructive" />
          <StatCard value={aniv} label="Aniversários este mês" />
        </div>

        <TableWrapper searchValue={search} onSearch={setSearch} searchPlaceholder="🔍 Buscar por nome, CPF, função..." count={filtered.length + ' registro(s)'}>
          <thead>
            <tr><Th>ID</Th><Th>Nome</Th><Th>CPF</Th><Th>Nascimento</Th><Th>Função</Th><Th>Celular</Th><Th>Admissão</Th><Th>Situação</Th><Th>Ações</Th></tr>
          </thead>
          <tbody>
            {filtered.map(f => (
              <tr key={f.id} className="cursor-pointer transition-colors hover:bg-gold-glow">
                <Td><Badge>{f.id}</Badge></Td>
                <Td className="font-bold">{f.nome}</Td>
                <Td>{f.cpf || '—'}</Td>
                <Td>{fmtDate(f.nasc)}</Td>
                <Td>{f.funcao || '—'}</Td>
                <Td>{f.cel || '—'}</Td>
                <Td>{fmtDate(f.admissao)}</Td>
                <Td><Badge variant={f.demissao ? 'danger' : 'success'}>{f.demissao ? 'Demitido' : 'Ativo'}</Badge></Td>
                <Td>
                  <div className="flex gap-1">
                    <Btn size="sm" variant="outline" onClick={() => printFuncionarioPDF(f)}>🖨️</Btn>
                    <Btn size="sm" variant="outline" onClick={() => openEdit(f.id)}>✏️</Btn>
                    <Btn size="sm" variant="danger" onClick={() => setConfirmDeleteId(f.id)}>🗑</Btn>
                  </div>
                </Td>
              </tr>
            ))}
            {!filtered.length && (
              <tr><td colSpan={9} className="text-center text-muted-foreground p-5">Nenhum funcionário cadastrado</td></tr>
            )}
          </tbody>
        </TableWrapper>
      </div>

      {modalOpen && (
        <FuncModal
          editId={editId}
          onClose={() => { setModalOpen(false); refresh(); }}
          session={session!}
        />
      )}
      <ConfirmModal
        open={confirmDeleteId !== null}
        title="Excluir Funcionário"
        message="Este funcionário será removido do sistema e da planilha Google. Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        onConfirm={() => { if (confirmDeleteId !== null) { deleteFunc(confirmDeleteId); setConfirmDeleteId(null); } }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </>
  );
}