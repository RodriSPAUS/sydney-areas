import { suburbsById } from "@/data/suburbs";
import { APP_NAME } from "@/lib/copy";
import type { Choropleth } from "@/lib/map-store";

const LAYER_LABELS: Record<Choropleth, string> = {
  safety: "Safety",
  housing: "Housing",
  households: "Households",
  backgrounds: "Backgrounds",
};

export function shareTitle(
  selectedId: string | null | undefined,
  choropleth: Choropleth,
): string {
  const layer = LAYER_LABELS[choropleth];
  const suburb = selectedId ? suburbsById[selectedId]?.name : undefined;
  if (suburb) return `${suburb} · ${layer} · ${APP_NAME}`;
  return `${layer} · ${APP_NAME}`;
}
