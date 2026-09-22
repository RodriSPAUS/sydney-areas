import { create } from "zustand";

export type Choropleth = "safety" | "housing" | "households" | "backgrounds";

export type SafetyMetric = "combined" | "street" | "dwelling" | "domestic";

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
  safetyMetric: "combined",
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
