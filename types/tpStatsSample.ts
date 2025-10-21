export interface Item {
  brand: string;
  model: string;
  count: number;
}

export interface tpSampleStats {
  data: {
    sample: {
      currentMonth: Item[];
    };
  };
}
