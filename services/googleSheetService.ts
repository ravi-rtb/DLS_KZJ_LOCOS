
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
    const newRow: { [key:string]: any } = {};
    cols.forEach((colName: string, index: number) => {
      if (!colName) return; // Skip columns that didn't have a valid header.
      
      const cell = row.c[index];
      // Coerce all values to strings for consistency.
      // Priority: 
      // 1. 'f' (formatted value) - Use this if available (handles dates and text in number cols).
      // 2. 'v' (raw value) - Use this if 'f' is missing.
      // 3. Empty string if both are missing.
      
      if (cell === null) {
        newRow[colName] = '';
      } else if (cell.f) {
        newRow[colName] = cell.f;
      } else if (cell.v !== null && cell.v !== undefined) {
        newRow[colName] = String(cell.v);
      } else {
        newRow[colName] = '';
      }
    });
    return newRow as T;
  });
};

/**
 * Parses a date string in 'dd-mm-yy' or 'dd-mm-yyyy' format.
 * @param dateString The date string from the sheet.
 * @returns A Date object or null if the format is invalid.
 */
export const parseDateDDMMYY = (dateString: string): Date | null => {
  if (!dateString || typeof dateString !== 'string') return null;
  const parts = dateString.split(/[-/]/);
  if (parts.length !== 3) return null;

  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
  let year = parseInt(parts[2], 10);

  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;

  // Handle 2-digit years, assuming they are in the 21st century.
  if (year < 100) {
    year += 2000;
  }
  
  // Use UTC to prevent timezone-related issues.
  const date = new Date(Date.UTC(year, month, day));

  // Validate the created date to ensure components weren't rolled over (e.g., month 13).
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day) {
    return null;
  }

  return date;
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

// Helper to find the key for 'locono' in an object with arbitrary original keys.
const findLocoNumberKey = (obj: { [key: string]: any }): string | undefined => {
    if (!obj) return undefined;
    for (const key of Object.keys(obj)) {
        const normalizedKey = key.toLowerCase().replace(/\s/g, '').replace(/[^a-z0-9]/gi, '');
        if (normalizedKey === 'loco' || normalizedKey === 'locono' || normalizedKey === 'loconumber') {
            return key; // Return the original, un-normalized key
        }
    }
    return undefined;
};

// Helper to find the normalized key for 'locono' in an object with already normalized keys.
const findNormalizedLocoNumberKey = (obj: { [key: string]: any }): string | undefined => {
    if (!obj) return undefined;
    const keys = Object.keys(obj);
    if (keys.includes('locono')) return 'locono';
    if (keys.includes('loconumber')) return 'loconumber';
    if (keys.includes('loco')) return 'loco';
    return undefined;
};

/**
 * Transforms a raw failure record from the WDG4 sheet to the standard TractionFailure format.
 * @param raw The raw object from the sheet.
 * @returns A formatted object conforming to the TractionFailure interface.
 */
const transformWDG4Failure = (raw: any): TractionFailure => {
  const locoKey = findNormalizedLocoNumberKey(raw);
  return {
    datefailed: raw.dateoffailure || '',
    locono: locoKey ? (raw[locoKey] || '') : '',
    muwith: raw.muwith || '',
    icmsmessage: raw.messageicms || '',
    div: raw.faileddivn || '',
    rly: raw.failedrly || '',
    briefmessage: raw.briefcause || '',
    causeoffailure: raw.shedinvestigation || '',
    equipment: raw.system || '',
    component: raw.componentfailed || '',
    responsibility: raw.shedsection || '',
    elocosaf: '',
    icms: raw.icms || '',
    documentlink: raw.documentlink || '',
    medialink: raw.medialink || '',
    trainno: raw.trainno || '',
    load: raw.load || '',
    station: raw.station || '',
    schparticulars: raw.schparticulars || '',
  };
};

/**
 * Fetches all locomotive numbers from both WAG7 and WDG4 lists.
 * @returns An array of all locomotive numbers as strings.
 */
export const getAllLocoNumbers = async (): Promise<string[]> => {
  const [wag7Details, wdg4Details] = await Promise.all([
    fetchSheet<LocoDetails>(SHEET_NAMES.Loco_list, false), // Keep raw headers
    fetchSheet<LocoDetails>(SHEET_NAMES.G4_list, false),   // Keep raw headers
  ]);

  const wag7LocoNoKey = wag7Details.length > 0 ? findLocoNumberKey(wag7Details[0]) : undefined;
  const wdg4LocoNoKey = wdg4Details.length > 0 ? findLocoNumberKey(wdg4Details[0]) : undefined;

  const wag7Numbers = wag7LocoNoKey 
    ? wag7Details.map(loco => String(loco[wag7LocoNoKey] || '').trim()).filter(Boolean)
    : [];
    
  const wdg4Numbers = wdg4LocoNoKey
    ? wdg4Details.map(loco => String(loco[wdg4LocoNoKey] || '').trim()).filter(Boolean)
    : [];

  // Combine and remove duplicates
  return [...new Set([...wag7Numbers, ...wdg4Numbers])];
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
 * Fetches all WAG7 traction failure data from the sheet.
 * @returns An array of all failure records.
 */
export const getAllWag7Failures = async (): Promise<TractionFailure[]> => {
  return fetchSheet<TractionFailure>(SHEET_NAMES.Traction_failures, true); // Normalize keys
};

/**
 * Fetches all WDG4 traction failure data from the sheet.
 * @returns An array of all failure records.
 */
export const getAllWdg4Failures = async (): Promise<TractionFailure[]> => {
  const rawFailures = await fetchSheet<any>(SHEET_NAMES.G4_Failures, true);
  return rawFailures.map(transformWDG4Failure);
};


/**
 * Fetches and aggregates all required data for a specific locomotive number.
 * It intelligently determines if the loco is a WAG7 or WDG4.
 * @param locoNo The locomotive number to search for.
 * @returns An object containing details, schedules, failures, modifications and type for the given loco.
 */
export const getLocoData = async (locoNo: string) => {
  const normalizedLocoNo = locoNo.trim().toUpperCase();

  // Fetch master lists to determine loco type first.
  const [wag7List, wdg4List] = await Promise.all([
    fetchSheet<LocoDetails>(SHEET_NAMES.Loco_list, false),
    fetchSheet<LocoDetails>(SHEET_NAMES.G4_list, false),
  ]);

  const wag7LocoNoKey = wag7List.length > 0 ? findLocoNumberKey(wag7List[0]) : undefined;
  const wdg4LocoNoKey = wdg4List.length > 0 ? findLocoNumberKey(wdg4List[0]) : undefined;

  let details: LocoDetails | null = null;
  let locoType: 'WAG7' | 'WDG4' | null = null;

  if (wag7LocoNoKey) {
    const wag7Details = wag7List.find(d => String(d[wag7LocoNoKey])?.toUpperCase() === normalizedLocoNo);
    if (wag7Details) {
      details = wag7Details;
      locoType = 'WAG7';
    }
  }
  
  if (!details && wdg4LocoNoKey) {
    const wdg4Details = wdg4List.find(d => String(d[wdg4LocoNoKey])?.toUpperCase() === normalizedLocoNo);
    if (wdg4Details) {
      details = wdg4Details;
      locoType = 'WDG4';
    }
  }

  // If loco not found in any list, return early.
  if (!locoType || !details) {
    return { details: null, schedules: [], failures: [], wag7Modifications: [], locoType: null };
  }

  if (locoType === 'WAG7') {
    const [allSchedules, allFailures, allWAG7Modifications] = await Promise.all([
      fetchSheet<LocoSchedule>(SHEET_NAMES.Loco_Schedules, true),
      fetchSheet<TractionFailure>(SHEET_NAMES.Traction_failures, true),
      fetchSheet<WAG7Modification>(SHEET_NAMES.WAG7_Modifications, false),
    ]);
    
    const scheduleLocoKey = allSchedules.length > 0 ? findNormalizedLocoNumberKey(allSchedules[0]) : undefined;
    const schedules = scheduleLocoKey
      ? allSchedules.filter(s => String(s[scheduleLocoKey])?.toUpperCase() === normalizedLocoNo)
      : [];

    const failureLocoKey = allFailures.length > 0 ? findNormalizedLocoNumberKey(allFailures[0]) : undefined;
    const failures = failureLocoKey
      ? allFailures.filter(f => String(f[failureLocoKey])?.toUpperCase() === normalizedLocoNo)
      : [];
    
    const locoNoKeyMods = allWAG7Modifications.length > 0 ? findLocoNumberKey(allWAG7Modifications[0]) : undefined;
    const wag7Modifications = locoNoKeyMods
      ? allWAG7Modifications.filter(m => String(m[locoNoKeyMods])?.toUpperCase() === normalizedLocoNo)
      : [];

    return { details, schedules, failures, wag7Modifications, locoType };
  }

  if (locoType === 'WDG4') {
    const [allSchedules, allFailures] = await Promise.all([
        fetchSheet<LocoSchedule>(SHEET_NAMES.G4_Schedules, true),
        fetchSheet<any>(SHEET_NAMES.G4_Failures, true), // Fetch as 'any' before transformation
    ]);

    const scheduleLocoKey = allSchedules.length > 0 ? findNormalizedLocoNumberKey(allSchedules[0]) : undefined;
    const schedules = scheduleLocoKey
      ? allSchedules.filter(s => String(s[scheduleLocoKey])?.toUpperCase() === normalizedLocoNo)
      : [];
    
    const failureLocoKey = allFailures.length > 0 ? findNormalizedLocoNumberKey(allFailures[0]) : undefined;
    const rawFailures = failureLocoKey
      ? allFailures.filter(f => String(f[failureLocoKey])?.toUpperCase() === normalizedLocoNo)
      : [];

    const failures = rawFailures.map(transformWDG4Failure);
    
    return { details, schedules, failures, wag7Modifications: [], locoType };
  }
  
  // Fallback for safety, though the initial check should handle this.
  return { details: null, schedules: [], failures: [], wag7Modifications: [], locoType: null };
};
