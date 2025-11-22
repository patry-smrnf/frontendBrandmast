export interface Account {
  idAccount: number;
  login: string;
  idUser: number;
}

export interface Activity {
  idActivity: number;
  account: Account;
  ip: string;
  userAgent: string;
  timestamp: string;
}

export type MyActivityResponse = Activity[];

