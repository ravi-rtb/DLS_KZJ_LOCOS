import { SPREADSHEET_ID, SHEET_NAMES } from '../constants';
import type { LocoDetails, LocoSchedule, TractionFailure, WAG7Modification } from '../types';

/**
 * Parses the JSON response from the Google Sheets Gviz API into a clean array of objects.
 * This handles the JSONP wrapper and potential security prefixes.
 * @param jsonString The raw text response from the fetch call.
 * @param normalizeKeys Whether to convert headers to normalized keys (lowercase, no spaces).
 * @returns A cleaned array of objects.
 */
const parseGvizData = <T,>(jsonString: string, normalizeKeys: boolean = true): T[] => {
  const prefix = 'google.visualization.Query.setResponse(';
  
  const startIndex = jsonString.indexOf(prefix);
  if (startIndex === -1) {
    throw new Error("Invalid response format from Google Sheets. Is the sheet shared publicly ('Anyone with the link can view')?");
  }
  
  // Extract the JSON part from the response string, which is inside the wrapper.
  const jsonPart = jsonString.substring(startIndex + prefix.length, jsonString.length - 2);
  const json = JSON.parse(jsonPart);

  // The API can return an error status in the JSON payload.
  if (json.status === 'error') {
    throw new Error(`Google Sheets API Error: ${json.errors.map((e: any) => e.detailed_message).join(', ')}`);
  }

  const { table } = json;
  if (!table || !table.cols || !table.rows) {
    return []; // Return empty if the table structure is missing
  }

  const cols = table.cols.map((col: { label: string; }) => {
    if (!col || !col.label) return '';
    if (normalizeKeys) {
      // Use column labels as keys, normalizing them (e.g., "LOCO No." -> "locono").
      return col.label.toLowerCase().replace(/\s/g, '').replace(/[^a-z0-9]/gi, '');
    }
    // Return the raw, original header from the sheet
    return col.label;
  });
  
  return table.rows.map((row: { c: ({ v: any; f?: string } | null)[]; }) => {
    const newRow: { [key: string]: any } = {};
    cols.forEach((colName: string, index: number) => {
      if (!colName) return; // Skip columns that didn't have a valid header.
      
      const cell = row.c[index];
      // Coerce all values to strings for consistency.
      // Use the formatted value 'f' (e.g., for dates) if available, otherwise use the raw value 'v'.
      if (cell === null || cell.v === null) {
        newRow[colName] = '';
      } else if (cell.f) {
        newRow[colName] = cell.f;
      } else {
        newRow[colName] = String(cell.v);
      }
    });
    return newRow as T;
  });
};

/**
 * Fetches data from a specific sheet by its name using the Gviz API.
 * @param sheetName The exact name of the sheet tab to fetch.
 * @param normalizeKeys Whether to normalize column headers into keys.
 * @returns A promise that resolves to the parsed data from the sheet.
 */
const fetchSheet = async <T,>(sheetName: string, normalizeKeys: boolean = true): Promise<T[]> => {
    // Use the default Gviz endpoint. The parser is designed to handle its JSONP response.
    const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?sheet=${encodeURIComponent(sheetName)}`;
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Failed to fetch sheet "${sheetName}". Status: ${response.status}. Check if the spreadsheet ID is correct and sharing is set to 'Anyone with the link'.`);
    }

    const text = await response.text();
    return parseGvizData<T>(text, normalizeKeys);
};

// Helper to find the key for 'locono' in an object with arbitrary keys.
const findLocoNumberKey = (obj: { [key: string]: any }): string | undefined => {
    if (!obj) return undefined;
    return Object.keys(obj).find(k => 
        k.toLowerCase().replace(/\s/g, '').replace(/[^a-z0-9]/gi, '') === 'locono'
    );
};

/**
 * Fetches all locomotive numbers from the Loco_list sheet.
 * @returns An array of all locomotive numbers as strings.
 */
export const getAllLocoNumbers = async (): Promise<string[]> => {
  const allDetails = await fetchSheet<LocoDetails>(SHEET_NAMES.Loco_list, false); // Keep raw headers
  if (allDetails.length === 0) {
    return [];
  }
  
  const locoNoKey = findLocoNumberKey(allDetails[0]);
  if (!locoNoKey) {
    console.warn("Could not find 'Loco Number' column in the Loco_list sheet.");
    return [];
  }

  return allDetails
    .map(loco => String(loco[locoNoKey] || '').trim())
    .filter(locoNo => locoNo !== '');
};


/**
 * Fetches all WAG7 modification data from the sheet.
 * @returns An array of all modification records.
 */
export const getAllWAG7Modifications = async (): Promise<WAG7Modification[]> => {
  // Keep raw headers (false) because they are the modification names.
  return fetchSheet<WAG7Modification>(SHEET_NAMES.WAG7_Modifications, false);
};


/**
 * Fetches and aggregates all required data for a specific locomotive number.
 * @param locoNo The locomotive number to search for.
 * @returns An object containing details, schedules, and failures for the given loco.
 */
export const getLocoData = async (locoNo: string) => {
  const normalizedLocoNo = locoNo.trim().toUpperCase();

  // Fetch all sheets concurrently for better performance
  const [allDetails, allSchedules, allFailures, allWAG7Modifications] = await Promise.all([
    fetchSheet<LocoDetails>(SHEET_NAMES.Loco_list, false), // Keep raw headers
    fetchSheet<LocoSchedule>(SHEET_NAMES.Loco_Schedules, true), // Normalize for stable keys
    fetchSheet<TractionFailure>(SHEET_NAMES.Traction_failures, true), // Normalize for stable keys
    fetchSheet<WAG7Modification>(SHEET_NAMES.WAG7_Modifications, false), // Keep raw headers
  ]);

  // Find the key for the loco number in the raw-header details sheet
  const locoNoKeyDetails = allDetails.length > 0 ? findLocoNumberKey(allDetails[0]) : undefined;

  // Find the specific loco's details using the dynamic key
  const details = locoNoKeyDetails
    ? allDetails.find(d => String(d[locoNoKeyDetails])?.toUpperCase() === normalizedLocoNo) || null
    : null;
  
  // Filter schedules and failures using the stable, normalized 'locono' key
  const schedules = allSchedules.filter(s => String(s.locono)?.toUpperCase() === normalizedLocoNo);
  const failures = allFailures.filter(f => String(f.locono)?.toUpperCase() === normalizedLocoNo);
  
  // Find the key for the loco number in the raw-header modifications sheet
  const locoNoKeyMods = allWAG7Modifications.length > 0 ? findLocoNumberKey(allWAG7Modifications[0]) : undefined;
  
  // Filter modifications using the dynamic key
  const wag7Modifications = locoNoKeyMods
    ? allWAG7Modifications.filter(m => String(m[locoNoKeyMods])?.toUpperCase() === normalizedLocoNo)
    : [];

  return { details, schedules, failures, wag7Modifications };
};