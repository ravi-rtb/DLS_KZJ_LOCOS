
import { SPREADSHEET_ID, SHEET_NAMES } from '../constants';
import type { LocoDetails, LocoSchedule, TractionFailure, WAG7Modification } from '../types';

/**
 * Parses the JSON response from the Google Sheets Gviz API into a clean array of objects.
 * This handles the JSONP wrapper and potential security prefixes.
 */
const parseGvizData = <T,>(jsonString: string, normalizeKeys: boolean = true): T[] => {
  const prefix = 'google.visualization.Query.setResponse(';
  
  const startIndex = jsonString.indexOf(prefix);
  if (startIndex === -1) {
    throw new Error("Invalid response format from Google Sheets. Is the sheet shared publicly?");
  }
  
  const jsonPart = jsonString.substring(startIndex + prefix.length, jsonString.length - 2);
  const json = JSON.parse(jsonPart);

  if (json.status === 'error') {
    throw new Error(`Google Sheets API Error: ${json.errors.map((e: any) => e.detailed_message).join(', ')}`);
  }

  const { table } = json;
  if (!table || !table.cols || !table.rows) {
    return [];
  }

  const cols = table.cols.map((col: { label: string; }) => {
    if (!col || !col.label) return '';
    if (normalizeKeys) {
      return col.label.toLowerCase().replace(/\s/g, '').replace(/[^a-z0-9]/gi, '');
    }
    return col.label;
  });
  
  return table.rows.map((row: { c: ({ v: any; f?: string } | null)[]; }) => {
    const newRow: { [key:string]: any } = {};
    cols.forEach((colName: string, index: number) => {
      if (!colName) return;
      
      const cell = row.c[index];
      
      // Robust value extraction:
      // We prioritize 'f' (formatted) because Google Sheets often returns 'v' as null
      // if it can't parse the content as the inferred type of the column.
      if (!cell) {
        newRow[colName] = '';
      } else if (cell.f !== undefined && cell.f !== null) {
        newRow[colName] = cell.f;
      } else if (cell.v !== null && cell.v !== undefined) {
        // If it's a boolean or number, convert to string
        newRow[colName] = String(cell.v);
      } else {
        newRow[colName] = '';
      }
    });
    return newRow as T;
  });
};

export const parseDateDDMMYY = (dateString: string): Date | null => {
  if (!dateString || typeof dateString !== 'string') return null;
  const parts = dateString.split(/[-/]/);
  if (parts.length !== 3) return null;

  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  let year = parseInt(parts[2], 10);

  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;

  if (year < 100) {
    year += 2000;
  }
  
  const date = new Date(Date.UTC(year, month, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day) {
    return null;
  }

  return date;
};

const fetchSheet = async <T,>(sheetName: string, normalizeKeys: boolean = true): Promise<T[]> => {
    const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?sheet=${encodeURIComponent(sheetName)}`;
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Failed to fetch sheet "${sheetName}".`);
    }

    const text = await response.text();
    return parseGvizData<T>(text, normalizeKeys);
};

const findLocoNumberKey = (obj: { [key: string]: any }): string | undefined => {
    if (!obj) return undefined;
    for (const key of Object.keys(obj)) {
        const normalizedKey = key.toLowerCase().replace(/\s/g, '').replace(/[^a-z0-9]/gi, '');
        if (normalizedKey === 'loco' || normalizedKey === 'locono' || normalizedKey === 'loconumber') {
            return key;
        }
    }
    return undefined;
};

const findNormalizedLocoNumberKey = (obj: { [key: string]: any }): string | undefined => {
    if (!obj) return undefined;
    const keys = Object.keys(obj);
    if (keys.includes('locono')) return 'locono';
    if (keys.includes('loconumber')) return 'loconumber';
    if (keys.includes('loco')) return 'loco';
    return undefined;
};

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

export const getAllLocoNumbers = async (): Promise<string[]> => {
  const [wag7Details, wdg4Details] = await Promise.all([
    fetchSheet<LocoDetails>(SHEET_NAMES.Loco_list, false),
    fetchSheet<LocoDetails>(SHEET_NAMES.G4_list, false),
  ]);

  const wag7LocoNoKey = wag7Details.length > 0 ? findLocoNumberKey(wag7Details[0]) : undefined;
  const wdg4LocoNoKey = wdg4Details.length > 0 ? findLocoNumberKey(wdg4Details[0]) : undefined;

  const wag7Numbers = wag7LocoNoKey 
    ? wag7Details.map(loco => String(loco[wag7LocoNoKey] || '').trim()).filter(Boolean)
    : [];
    
  const wdg4Numbers = wdg4LocoNoKey
    ? wdg4Details.map(loco => String(loco[wdg4LocoNoKey] || '').trim()).filter(Boolean)
    : [];

  return [...new Set([...wag7Numbers, ...wdg4Numbers])];
};

export const getAllWAG7Modifications = async (): Promise<WAG7Modification[]> => {
  return fetchSheet<WAG7Modification>(SHEET_NAMES.WAG7_Modifications, false);
};

export const getAllWag7Failures = async (): Promise<TractionFailure[]> => {
  return fetchSheet<TractionFailure>(SHEET_NAMES.Traction_failures, true);
};

export const getAllWdg4Failures = async (): Promise<TractionFailure[]> => {
  const rawFailures = await fetchSheet<any>(SHEET_NAMES.G4_Failures, true);
  return rawFailures.map(transformWDG4Failure);
};

export const getLocoData = async (locoNo: string) => {
  const normalizedLocoNo = locoNo.trim().toUpperCase();

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
        fetchSheet<any>(SHEET_NAMES.G4_Failures, true),
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
  
  return { details: null, schedules: [], failures: [], wag7Modifications: [], locoType: null };
};
