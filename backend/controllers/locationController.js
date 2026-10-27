const axios = require("axios");
const { formatAddress } = require("../utils/address");

// Use LocationIQ when a key is set (works from cloud hosts like Render);
// otherwise fall back to the free Nominatim service (fine for local dev).
const BASE = process.env.LOCATIONIQ_KEY
  ? "https://us1.locationiq.com/v1"
  : "https://nominatim.openstreetmap.org";
const KEY = process.env.LOCATIONIQ_KEY ? { key: process.env.LOCATIONIQ_KEY } : {};
const HEADERS = { "User-Agent": "Smart-Waste-Management-System/1.0 (college project)" };

// Small in-memory cache so repeated pin drags do not hammer the geocoding service
const CACHE_MS = 10 * 60 * 1000;
const cache = new Map();
const cacheGet = (key) => {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;
  cache.delete(key);
  return null;
};
const cacheSet = (key, value) => {
  if (cache.size > 500) cache.clear();
  cache.set(key, { at: Date.now(), value });
};

// GET /api/location/reverse?lat=13.082680&lng=80.270721
// Returns the street-level address for a coordinate.
exports.reverseGeocode = async (req, res) => {
  try {
    const { lat, lng } = req.query;

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ message: "Latitude and longitude are required" });
    }

    const latitude = Number(lat);
    const longitude = Number(lng);

    if (Number.isNaN(latitude) || latitude < -90 || latitude > 90) {
      return res.status(400).json({ message: "Invalid latitude" });
    }
    if (Number.isNaN(longitude) || longitude < -180 || longitude > 180) {
      return res.status(400).json({ message: "Invalid longitude" });
    }

    const key = `${latitude.toFixed(5)},${longitude.toFixed(5)}`;
    const cached = cacheGet(key);
    if (cached) return res.json(cached);

    // Try street level first; if there is no street there, widen the search so
    // the nearest road / neighbourhood is returned instead of "Not found".
    let data = null;
    for (const zoom of [18, 17, 16]) {
      const response = await axios.get(`${BASE}/reverse`, {
        params: {
          ...KEY,
          lat: latitude,
          lon: longitude,
          format: "jsonv2",
          addressdetails: 1,
          namedetails: 1,
          zoom,
          "accept-language": "en",
        },
        headers: HEADERS,
        timeout: 10000,
      });
      if (response.data && !response.data.error) {
        const formatted = formatAddress(response.data);
        if (!data || formatted.hasStreet) data = response.data;
        if (formatted.hasStreet) break;
      }
    }

    if (!data) {
      return res.status(404).json({ message: "No address found for this point" });
    }

    const result = {
      ...formatAddress(data),
      latitude,
      longitude,
    };

    cacheSet(key, result);
    res.json(result);
  } catch (error) {
    console.error("Reverse geocoding error:", error.response?.data || error.message);
    if (error.response?.status === 429) {
      return res.status(429).json({ message: "Too many lookups. Please wait a moment and try again." });
    }
    res.status(500).json({ message: "Unable to find address from your location" });
  }
};

// GET /api/location/search?q=easwari engineering college ramapuram
// Finds places by name so a citizen can put the pin on the exact spot.
exports.searchPlaces = async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    if (q.length < 3) {
      return res.status(400).json({ message: "Type at least 3 characters to search" });
    }

    const key = `search:${q.toLowerCase()}`;
    const cached = cacheGet(key);
    if (cached) return res.json(cached);

    const response = await axios.get(`${BASE}/search`, {
      params: {
        ...KEY,
        q,
        format: "json",
        addressdetails: 1,
        namedetails: 1,
        limit: 6,
        "accept-language": "en",
        ...(process.env.GEOCODE_COUNTRY ? { countrycodes: process.env.GEOCODE_COUNTRY } : {}),
      },
      headers: HEADERS,
      timeout: 10000,
    });

    const result = {
      results: response.data.map((item) => ({
        ...formatAddress(item),
        latitude: Number(item.lat),
        longitude: Number(item.lon),
      })),
    };

    cacheSet(key, result);
    res.json(result);
  } catch (error) {
    console.error("Place search error:", error.response?.data || error.message);
    if (error.response?.status === 429) {
      return res.status(429).json({ message: "Too many lookups. Please wait a moment and try again." });
    }
    res.status(500).json({ message: "Unable to search places right now" });
  }
};