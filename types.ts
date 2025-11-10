
export interface UserProfile {
  email: string;
  name: string;
  picture: string;
}

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
  medialink?: string;
  investigationstatus?: string;
  icms?: string; // Added for WDG4 failure categorization
  [key: string]: string | undefined;
}

export interface WAGModification {
  [key: string]: string;
}

export interface WAG7Modification {
  [key: string]: string;
}