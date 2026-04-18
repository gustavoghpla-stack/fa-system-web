import { useState, useMemo, type ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DB } from '@/lib/db';
import logoImg from '@/assets/logo.png';

interface NavItem {
  id: string; icon: string; label: string; section?: string;
  masterOnly?: boolean;
  feature?: string;
}

const allNavItems: NavItem[] = [
  { section: 'Principal', id: 'menu', icon: '🏠', label: 'Menu Principal' },
  { section: 'Cadastros', id: 'funcionarios', icon: '👤', label: 'Funcionários', feature: 'funcionarios' },
  { id: 'bancos', icon: '🏦', label: 'Bancos / PIX', feature: 'bancos' },
  { id: 'escalas', icon: '📅', label: 'Escalas', feature: 'escalas' },
  { id: 'documentos', icon: '📄', label: 'Documentos', feature: 'documentos' },
  { id: 'usuarios', icon: '👥', label: 'Usuários', feature: 'usuarios' },
  { section: 'Operações', id: 'estoque', icon: '📦', label: 'Estoque', feature: 'estoque' },
  { id: 'abastecimento', icon: '⛽', label: 'Abastecimento', feature: 'abastecimento' },
  { section: 'Financeiro', id: 'fluxo-caixa', icon: '💰', label: 'Fluxo de Caixa', feature: 'fluxoCaixa' },
  { id: 'orcamento', icon: '📋', label: 'Orçamento', feature: 'orcamento' },
  { id: 'certificado', icon: '📜', label: 'Certificado', feature: 'certificado' },
  { section: 'Equipe', id: 'equipe', icon: '⭐', label: 'Controle de Equipe', feature: 'equipe' },
  { section: 'Relatórios', id: 'rel-func', icon: '📊', label: 'Funcionários', feature: 'relatorios' },
  { id: 'rel-aniv', icon: '🎂', label: 'Aniversariantes', feature: 'relatorios' },
  { id: 'rel-users', icon: '🧾', label: 'Usuários', feature: 'relatorios' },
  { id: 'rel-acessos', icon: '🔒', label: 'Acessos', masterOnly: true },
  { section: 'Sistema', id: 'config', icon: '⚙️', label: 'Configurações', masterOnly: true },
  { id: 'debug', icon: '🔧', label: 'Debug', masterOnly: true },
];

interface Props {
  currentPage: string; onNavigate: (page: string) => void;
  theme: 'dark' | 'light' | 'orange'; onCycleTheme: () => void; children: ReactNode;
}

export default function AppLayout({ currentPage, onNavigate, theme, onCycleTheme, children }: Props) {
  const { session, logout, permissionsVersion } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const userNivel = session?.nivel || 'Operador';
  const userEmail = session?.user || '';

  const navItems = useMemo(() => {
    const userPerms = DB.getObj('config').userPermissions?.[userEmail] ?? {};
    return allNavItems.filter(item => {
      if (item.masterOnly) return userNivel === 'Master';
      if (userNivel === 'Master') return true;
      // DEFAULT ALLOW: only hide when explicitly disabled (=== false)
      if (item.feature) {
        const val = userPerms[item.feature as keyof typeof userPerms];
        return val !== false;
      }
      return true;
    });
  }, [userNivel, userEmail, permissionsVersion]);

  return (
    <div className="fixed inset-0 flex flex-row">
      <div className={`bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-200 overflow-hidden ${collapsed ? 'w-[54px] min-w-[54px]' : 'w-[224px] min-w-[224px]'}`}>
        <div className="p-3.5 border-b border-sidebar-border flex items-center gap-2.5 h-[62px] shrink-0">
          <div className="w-[34px] h-[34px] rounded-full overflow-hidden shrink-0">
            <img src={logoImg} alt="F&A" className="w-full h-full object-cover" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden whitespace-nowrap">
              <div className="font-heading text-[13px] font-bold text-primary tracking-[0.5px]">F&A System Web</div>
              <div className="text-[8px] text-muted-foreground">Bacamarte Dev Company</div>
              <a href="mailto:bacamarte.pe@gmail.com" className="text-[7px] text-primary hover:underline">bacamarte.pe@gmail.com</a>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto py-1.5">
          {navItems.map((item, i) => (
            <div key={item.id}>
              {item.section && !collapsed && (
                <div className="px-3.5 pt-3.5 pb-1 text-[9px] font-bold tracking-[2px] text-muted-foreground uppercase whitespace-nowrap">{item.section}</div>
              )}
              {item.section && collapsed && i > 0 && <div className="h-px bg-sidebar-border mx-2 my-1.5" />}
              <div onClick={() => onNavigate(item.id)}
                className={`flex items-center gap-2.5 py-2 px-3.5 cursor-pointer text-[12px] font-medium whitespace-nowrap border-l-2 transition-all
                  ${currentPage === item.id ? 'bg-sidebar-accent text-sidebar-accent-foreground border-l-primary font-semibold' : 'text-muted-foreground border-l-transparent hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:border-l-gold-dark'}`}>
                <span className="text-[15px] shrink-0 w-5 text-center">{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-sidebar-border shrink-0">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-[30px] h-[30px] rounded-full bg-gold-deep flex items-center justify-center font-bold text-[12px] text-primary-foreground shrink-0 overflow-hidden">
              {session?.name?.[0]?.toUpperCase() || 'A'}
            </div>
            {!collapsed && (
              <div className="overflow-hidden">
                <div className="text-[11px] font-semibold truncate">{session?.name}</div>
                <div className="text-[9px] text-muted-foreground">{session?.nivel}</div>
              </div>
            )}
          </div>
          <div className="flex gap-1.5">
            <button onClick={onCycleTheme}
              className="flex-1 py-1.5 px-1 rounded-md text-[10px] font-semibold flex items-center justify-center gap-1 bg-secondary border border-border text-primary transition-opacity hover:opacity-80">
              <span>{theme === 'dark' ? '☀️' : theme === 'light' ? '🟠' : '🌙'}</span>
              {!collapsed && <span>{theme === 'dark' ? 'Claro' : theme === 'light' ? 'Laranja' : 'Escuro'}</span>}
            </button>
            <button onClick={() => { if (confirm('Deseja sair do sistema?')) logout(); }}
              className="flex-1 py-1.5 px-1 rounded-md text-[10px] font-semibold flex items-center justify-center gap-1 bg-destructive text-destructive-foreground transition-opacity hover:opacity-80">
              <span>🚪</span>{!collapsed && <span>Sair</span>}
            </button>
          </div>
          <button onClick={() => setCollapsed(!collapsed)}
            className="w-full bg-transparent text-muted-foreground text-[10px] p-1 text-center cursor-pointer mt-1.5 transition-colors hover:text-primary">
            {collapsed ? '▶' : '◀ Recolher'}
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden flex flex-col bg-background">{children}</div>
    </div>
  );
}
