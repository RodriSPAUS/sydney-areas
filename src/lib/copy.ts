export const APP_NAME = "Uvicus";

export const PLACE_LINE = "Greater Sydney";

export const TAGLINE =
  "Crime, rent, and who lives there — ranked among Greater Sydney suburbs.";

export const APP_DESCRIPTION =
  "Crime, rent and who lives there — ranked among Greater Sydney suburbs. Independent map on ABS, BOCSAR and DCJ open data. Not affiliated with those agencies. Not a live risk score.";

export const AFFILIATION_LINE = "Independent map · not affiliated with ABS, BOCSAR or DCJ";

export const FOOTER_LINE =
  "Sources (open data, unofficial): Boundaries ABS SAL 2021 · Safety BOCSAR · Households and ancestry Census 2021 · Rent DCJ or Census 2021.";

export const SAFETY_DISCLAIMER =
  "Recorded incidents per 1,000 residents on this map. Not an official BOCSAR score.";

export const SAFETY_WINDOW = "Last 12 months";

export const SAFETY_WINDOW_NOTE =
  "Map colour and the rates use the last 12 months. Not a live risk score.";

export const SAFETY_RANK_NOTE =
  "Ranked among Greater Sydney suburbs. Darker = more incidents in the selected category. Not a live risk score.";

export const HOUSING_DCJ_NOTE =
  "Median weekly rent of new bonds (DCJ), by postcode. A neighbour may share this figure.";

export const HOUSING_CENSUS_NOTE =
  "ABS Census 2021 median rent. Not today’s advertised price. Not Domain or CoreLogic.";

export const BACKGROUNDS_NOTE =
  "Ancestry is Census 2021. People can report more than one origin. This is not a judgement of the suburb.";

export const TRANSIT_NOTE =
  "Counted if the point is inside this ABS suburb boundary. A station just over the line is counted in the neighbour. Not a trip planner. TfNSW GTFS, CC-BY.";

export const ABOUT_INTRO =
  "Uvicus is an independent map of Greater Sydney suburbs. It is not affiliated with, or endorsed by, the ABS, BOCSAR or DCJ. Colours rank suburbs on this map. They are not a live risk score and not an official safety rating. No account. This page is sources and limits, not a landing page.";

export const FIRST_VISIT_TITLE = "This is Uvicus";

export const FIRST_VISIT_KEY = "uvicus-first-visit-v1";

export const FIRST_VISIT_BULLETS = [
  "Tap a suburb for recorded crime, rent, and a census snapshot.",
  "Colours rank suburbs on this map. They are not a live risk score and not an official safety rating.",
  "Open data from ABS, BOCSAR and DCJ. Uvicus is independent — not a government site.",
] as const;

export const FIRST_VISIT_CTA = "Show the map";

export const NO_DATA_LABEL = "No data";

export const SOURCE_LINES = [
  {
    name: "Safety",
    detail:
      "NSW Bureau of Crime Statistics and Research (BOCSAR) recorded incidents, last 12 months, per 1,000 Census 2021 residents. Violence: homicide, sexual offences, non-DV assault, assault on police, robbery, theft from person. Property: break-and-enter dwelling, theft from home / vehicle, stolen vehicles, malicious damage. All: violence + property. Not domestic. Not retail. Domestic: DV assault only, and it only colours the Domestic chip. Ranked on this map. Not an official BOCSAR score. Not a live risk score.",
  },
  {
    name: "Housing",
    detail:
      "NSW Department of Communities and Justice Rent and Sales Report: median weekly rent of new bonds by postcode, with 1/2/3-bed and house/flat figures on the sheet when published. ABS Census 2021 rent if a postcode median is missing. Not Domain or CoreLogic prices. Census 2021 median age, share renting, and families with children sit on the housing sheet, not on their own map layer.",
  },
  {
    name: "Backgrounds",
    detail:
      "Australian Bureau of Statistics Census 2021, Suburbs and Localities (SAL). Birthplace, ancestry, and language. Ancestry is multi-response: items can add up to more than 100%.",
  },
  {
    name: "Transit",
    detail:
      "Transport for NSW Complete GTFS (train, metro, light rail, ferry). Bus omitted. Colour is how many of those stops sit inside the suburb polygon. Lines are simplified GTFS shapes when that file is included. Independent map; not affiliated with TfNSW.",
  },
  {
    name: "Boundaries",
    detail: "Australian Bureau of Statistics Suburbs and Localities 2021 (SAL).",
  },
] as const;
