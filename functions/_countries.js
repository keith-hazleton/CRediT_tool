// Common country name variants → standardized form
// Lookup is case-insensitive (keys are lowercase)
const COUNTRY_ALIASES = {
  // United States
  "us": "United States",
  "usa": "United States",
  "u.s.": "United States",
  "u.s.a.": "United States",
  "u.s": "United States",
  "u.s.a": "United States",
  "united states": "United States",
  "united states of america": "United States",
  // United Kingdom
  "uk": "United Kingdom",
  "u.k.": "United Kingdom",
  "u.k": "United Kingdom",
  "united kingdom": "United Kingdom",
  "great britain": "United Kingdom",
  // Netherlands
  "the netherlands": "Netherlands",
  "holland": "Netherlands",
  "netherlands": "Netherlands",
  // Brazil
  "brasil": "Brazil",
  "brazil": "Brazil",
  // South Korea
  "republic of korea": "South Korea",
  "south korea": "South Korea",
  // China
  "prc": "China",
  "people's republic of china": "China",
  "china": "China",
  // Germany
  "deutschland": "Germany",
  "germany": "Germany",
  // Mexico
  "méxico": "Mexico",
  "mexico": "Mexico",
};

export function normalizeCountry(country) {
  if (!country) return country;
  const trimmed = country.trim();
  return COUNTRY_ALIASES[trimmed.toLowerCase()] || trimmed;
}

export function normalizeAffiliations(affiliations) {
  if (!Array.isArray(affiliations)) return affiliations;
  return affiliations.map(aff => ({
    ...aff,
    country: normalizeCountry(aff.country)
  }));
}
