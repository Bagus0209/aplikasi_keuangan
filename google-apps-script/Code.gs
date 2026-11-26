/**
 * KASPRESISI - BACKEND GOOGLE APPS SCRIPT (GOOGLE SHEET + GOOGLE DRIVE PRIBADI)
 * Tempelkan seluruh kode ini ke menu Extensions > Apps Script di Google Sheet Anda.
 *
 * Langkah awal:
 * 1. Ubah DEFAULT_SECRET_PIN di bawah ini dengan PIN/kata sandi rahasia pilihan Anda.
 * 2. Jalankan fungsi `setupDatabase` satu kali dari toolbar Apps Script untuk membuat
 *    tab Rekening, Transaksi, Transfer, Pengaturan, serta folder Google Drive bukti struk,
 *    dan memberikan izin akses ke akun Google Anda sendiri.
 * 3. Klik Deploy > New deployment > Select type: Web app
 *    - Execute as: Me (email Anda)
 *    - Who has access: Anyone
 * 4. Salin Web App URL dan masukkan bersama PIN Anda di menu Pengaturan aplikasi KasPresisi.
 */

const DEFAULT_SECRET_PIN = "123456"; // <-- GANTI DENGAN PIN / KATA SANDI PRIBADI ANDA
const DRIVE_FOLDER_NAME = "KasPresisi - Bukti Struk Keuangan";

const SHEET_ACCOUNTS = "Rekening";
const SHEET_TRANSACTIONS = "Transaksi";
const SHEET_TRANSFERS = "Transfer";
const SHEET_SETTINGS = "Pengaturan";

/**
 * Jalankan fungsi ini 1x dari editor Apps Script untuk menyiapkan seluruh tabel & folder Drive.
 */
function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  ensureSheet_(ss, SHEET_ACCOUNTS, [
    "id",
    "nama",
    "tipe",
    "nomor_masked",
    "peran",
    "saldo_awal",
    "saldo_saat_ini",
    "dibuat_pada",
    "aktif"
  ]);

  ensureSheet_(ss, SHEET_TRANSACTIONS, [
    "id",
    "tanggal",
    "waktu",
    "jenis",
    "nominal",
    "kategori",
    "catatan",
    "rekening_id",
    "rekening_nama",
    "saldo_sebelum",
    "saldo_sesudah",
    "bukti_file_id",
    "bukti_url",
    "dibuat_pada"
  ]);

  ensureSheet_(ss, SHEET_TRANSFERS, [
    "id",
    "tanggal",
    "waktu",
    "dari_rekening_id",
    "dari_rekening_nama",
    "ke_rekening_id",
    "ke_rekening_nama",
    "nominal",
    "biaya_admin",
    "catatan",
    "saldo_asal_sesudah",
    "saldo_tujuan_sesudah",
    "dibuat_pada"
  ]);

  const settingsSheet = ensureSheet_(ss, SHEET_SETTINGS, ["kunci", "nilai"]);
  const settingsMap = getSettingsMap_(settingsSheet);

  if (!settingsMap.secret_pin) {
    setSetting_(settingsSheet, "secret_pin", DEFAULT_SECRET_PIN);
  }

  if (!settingsMap.drive_folder_id) {
    const folderId = getOrCreateReceiptFolder_();
    setSetting_(settingsSheet, "drive_folder_id", folderId);
  }

  return {
    ok: true,
    message: "Database Google Sheet dan folder Google Drive KasPresisi siap digunakan."
  };
}

function doGet() {
  return jsonResponse_({
    ok: true,
    service: "KasPresisi Personal Finance API",
    status: "ready"
  });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse_({ ok: false, error: "Body permintaan kosong." });
    }

    const req = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    setupDatabase();

    const settingsSheet = ss.getSheetByName(SHEET_SETTINGS);
    const settings = getSettingsMap_(settingsSheet);
    const expectedPin = String(settings.secret_pin || DEFAULT_SECRET_PIN).trim();

    if (String(req.token || "").trim() !== expectedPin) {
      return jsonResponse_({
        ok: false,
        error: "PIN / Kunci Rahasia tidak cocok. Periksa PIN di Pengaturan Google Sheet."
      });
    }

    switch (req.action) {
      case "ping":
        return jsonResponse_({
          ok: true,
          spreadsheetName: ss.getName(),
          spreadsheetUrl: ss.getUrl()
        });

      case "syncAll":
        return jsonResponse_(handleSyncAll_(ss));

      case "addAccount":
        return jsonResponse_(handleAddAccount_(ss, req.payload));

      case "deleteAccount":
        return jsonResponse_(handleDeleteAccount_(ss, req.payload));

      case "addTransaction":
        return jsonResponse_(handleAddTransaction_(ss, settings, req.payload));

      case "deleteTransaction":
        return jsonResponse_(handleDeleteTransaction_(ss, req.payload));

      case "addTransfer":
        return jsonResponse_(handleAddTransfer_(ss, req.payload));

      default:
        return jsonResponse_({ ok: false, error: "Aksi tidak dikenali: " + req.action });
    }
  } catch (err) {
    return jsonResponse_({
      ok: false,
      error: err && err.message ? err.message : String(err)
    });
  } finally {
    lock.releaseLock();
  }
}

function handleSyncAll_(ss) {
  const accounts = readObjects_(ss.getSheetByName(SHEET_ACCOUNTS))
    .filter(function (r) {
      return String(r.aktif) !== "false";
    })
    .map(function (r) {
      return {
        id: String(r.id),
        name: String(r.nama),
        type: String(r.tipe || "bank"),
        maskedNumber: String(r.nomor_masked || ""),
        roleTag: String(r.peran || ""),
        initialBalance: Number(r.saldo_awal) || 0,
        balance: Number(r.saldo_saat_ini) || 0,
        createdAt: String(r.dibuat_pada || "")
      };
    });

  const transactions = readObjects_(ss.getSheetByName(SHEET_TRANSACTIONS)).map(function (r) {
    return {
      id: String(r.id),
      date: formatDateCell_(r.tanggal),
      time: formatTimeCell_(r.waktu),
      kind: String(r.jenis) === "income" ? "income" : "expense",
      amount: Number(r.nominal) || 0,
      category: String(r.kategori || "Umum"),
      note: String(r.catatan || ""),
      accountId: String(r.rekening_id),
      accountName: String(r.rekening_nama || ""),
      balanceBefore: Number(r.saldo_sebelum) || 0,
      balanceAfter: Number(r.saldo_sesudah) || 0,
      receiptFileId: String(r.bukti_file_id || ""),
      receiptUrl: String(r.bukti_url || ""),
      createdAt: String(r.dibuat_pada || "")
    };
  });

  const transfers = readObjects_(ss.getSheetByName(SHEET_TRANSFERS)).map(function (r) {
    return {
      id: String(r.id),
      date: formatDateCell_(r.tanggal),
      time: formatTimeCell_(r.waktu),
      fromAccountId: String(r.dari_rekening_id),
      fromAccountName: String(r.dari_rekening_nama || ""),
      toAccountId: String(r.ke_rekening_id),
      toAccountName: String(r.ke_rekening_nama || ""),
      amount: Number(r.nominal) || 0,
      adminFee: Number(r.biaya_admin) || 0,
      note: String(r.catatan || ""),
      fromBalanceAfter: Number(r.saldo_asal_sesudah) || 0,
      toBalanceAfter: Number(r.saldo_tujuan_sesudah) || 0,
      createdAt: String(r.dibuat_pada || "")
    };
  });

  return {
    ok: true,
    spreadsheetName: ss.getName(),
    spreadsheetUrl: ss.getUrl(),
    accounts: accounts,
    transactions: transactions.reverse(),
    transfers: transfers.reverse()
  };
}

function handleAddAccount_(ss, payload) {
  const sheet = ss.getSheetByName(SHEET_ACCOUNTS);
  const id = String(payload.id || "acc_" + new Date().getTime());
  const initialBalance = Number(payload.initialBalance) || 0;
  const nowIso = new Date().toISOString();

  sheet.appendRow([
    id,
    String(payload.name || "Rekening Baru"),
    String(payload.type || "bank"),
    String(payload.maskedNumber || ""),
    String(payload.roleTag || "Rekening Aktif"),
    initialBalance,
    initialBalance,
    nowIso,
    "true"
  ]);

  return handleSyncAll_(ss);
}

function handleDeleteAccount_(ss, payload) {
  const sheet = ss.getSheetByName(SHEET_ACCOUNTS);
  const data = sheet.getDataRange().getValues();
  const targetId = String(payload.id || "");

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === targetId) {
      sheet.getRange(i + 1, 9).setValue("false");
      break;
    }
  }
  return handleSyncAll_(ss);
}

function handleAddTransaction_(ss, settings, payload) {
  const accSheet = ss.getSheetByName(SHEET_ACCOUNTS);
  const txSheet = ss.getSheetByName(SHEET_TRANSACTIONS);

  const accRow = findAccountRow_(accSheet, String(payload.accountId));
  if (!accRow) {
    throw new Error("Rekening tujuan tidak ditemukan di Google Sheet.");
  }

  const amount = Math.abs(Number(payload.amount) || 0);
  if (amount <= 0) {
    throw new Error("Nominal transaksi harus lebih dari Rp 0.");
  }

  const kind = payload.kind === "income" ? "income" : "expense";
  const balanceBefore = Number(accRow.balance) || 0;
  const balanceAfter = kind === "income" ? balanceBefore + amount : balanceBefore - amount;

  var receiptFileId = "";
  var receiptUrl = "";
  if (payload.receiptBase64) {
    const savedFile = saveReceiptToDrive_(
      settings.drive_folder_id,
      payload.receiptBase64,
      payload.receiptFileName || ("struk_" + payload.date + "_" + new Date().getTime() + ".jpg")
    );
    receiptFileId = savedFile.id;
    receiptUrl = savedFile.url;
  }

  accSheet.getRange(accRow.rowIndex, 7).setValue(balanceAfter);

  const id = String(payload.id || "tx_" + new Date().getTime());
  txSheet.appendRow([
    id,
    "'" + String(payload.date),
    "'" + String(payload.time),
    kind,
    amount,
    String(payload.category || "Umum"),
    String(payload.note || ""),
    accRow.id,
    accRow.name,
    balanceBefore,
    balanceAfter,
    receiptFileId,
    receiptUrl,
    new Date().toISOString()
  ]);

  return handleSyncAll_(ss);
}

function handleDeleteTransaction_(ss, payload) {
  const txSheet = ss.getSheetByName(SHEET_TRANSACTIONS);
  const accSheet = ss.getSheetByName(SHEET_ACCOUNTS);
  const data = txSheet.getDataRange().getValues();
  const targetId = String(payload.id || "");

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === targetId) {
      const kind = String(data[i][3]);
      const amount = Number(data[i][4]) || 0;
      const accountId = String(data[i][7]);
      const accRow = findAccountRow_(accSheet, accountId);
      if (accRow) {
        const reverted = kind === "income" ? accRow.balance - amount : accRow.balance + amount;
        accSheet.getRange(accRow.rowIndex, 7).setValue(reverted);
      }
      txSheet.deleteRow(i + 1);
      break;
    }
  }
  return handleSyncAll_(ss);
}

function handleAddTransfer_(ss, payload) {
  const accSheet = ss.getSheetByName(SHEET_ACCOUNTS);
  const trfSheet = ss.getSheetByName(SHEET_TRANSFERS);

  const fromId = String(payload.fromAccountId || "");
  const toId = String(payload.toAccountId || "");
  if (!fromId || !toId || fromId === toId) {
    throw new Error("Rekening sumber dan tujuan harus berbeda.");
  }

  const fromAcc = findAccountRow_(accSheet, fromId);
  const toAcc = findAccountRow_(accSheet, toId);
  if (!fromAcc || !toAcc) {
    throw new Error("Rekening sumber atau tujuan tidak ditemukan.");
  }

  const amount = Math.abs(Number(payload.amount) || 0);
  const adminFee = Math.max(0, Number(payload.adminFee) || 0);
  if (amount <= 0) {
    throw new Error("Nominal pemindahan harus lebih dari Rp 0.");
  }

  const totalDeducted = amount + adminFee;
  if (fromAcc.balance < totalDeducted) {
    throw new Error("Saldo rekening sumber tidak mencukupi untuk nominal dan biaya admin.");
  }

  const fromAfter = fromAcc.balance - totalDeducted;
  const toAfter = toAcc.balance + amount;

  accSheet.getRange(fromAcc.rowIndex, 7).setValue(fromAfter);
  accSheet.getRange(toAcc.rowIndex, 7).setValue(toAfter);

  const id = String(payload.id || "trf_" + new Date().getTime());
  trfSheet.appendRow([
    id,
    "'" + String(payload.date),
    "'" + String(payload.time),
    fromAcc.id,
    fromAcc.name,
    toAcc.id,
    toAcc.name,
    amount,
    adminFee,
    String(payload.note || ""),
    fromAfter,
    toAfter,
    new Date().toISOString()
  ]);

  return handleSyncAll_(ss);
}

function findAccountRow_(accSheet, accountId) {
  const data = accSheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === accountId && String(data[i][8]) !== "false") {
      return {
        rowIndex: i + 1,
        id: String(data[i][0]),
        name: String(data[i][1]),
        balance: Number(data[i][6]) || 0
      };
    }
  }
  return null;
}

function saveReceiptToDrive_(folderId, dataUrlOrBase64, fileName) {
  var folder;
  try {
    folder = folderId ? DriveApp.getFolderById(folderId) : null;
  } catch (_) {
    folder = null;
  }
  if (!folder) {
    folder = DriveApp.getFolderById(getOrCreateReceiptFolder_());
  }

  var rawBase64 = String(dataUrlOrBase64);
  var mimeType = "image/jpeg";
  if (rawBase64.indexOf("base64,") !== -1) {
    const parts = rawBase64.split("base64,");
    const header = parts[0];
    rawBase64 = parts[1];
    const mimeMatch = header.match(/data:([^;]+);/);
    if (mimeMatch && mimeMatch[1]) {
      mimeType = mimeMatch[1];
    }
  }

  const bytes = Utilities.base64Decode(rawBase64);
  const blob = Utilities.newBlob(bytes, mimeType, fileName);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return {
    id: file.getId(),
    url: "https://drive.google.com/uc?export=view&id=" + file.getId()
  };
}

function getOrCreateReceiptFolder_() {
  const existing = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);
  if (existing.hasNext()) {
    return existing.next().getId();
  }
  return DriveApp.createFolder(DRIVE_FOLDER_NAME).getId();
}

function ensureSheet_(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground("#0B1220");
    headerRange.setFontColor("#FFFFFF");
    headerRange.setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getSettingsMap_(sheet) {
  const rows = sheet.getDataRange().getValues();
  const map = {};
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0]) {
      map[String(rows[i][0])] = String(rows[i][1]);
    }
  }
  return map;
}

function setSetting_(sheet, key, value) {
  const rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === key) {
      sheet.getRange(i + 1, 2).setValue(value);
      return;
    }
  }
  sheet.appendRow([key, value]);
}

function readObjects_(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  const headers = values[0].map(function (h) {
    return String(h).trim();
  });
  const list = [];
  for (var i = 1; i < values.length; i++) {
    const row = values[i];
    if (!row[0]) continue;
    const obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j];
    }
    list.push(obj);
  }
  return list;
}

function formatDateCell_(val) {
  if (!val) return "";
  if (Object.prototype.toString.call(val) === "[object Date]") {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return String(val).replace(/^'/, "");
}

function formatTimeCell_(val) {
  if (!val) return "";
  if (Object.prototype.toString.call(val) === "[object Date]") {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), "HH:mm");
  }
  return String(val).replace(/^'/, "");
}

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
