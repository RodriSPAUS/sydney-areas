/**
 * Sample suburb figures for product testing.
 * Replace this file later with Census / BOCSAR-backed data.
 * Numbers are plausible but clearly fake — not official output.
 */
import type { Suburb } from "@/lib/suburb-types";

export const suburbs: Suburb[] = [
  {
    id: "bondi",
    name: "Bondi",
    bbox: [151.255, -33.897, 151.27, -33.886],
    safety: {
      band: 4,
      summary:
        "Fewer dwelling break-ins than the Sydney median. Assaults near the median. BOCSAR-style sample data, not live.",
    },
    housing: { medianWeeklyRent: 650, medianPurchase: 2420000 },
    households: { medianAge: 34, pctRenting: 48, pctFamiliesWithChildren: 22 },
    backgrounds: {
      pctBornAustralia: 58,
      topAncestries: [
        { name: "English", pct: 28 },
        { name: "Australian", pct: 22 },
        { name: "Irish", pct: 12 },
      ],
      topLanguageOther: "Mandarin",
    },
    services: [
      { type: "station", name: "Bondi Junction", lng: 151.257, lat: -33.891 },
      { type: "school", name: "Bondi Public", lng: 151.263, lat: -33.894 },
      { type: "hospital", name: "Bondi Road Clinic", lng: 151.266, lat: -33.888 },
    ],
  },
  {
    id: "bondi-beach",
    name: "Bondi Beach",
    bbox: [151.27, -33.896, 151.282, -33.888],
    safety: {
      band: 3,
      summary:
        "Incidents per capita sit near the Sydney median. Stealing from motor vehicles is a little higher in summer months. BOCSAR-style sample data, not live.",
    },
    housing: { medianWeeklyRent: 720, medianPurchase: 2850000 },
    households: { medianAge: 32, pctRenting: 55, pctFamiliesWithChildren: 18 },
    backgrounds: {
      pctBornAustralia: 55,
      topAncestries: [
        { name: "English", pct: 26 },
        { name: "Australian", pct: 20 },
        { name: "Irish", pct: 11 },
      ],
      topLanguageOther: "Spanish",
    },
    services: [
      { type: "school", name: "Bondi Beach Public", lng: 151.273, lat: -33.892 },
      { type: "station", name: "Campbell Parade stop", lng: 151.277, lat: -33.891 },
    ],
  },
  {
    id: "coogee",
    name: "Coogee",
    bbox: [151.25, -33.926, 151.262, -33.916],
    safety: {
      band: 4,
      summary:
        "Fewer recorded assaults than the Sydney median. Break-ins sit close to the median. BOCSAR-style sample data, not live.",
    },
    housing: { medianWeeklyRent: 620, medianPurchase: 2150000 },
    households: { medianAge: 35, pctRenting: 44, pctFamiliesWithChildren: 28 },
    backgrounds: {
      pctBornAustralia: 57,
      topAncestries: [
        { name: "English", pct: 27 },
        { name: "Australian", pct: 23 },
        { name: "Irish", pct: 10 },
      ],
      topLanguageOther: "Mandarin",
    },
    services: [
      { type: "school", name: "Coogee Public", lng: 151.253, lat: -33.921 },
      { type: "hospital", name: "Coogee Bay Medical", lng: 151.258, lat: -33.919 },
      { type: "station", name: "Coogee Beach stop", lng: 151.259, lat: -33.923 },
    ],
  },
  {
    id: "randwick",
    name: "Randwick",
    bbox: [151.235, -33.918, 151.25, -33.905],
    safety: {
      band: 4,
      summary:
        "Fewer stealing-from-dwelling incidents than the Sydney median. Assaults near the median. BOCSAR-style sample data, not live.",
    },
    housing: { medianWeeklyRent: 550, medianPurchase: 1780000 },
    households: { medianAge: 36, pctRenting: 42, pctFamiliesWithChildren: 32 },
    backgrounds: {
      pctBornAustralia: 52,
      topAncestries: [
        { name: "English", pct: 22 },
        { name: "Australian", pct: 20 },
        { name: "Chinese", pct: 14 },
      ],
      topLanguageOther: "Mandarin",
    },
    services: [
      { type: "hospital", name: "Prince of Wales", lng: 151.238, lat: -33.91 },
      { type: "school", name: "Randwick Boys / Girls", lng: 151.242, lat: -33.913 },
      { type: "station", name: "Randwick light rail", lng: 151.241, lat: -33.908 },
    ],
  },
  {
    id: "surry-hills",
    name: "Surry Hills",
    bbox: [151.205, -33.89, 151.218, -33.878],
    safety: {
      band: 3,
      summary:
        "Incidents per capita near the Sydney median. More late-night street offences, fewer dwelling break-ins. BOCSAR-style sample data, not live.",
    },
    housing: { medianWeeklyRent: 580, medianPurchase: 1450000 },
    households: { medianAge: 33, pctRenting: 58, pctFamiliesWithChildren: 16 },
    backgrounds: {
      pctBornAustralia: 50,
      topAncestries: [
        { name: "English", pct: 24 },
        { name: "Australian", pct: 18 },
        { name: "Irish", pct: 11 },
      ],
      topLanguageOther: "Mandarin",
    },
    services: [
      { type: "station", name: "Central", lng: 151.207, lat: -33.883 },
      { type: "school", name: "Bourke Street Public", lng: 151.213, lat: -33.886 },
      { type: "hospital", name: "St Vincent's nearby", lng: 151.215, lat: -33.88 },
    ],
  },
  {
    id: "newtown",
    name: "Newtown",
    bbox: [151.175, -33.902, 151.19, -33.892],
    safety: {
      band: 3,
      summary:
        "Assaults a little above the Sydney median on weekend nights. Dwelling break-ins near the median. BOCSAR-style sample data, not live.",
    },
    housing: { medianWeeklyRent: 500, medianPurchase: 1380000 },
    households: { medianAge: 33, pctRenting: 52, pctFamiliesWithChildren: 21 },
    backgrounds: {
      pctBornAustralia: 54,
      topAncestries: [
        { name: "English", pct: 25 },
        { name: "Australian", pct: 22 },
        { name: "Irish", pct: 12 },
      ],
      topLanguageOther: "Greek",
    },
    services: [
      { type: "station", name: "Newtown", lng: 151.178, lat: -33.898 },
      { type: "school", name: "Newtown Public", lng: 151.183, lat: -33.896 },
      { type: "hospital", name: "Royal Prince Alfred nearby", lng: 151.186, lat: -33.894 },
    ],
  },
  {
    id: "marrickville",
    name: "Marrickville",
    bbox: [151.148, -33.918, 151.168, -33.902],
    safety: {
      band: 4,
      summary:
        "Fewer incidents per capita than the Sydney median across steal-from-dwelling and assault. BOCSAR-style sample data, not live.",
    },
    housing: { medianWeeklyRent: 450, medianPurchase: 1250000 },
    households: { medianAge: 36, pctRenting: 46, pctFamiliesWithChildren: 30 },
    backgrounds: {
      pctBornAustralia: 48,
      topAncestries: [
        { name: "Australian", pct: 20 },
        { name: "English", pct: 18 },
        { name: "Greek", pct: 12 },
      ],
      topLanguageOther: "Greek",
    },
    services: [
      { type: "station", name: "Marrickville", lng: 151.155, lat: -33.91 },
      { type: "school", name: "Marrickville Public", lng: 151.16, lat: -33.908 },
      { type: "hospital", name: "Marrickville Health", lng: 151.152, lat: -33.914 },
    ],
  },
  {
    id: "leichhardt",
    name: "Leichhardt",
    bbox: [151.148, -33.89, 151.165, -33.876],
    safety: {
      band: 5,
      summary:
        "Fewer dwelling break-ins and assaults than the Sydney median. BOCSAR-style sample data, not live.",
    },
    housing: { medianWeeklyRent: 520, medianPurchase: 1620000 },
    households: { medianAge: 37, pctRenting: 38, pctFamiliesWithChildren: 31 },
    backgrounds: {
      pctBornAustralia: 61,
      topAncestries: [
        { name: "Australian", pct: 24 },
        { name: "English", pct: 23 },
        { name: "Italian", pct: 14 },
      ],
      topLanguageOther: "Italian",
    },
    services: [
      { type: "station", name: "Leichhardt North light rail", lng: 151.152, lat: -33.88 },
      { type: "school", name: "Leichhardt Public", lng: 151.157, lat: -33.884 },
      { type: "hospital", name: "Norton Street Medical", lng: 151.16, lat: -33.878 },
    ],
  },
  {
    id: "parramatta",
    name: "Parramatta",
    bbox: [150.995, -33.82, 151.01, -33.807],
    safety: {
      band: 3,
      summary:
        "Incidents per capita near the Sydney median. More theft in the civic centre, fewer in surrounding streets. BOCSAR-style sample data, not live.",
    },
    housing: { medianWeeklyRent: 420, medianPurchase: 980000 },
    households: { medianAge: 34, pctRenting: 48, pctFamiliesWithChildren: 34 },
    backgrounds: {
      pctBornAustralia: 42,
      topAncestries: [
        { name: "Indian", pct: 22 },
        { name: "Chinese", pct: 18 },
        { name: "Australian", pct: 16 },
      ],
      topLanguageOther: "Mandarin",
    },
    services: [
      { type: "station", name: "Parramatta", lng: 151.003, lat: -33.817 },
      { type: "hospital", name: "Westmead nearby", lng: 150.998, lat: -33.81 },
      { type: "school", name: "Parramatta Public", lng: 151.007, lat: -33.813 },
      { type: "station", name: "Parramatta light rail", lng: 151.005, lat: -33.809 },
    ],
  },
  {
    id: "harris-park",
    name: "Harris Park",
    bbox: [151.006, -33.828, 151.016, -33.82],
    safety: {
      band: 3,
      summary:
        "Incidents per capita sit near the Sydney median. Steal-from-motor-vehicle a little above, dwelling break-ins a little below. BOCSAR-style sample data, not live.",
    },
    housing: { medianWeeklyRent: 380, medianPurchase: 820000 },
    households: { medianAge: 31, pctRenting: 52, pctFamiliesWithChildren: 41 },
    backgrounds: {
      pctBornAustralia: 28,
      topAncestries: [
        { name: "Indian", pct: 38 },
        { name: "Australian", pct: 12 },
        { name: "English", pct: 10 },
      ],
      topLanguageOther: "Hindi",
    },
    services: [
      { type: "station", name: "Harris Park", lng: 151.008, lat: -33.823 },
      { type: "school", name: "Harris Park Public", lng: 151.012, lat: -33.825 },
    ],
  },
  {
    id: "strathfield",
    name: "Strathfield",
    bbox: [151.072, -33.882, 151.09, -33.868],
    safety: {
      band: 5,
      summary:
        "Fewer incidents per capita than the Sydney median across assault and steal-from-dwelling. BOCSAR-style sample data, not live.",
    },
    housing: { medianWeeklyRent: 480, medianPurchase: 1720000 },
    households: { medianAge: 38, pctRenting: 35, pctFamiliesWithChildren: 40 },
    backgrounds: {
      pctBornAustralia: 38,
      topAncestries: [
        { name: "Chinese", pct: 32 },
        { name: "Australian", pct: 16 },
        { name: "Korean", pct: 14 },
      ],
      topLanguageOther: "Korean",
    },
    services: [
      { type: "station", name: "Strathfield", lng: 151.08, lat: -33.872 },
      { type: "school", name: "Strathfield Girls / Boys", lng: 151.076, lat: -33.876 },
      { type: "hospital", name: "Strathfield Private nearby", lng: 151.085, lat: -33.87 },
    ],
  },
  {
    id: "hurstville",
    name: "Hurstville",
    bbox: [151.095, -33.972, 151.112, -33.958],
    safety: {
      band: 4,
      summary:
        "Fewer dwelling break-ins than the Sydney median. Assaults near the median. BOCSAR-style sample data, not live.",
    },
    housing: { medianWeeklyRent: 430, medianPurchase: 1180000 },
    households: { medianAge: 37, pctRenting: 38, pctFamiliesWithChildren: 38 },
    backgrounds: {
      pctBornAustralia: 34,
      topAncestries: [
        { name: "Chinese", pct: 42 },
        { name: "Australian", pct: 14 },
        { name: "English", pct: 12 },
      ],
      topLanguageOther: "Mandarin",
    },
    services: [
      { type: "station", name: "Hurstville", lng: 151.102, lat: -33.967 },
      { type: "school", name: "Hurstville Public", lng: 151.098, lat: -33.964 },
      { type: "hospital", name: "Hurstville Private", lng: 151.108, lat: -33.961 },
    ],
  },
  {
    id: "cabramatta",
    name: "Cabramatta",
    bbox: [150.928, -33.9, 150.945, -33.888],
    safety: {
      band: 3,
      summary:
        "Incidents per capita near the Sydney median. Steal-from-retail a little above, dwelling break-ins a little below. BOCSAR-style sample data, not live.",
    },
    housing: { medianWeeklyRent: 360, medianPurchase: 760000 },
    households: { medianAge: 39, pctRenting: 42, pctFamiliesWithChildren: 38 },
    backgrounds: {
      pctBornAustralia: 26,
      topAncestries: [
        { name: "Vietnamese", pct: 36 },
        { name: "Chinese", pct: 18 },
        { name: "Australian", pct: 12 },
      ],
      topLanguageOther: "Vietnamese",
    },
    services: [
      { type: "station", name: "Cabramatta", lng: 150.935, lat: -33.895 },
      { type: "school", name: "Cabramatta Public", lng: 150.94, lat: -33.892 },
      { type: "hospital", name: "Cabramatta Medical", lng: 150.932, lat: -33.89 },
    ],
  },
  {
    id: "fairfield",
    name: "Fairfield",
    bbox: [150.948, -33.875, 150.965, -33.862],
    safety: {
      band: 2,
      summary:
        "More recorded incidents per capita than the Sydney median, mostly steal-from-motor-vehicle and steal-from-retail. BOCSAR-style sample data, not live.",
    },
    housing: { medianWeeklyRent: 350, medianPurchase: 720000 },
    households: { medianAge: 36, pctRenting: 40, pctFamiliesWithChildren: 40 },
    backgrounds: {
      pctBornAustralia: 33,
      topAncestries: [
        { name: "Vietnamese", pct: 22 },
        { name: "Assyrian", pct: 16 },
        { name: "Australian", pct: 14 },
      ],
      topLanguageOther: "Arabic",
    },
    services: [
      { type: "station", name: "Fairfield", lng: 150.956, lat: -33.87 },
      { type: "school", name: "Fairfield Public", lng: 150.952, lat: -33.867 },
      { type: "hospital", name: "Fairfield Hospital nearby", lng: 150.96, lat: -33.872 },
    ],
  },
  {
    id: "auburn",
    name: "Auburn",
    bbox: [151.022, -33.855, 151.04, -33.84],
    safety: {
      band: 3,
      summary:
        "Incidents per capita sit near the Sydney median. Assaults a little above in the town centre. BOCSAR-style sample data, not live.",
    },
    housing: { medianWeeklyRent: 390, medianPurchase: 890000 },
    households: { medianAge: 33, pctRenting: 50, pctFamiliesWithChildren: 37 },
    backgrounds: {
      pctBornAustralia: 32,
      topAncestries: [
        { name: "Chinese", pct: 24 },
        { name: "Australian", pct: 16 },
        { name: "Turkish", pct: 14 },
      ],
      topLanguageOther: "Arabic",
    },
    services: [
      { type: "station", name: "Auburn", lng: 151.033, lat: -33.849 },
      { type: "school", name: "Auburn Public", lng: 151.027, lat: -33.846 },
      { type: "hospital", name: "Auburn Hospital", lng: 151.036, lat: -33.843 },
    ],
  },
  {
    id: "lakemba",
    name: "Lakemba",
    bbox: [151.07, -33.925, 151.086, -33.912],
    safety: {
      band: 3,
      summary:
        "Incidents per capita near the Sydney median. Dwelling break-ins a little below. BOCSAR-style sample data, not live.",
    },
    housing: { medianWeeklyRent: 370, medianPurchase: 780000 },
    households: { medianAge: 32, pctRenting: 48, pctFamiliesWithChildren: 39 },
    backgrounds: {
      pctBornAustralia: 35,
      topAncestries: [
        { name: "Lebanese", pct: 28 },
        { name: "Bengali", pct: 16 },
        { name: "Australian", pct: 14 },
      ],
      topLanguageOther: "Arabic",
    },
    services: [
      { type: "station", name: "Lakemba", lng: 151.076, lat: -33.92 },
      { type: "school", name: "Lakemba Public", lng: 151.08, lat: -33.916 },
      { type: "hospital", name: "Lakemba Medical", lng: 151.073, lat: -33.918 },
    ],
  },
  {
    id: "manly",
    name: "Manly",
    bbox: [151.278, -33.802, 151.292, -33.79],
    safety: {
      band: 5,
      summary:
        "Fewer dwelling break-ins than the Sydney median. Assaults near the median on weekend nights. BOCSAR-style sample data, not live.",
    },
    housing: { medianWeeklyRent: 680, medianPurchase: 2380000 },
    households: { medianAge: 38, pctRenting: 36, pctFamiliesWithChildren: 29 },
    backgrounds: {
      pctBornAustralia: 62,
      topAncestries: [
        { name: "English", pct: 32 },
        { name: "Australian", pct: 28 },
        { name: "Irish", pct: 12 },
      ],
      topLanguageOther: "Spanish",
    },
    services: [
      { type: "station", name: "Manly Wharf", lng: 151.284, lat: -33.8 },
      { type: "school", name: "Manly Village Public", lng: 151.286, lat: -33.796 },
      { type: "hospital", name: "Manly Hospital nearby", lng: 151.281, lat: -33.793 },
    ],
  },
  {
    id: "chatswood",
    name: "Chatswood",
    bbox: [151.172, -33.802, 151.188, -33.79],
    safety: {
      band: 4,
      summary:
        "Fewer assaults than the Sydney median. Steal-from-retail in the mall sits near the median. BOCSAR-style sample data, not live.",
    },
    housing: { medianWeeklyRent: 560, medianPurchase: 1680000 },
    households: { medianAge: 36, pctRenting: 40, pctFamiliesWithChildren: 35 },
    backgrounds: {
      pctBornAustralia: 36,
      topAncestries: [
        { name: "Chinese", pct: 38 },
        { name: "English", pct: 14 },
        { name: "Australian", pct: 14 },
      ],
      topLanguageOther: "Mandarin",
    },
    services: [
      { type: "station", name: "Chatswood", lng: 151.18, lat: -33.797 },
      { type: "school", name: "Chatswood Public", lng: 151.176, lat: -33.794 },
      { type: "hospital", name: "Chatswood Private", lng: 151.184, lat: -33.799 },
    ],
  },
  {
    id: "mosman",
    name: "Mosman",
    bbox: [151.232, -33.838, 151.252, -33.822],
    safety: {
      band: 5,
      summary:
        "Fewer incidents per capita than the Sydney median across assault and steal-from-dwelling. BOCSAR-style sample data, not live.",
    },
    housing: { medianWeeklyRent: 780, medianPurchase: 3450000 },
    households: { medianAge: 42, pctRenting: 28, pctFamiliesWithChildren: 33 },
    backgrounds: {
      pctBornAustralia: 64,
      topAncestries: [
        { name: "English", pct: 34 },
        { name: "Australian", pct: 26 },
        { name: "Irish", pct: 14 },
      ],
      topLanguageOther: "Mandarin",
    },
    services: [
      { type: "school", name: "Mosman Public", lng: 151.24, lat: -33.83 },
      { type: "hospital", name: "Mosman Medical", lng: 151.245, lat: -33.826 },
      { type: "station", name: "Spit Junction stop", lng: 151.236, lat: -33.834 },
    ],
  },
  {
    id: "penrith",
    name: "Penrith",
    bbox: [150.682, -33.762, 150.705, -33.745],
    safety: {
      band: 3,
      summary:
        "Incidents per capita near the Sydney median. Steal-from-motor-vehicle a little above in the civic centre. BOCSAR-style sample data, not live.",
    },
    housing: { medianWeeklyRent: 380, medianPurchase: 750000 },
    households: { medianAge: 35, pctRenting: 32, pctFamiliesWithChildren: 44 },
    backgrounds: {
      pctBornAustralia: 66,
      topAncestries: [
        { name: "Australian", pct: 32 },
        { name: "English", pct: 28 },
        { name: "Irish", pct: 10 },
      ],
      topLanguageOther: "Arabic",
    },
    services: [
      { type: "station", name: "Penrith", lng: 150.694, lat: -33.751 },
      { type: "school", name: "Penrith Public", lng: 150.688, lat: -33.748 },
      { type: "hospital", name: "Nepean Hospital nearby", lng: 150.7, lat: -33.756 },
      { type: "school", name: "Penrith High", lng: 150.691, lat: -33.754 },
    ],
  },
];

export const suburbsById: Record<string, Suburb> = Object.fromEntries(
  suburbs.map((s) => [s.id, s]),
);
