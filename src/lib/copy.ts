export const APP_NAME = "Sydney Areas";

export const TAGLINE =
  "Crime, rent, and who lives there — ranked among Greater Sydney suburbs.";

export const APP_DESCRIPTION =
  "Official open data on Greater Sydney suburbs. Colours are rankings among mapped suburbs, not a live risk score.";

export const SAFETY_DISCLAIMER =
  "Colours rank mapped suburbs by recorded incidents per 1,000 residents. This is not a live risk score.";

export const FIRST_VISIT_KEY = "sa-first-visit-v1";

export const FIRST_VISIT_BULLETS = [
  "Tap a suburb for recorded crime, rent, and a census snapshot.",
  "Colours are rankings among mapped suburbs, not a live risk score.",
  "No account. Sources stay on the map and on About.",
] as const;

export const SOURCE_LINES = [
  {
    name: "Safety",
    detail:
      "NSW Bureau of Crime Statistics and Research (BOCSAR) suburb recorded incidents. Map colour is the rate per 1,000 usual residents (Census 2021), ranked among suburbs on this map. Combined = street + home. Retail theft never paints the map. Domestic assault only colours the Domestic chip.",
  },
  {
    name: "Housing",
    detail:
      "NSW Department of Communities and Justice Rent and Sales Report: median weekly rent of new bonds by postcode, with 1/2/3-bed and house/flat figures on the sheet when published. ABS Census 2021 rent if a postcode median is missing. Not Domain or CoreLogic prices.",
  },
  {
    name: "Households and backgrounds",
    detail:
      "Australian Bureau of Statistics Census 2021, Suburbs and Localities (SAL). Age, tenure, families, birthplace, ancestry, and language.",
  },
  {
    name: "Boundaries",
    detail: "Australian Bureau of Statistics Suburbs and Localities 2021 (SAL).",
  },
] as const;
