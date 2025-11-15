// =================================================================================
// Loco Data Summary - Google Apps Script Backend (v10 - Corrected Config)
// =================================================================================
// INSTRUCTIONS:
// 1. Paste this entire script into the Code.gs file in your Google Sheet's
//    Apps Script editor (Extensions > Apps Script), replacing any old script.
// 2. The configuration below has been updated based on your feedback. Please verify it is correct.
// 3. Deploy the script: Deploy > Manage deployments > Edit (pencil icon) > Version: New version > Deploy.
// 4. Grant permissions if prompted.
// 5. You DO NOT need to copy the URL again. Updating the deployment keeps the same URL.
// =================================================================================


// --- CONFIGURATION ---

// 1. [IMPORTANT] This is the ID of the ORIGINAL master spreadsheet where edits and logs are saved.
const SPREADSHEET_ID = '1M3dxz195hLWXDLgj8au7WX2mDvoMXjhVkA1wQ7UC0xc'; // <-- CORRECTED SPREADSHEET ID

// 2. [REQUIRED] Add the Google email addresses of users allowed to edit.
const AUTHORIZED_USERS = [
  'techcelljedslkzj@gmail.com',
  'techcelldlskzj@gmail.com',
  'brt1179fl@gmail.com',
  'sseelabdlskzj@gmail.com'
  // Add more emails here inside the brackets, separated by commas.
];

// 3. [REQUIRED] Paste your Google Client ID from the `constants.ts` file here.
const GOOGLE_CLIENT_ID = '999272865261-b3vf4mvie07h0ag72taqc2dnatihjhfd.apps.googleusercontent.com';

// 4. [REQUIRED] The names of the sheets containing failure data.
//    These MUST exactly match the names in your Google Sheet document.
const WAG7_FAILURES_SHEET = '22-23 Traction Failures'; // <-- CORRECTED SHEET NAME
const WDG4_FAILURES_SHEET = '22-23 Diesel Failures'; // <-- CORRECTED SHEET NAME

// 5. Edit logs will be automatically created in sheets named 'WAG7_Edit_Log' and 'WDG4_Edit_Log'.


// --- DO NOT EDIT BELOW THIS LINE ---


/**
 * Handles POST requests from the web application to update a cell.
 */
function doPost(e) {
  Logger.log('doPost: Script execution started.');
  let spreadsheet;
  try {
    spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    if (!spreadsheet) {
      Logger.log(`doPost: ERROR - Could not open spreadsheet with ID: ${SPREADSHEET_ID}.`);
      throw new Error(`Could not open spreadsheet with ID: ${SPREADSHEET_ID}. Please check the ID in the script configuration.`);
    }
    Logger.log('doPost: Spreadsheet opened successfully.');

    const payload = JSON.parse(e.postData.contents);
    const {
      locoNo,
      dateFailed,
      newCauseOfFailure,
      responsibility,
      locoType,
      idToken
    } = payload;
    Logger.log(`doPost: Payload parsed for loco #${locoNo || 'UNKNOWN'}.`);

    // --- 1. Validate Incoming Data with Specific Error Messages ---
    const missingFields = [];
    if (!idToken) missingFields.push('idToken');
    if (!locoNo) missingFields.push('locoNo');
    if (!dateFailed) missingFields.push('dateFailed');
    if (newCauseOfFailure === undefined) missingFields.push('newCauseOfFailure');
    if (locoType !== 'WAG7' && locoType !== 'WDG4') missingFields.push('locoType (must be "WAG7" or "WDG4")');

    if (missingFields.length > 0) {
      const message = `The following required data fields were missing or invalid in the request: ${missingFields.join(', ')}. Please try a hard refresh (Ctrl+Shift+R) of the web app.`;
      Logger.log(`doPost: ERROR - ${message}`);
      return createJsonResponse({ status: 'error', message: message }, 400);
    }
    Logger.log('doPost: Payload validation passed.');

    // --- 2. Authenticate & Authorize User ---
    const userEmail = validateTokenAndGetUserEmail(idToken);
    if (!userEmail) {
      Logger.log('doPost: ERROR - Token validation failed.');
      return createJsonResponse({ status: 'error', message: 'Invalid or expired token. Please sign in again.' }, 401);
    }
    if (AUTHORIZED_USERS.indexOf(userEmail) === -1) {
      Logger.log(`doPost: ERROR - Unauthorized user: ${userEmail}.`);
      return createJsonResponse({ status: 'error', message: `User '${userEmail}' is not authorized to perform this action.` }, 403);
    }
    Logger.log(`doPost: User '${userEmail}' authenticated and authorized.`);

    // --- 3. Access the Correct Data Sheet based on locoType ---
    const dataSheetName = locoType === 'WAG7' ? WAG7_FAILURES_SHEET : WDG4_FAILURES_SHEET;
    const sheet = spreadsheet.getSheetByName(dataSheetName);
    if (!sheet) {
      Logger.log(`doPost: ERROR - Sheet named '${dataSheetName}' not found.`);
      throw new Error(`Sheet named '${dataSheetName}' not found. Please check your script configuration.`);
    }
    Logger.log(`doPost: Accessed data sheet '${dataSheetName}'.`);

    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    const displayValues = dataRange.getDisplayValues();

    const headers = values[0].map(h => String(h).toLowerCase().replace(/\s/g, '').replace(/[^a-z0-9]/gi, ''));

    const locoNoCol = headers.includes('locono') ? headers.indexOf('locono') : headers.indexOf('loco');
    const dateFailedCol = headers.includes('datefailed') ? headers.indexOf('datefailed') : headers.indexOf('dateoffailure');
    const causeCol = headers.includes('causeoffailure') ? headers.indexOf('causeoffailure') : headers.indexOf('shedinvestigation');

    if (locoNoCol === -1 || dateFailedCol === -1 || causeCol === -1) {
      Logger.log('doPost: ERROR - Could not find required columns in the sheet.');
      throw new Error(`Could not find required columns (Loco No, Date Failed, Cause of Failure) in sheet '${dataSheetName}'.`);
    }

    // --- 4. Find Matching Row and Update ---
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][locoNoCol]) == locoNo && displayValues[i][dateFailedCol] == dateFailed) {
        Logger.log(`doPost: Found matching row at index ${i + 1}.`);
        const cellToUpdate = sheet.getRange(i + 1, causeCol + 1);
        const oldCauseOfFailure = cellToUpdate.getValue();

        cellToUpdate.setValue(newCauseOfFailure);
        Logger.log('doPost: Cell updated in sheet.');

        // --- 5. Log the Change ---
        const logResult = logChange(spreadsheet, userEmail, locoNo, dateFailed, oldCauseOfFailure, newCauseOfFailure, responsibility, locoType);

        if (!logResult.success) {
          Logger.log(`doPost: ERROR - Logging failed. Reason: ${logResult.error}`);
          return createJsonResponse({
              status: 'error',
              message: `The record was updated successfully, but the change could not be recorded in the log. Reason: ${logResult.error}`
          });
        }

        Logger.log('doPost: Logging successful. Sending success response.');
        return createJsonResponse({ status: 'success', message: `Record for Loco #${locoNo} on ${dateFailed} updated successfully.` });
      }
    }

    Logger.log(`doPost: WARNING - No matching row found for Loco #${locoNo} on date ${dateFailed}. Checked ${values.length - 1} rows.`);
    const debugMessage = `Matching record not found for Loco #${locoNo} on date ${dateFailed}. Checked ${values.length - 1} rows in sheet '${dataSheetName}'. Please ensure the date format in the master Google Sheet is identical to the one displayed in the app.`;
    return createJsonResponse({ status: 'error', message: debugMessage }, 404);

  } catch (error) {
    Logger.log(`[FATAL ERROR] doPost: ${error.stack}`);
    return createJsonResponse({ status: 'error', message: `An internal server error occurred: ${error.message}` }, 500);
  }
}

/**
 * Logs the details of an edit to a separate sheet named based on loco type.
 * @returns {{success: boolean, error?: string}}
 */
function logChange(spreadsheet, userEmail, locoNo, dateFailed, oldCause, newCause, responsibility, locoType) {
  const logSheetName = `${locoType}_Edit_Log`; // e.g., "WAG7_Edit_Log"
  Logger.log(`logChange: Attempting to log change for loco #${locoNo} to sheet '${logSheetName}'.`);
  try {
    let logSheet = spreadsheet.getSheetByName(logSheetName);
    if (!logSheet) {
      Logger.log(`logChange: Log sheet '${logSheetName}' not found. Creating it.`);
      logSheet = spreadsheet.insertSheet(logSheetName);
      const headers = ['Timestamp', 'User Email', 'Loco No', 'Date Failed', 'Responsibility', 'Old Cause of Failure', 'New Cause of Failure'];
      logSheet.appendRow(headers);
      logSheet.setFrozenRows(1);
      logSheet.getRange('A1:G1').setFontWeight('bold');
    } else {
      Logger.log(`logChange: Found existing log sheet '${logSheetName}'.`);
    }

    const logData = [new Date(), userEmail, locoNo, dateFailed, responsibility || 'N/A', oldCause, newCause];
    logSheet.appendRow(logData);
    Logger.log('logChange: Appended new row to log sheet.');

    SpreadsheetApp.flush();
    Logger.log('logChange: Spreadsheet flushed. Log entry committed.');

    return { success: true };
  } catch (e) {
    const attemptedData = JSON.stringify([new Date(), userEmail, locoNo, dateFailed, responsibility || 'N/A', oldCause, newCause]);
    Logger.log(`[ERROR] logChange failed: ${e.message}. Stack: ${e.stack}. Attempted to log data: ${attemptedData}`);
    return { success: false, error: e.message };
  }
}

/**
 * Validates a Google ID token and returns the user's email if valid.
 */
function validateTokenAndGetUserEmail(idToken) {
  try {
    const response = UrlFetchApp.fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
    const payload = JSON.parse(response.getContentText());

    if (payload.aud !== GOOGLE_CLIENT_ID) {
      Logger.log('Token validation failed: Audience mismatch.');
      return null;
    }
    if (payload.email && payload.email_verified) {
      return payload.email;
    }
    Logger.log('Token validation failed: Email not present or not verified.');
    return null;
  } catch (e) {
    Logger.log(`Token validation fetch failed: ${e.message}`);
    return null;
  }
}

/**
 * Helper function to create a JSON response for the web app.
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
