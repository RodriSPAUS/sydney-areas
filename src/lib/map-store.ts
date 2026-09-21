import { create } from "zustand";

export type Choropleth = "safety" | "housing" | "households" | "backgrounds";

export type SafetyMetric = "combined" | "street" | "dwelling" | "domestic";

export type LayerFilter = "all" | "low" | "high";

export type FeedbackValue = "yes" | "no";

type MapStore = {
  choropleth: Choropleth;
  safetyMetric: SafetyMetric;
  layerFilter: LayerFilter;
  selectedId: string | null;
  focusSeq: number;
  feedback: Record<string, FeedbackValue>;
  setChoropleth: (layer: Choropleth) => void;
  setSafetyMetric: (metric: SafetyMetric) => void;
  setLayerFilter: (filter: LayerFilter) => void;
  selectSuburb: (id: string | null) => void;
  setFeedback: (id: string, value: FeedbackValue) => void;
};

export const useMapStore = create<MapStore>((set) => ({
  choropleth: "safety",
  safetyMetric: "combined",
  layerFilter: "all",
  selectedId: null,
  focusSeq: 0,
  feedback: {},
  setChoropleth: (layer) => set({ choropleth: layer, layerFilter: "all" }),
  setSafetyMetric: (metric) => set({ safetyMetric: metric }),
  setLayerFilter: (filter) => set({ layerFilter: filter }),
  selectSuburb: (id) =>
    set((s) => ({
      selectedId: id,
      focusSeq: id ? s.focusSeq + 1 : s.focusSeq,
    })),
  setFeedback: (id, value) => set((s) => ({ feedback: { ...s.feedback, [id]: value } })),
}));
