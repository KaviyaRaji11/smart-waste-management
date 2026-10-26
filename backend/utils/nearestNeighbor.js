/**
 * Route Optimization (FR-09 / Section 10 of the requirement doc).
 * Simple, clearly-defined nearest-neighbor heuristic, as suggested for a student
 * project. Starts from a depot point, repeatedly visits the closest unvisited
 * location, and returns the resulting order plus total estimated distance.
 * NOT a real map/routing service — that integration is left "planned" per the
 * doc's rule against claiming unimplemented features.
 */

function haversineDistanceKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}

// points: [{ id, name, lat, lng }], depot: { lat, lng } (optional, defaults to first point)
function nearestNeighborRoute(points, depot) {
  if (!points || points.length === 0) return { order: [], totalDistanceKm: 0 };

  const start = depot || { lat: points[0].lat, lng: points[0].lng, name: "Depot" };
  const unvisited = [...points];
  const order = [];
  let current = start;
  let totalDistanceKm = 0;

  while (unvisited.length > 0) {
    let nearestIdx = 0;
    let nearestDist = Infinity;
    unvisited.forEach((p, idx) => {
      const d = haversineDistanceKm(current, p);
      if (d < nearestDist) {
        nearestDist = d;
        nearestIdx = idx;
      }
    });
    const next = unvisited.splice(nearestIdx, 1)[0];
    totalDistanceKm += nearestDist;
    order.push(next);
    current = next;
  }

  return { order, totalDistanceKm: Math.round(totalDistanceKm * 100) / 100 };
}

module.exports = { nearestNeighborRoute, haversineDistanceKm };
