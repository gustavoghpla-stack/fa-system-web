// ============================================================
//  F&A Higienizações — Google Apps Script v3 (ESTOQUE)
//  Estoque / Movimentos / Veiculos / Abastecimentos
// ============================================================

var SHEETS = {
  estoque:        'Estoque',
  estoque_mov:    'EstoqueMovimentos',
  veiculos:       'Veiculos',
  abastecimentos: 'Abastecimentos',
};

var HEADERS = {
  estoque:        ['id','nome','categoria','unidade','qtdAtual','qtdMinima','localizacao','cadastrado'],
  estoque_mov:    ['id','itemId','itemNome','tipo','qtd','motivo','responsavel','data','cadastrado'],
  veiculos:       ['id','placa','modelo','ano','cor','combustivel','hodometroAtual','cadastrado'],
  abastecimentos: ['id','veiculoId','veiculoPlaca','veiculoModelo','data','horario','hodometro','litros','valorLitro','valorTotal','combustivel','posto','motorista','obs','cadastrado'],
};

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

function jsonToSheet(sheet, rows, headerDef) {
  sheet.clearContents();
  var headers = (rows && rows.length > 0) ? Object.keys(rows[0]) : (headerDef || null);
  if (!headers) return;
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setBackground('#1a1a1a').setFontColor('#d4a017').setFontWeight('bold');
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

function doGet(e) {
  var acao = (e && e.parameter) ? e.parameter.acao : '';
  if (acao === 'ping') return jsonOut({ ok: true, msg: 'FA Estoque OK', version: 3 });
  if (acao === 'get_all') {
    var result = {};
    Object.keys(SHEETS).forEach(function(key) {
      result[key] = sheetToJson(getOrCreateSheet(SHEETS[key]));
    });
    return jsonOut(result);
  }
  return jsonOut({ ok: false, error: 'Ação desconhecida: ' + acao });
}

function doPost(e) {
  var data;
  try { data = JSON.parse(e.postData.contents); }
  catch (err) { return jsonOut({ ok: false, error: 'JSON inválido: ' + err.message }); }

  if (data.acao === 'sync_estoque') {
    jsonToSheet(getOrCreateSheet(SHEETS.estoque),        data.estoque        || [], HEADERS.estoque);
    jsonToSheet(getOrCreateSheet(SHEETS.estoque_mov),    data.estoque_mov    || [], HEADERS.estoque_mov);
    jsonToSheet(getOrCreateSheet(SHEETS.veiculos),       data.veiculos       || [], HEADERS.veiculos);
    jsonToSheet(getOrCreateSheet(SHEETS.abastecimentos), data.abastecimentos || [], HEADERS.abastecimentos);
    return jsonOut({ ok: true });
  }

  if (data.acao === 'delete') {
    var sheetKey = data.sheet;
    if (!sheetKey || !SHEETS[sheetKey]) return jsonOut({ ok: false, error: 'Sheet inválido' });
    var ok = deleteRowById(getOrCreateSheet(SHEETS[sheetKey]), data.id);
    return jsonOut({ ok: ok, deleted: ok });
  }

  return jsonOut({ ok: false, error: 'Ação desconhecida: ' + data.acao });
}
