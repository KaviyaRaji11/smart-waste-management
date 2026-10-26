const Bin = require("../models/Bin");
const { haversineDistanceKm } = require("../utils/nearestNeighbor");

// Reports closer than this are treated as the same physical bin
const BIN_RADIUS_M = Number(process.env.BIN_MATCH_RADIUS_M) || 40;

const hasCoords = (loc) => !!loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lng);

// Finds the bin within BIN_RADIUS_M of the location, or creates a new one.
async function findOrCreateBin(location = {}) {
  if (!hasCoords(location)) return null;

  const { lat, lng } = location;
  const degLat = BIN_RADIUS_M / 111320;
  const degLng = degLat / Math.max(Math.cos((lat * Math.PI) / 180), 0.01);

  const candidates = await Bin.find({
    "location.lat": { $gte: lat - degLat, $lte: lat + degLat },
    "location.lng": { $gte: lng - degLng, $lte: lng + degLng },
  });

  let nearest = null;
  let nearestMetres = Infinity;
  for (const bin of candidates) {
    const metres = haversineDistanceKm(bin.location, { lat, lng }) * 1000;
    if (metres <= BIN_RADIUS_M && metres < nearestMetres) {
      nearest = bin;
      nearestMetres = metres;
    }
  }

  if (nearest) {
    // Fill in address details the bin does not have yet
    let changed = false;
    ["address", "area", "city", "landmark"].forEach((key) => {
      if (!nearest.location[key] && location[key]) {
        nearest.location[key] = location[key];
        changed = true;
      }
    });
    if (changed) await nearest.save();
    return nearest;
  }

  return Bin.create({
    location: {
      address: location.address || "",
      area: location.area || "",
      city: location.city || "",
      landmark: location.landmark || "",
      lat,
      lng,
    },
  });
}

module.exports = { findOrCreateBin, hasCoords, BIN_RADIUS_M };
