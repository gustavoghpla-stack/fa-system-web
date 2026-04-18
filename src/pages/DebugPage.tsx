import { useState } from 'react';
import { DB, syncGS, syncEstoqueGS, syncFluxoGS, syncEquipeGS } from '@/lib/db';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader, Btn, FormCard } from '@/components/ui-custom';

interface TestResult {
  name: string;
  status: 'ok' | 'error' | 'warn' | 'info' | 'pending';
  message: string;
  detail?: string;
}

async function gsFetchDirect(url: string): Promise<{ ok: boolean; status: number; body: string }> {
  const win = window as any;
  if (win.electronAPI?.gsFetch) {
    return win.electronAPI.gsFetch({ url, method: 'GET' });
  }
  const res = await fetch(url, { redirect: 'follow' });
  return { ok: res.ok, status: res.status, body: await res.text() };
}

export default function DebugPage() {
  const { session } = useAuth();
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);
  const [syncLog, setSyncLog] = useState<string[]>([]);

  const log = (msg: string) => setSyncLog(prev => [`[${new Date().toLocaleTimeString('pt-BR')}] ${msg}`, ...prev]);

  const addResult = (r: TestResult) => setResults(prev => [...prev, r]);

  const runDiagnostics = async () => {
    setRunning(true);
    setResults([]);
    setSyncLog([]);

    const cfg = DB.getObj('config');

    // ── 1. LocalStorage integrity ──────────────────────────────────
    const keys = ['func', 'bancos', 'escalas', 'docs', 'users', 'estoque', 'estoque_mov', 'veiculos', 'abastecimentos', 'fluxo_caixa', 'custos_fixos', 'equipe_avaliacoes'];
    for (const k of keys) {
      try {
        const raw = localStorage.getItem('fa_' + k);
        if (!raw) {
          addResult({ name: `LocalStorage: ${k}`, status: 'info', message: 'Vazio (0 registros)' });
          continue;
        }
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
          addResult({ name: `LocalStorage: ${k}`, status: 'error', message: 'NÃO é array!', detail: typeof parsed });
        } else {
          addResult({ name: `LocalStorage: ${k}`, status: 'ok', message: `${parsed.length} registro(s)` });
        }
      } catch (e: any) {
        addResult({ name: `LocalStorage: ${k}`, status: 'error', message: 'JSON inválido!', detail: e.message });
      }
    }

    // ── 2. Config check ────────────────────────────────────────────
    addResult({ name: 'Config: masterPasswordHash', status: cfg.masterPasswordHash ? 'ok' : 'warn', message: cfg.masterPasswordHash ? 'Definida' : 'Não configurada' });
    addResult({ name: 'Config: gsUrl (Funcionários)', status: cfg.gsUrl ? 'ok' : 'warn', message: cfg.gsUrl ? cfg.gsUrl.slice(0, 60) + '...' : '❌ NÃO CONFIGURADA — sync de func/users não funciona!' });
    addResult({ name: 'Config: gsUrlEstoque', status: cfg.gsUrlEstoque ? 'ok' : 'warn', message: cfg.gsUrlEstoque ? cfg.gsUrlEstoque.slice(0, 60) + '...' : '❌ NÃO CONFIGURADA — sync de estoque não funciona!' });
    addResult({ name: 'Config: gsUrlFluxo', status: cfg.gsUrlFluxo ? 'ok' : 'info', message: cfg.gsUrlFluxo ? cfg.gsUrlFluxo.slice(0, 60) + '...' : 'Não configurada' });
    addResult({ name: 'Config: gsUrlEquipe', status: cfg.gsUrlEquipe ? 'ok' : 'info', message: cfg.gsUrlEquipe ? cfg.gsUrlEquipe.slice(0, 60) + '...' : 'Não configurada' });

    // ── 3. GAS connectivity tests ──────────────────────────────────
    if (cfg.gsUrl) {
      try {
        log('Testando conexão GAS principal...');
        const r = await gsFetchDirect(cfg.gsUrl + '?acao=ping');
        addResult({ name: 'GAS Ping: Funcionários', status: r.ok ? 'ok' : 'error', message: r.ok ? `✅ Online (HTTP ${r.status})` : `❌ HTTP ${r.status}`, detail: r.body.slice(0, 200) });
        log(`GAS principal: ${r.ok ? 'OK' : 'FALHOU'} (${r.status})`);
      } catch (e: any) {
        addResult({ name: 'GAS Ping: Funcionários', status: 'error', message: '❌ Erro de conexão', detail: e.message });
        log(`GAS principal ERRO: ${e.message}`);
      }
    }

    if (cfg.gsUrlEstoque) {
      try {
        log('Testando conexão GAS estoque...');
        const r = await gsFetchDirect(cfg.gsUrlEstoque + '?acao=ping');
        addResult({ name: 'GAS Ping: Estoque', status: r.ok ? 'ok' : 'error', message: r.ok ? `✅ Online (HTTP ${r.status})` : `❌ HTTP ${r.status}` });
        log(`GAS estoque: ${r.ok ? 'OK' : 'FALHOU'} (${r.status})`);
      } catch (e: any) {
        addResult({ name: 'GAS Ping: Estoque', status: 'error', message: '❌ Erro de conexão', detail: e.message });
      }
    }

    if (cfg.gsUrlFluxo) {
      try {
        const r = await gsFetchDirect(cfg.gsUrlFluxo + '?acao=ping');
        addResult({ name: 'GAS Ping: Financeiro', status: r.ok ? 'ok' : 'error', message: r.ok ? `✅ Online` : `❌ HTTP ${r.status}` });
      } catch (e: any) {
        addResult({ name: 'GAS Ping: Financeiro', status: 'error', message: '❌ ' + e.message });
      }
    }

    if (cfg.gsUrlEquipe) {
      try {
        const r = await gsFetchDirect(cfg.gsUrlEquipe + '?acao=ping');
        addResult({ name: 'GAS Ping: Equipe', status: r.ok ? 'ok' : 'error', message: r.ok ? `✅ Online` : `❌ HTTP ${r.status}` });
      } catch (e: any) {
        addResult({ name: 'GAS Ping: Equipe', status: 'error', message: '❌ ' + e.message });
      }
    }

    // ── 4. Data integrity checks ────────────────────────────────────
    const func = DB.get<any>('func');
    const users = DB.get<any>('users');
    const avaliacoes = DB.get<any>('equipe_avaliacoes');

    // Check for funcionarios with no ID
    const funcSemId = func.filter((f: any) => !f.id);
    if (funcSemId.length > 0) {
      addResult({ name: 'Integridade: Funcionários sem ID', status: 'error', message: `${funcSemId.length} funcionário(s) sem ID!`, detail: JSON.stringify(funcSemId.map((f: any) => f.nome)) });
    } else {
      addResult({ name: 'Integridade: IDs Funcionários', status: 'ok', message: `Todos os ${func.length} funcionários têm ID` });
    }

    // Check for duplicate IDs in func
    const funcIds = func.map((f: any) => f.id);
    const funcDupIds = funcIds.filter((id: any, i: number) => funcIds.indexOf(id) !== i);
    if (funcDupIds.length > 0) {
      addResult({ name: 'Integridade: IDs duplicados (func)', status: 'error', message: `IDs duplicados: ${funcDupIds.join(', ')}` });
    }

    // Check for users with no ID
    const usersSemId = users.filter((u: any) => !u.id);
    if (usersSemId.length > 0) {
      addResult({ name: 'Integridade: Usuários sem ID', status: 'error', message: `${usersSemId.length} usuário(s) sem ID!` });
    } else {
      addResult({ name: 'Integridade: IDs Usuários', status: 'ok', message: `Todos os ${users.length} usuários têm ID` });
    }

    // Check avaliacoes reference valid funcionarios
    const funcIdSet = new Set(func.map((f: any) => f.id));
    const avOrfaos = avaliacoes.filter((a: any) => a.funcionarioId && !funcIdSet.has(a.funcionarioId));
    if (avOrfaos.length > 0) {
      addResult({ name: 'Integridade: Avaliações órfãs', status: 'warn', message: `${avOrfaos.length} avaliação(ões) referem funcionários deletados` });
    } else {
      addResult({ name: 'Integridade: Referências de avaliações', status: 'ok', message: 'Todas as avaliações referenciam funcionários válidos' });
    }

    // ── 5. Permissions check ────────────────────────────────────────
    const perms = cfg.userPermissions || {};
    const permUsers = Object.keys(perms);
    if (permUsers.length === 0) {
      addResult({ name: 'Permissões', status: 'info', message: 'Nenhuma permissão customizada — todos com acesso total (padrão correto)' });
    } else {
      for (const email of permUsers) {
        const blocked = Object.entries(perms[email] || {}).filter(([, v]) => v === false).map(([k]) => k);
        if (blocked.length > 0) {
          addResult({ name: `Permissões: ${email}`, status: 'info', message: `${blocked.length} módulo(s) bloqueado(s)`, detail: blocked.join(', ') });
        }
      }
    }

    // ── 6. Sync summary ─────────────────────────────────────────────
    const summary = [
      cfg.gsUrl ? null : '⚠️ gsUrl não configurada → func e users NÃO sincronizam',
      cfg.gsUrlEstoque ? null : '⚠️ gsUrlEstoque não configurada → estoque/veículos NÃO sincronizam',
    ].filter(Boolean);

    if (summary.length > 0) {
      addResult({ name: '⚠️ RESUMO CRÍTICO', status: 'error', message: summary.join(' | ') });
    } else {
      addResult({ name: 'Resumo Geral', status: 'ok', message: 'Todas as URLs configuradas. Sync deve funcionar.' });
    }

    log('Diagnóstico concluído.');
    setRunning(false);
  };

  const forceSync = async (type: string) => {
    log(`Forçando sync: ${type}...`);
    try {
      let ok = false;
      if (type === 'rh') ok = await syncGS(false);
      else if (type === 'estoque') ok = await syncEstoqueGS(false);
      else if (type === 'fluxo') ok = await syncFluxoGS(false);
      else if (type === 'equipe') ok = await syncEquipeGS(false);
      log(`Sync ${type}: ${ok ? 'SUCESSO' : 'FALHOU'}`);
    } catch (e: any) {
      log(`Sync ${type} ERRO: ${e.message}`);
    }
  };

  const clearOrphanAvaliacoes = () => {
    const func = DB.get<any>('func');
    const funcIdSet = new Set(func.map((f: any) => f.id));
    const all = DB.get<any>('equipe_avaliacoes');
    const valid = all.filter((a: any) => funcIdSet.has(a.funcionarioId));
    const removed = all.length - valid.length;
    if (removed === 0) { log('Nenhuma avaliação órfã encontrada.'); return; }
    DB.set('equipe_avaliacoes', valid);
    log(`Removidas ${removed} avaliação(ões) órfã(s).`);
  };

  const statusColor: Record<string, string> = {
    ok: 'bg-success/10 border-success/30 text-success',
    error: 'bg-destructive/10 border-destructive/30 text-destructive',
    warn: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500',
    info: 'bg-secondary border-border text-muted-foreground',
    pending: 'bg-secondary border-border text-muted-foreground',
  };

  const statusIcon: Record<string, string> = { ok: '✅', error: '❌', warn: '⚠️', info: 'ℹ️', pending: '⏳' };

  const counts = {
    ok: results.filter(r => r.status === 'ok').length,
    error: results.filter(r => r.status === 'error').length,
    warn: results.filter(r => r.status === 'warn').length,
  };

  return (
    <>
      <PageHeader title="Painel de Debug" icon="🔧">
        <Btn variant="danger" onClick={runDiagnostics} className={running ? 'opacity-60' : ''}>
          {running ? '⏳ Executando...' : '🔍 Executar Diagnóstico Completo'}
        </Btn>
      </PageHeader>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Warning */}
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-2.5 text-[11px] text-destructive font-semibold">
          🔒 Esta aba é exclusiva do usuário <b>Master</b>. Nenhuma ação aqui afeta dados de produção (exceto o botão de limpeza de órfãos).
        </div>

        {/* Summary when done */}
        {results.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-success/10 border border-success/30 rounded-xl p-3 text-center">
              <div className="text-[24px] font-bold text-success">{counts.ok}</div>
              <div className="text-[10px] text-muted-foreground">Passou</div>
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 text-center">
              <div className="text-[24px] font-bold text-yellow-500">{counts.warn}</div>
              <div className="text-[10px] text-muted-foreground">Avisos</div>
            </div>
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 text-center">
              <div className="text-[24px] font-bold text-destructive">{counts.error}</div>
              <div className="text-[10px] text-muted-foreground">Erros</div>
            </div>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <FormCard title="Resultados do Diagnóstico">
            <div className="space-y-1.5 max-h-[420px] overflow-y-auto">
              {results.map((r, i) => (
                <div key={i} className={`flex items-start gap-2.5 px-3 py-2 rounded-lg border text-[10px] ${statusColor[r.status]}`}>
                  <span className="shrink-0 text-[13px] mt-0.5">{statusIcon[r.status]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold">{r.name}</div>
                    <div className="opacity-80">{r.message}</div>
                    {r.detail && <div className="opacity-60 mt-0.5 break-all">{r.detail}</div>}
                  </div>
                </div>
              ))}
            </div>
          </FormCard>
        )}

        {/* Manual sync controls */}
        <FormCard title="Sincronização Manual (força envio imediato)" icon="📤">
          <div className="flex flex-wrap gap-2">
            <Btn variant="info" onClick={() => forceSync('rh')}>📤 Funcionários + Usuários</Btn>
            <Btn variant="info" onClick={() => forceSync('estoque')}>📤 Estoque + Veículos</Btn>
            <Btn variant="info" onClick={() => forceSync('fluxo')}>📤 Financeiro</Btn>
            <Btn variant="info" onClick={() => forceSync('equipe')}>📤 Controle de Equipe</Btn>
          </div>
        </FormCard>

        {/* Data maintenance */}
        <FormCard title="Manutenção de Dados" icon="🛠">
          <div className="flex flex-wrap gap-2 mb-3">
            <Btn variant="outline" onClick={clearOrphanAvaliacoes}>🗑 Remover avaliações de funcionários deletados</Btn>
          </div>
          <p className="text-[10px] text-muted-foreground">Útil se o Controle de Equipe mostrar registros de funcionários que não existem mais.</p>
        </FormCard>

        {/* LocalStorage raw viewer */}
        <FormCard title="Contagem de Registros (localStorage)" icon="📊">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2">
            {['func','users','bancos','escalas','docs','estoque','estoque_mov','veiculos','abastecimentos','fluxo_caixa','custos_fixos','equipe_avaliacoes'].map(k => {
              let count = 0;
              try { count = JSON.parse(localStorage.getItem('fa_' + k) || '[]').length; } catch {}
              return (
                <div key={k} className="bg-secondary rounded-lg p-2.5 flex justify-between items-center text-[10px]">
                  <span className="font-semibold text-muted-foreground">{k}</span>
                  <span className={`font-bold px-2 py-0.5 rounded ${count > 0 ? 'text-primary' : 'text-muted-foreground/40'}`}>{count}</span>
                </div>
              );
            })}
          </div>
        </FormCard>

        {/* Sync log */}
        {syncLog.length > 0 && (
          <FormCard title="Log de Operações" icon="📋">
            <div className="bg-card border border-border rounded-lg p-3 max-h-[200px] overflow-y-auto">
              {syncLog.map((line, i) => (
                <div key={i} className="text-[10px] font-mono text-muted-foreground py-0.5 border-b border-border/30 last:border-0">{line}</div>
              ))}
            </div>
            <Btn variant="outline" onClick={() => setSyncLog([])} className="mt-2">🗑 Limpar log</Btn>
          </FormCard>
        )}

        {/* Architecture explanation */}
        <FormCard title="📚 Como o Sistema Funciona" icon="ℹ️">
          <div className="text-[10px] text-muted-foreground space-y-2 leading-relaxed">
            <p><b className="text-foreground">Armazenamento:</b> Todos os dados ficam no <code className="bg-secondary px-1 rounded">localStorage</code> do navegador Electron. Não há banco de dados remoto.</p>
            <p><b className="text-foreground">Sincronização:</b> Ao alterar qualquer dado, um timer de <b>800ms</b> é iniciado. Após esse tempo, os dados são enviados ao Google Apps Script via HTTP POST. O GAS limpa a aba e reescreve tudo.</p>
            <p><b className="text-foreground">Por que o sync pode falhar:</b></p>
            <ul className="list-disc pl-4 space-y-1">
              <li>URL do GAS não configurada em Configurações</li>
              <li>GAS não republicado após alteração de código</li>
              <li>Permissão do GAS mudada (precisa ser "Qualquer pessoa")</li>
              <li>App fechado dentro dos 800ms após a alteração</li>
            </ul>
            <p><b className="text-foreground">Planilhas conectadas:</b></p>
            <ul className="list-disc pl-4 space-y-1">
              <li><b>URL Funcionários (gsUrl):</b> func, bancos, escalas, docs, users, fluxo_caixa</li>
              <li><b>URL Estoque (gsUrlEstoque):</b> estoque, estoque_mov, veículos, abastecimentos</li>
              <li><b>URL Financeiro (gsUrlFluxo):</b> fluxo_caixa, custos_fixos</li>
              <li><b>URL Equipe (gsUrlEquipe):</b> equipe_avaliacoes</li>
            </ul>
          </div>
        </FormCard>

      </div>
    </>
  );
}
