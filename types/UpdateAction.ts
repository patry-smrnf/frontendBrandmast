export interface newActionPayload  {
    idShop: number,
    sinceSystem?: string | null,
    untilSystem?: string | null,
};

export interface updateActionPayload extends newActionPayload {
    idAction: number,
    sinceReal?: string,
    untilReal?: string 
}