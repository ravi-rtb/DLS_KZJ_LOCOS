
// IMPORTANT: Replace with the Client ID you created in the Google Cloud Console.
export const GOOGLE_CLIENT_ID = '999272865261-b3vf4mvie07h0ag72taqc2dnatihjhfd.apps.googleusercontent.com';

// IMPORTANT: Replace with the Web app URL you get after deploying your Google Apps Script.
export const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxJuBlj7U5xofUPRBGWX8DaBQv2NrfQS8Q4pyXju8V81X4RZrwNZsg4CZkoN_-mnEK-/exec';

// The unique ID of your Google Sheet.
// Found in the URL: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
export const SPREADSHEET_ID = '1oVY3a7LrG4zn2oVkW88bi31uZqGdw_mb-YHk2-NVqKQ';

// The exact names of the sheets (tabs) in your Google Sheet document.
// If you rename a sheet in your document, you must update it here.
export const SHEET_NAMES = {
  // WAG7 Sheets
  Loco_list: 'Loco_list',
  Loco_Schedules: 'Loco_Schedules',
  Traction_failures: 'Traction_failures',
  WAG7_Modifications: 'WAG7_Modifications',
  
  // WDG4 Sheets
  G4_list: 'G4_list',
  G4_Schedules: 'G4_Schedules',
  G4_Failures: 'G4_Failures',
};

// URL for the external documents folder.
export const DOCUMENTS_URL = 'https://drive.google.com/drive/folders/1CRiiwcqfEJIBEaXvw8ZgWoLGVOP3zjTO?usp=sharing';

// Configuration for the columns to display in the Schedules table.
// 'key' must be the lowercase version of the sheet column header, with no spaces.
// 'header' is the display name in the app's table.
export const LOCO_SCHEDULES_COLUMNS = [
  { key: 'incomingdate', header: 'Incoming Date' },
  { key: 'sch', header: 'Sch' },
  { key: 'outgoingdate', header: 'Outgoing Date' },
];

// Mapping of sheet column keys (lowercase, no spaces/special chars) to user-friendly display labels.
// This allows customizing the display names for details and modifications without changing code.
export const FRIENDLY_LABELS: { [key: string]: string } = {
  locono: 'Loco Number',
  commdate: 'Commissioning Date',
  manuf: 'Manufacturer',
  owningrly: 'Owning Railway',
  owningshed: 'Owning Shed',
  currentstatus: 'Current Status',
  lastsch: 'Last Schedule',
  lastschdate: 'Last Schedule Date',
  homingdate: 'Homing Date',
  dod: 'Date of Despatch',
  sch: 'Schedule',
  remarks: 'Remarks',
};
