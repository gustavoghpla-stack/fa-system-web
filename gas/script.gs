// ============================================================
// F&A HIGIENIZAÇÕES - Google Apps Script CORRIGIDO
// ============================================================
// INSTRUÇÕES:
// 1. Apague TODO o código atual e cole este
// 2. Salve (Ctrl+S)
// 3. Implantar → Nova implantação
//    - Tipo: App da Web
//    - Executar como: Você
//    - Quem tem acesso: Qualquer pessoa
// 4. Copie a nova URL e cole em Configurações no sistema
// ============================================================

var SENHA_MESTRA = '@Line2122!';
var EMAIL_MASTER = 'feaviplimpeza@gmail.com';

// ─── NOMES DAS ABAS ──────────────────────────────────────────
var SHEETS = {
  func:        'Funcionários',
  bancos:      'Bancos_PIX',
  escalas:     'Escalas',
  docs:        'Documentos',
  users:       'Usuários',
  fluxo_caixa: 'FluxoCaixa',
};

var HEADERS = {
  func:        ['id','nome','nasc','sexo','rh','estcivil','natural','uf','escol','pai','mae','end','compl','cep','cidade','bairro','ufend','tel','cel','email','cpf','rg','ufrg','emissrg','pis','ctps','seriectps','emissctps','titulo','secao','zona','cnh','catcnh','venccnh','reserv','empresa','cnpj','primemp','sindical','admissao','demissao','funcao','horario','salario','ticket','valdia','vtransp','valdiat','descvt','descvr','planosaude','exp','banco','agencia','conta','tipoconta','pix','tipopix','foto','cadastrado'],
  bancos:      ['id','funcId','funcNome','banco','codigo','agencia','conta','tipo','tipopix','chavepix','obs','cadastrado'],
  escalas:     ['id','desc','cadastrado'],
  docs:        ['id','desc','obrig'],
  users:       ['id','nome','email','nivel','foto','cadastrado'],
  fluxo_caixa: ['id','tipo','descricao','valor','data','categoria','obs','cadastrado'],
};

// ─── UTILITÁRIOS ─────────────────────────────────────────────

function getOrCreateSheet(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * CORREÇÃO PRINCIPAL: substitui TODO o conteúdo da aba.
 * Funciona para INSERT, UPDATE e DELETE (delete-by-omission).
 * Array vazio [] = limpa todos os dados mas mantém o cabeçalho.
 * NUNCA usa appendRow — evita duplicatas.
 */
function jsonToSheet(sheet, rows, headerDef) {
  // 1. Limpa tudo
  sheet.clearContents();

  // 2. Define cabeçalhos
  var headers = (rows && rows.length > 0) ? Object.keys(rows[0]) : (headerDef || null);
  if (!headers) return;

  // 3. Sempre escreve o cabeçalho (mesmo com [] vazio)
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setBackground('#1a1a2e')
    .setFontColor('#d4af37')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');
  sheet.setFrozenRows(1);

  // 4. Só escreve dados se houver
  if (!rows || rows.length === 0) {
    try { sheet.autoResizeColumns(1, headers.length); } catch(e) {}
    return;
  }

  var values = rows.map(function(r) {
    return headers.map(function(h) { return r[h] !== undefined && r[h] !== null ? r[h] : ''; });
  });
  sheet.getRange(2, 1, values.length, headers.length).setValues(values);
  try { sheet.autoResizeColumns(1, headers.length); } catch(e) {}
}

function sheetToJson(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0].map(function(h) { return String(h).trim(); }).filter(function(h) { return h; });
  return data.slice(1)
    .filter(function(row) { return row[0] !== '' && row[0] !== null && row[0] !== undefined; })
    .map(function(row) {
      var obj = {};
      headers.forEach(function(h, i) { obj[h] = row[i] !== undefined ? row[i] : ''; });
      return obj;
    });
}

// ─── HANDLER GET ─────────────────────────────────────────────

function doGet(e) {
  var acao = (e && e.parameter) ? (e.parameter.acao || '') : '';

  if (acao === 'ping') {
    return jsonOut({ ok: true, msg: 'FA RH OK', version: 4 });
  }

  if (acao === 'get_all') {
    var result = {};
    Object.keys(SHEETS).forEach(function(key) {
      result[key] = sheetToJson(getOrCreateSheet(SHEETS[key]));
    });
    return jsonOut(result);
  }

  if (acao === 'login') {
    var email = e.parameter.email;
    var senha = e.parameter.senha;
    var usersSheet = getOrCreateSheet(SHEETS.users);
    var users = usersSheet.getDataRange().getValues();
    for (var i = 1; i < users.length; i++) {
      if (users[i][2] === email && users[i][3] === senha) {
        return jsonOut({ ok: true, usuario: { nome: users[i][1], email: users[i][2], nivel: users[i][4] } });
      }
    }
    return jsonOut({ ok: false, error: 'Credenciais inválidas' });
  }

  return jsonOut({ ok: true, msg: 'FA RH OK', version: 4 });
}

// ─── HANDLER POST ────────────────────────────────────────────

function doPost(e) {
  var data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch(err) {
    return jsonOut({ ok: false, error: 'JSON inválido: ' + err.message });
  }

  // ── SYNC COMPLETO ──────────────────────────────────────────
  // CORREÇÃO: sem condição "length > 0" — array vazio limpa a aba corretamente
  if (data.acao === 'sync_all') {
    jsonToSheet(getOrCreateSheet(SHEETS.func),        data.func        !== undefined ? data.func        : [], HEADERS.func);
    jsonToSheet(getOrCreateSheet(SHEETS.bancos),      data.bancos      !== undefined ? data.bancos      : [], HEADERS.bancos);
    jsonToSheet(getOrCreateSheet(SHEETS.escalas),     data.escalas     !== undefined ? data.escalas     : [], HEADERS.escalas);
    jsonToSheet(getOrCreateSheet(SHEETS.docs),        data.docs        !== undefined ? data.docs        : [], HEADERS.docs);
    jsonToSheet(getOrCreateSheet(SHEETS.users),       data.users       !== undefined ? data.users       : [], HEADERS.users);
    jsonToSheet(getOrCreateSheet(SHEETS.fluxo_caixa), data.fluxo_caixa !== undefined ? data.fluxo_caixa : [], HEADERS.fluxo_caixa);
    return jsonOut({ ok: true, msg: 'sync_all concluído' });
  }

  return jsonOut({ ok: false, error: 'Ação desconhecida: ' + data.acao });
}

// ─── INSTALAÇÃO (primeira vez) ────────────────────────────────

function instalarSistema() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // Garante que todas as abas existam com cabeçalhos corretos
  Object.keys(SHEETS).forEach(function(key) {
    var sheet = getOrCreateSheet(SHEETS[key]);
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, HEADERS[key].length).setValues([HEADERS[key]]);
      sheet.getRange(1, 1, 1, HEADERS[key].length)
        .setBackground('#1a1a2e').setFontColor('#d4af37')
        .setFontWeight('bold').setHorizontalAlignment('center');
      sheet.setFrozenRows(1);
    }
  });

  // Documentos padrão
  var docsSheet = getOrCreateSheet(SHEETS.docs);
  if (docsSheet.getLastRow() <= 1) {
    var docs = [
      [1,'02 Fotos 3x4 recentes','Sim'],
      [2,'Cópia do CPF','Sim'],
      [3,'Cópia do RG (Identidade)','Sim'],
      [4,'Cópia do Título de Eleitor','Sim'],
      [5,'Cópia do Comprovante de Residência','Sim'],
      [6,'Cópia da Certidão de Nascimento ou Casamento','Sim'],
      [7,'Cópia da Carteira de Trabalho (CTPS)','Sim'],
      [8,'Cópia do PIS/PASEP','Sim'],
      [9,'Cópia do Certificado de Reservista (masculino)','Sim'],
      [10,'Atestado de Saúde Ocupacional (ASO)','Sim'],
      [11,'Cópia da CNH (se motorista)','Não'],
      [12,'Certidão de Nascimento dos filhos (menores de 14 anos)','Não'],
      [13,'Comprovante de escolaridade','Não']
    ];
    docsSheet.getRange(2, 1, docs.length, 3).setValues(docs);
  }

  SpreadsheetApp.getUi().alert('✅ Sistema F&A Higienizações v4 instalado!\n\nAgora reimplante como Web App com acesso "Qualquer pessoa".');
}

// ─── MENU DA PLANILHA ─────────────────────────────────────────

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('⭐ F&A Higienizações')
    .addItem('📊 Atualizar Formatação', 'formatarTodasAbas')
    .addSeparator()
    .addItem('🎂 Aniversariantes do Mês', 'relAniversariantes')
    .addItem('✅ Funcionários Ativos', 'relAtivos')
    .addItem('❌ Funcionários Desligados', 'relDesligados')
    .addToUi();
}

function formatarTodasAbas() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.getSheets().forEach(function(sheet) {
    var lastCol = sheet.getLastColumn();
    if (lastCol > 0) {
      sheet.getRange(1, 1, 1, lastCol)
        .setBackground('#1a1a2e').setFontColor('#d4af37')
        .setFontWeight('bold').setHorizontalAlignment('center');
      sheet.setFrozenRows(1);
    }
  });
  SpreadsheetApp.getUi().alert('✅ Formatação aplicada!');
}

function relAniversariantes() {
  var sheet = getOrCreateSheet(SHEETS.func);
  var data = sheet.getDataRange().getValues();
  var mesAtual = new Date().getMonth() + 1;
  var meses = ['','Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  var result = [];
  for (var i = 1; i < data.length; i++) {
    if (data[i][2]) {
      var dt = new Date(data[i][2]);
      if (dt.getMonth() + 1 === mesAtual) {
        result.push(data[i][1] + ' — ' + Utilities.formatDate(dt, 'America/Sao_Paulo', 'dd/MM'));
      }
    }
  }
  SpreadsheetApp.getUi().alert('🎂 Aniversariantes de ' + meses[mesAtual] + ':\n\n' + (result.length ? result.join('\n') : 'Nenhum.'));
}

function relAtivos() {
  var sheet = getOrCreateSheet(SHEETS.func);
  var data = sheet.getDataRange().getValues();
  var result = [];
  for (var i = 1; i < data.length; i++) {
    if (!data[i][40]) result.push(data[i][1] + ' | ' + (data[i][41] || '—'));
  }
  SpreadsheetApp.getUi().alert('✅ Ativos (' + result.length + '):\n\n' + (result.length ? result.join('\n') : 'Nenhum.'));
}

function relDesligados() {
  var sheet = getOrCreateSheet(SHEETS.func);
  var data = sheet.getDataRange().getValues();
  var result = [];
  for (var i = 1; i < data.length; i++) {
    if (data[i][40]) result.push(data[i][1] + ' | Demissão: ' + data[i][40]);
  }
  SpreadsheetApp.getUi().alert('❌ Desligados (' + result.length + '):\n\n' + (result.length ? result.join('\n') : 'Nenhum.'));
}
