/**
 * Reobote Consórcios — Webhook para Google Sheets
 *
 * COMO PUBLICAR:
 * 1. Abra a planilha → Extensões → Apps Script
 * 2. Cole este código
 * 3. Implanta → Nova implantação → Tipo: App da Web
 *    - Executar como: Eu (sua conta Google)
 *    - Quem tem acesso: Qualquer pessoa (anônimo)
 * 4. Copie a URL gerada e cole em CONFIG.WEBHOOK_URL no script.js
 *
 * ABAS NECESSÁRIAS NA PLANILHA:
 *   - candidatosComCarro
 *   - candidatosSemCarro
 *
 * COLUNAS (A → H):
 *   A: Nome | B: Telefone | C: Idade | D: E-mail |
 *   E: CPF (vazio) | F: Possui Veículo | G: Sobre | H: Cidade
 */

var SPREADSHEET_ID = '1469257025'; // ← confirme este ID na URL da sua planilha

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);

    var tabName = data.possuiCarro === 'SIM' ? 'candidatosComCarro' : 'candidatosSemCarro';
    var sheet = spreadsheet.getSheetByName(tabName);

    if (!sheet) {
      return jsonResponse({ result: 'error', message: 'Aba "' + tabName + '" não encontrada na planilha.' });
    }

    /* Cabeçalho automático se a planilha estiver vazia */
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Nome', 'Telefone', 'Idade', 'E-mail', 'CPF', 'Possui Veículo', 'Sobre', 'Cidade']);
    }

    sheet.appendRow([
      sanitize(data.nome),
      sanitize(data.telefone),
      sanitize(data.idade),
      sanitize(data.email),
      '',                        // CPF — reservado para uso futuro
      sanitize(data.possuiCarro),
      sanitize(data.sobre),
      'Campo Grande',
    ]);

    /* Marca timestamp na coluna I (opcional) */
    var lastRow = sheet.getLastRow();
    sheet.getRange(lastRow, 9).setValue(new Date());

    return jsonResponse({ result: 'success' });

  } catch (err) {
    return jsonResponse({ result: 'error', error: err.toString() });
  }
}

/* Garante que o valor é string limpa */
function sanitize(val) {
  if (val === null || val === undefined) return '';
  return String(val).trim().slice(0, 2000); // limite de segurança
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* Teste manual — rode esta função no editor do Apps Script para validar */
function _testeManual() {
  var fakeEvent = {
    postData: {
      contents: JSON.stringify({
        nome:        'João Teste',
        telefone:    '+55 (67) 99999-9999',
        idade:       '28',
        email:       'joao@teste.com',
        possuiCarro: 'SIM',
        sobre:       'Tenho 3 anos de experiência em vendas.',
      })
    }
  };
  Logger.log(doPost(fakeEvent).getContent());
}
