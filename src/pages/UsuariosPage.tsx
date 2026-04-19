import { useState } from 'react';
import { DB, nextId, hashPassword, isPasswordHash, syncGS, type Usuario, logAcesso } from '@/lib/db';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader, TableWrapper, Th, Td, Badge, Btn, Modal, FormCard, Field, Input , ConfirmModal } from '@/components/ui-custom';

const CARGOS_PREDEFINIDOS = ['Operador', 'Estoquista', 'Administrador'];

export default function UsuariosPage() {
  const { session } = useAuth();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const isMaster = session?.nivel === 'Master';

  const list = DB.get<Usuario>('users').filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return u.nome?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
  });

  const del = (id: number) => {
    DB.set('users', DB.get<Usuario>('users').filter(x => x.id !== id));
    logAcesso('Excluiu usuário ID ' + id, session!.name, session!.user);
    syncGS(true); // sync imediato além do auto-sync de 800ms
    refresh();
  };

  return (
    <>
      <PageHeader title="Usuários do Sistema" icon="👥">
        <Btn onClick={() => { setEditId(null); setModalOpen(true); }}>➕ Novo Usuário</Btn>
      </PageHeader>
      <div className="flex-1 overflow-y-auto p-5">
        <div className="bg-secondary border border-border rounded-xl px-4 py-2.5 mb-4 text-[10px] text-muted-foreground">
          ℹ️ O <b className="text-foreground">Cargo</b> é apenas informativo e não controla permissões.
          O acesso a cada módulo é gerenciado em <b className="text-primary">Configurações → Permissões</b>.
          Por padrão, todo usuário tem acesso a todos os módulos.
        </div>
        <TableWrapper searchValue={search} onSearch={setSearch} searchPlaceholder="🔍 Buscar usuário..." count={list.length + ' usuário(s)'}>
          <thead><tr><Th>ID</Th><Th>Foto</Th><Th>Nome</Th><Th>E-mail</Th><Th>Cargo</Th><Th>Cadastrado</Th><Th>Ações</Th></tr></thead>
          <tbody>
            {list.map(u => (
              <tr key={u.id} className="hover:bg-gold-glow transition-colors">
                <Td><Badge>{u.id}</Badge></Td>
                <Td>
                  <div className="w-7 h-7 rounded-full bg-gold-deep flex items-center justify-center text-[10px] font-bold text-primary-foreground overflow-hidden">
                    {u.foto ? <img src={u.foto} className="w-full h-full object-cover" alt="" /> : u.nome?.[0]?.toUpperCase()}
                  </div>
                </Td>
                <Td className="font-bold">{u.nome}</Td>
                <Td>{u.email}</Td>
                <Td><Badge variant="info">{u.nivel}</Badge></Td>
                <Td>{u.cadastrado || '—'}</Td>
                <Td>
                  <div className="flex gap-1">
                    <Btn size="sm" variant="outline" onClick={() => { setEditId(u.id); setModalOpen(true); }}>✏️</Btn>
                    <Btn size="sm" variant="danger" onClick={() => setConfirmDeleteId(u.id)}>🗑</Btn>
                  </div>
                </Td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan={7} className="text-center text-muted-foreground p-5">Nenhum usuário</td></tr>}
          </tbody>
        </TableWrapper>
      </div>
      {modalOpen && <UserModal editId={editId} onClose={() => { setModalOpen(false); refresh(); }} session={session!} isMaster={isMaster} />}
      <ConfirmModal
        open={confirmDeleteId !== null}
        title="Excluir Usuário"
        message="Este usuário será removido do sistema e da planilha."
        confirmLabel="Excluir"
        onConfirm={() => { if (confirmDeleteId !== null) { del(confirmDeleteId); setConfirmDeleteId(null); } }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </>
  );
}