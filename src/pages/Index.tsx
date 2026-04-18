import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission } from '@/lib/db';
import LoginScreen from '@/components/LoginScreen';
import AppLayout from '@/components/AppLayout';
import MenuPage from '@/pages/MenuPage';
import FuncionariosPage from '@/pages/FuncionariosPage';
import BancosPage from '@/pages/BancosPage';
import EscalasPage from '@/pages/EscalasPage';
import DocumentosPage from '@/pages/DocumentosPage';
import UsuariosPage from '@/pages/UsuariosPage';
import EstoquePage from '@/pages/EstoquePage';
import AbastecimentoPage from '@/pages/AbastecimentoPage';
import FluxoCaixaPage from '@/pages/FluxoCaixaPage';
import { RelFuncPage, RelAnivPage, RelUsersPage, RelAcessosPage } from '@/pages/RelatoriosPages';
import ConfigPage from '@/pages/ConfigPage';
import OrcamentoPage from '@/pages/OrcamentoPage';
import CertificadoPage from '@/pages/CertificadoPage';
import EquipePage from '@/pages/EquipePage';
import DebugPage from '@/pages/DebugPage';

const PAGE_FEATURE: Record<string, string> = {
  'funcionarios': 'funcionarios',
  'bancos': 'bancos',
  'escalas': 'escalas',
  'documentos': 'documentos',
  'usuarios': 'usuarios',
  'estoque': 'estoque',
  'abastecimento': 'abastecimento',
  'fluxo-caixa': 'fluxoCaixa',
  'rel-func': 'relatorios',
  'rel-aniv': 'relatorios',
  'rel-users': 'relatorios',
  'rel-acessos': 'relatorios',
  'config': 'config',
  'orcamento': 'orcamento',
  'certificado': 'certificado',
  'equipe': 'equipe',
  'debug': '__masterOnly__',
};

export default function Index() {
  const { session, permissionsVersion } = useAuth();
  const [currentPage, setCurrentPage] = useState('menu');
  const [theme, setTheme] = useState<'dark' | 'light' | 'orange'>('dark');

  const cycleTheme = () => {
    const next = theme === 'dark' ? 'light' : theme === 'light' ? 'orange' : 'dark';
    setTheme(next);
    document.body.classList.remove('light', 'orange');
    if (next !== 'dark') document.body.classList.add(next);
  };

  if (!session) return <LoginScreen />;

  const navigate = (page: string) => {
    // Master-only pages
    if (['config', 'rel-acessos', 'debug'].includes(page) && session.nivel !== 'Master') return;
    // For all other pages: check explicit permission only
    const feature = PAGE_FEATURE[page];
    if (feature && feature !== '__masterOnly__' && !hasPermission(session.user, session.nivel, feature)) return;
    setCurrentPage(page);
  };

  // If current page permission was revoked, fall back to menu
  const effectivePage = (() => {
    if (['config', 'rel-acessos', 'debug'].includes(currentPage) && session.nivel !== 'Master') return 'menu';
    const feature = PAGE_FEATURE[currentPage];
    if (feature && feature !== '__masterOnly__' && !hasPermission(session.user, session.nivel, feature)) return 'menu';
    return currentPage;
  })();

  // permissionsVersion is referenced to trigger re-evaluation when permissions change
  void permissionsVersion;

  const pages: Record<string, JSX.Element> = {
    'menu': <MenuPage onNavigate={navigate} />,
    'funcionarios': <FuncionariosPage />,
    'bancos': <BancosPage />,
    'escalas': <EscalasPage />,
    'documentos': <DocumentosPage />,
    'usuarios': <UsuariosPage />,
    'estoque': <EstoquePage />,
    'abastecimento': <AbastecimentoPage />,
    'fluxo-caixa': <FluxoCaixaPage />,
    'rel-func': <RelFuncPage />,
    'rel-aniv': <RelAnivPage />,
    'rel-users': <RelUsersPage />,
    'rel-acessos': <RelAcessosPage />,
    'config': <ConfigPage />,
    'orcamento': <OrcamentoPage />,
    'certificado': <CertificadoPage />,
    'equipe': <EquipePage />,
    'debug': <DebugPage />,
  };

  return (
    <AppLayout currentPage={effectivePage} onNavigate={navigate} theme={theme} onCycleTheme={cycleTheme}>
      {pages[effectivePage] || <MenuPage onNavigate={navigate} />}
    </AppLayout>
  );
}
