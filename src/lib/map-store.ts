import { create } from "zustand";

export type Choropleth = "safety" | "housing" | "backgrounds" | "transit";

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
  // Re-selecting the open suburb must not bump focusSeq: that re-ran fitBounds
  // and the camera jumped back while the person was panning around it.
  selectSuburb: (id) =>
    set((s) =>
      id === s.selectedId
        ? s
        : {
            selectedId: id,
            focusSeq: id ? s.focusSeq + 1 : s.focusSeq,
          },
    ),
}));
