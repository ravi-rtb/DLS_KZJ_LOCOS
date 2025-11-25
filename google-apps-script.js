
// =================================================================================
// Loco Data Summary - Backend Script (Update v2)
// =================================================================================
// INSTRUCTIONS:
// 1. Paste this code into your Google Apps Script editor (Extensions > Apps Script).
// 2. FILL IN THE 'MASTER_SPREADSHEET_ID' below with the ID of your ORIGINAL data sheet.
// 3. FILL IN the sheet names exactly as they appear in your Original Master Sheet.
// 4. Deploy: Deploy > Manage deployments > Edit > Version: New > Deploy.
// =================================================================================

// --- CONFIGURATION ---

// 1. [REQUIRED] The ID of the ORIGINAL Master Google Sheet where the actual data lives.
//    (This is different from the sheet the web app reads, if you are using imports).
const MASTER_SPREADSHEET_ID = 'ENTER_YOUR_ORIGINAL_SHEET_ID_HERE'; 

// 2. [REQUIRED] The names of the tabs in the MASTER sheet to be edited.
const WAG7_MASTER_TAB_NAME = '22-23 Traction Failures'; 
const WDG4_MASTER_TAB_NAME = '22-23 Diesel Failures'; 

// 3. [REQUIRED] Authorized Editors
const AUTHORIZED_USERS = [
  'techcelljedslkzj@gmail.com',
  'techcelldlskzj@gmail.com',
  'brt1179fl@gmail.com',
  'sseelabdlskzj@gmail.com'
];

// 4. Client ID (Validation)
const GOOGLE_CLIENT_ID = '999272865261-b3vf4mvie07h0ag72taqc2dnatihjhfd.apps.googleusercontent.com';

// --- MAIN LOGIC ---

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const { locoNo, dateFailed, newCauseOfFailure, idToken, locoType, responsibility } = payload;

    // --- 1. Validation ---
    if (!idToken) return createJsonResponse({ status: 'error', message: 'Missing auth token.' }, 401);
    if (!locoNo || !dateFailed || newCauseOfFailure === undefined) {
      return createJsonResponse({ status: 'error', message: 'Missing required fields.' }, 400);
    }
    if (locoType !== 'WAG7' && locoType !== 'WDG4') {
       return createJsonResponse({ status: 'error', message: 'Invalid Loco Type.' }, 400);
    }

    // --- 2. Authentication & Authorization ---
    const userEmail = validateTokenAndGetUserEmail(idToken);
    if (!userEmail) return createJsonResponse({ status: 'error', message: 'Invalid token.' }, 401);

    if (AUTHORIZED_USERS.indexOf(userEmail) === -1) {
      return createJsonResponse({ status: 'error', message: `User ${userEmail} is not authorized.` }, 403);
    }

    // --- 3. Open the MASTER Spreadsheet ---
    let spreadsheet;
    try {
      spreadsheet = SpreadsheetApp.openById(MASTER_SPREADSHEET_ID);
    } catch (err) {
      return createJsonResponse({ status: 'error', message: 'Could not open Master Spreadsheet. Check ID in script.' }, 500);
    }

    // --- 4. Select the Correct Sheet ---
    const targetSheetName = (locoType === 'WAG7') ? WAG7_MASTER_TAB_NAME : WDG4_MASTER_TAB_NAME;
    const sheet = spreadsheet.getSheetByName(targetSheetName);
    
    if (!sheet) {
      return createJsonResponse({ status: 'error', message: `Sheet '${targetSheetName}' not found in Master Spreadsheet.` }, 404);
    }

    // --- 5. Find and Update the Row ---
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();       // Raw values
    const displayValues = dataRange.getDisplayValues(); // Formatted values (dates)
    
    // Normalize headers to find column indexes
    const headers = values[0].map(h => String(h).toLowerCase().replace(/\s/g, '').replace(/[^a-z0-9]/gi, ''));
    
    // Determine column mapping based on Loco Type (WDG4 headers might differ slightly)
    const locoNoCol = headers.findIndex(h => h === 'locono' || h === 'loco');
    // WDG4 sometimes uses 'dateoffailure', WAG7 uses 'datefailed'
    const dateFailedCol = headers.findIndex(h => h === 'datefailed' || h === 'dateoffailure');
    // WDG4 uses 'shedinvestigation', WAG7 uses 'causeoffailure'
    const causeCol = headers.findIndex(h => h === 'causeoffailure' || h === 'shedinvestigation');

    if (locoNoCol === -1 || dateFailedCol === -1 || causeCol === -1) {
      return createJsonResponse({ status: 'error', message: `Required columns not found in '${targetSheetName}'.` }, 500);
    }

    let recordFound = false;

    // Iterate to find the matching row
    for (let i = 1; i < values.length; i++) {
      // Compare Raw Loco No AND Formatted Date
      // We use loose equality (==) for Loco No to handle string/number differences
      if (values[i][locoNoCol] == locoNo && displayValues[i][dateFailedCol] == dateFailed) {
        
        const cell = sheet.getRange(i + 1, causeCol + 1);
        const oldCause = cell.getValue();

        // Update the cell
        cell.setValue(newCauseOfFailure);

        // --- 6. Log the Change ---
        logChange(spreadsheet, locoType, userEmail, locoNo, dateFailed, responsibility, oldCause, newCauseOfFailure);

        recordFound = true;
        break; 
      }
    }

    if (recordFound) {
      return createJsonResponse({ status: 'success', message: 'Record updated and logged successfully.' });
    } else {
      return createJsonResponse({ 
        status: 'error', 
        message: `Record not found in Master Sheet for Loco ${locoNo} on ${dateFailed}.` 
      }, 404);
    }

  } catch (error) {
    return createJsonResponse({ status: 'error', message: `Server Error: ${error.message}` }, 500);
  }
}

/**
 * Appends a log entry to a specific log sheet in the Master Spreadsheet.
 */
function logChange(spreadsheet, locoType, userEmail, locoNo, dateFailed, responsibility, oldVal, newVal) {
  const logSheetName = `${locoType}_Edit_Log`; // e.g. "WAG7_Edit_Log"
  let logSheet = spreadsheet.getSheetByName(logSheetName);

  // Create log sheet if it doesn't exist
  if (!logSheet) {
    logSheet = spreadsheet.insertSheet(logSheetName);
    logSheet.appendRow(['Timestamp', 'User Email', 'Loco No', 'Date Failed', 'Responsibility', 'Old Cause', 'New Cause']);
    logSheet.setFrozenRows(1);
    logSheet.getRange('A1:G1').setFontWeight('bold');
  }

  // Append the log entry
  logSheet.appendRow([
    new Date(),
    userEmail,
    locoNo,
    dateFailed,
    responsibility || 'N/A',
    oldVal,
    newVal
  ]);
}

/**
 * Validates Google ID Token
 */
function validateTokenAndGetUserEmail(idToken) {
  try {
    const response = UrlFetchApp.fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
    const payload = JSON.parse(response.getContentText());
    if (payload.email && payload.email_verified) {
      return payload.email;
    }
    return null;
  } catch (e) {
    return null;
  }
}

function createJsonResponse(data, statusCode = 200) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
