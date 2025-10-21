export interface ShopDetails {
  streetAddress: string;
  cityName: string;
  ShopName: string;
  event: {
    ident: string;
    name: string;
  };
}

export interface Action {
  ident: string;
  name: string;
  since: string;
  until: string;
  status: string;
  shopDetails: ShopDetails;
  totalTime: string;
  detailCheckIn: string;
  detailCheckOut: string;
}

export interface MyCasActionsResponse {
  idTourplanner: string;
  "account.login": string;
  imie: string;
  nazwisko: string;
  actions: Action[];
}
