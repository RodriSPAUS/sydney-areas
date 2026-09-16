import { create } from "zustand";

export type Choropleth = "safety" | "housing" | "households" | "backgrounds";

export type FeedbackValue = "yes" | "no";

type MapStore = {
  choropleth: Choropleth;
  servicesOn: boolean;
  selectedId: string | null;
  feedback: Record<string, FeedbackValue>;
  setChoropleth: (layer: Choropleth) => void;
  toggleServices: () => void;
  selectSuburb: (id: string | null) => void;
  setFeedback: (id: string, value: FeedbackValue) => void;
};

export const useMapStore = create<MapStore>((set) => ({
  choropleth: "safety",
  servicesOn: false,
  selectedId: null,
  feedback: {},
  setChoropleth: (layer) => set({ choropleth: layer }),
  toggleServices: () => set((s) => ({ servicesOn: !s.servicesOn })),
  selectSuburb: (id) => set({ selectedId: id }),
  setFeedback: (id, value) =>
    set((s) => ({ feedback: { ...s.feedback, [id]: value } })),
}));
