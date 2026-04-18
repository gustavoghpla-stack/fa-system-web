// ============================================================
//  F&A Higienizações — Google Apps Script v3 (RH)
//  Funcionarios / Bancos / Escalas / Documentos / Usuarios / FluxoCaixa
//  Implante como "Aplicativo da Web" → "Qualquer pessoa, mesmo anônima"
// ============================================================

var SHEETS = {
  func:         'Funcionarios',
  bancos:       'Bancos',
  escalas:      'Escalas',
  docs:         'Documentos',
  users:        'Usuarios',
  fluxo_caixa:  'FluxoCaixa',
};

// Header definitions — ALWAYS written even when data is empty so column "id" is preserved
var HEADERS = {
  func:        ['id','nome','nasc','sexo','rh','estcivil','natural','uf','escol','pai','mae','end','compl','cep','cidade','bairro','ufend','tel','cel','email','cpf','rg','ufrg','emissrg','pis','ctps','seriectps','emissctps','titulo','secao','zona','cnh','catcnh','venccnh','reserv','empresa','cnpj','primemp','sindical','admissao','demissao','funcao','horario','salario','ticket','valdia','vtransp','valdiat','descvt','descvr','planosaude','exp','banco','agencia','conta','tipoconta','pix','tipopix','foto','cadastrado'],
  bancos:      ['id','funcId','funcNome','banco','codigo','agencia','conta','tipo','tipopix','chavepix','obs','cadastrado'],
  escalas:     ['id','desc','cadastrado'],
  docs:        ['id','desc','obrig'],
  users:       ['id','nome','email','nivel','foto','cadastrado'],
  fluxo_caixa: ['id','tipo','descricao','valor','data','categoria','obs','cadastrado'],
};

// ─── Utilities ───────────────────────────────────────────────

function getOrCreateSheet(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function sheetToJson(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0].map(function(h) { return String(h); }).filter(function(h) { return h; });
  return data.slice(1)
    .filter(function(row) { return row[0] !== '' && row[0] !== null && row[0] !== undefined; })
    .map(function(row) {
      var obj = {};
      headers.forEach(function(h, i) { obj[h] = row[i] !== undefined ? row[i] : ''; });
      return obj;
    });
}

/**
 * Replaces sheet contents with `rows`. Header is always written from headerDef
 * (so deletes that leave [] still keep the column structure incl. "id").
 * This effectively gives us delete-by-omission: anything not in `rows` is gone.
 */
function jsonToSheet(sheet, rows, headerDef) {
  sheet.clearContents();

  var headers = (rows && rows.length > 0) ? Object.keys(rows[0]) : (headerDef || null);
  if (!headers) return;

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setBackground('#1a1a1a')
    .setFontColor('#d4a017')
    .setFontWeight('bold');
  sheet.setFrozenRows(1);

  if (!rows || rows.length === 0) {
    try { sheet.autoResizeColumns(1, headers.length); } catch (e) {}
    return;
  }

  var values = rows.map(function(r) {
    return headers.map(function(h) { return r[h] !== undefined ? r[h] : ''; });
  });
  sheet.getRange(2, 1, values.length, headers.length).setValues(values);
  try { sheet.autoResizeColumns(1, headers.length); } catch (e) {}
}

/** Deletes a single row in `sheet` whose `id` column matches `id`. */
function deleteRowById(sheet, id) {
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return false;
  var headers = data[0];
  var idCol = -1;
  for (var i = 0; i < headers.length; i++) {
    if (String(headers[i]).toLowerCase() === 'id') { idCol = i; break; }
  }
  if (idCol < 0) return false;
  var target = String(id);
  for (var r = data.length - 1; r >= 1; r--) {
    if (String(data[r][idCol]) === target) {
      sheet.deleteRow(r + 1);
      return true;
    }
  }
  return false;
}

// ─── Handler GET ──────────────────────────────────────────────

function doGet(e) {
  var acao = (e && e.parameter) ? e.parameter.acao : '';

  if (acao === 'ping') {
    return jsonOut({ ok: true, msg: 'FA RH OK', version: 3 });
  }

  if (acao === 'get_all') {
    var result = {};
    Object.keys(SHEETS).forEach(function(key) {
      result[key] = sheetToJson(getOrCreateSheet(SHEETS[key]));
    });
    return jsonOut(result);
  }

  return jsonOut({ ok: false, error: 'Ação desconhecida: ' + acao });
}

// ─── Handler POST ─────────────────────────────────────────────

function doPost(e) {
  var data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonOut({ ok: false, error: 'JSON inválido: ' + err.message });
  }

  // Bulk replace (delete-by-omission) — used by auto-sync
  if (data.acao === 'sync_all') {
    jsonToSheet(getOrCreateSheet(SHEETS.func),        data.func        || [], HEADERS.func);
    jsonToSheet(getOrCreateSheet(SHEETS.bancos),      data.bancos      || [], HEADERS.bancos);
    jsonToSheet(getOrCreateSheet(SHEETS.escalas),     data.escalas     || [], HEADERS.escalas);
    jsonToSheet(getOrCreateSheet(SHEETS.docs),        data.docs        || [], HEADERS.docs);
    jsonToSheet(getOrCreateSheet(SHEETS.users),       data.users       || [], HEADERS.users);
    jsonToSheet(getOrCreateSheet(SHEETS.fluxo_caixa), data.fluxo_caixa || [], HEADERS.fluxo_caixa);
    return jsonOut({ ok: true });
  }

  // Single-row delete by id (defensive — auto-sync already handles this)
  if (data.acao === 'delete') {
    var sheetKey = data.sheet;
    var id = data.id;
    if (!sheetKey || !SHEETS[sheetKey] || id === undefined || id === null) {
      return jsonOut({ ok: false, error: 'Parâmetros inválidos' });
    }
    var ok = deleteRowById(getOrCreateSheet(SHEETS[sheetKey]), id);
    return jsonOut({ ok: ok, deleted: ok });
  }

  return jsonOut({ ok: false, error: 'Ação desconhecida: ' + data.acao });
}
