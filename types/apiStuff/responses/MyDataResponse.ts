export interface MyDataResponse {
  tourplannerId: string;
  brandmasterId: number;
  imie: string;
  nazwisko: string;
  kasoterminal: {
    number: number;
  };
  targets: {
    velo: number | null;
    hilo: number | null;
    hiloPlus: number | null;
  };
}

