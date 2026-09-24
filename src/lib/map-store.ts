import { create } from "zustand";

export type Choropleth = "safety" | "housing" | "backgrounds" | "access";

export type SafetyMetric = "all" | "violence" | "property" | "domestic";

type MapStore = {
  choropleth: Choropleth;
  safetyMetric: SafetyMetric;
  selectedId: string | null;
  focusSeq: number;
  setChoropleth: (layer: Choropleth) => void;
  setSafetyMetric: (metric: SafetyMetric) => void;
  selectSuburb: (id: string | null) => void;
};

export const useMapStore = create<MapStore>((set) => ({
  choropleth: "safety",
  safetyMetric: "all",
  selectedId: null,
  focusSeq: 0,
  setChoropleth: (layer) => set({ choropleth: layer }),
  setSafetyMetric: (metric) => set({ safetyMetric: metric }),
  selectSuburb: (id) =>
    set((s) => ({
      selectedId: id,
      focusSeq: id ? s.focusSeq + 1 : s.focusSeq,
    })),
}));
