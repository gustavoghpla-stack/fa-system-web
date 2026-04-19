import { useState } from 'react';
import { DB, nextId, syncGS, isDemitido, type BancoRegistro, type Funcionario, logAcesso } from '@/lib/db';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader, TableWrapper, Th, Td, Badge, Btn, Modal, FormCard, Field, Input, Select , ConfirmModal } from '@/components/ui-custom';

export default function BancosPage() {
  const { session } = useAuth();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const funcs = DB.get<Funcionario>('func');
  const demitidosIds = new Set(funcs.filter(isDemitido).map(f => f.id));

  const list = DB.get<BancoRegistro>('bancos').filter(b => {
    if (demitidosIds.has(b.funcId)) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return b.funcNome?.toLowerCase().includes(q) || b.banco?.toLowerCase().includes(q) || b.chavepix?.toLowerCase().includes(q);
  });

  const del = (id: number) => {
    DB.set('bancos', DB.get<BancoRegistro>('bancos').filter(x => x.id !== id));
    logAcesso('Excluiu banco/PIX ID ' + id, session!.name, session!.user);
    syncGS(true);
    refresh();
  };

  return (
    <>
      <PageHeader title="Bancos / PIX por Funcionário" icon="🏦">
        <Btn variant="outline" onClick={() => syncGS()}>📤 Sincronizar Agora</Btn>
        <Btn onClick={() => { setEditId(null); setModalOpen(true); }}>➕ Novo Registro</Btn>
      </PageHeader>
      <div className="flex-1 overflow-y-auto p-5">
        <TableWrapper searchValue={search} onSearch={setSearch} searchPlaceholder="🔍 Buscar..." count={list.length + ' registro(s)'}>
          <thead><tr><Th>Funcionário</Th><Th>Banco</Th><Th>Agência</Th><Th>Conta</Th><Th>Tipo</Th><Th>Chave PIX</Th><Th>Tipo PIX</Th><Th>Ações</Th></tr></thead>
          <tbody>
            {list.map(b => (
              <tr key={b.id} className="hover:bg-gold-glow transition-colors">
                <Td className="font-bold">{b.funcNome || '—'}</Td>
                <Td>{b.banco}</Td><Td>{b.agencia || '—'}</Td><Td>{b.conta || '—'}</Td>
                <Td><Badge variant="info">{b.tipo || '—'}</Badge></Td>
                <Td className="font-bold text-primary">{b.chavepix}</Td>
                <Td><Badge>{b.tipopix || '—'}</Badge></Td>
                <Td>
                  <div className="flex gap-1">
                    <Btn size="sm" variant="outline" onClick={() => { setEditId(b.id); setModalOpen(true); }}>✏️</Btn>
                    <Btn size="sm" variant="danger" onClick={() => setConfirmDeleteId(b.id)}>🗑</Btn>
                  </div>
                </Td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan={8} className="text-center text-muted-foreground p-5">Nenhum registro</td></tr>}
          </tbody>
        </TableWrapper>
      </div>
      {modalOpen && <BancoModal editId={editId} onClose={() => { setModalOpen(false); refresh(); }} session={session!} />}
      <ConfirmModal
        open={confirmDeleteId !== null}
        title="Excluir Banco/PIX"
        message="Este registro bancário será removido do sistema e da planilha."
        confirmLabel="Excluir"
        onConfirm={() => { if (confirmDeleteId !== null) { del(confirmDeleteId); setConfirmDeleteId(null); } }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </>
  );
}