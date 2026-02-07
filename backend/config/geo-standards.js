/**
 * Geographic Standards - SINGLE SOURCE OF TRUTH for country/state data
 *
 * This module defines supported countries and their subdivisions (states/provinces).
 * Used by field-type-standards.js for address field validation.
 *
 * EXTENSIBILITY:
 * To add a new country:
 * 1. Add 2-letter ISO code to SUPPORTED_COUNTRIES
 * 2. Add subdivisions to SUBDIVISIONS_BY_COUNTRY
 * 3. That's it - validation and frontend will pick it up automatically
 *
 * STANDARDS:
 * - Countries: ISO 3166-1 alpha-2 (e.g., 'US', 'CA')
 * - Subdivisions: ISO 3166-2 codes (e.g., 'OR', 'BC')
 *
 * @module config/geo-standards
 */

// ============================================================================
// SUPPORTED COUNTRIES
// ============================================================================

/**
 * Countries supported by the application
 * Order matters for UI dropdowns - most common first
 */
const SUPPORTED_COUNTRIES = Object.freeze(["US", "CA"]);

/**
 * Default country code for new addresses
 */
const DEFAULT_COUNTRY = "US";

/**
 * Country display names for UI
 */
const COUNTRY_NAMES = Object.freeze({
  US: "United States",
  CA: "Canada",
});

// ============================================================================
// SUBDIVISIONS (States/Provinces)
// ============================================================================

/**
 * US States and Territories
 * Includes 50 states + DC + populated territories
 */
const US_STATES = Object.freeze([
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "DC",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
  // Territories
  "AS",
  "GU",
  "MP",
  "PR",
  "VI",
]);

/**
 * US State display names
 */
const US_STATE_NAMES = Object.freeze({
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  DC: "District of Columbia",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
  // Territories
  AS: "American Samoa",
  GU: "Guam",
  MP: "Northern Mariana Islands",
  PR: "Puerto Rico",
  VI: "U.S. Virgin Islands",
});

/**
 * Canadian Provinces and Territories
 */
const CA_PROVINCES = Object.freeze([
  "AB",
  "BC",
  "MB",
  "NB",
  "NL",
  "NS",
  "NT",
  "NU",
  "ON",
  "PE",
  "QC",
  "SK",
  "YT",
]);

/**
 * Canadian Province display names
 */
const CA_PROVINCE_NAMES = Object.freeze({
  AB: "Alberta",
  BC: "British Columbia",
  MB: "Manitoba",
  NB: "New Brunswick",
  NL: "Newfoundland and Labrador",
  NS: "Nova Scotia",
  NT: "Northwest Territories",
  NU: "Nunavut",
  ON: "Ontario",
  PE: "Prince Edward Island",
  QC: "Quebec",
  SK: "Saskatchewan",
  YT: "Yukon",
});

/**
 * Subdivisions by country code
 * Used for country-specific dropdown filtering
 */
const SUBDIVISIONS_BY_COUNTRY = Object.freeze({
  US: US_STATES,
  CA: CA_PROVINCES,
});

/**
 * Subdivision names by country code
 * Used for display in UI
 */
const SUBDIVISION_NAMES_BY_COUNTRY = Object.freeze({
  US: US_STATE_NAMES,
  CA: CA_PROVINCE_NAMES,
});

/**
 * All valid subdivision codes (combined)
 * Used for backend validation - accepts any valid state/province
 */
const ALL_SUBDIVISIONS = Object.freeze(
  Object.values(SUBDIVISIONS_BY_COUNTRY).flat(),
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a country code is supported
 * @param {string} countryCode - ISO 3166-1 alpha-2 code
 * @returns {boolean}
 */
function isValidCountry(countryCode) {
  return SUPPORTED_COUNTRIES.includes(countryCode);
}

/**
 * Check if a subdivision code is valid for any supported country
 * @param {string} subdivisionCode - ISO 3166-2 subdivision code
 * @returns {boolean}
 */
function isValidSubdivision(subdivisionCode) {
  return ALL_SUBDIVISIONS.includes(subdivisionCode);
}

/**
 * Check if a subdivision is valid for a specific country
 * @param {string} subdivisionCode - ISO 3166-2 subdivision code
 * @param {string} countryCode - ISO 3166-1 alpha-2 code
 * @returns {boolean}
 */
function isValidSubdivisionForCountry(subdivisionCode, countryCode) {
  const countrySubdivisions = SUBDIVISIONS_BY_COUNTRY[countryCode];
  if (!countrySubdivisions) {
    return false;
  }
  return countrySubdivisions.includes(subdivisionCode);
}

/**
 * Get subdivisions for a country
 * @param {string} countryCode - ISO 3166-1 alpha-2 code
 * @returns {string[]} Array of subdivision codes, empty if country not supported
 */
function getSubdivisionsForCountry(countryCode) {
  return SUBDIVISIONS_BY_COUNTRY[countryCode] || [];
}

/**
 * Get subdivision name
 * @param {string} subdivisionCode - ISO 3166-2 subdivision code
 * @param {string} countryCode - ISO 3166-1 alpha-2 code
 * @returns {string|null} Display name or null if not found
 */
function getSubdivisionName(subdivisionCode, countryCode) {
  const names = SUBDIVISION_NAMES_BY_COUNTRY[countryCode];
  return names?.[subdivisionCode] || null;
}

/**
 * Get country name
 * @param {string} countryCode - ISO 3166-1 alpha-2 code
 * @returns {string|null} Display name or null if not found
 */
function getCountryName(countryCode) {
  return COUNTRY_NAMES[countryCode] || null;
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Constants
  SUPPORTED_COUNTRIES,
  DEFAULT_COUNTRY,
  COUNTRY_NAMES,
  SUBDIVISIONS_BY_COUNTRY,
  SUBDIVISION_NAMES_BY_COUNTRY,
  ALL_SUBDIVISIONS,

  // Individual country data (for direct access)
  US_STATES,
  US_STATE_NAMES,
  CA_PROVINCES,
  CA_PROVINCE_NAMES,

  // Helper functions
  isValidCountry,
  isValidSubdivision,
  isValidSubdivisionForCountry,
  getSubdivisionsForCountry,
  getSubdivisionName,
  getCountryName,
};
