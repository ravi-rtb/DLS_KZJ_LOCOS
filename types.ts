export interface LocoDetails {
  [key: string]: string;
}

export interface LocoSchedule {
  incomingdate: string;
  sch: string;
  outgoingdate: string;
  [key: string]: string;
}

export interface TractionFailure {
  datefailed: string;
  icmsmessage: string;
  locono: string;
  muwith: string;
  div: string;
  rly: string;
  briefmessage: string;
  causeoffailure: string;
  component: string;
  equipment: string;
  responsibility: string;
  elocosaf: string;
  documentlink?: string;
  [key: string]: string;
}

// FIX: Add missing WAGModification interface to resolve module export error.
export interface WAGModification {
  [key: string]: string;
}

export interface WAG7Modification {
  [key: string]: string;
}