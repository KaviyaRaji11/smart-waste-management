/**
 * Turns an OpenStreetMap (Nominatim) place into the fields the report form
 * needs, keeping the full street-level detail instead of a bare road name.
 *
 *   address  "Easwari Engineering College, 12, D Street, Ganapathy Nagar"
 *   area     "Tondiarpet"
 *   city     "Chennai"
 *   formatted  address + area + city + state + postcode on one line
 */

const ROAD_KEYS = ["road", "pedestrian", "footway", "cycleway", "path", "living_street", "service", "track"];
const POI_KEYS = [
  "amenity", "building", "shop", "tourism", "office", "leisure", "historic",
  "college", "school", "university", "hospital", "clinic", "place_of_worship",
];
const GENERIC = new Set(["yes", "house", "residential", "apartments", "commercial", "detached", "terrace", "industrial", "retail", "roof", "construction"]);
const ROAD_CATEGORIES = new Set(["highway", "railway", "waterway", "boundary", "place"]);

const first = (obj, keys) => {
  for (const k of keys) if (obj[k]) return String(obj[k]);
  return "";
};

// Joins non-empty parts, dropping case-insensitive duplicates
const joinUnique = (parts) => {
  const seen = new Set();
  return parts
    .map((p) => (p ? String(p).trim() : ""))
    .filter((p) => {
      if (!p) return false;
      const key = p.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join(", ");
};

function formatAddress(data = {}) {
  const a = data.address || {};

  const road = first(a, ROAD_KEYS);
  const houseNumber = a.house_number || a.house_name || "";

  // Name of the building / institution at this exact point, if any
  let place = "";
    if (data.name && !ROAD_CATEGORIES.has(data.category || data.class) && data.name.toLowerCase() !== road.toLowerCase()) {
    place = data.name;
  } else {
    for (const k of POI_KEYS) {
      const v = a[k];
      if (v && v.length > 2 && !GENERIC.has(String(v).toLowerCase())) {
        place = v;
        break;
      }
    }
  }

  const streetLine = joinUnique([houseNumber, road]);

  // Broad locality (shown separately) vs. smaller neighbourhood (kept in the address line)
  const area = a.suburb || a.neighbourhood || a.quarter || a.city_district || a.residential || a.hamlet || "";
  const micro = [a.neighbourhood, a.quarter, a.residential].find(
    (v) => v && v.toLowerCase() !== area.toLowerCase() && v.toLowerCase() !== road.toLowerCase()
  );

  let address = joinUnique([place, streetLine, micro]);
  if (!address) {
    // No street found: fall back to the first parts of the full OSM name
    address = (data.display_name || "").split(",").slice(0, 2).join(",").trim();
  }

  const city = a.city || a.town || a.municipality || a.village || a.county || a.state_district || "";
  const state = a.state || "";
  const postcode = a.postcode || "";

  return {
    address,
    area,
    city,
    state,
    postcode,
    place,
    street: road,
    hasStreet: !!road,
    formatted: joinUnique([address, area, city, [state, postcode].filter(Boolean).join(" ")]),
    displayName: data.display_name || "",
  };
}

module.exports = { formatAddress };
