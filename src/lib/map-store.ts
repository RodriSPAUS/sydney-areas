import { create } from "zustand";

export type Choropleth = "safety" | "housing" | "households" | "backgrounds";

export type SafetyMetric = "combined" | "street" | "dwelling" | "domestic";

export type FeedbackValue = "yes" | "no";

type MapStore = {
  choropleth: Choropleth;
  safetyMetric: SafetyMetric;
  selectedId: string | null;
  feedback: Record<string, FeedbackValue>;
  setChoropleth: (layer: Choropleth) => void;
  setSafetyMetric: (metric: SafetyMetric) => void;
  selectSuburb: (id: string | null) => void;
  setFeedback: (id: string, value: FeedbackValue) => void;
};

export const useMapStore = create<MapStore>((set) => ({
  choropleth: "safety",
  safetyMetric: "combined",
  selectedId: null,
  feedback: {},
  setChoropleth: (layer) => set({ choropleth: layer }),
  setSafetyMetric: (metric) => set({ safetyMetric: metric }),
  selectSuburb: (id) => set({ selectedId: id }),
  setFeedback: (id, value) => set((s) => ({ feedback: { ...s.feedback, [id]: value } })),
}));
