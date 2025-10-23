export interface TeamCasAction {
  uuid: string;
  ident: string;
  name: string;
  since: string;
  until: string;
  event: {
    uuid: string;
    ident: string;
    name: string;
  };
  status: "accepted" | "finished" | "started" | "editable" | "cancelled";
  users: {
    uuid: string;
    ident: string;
    firstname: string;
    lastname: string;
  };
  actionPointsName: string;
  actionPointsStreetAddress: string;
}

export type TeamCasActionsResponse = TeamCasAction[];

