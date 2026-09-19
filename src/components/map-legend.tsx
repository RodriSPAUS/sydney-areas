import {
  BORN_AU_HIGH,
  BORN_AU_LOW,
  FAMILIES_HIGH,
  FAMILIES_LOW,
  HOUSING_HIGH,
  HOUSING_LOW,
  SAFETY_FILL,
  bornAuRange,
  familyRange,
  formatAud,
  rentRange,
} from "@/lib/choropleth";
import type { Choropleth } from "@/lib/map-store";
import { useMapStore } from "@/lib/map-store";

function Ramp({ from, to, left, right }: { from: string; to: string; left: string; right: string }) {
  return (
    <div>
      <div
        className="h-1.5 rounded-full"
        style={{ background: `linear-gradient(to right, ${from}, ${to})` }}
      />
      <div className="mt-1 flex justify-between text-[10px] tracking-wide text-muted tabular-nums">
        <span>{left}</span>
        <span>{right}</span>
      </div>
    </div>
  );
}

function LegendBody({ layer }: { layer: Choropleth }) {
  if (layer === "safety") {
    return (
      <div>
        <p className="mb-1.5 text-[11px] font-medium text-fg">Incidents per 1,000 residents</p>
        <div className="flex overflow-hidden rounded-full">
          {([5, 4, 3, 2, 1] as const).map((band) => (
            <span
              key={band}
              className="h-1.5 flex-1 first:rounded-l-full last:rounded-r-full"
              style={{ backgroundColor: SAFETY_FILL[band] }}
            />
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-muted">
          <span>Fewer</span>
          <span>More</span>
        </div>
      </div>
    );
  }
  if (layer === "housing") {
    return (
      <div>
        <p className="mb-1.5 text-[11px] font-medium text-fg">Weekly rent (sample)</p>
        <Ramp
          from={HOUSING_LOW}
          to={HOUSING_HIGH}
          left={formatAud(rentRange.min)}
          right={formatAud(rentRange.max)}
        />
      </div>
    );
  }
  if (layer === "households") {
    return (
      <div>
        <p className="mb-1.5 text-[11px] font-medium text-fg">Families with children</p>
        <Ramp
          from={FAMILIES_LOW}
          to={FAMILIES_HIGH}
          left={`${familyRange.min}%`}
          right={`${familyRange.max}%`}
        />
      </div>
    );
  }
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-medium text-fg">Born in Australia</p>
      <Ramp
        from={BORN_AU_LOW}
        to={BORN_AU_HIGH}
        left={`${bornAuRange.min}%`}
        right={`${bornAuRange.max}%`}
      />
    </div>
  );
}

export function MapLegend() {
  const layer = useMapStore((s) => s.choropleth);
  const servicesOn = useMapStore((s) => s.servicesOn);

  return (
    <div className="pointer-events-none w-[168px] rounded-xl bg-surface/95 px-3 py-2.5 shadow-[var(--shadow-border)]">
      <LegendBody layer={layer} />
      {servicesOn ? (
        <ul className="mt-2 flex flex-col gap-1 border-t border-border pt-2 text-[10px] text-muted">
          <li className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-pin-hospital" /> Hospital
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-pin-school" /> School
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-pin-station" /> Station
          </li>
        </ul>
      ) : null}
    </div>
  );
}
