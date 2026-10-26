const Assignment = require("../models/Assignment");
const { nearestNeighborRoute, haversineDistanceKm } = require("../utils/nearestNeighbor");

const hasCoords = (loc) => !!loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lng);

/**
 * Route Optimizer for one staff member.
 * Takes every task that is still open for them (assigned / in-progress) and
 * orders the bins with the Nearest Neighbor heuristic on Haversine distances.
 *
 * depot: where the staff member is now ({ lat, lng }). Without it the route
 * starts at the most urgent bin.
 */
async function buildStaffRoute(staffId, depot, { reorder = false } = {}) {
  const assignments = await Assignment.find({
    staff: staffId,
    taskStatus: { $in: ["assigned", "in-progress"] },
  }).populate("report");

  const points = [];
  const skipped = [];

  assignments.forEach((a) => {
    const r = a.report;
    if (!r) return;
    if (!hasCoords(r.location)) {
      skipped.push(String(a._id));
      return;
    }
    points.push({
      id: String(a._id),
      taskId: String(a._id),
      reportId: String(r._id),
      name: r.location.address || r.description.slice(0, 40),
      description: r.description,
      lat: r.location.lat,
      lng: r.location.lng,
      priorityLevel: r.priorityLevel,
      priorityScore: r.priorityScore,
      taskStatus: a.taskStatus,
      routeOrder: a.routeOrder,
    });
  });

  // Stops the admin put in a route keep the admin's order (unless the staff member
  // asks to re-plan). Any other tasks are ordered by Nearest Neighbor after them.
  const start = hasCoords(depot) ? { lat: depot.lat, lng: depot.lng } : undefined;
  const fromAdmin = reorder ? [] : points.filter((p) => p.routeOrder).sort((a, b) => a.routeOrder - b.routeOrder);
  const rest = reorder ? points : points.filter((p) => !p.routeOrder);

  // With no starting point, begin at the most urgent bin
  rest.sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));

  const last = fromAdmin[fromAdmin.length - 1];
  const nn = nearestNeighborRoute(rest, fromAdmin.length ? { lat: last.lat, lng: last.lng } : start);
  const order = [...fromAdmin, ...nn.order];

  // Total distance across the final order
  let totalDistanceKm = 0;
  let prev = start || (order[0] ? { lat: order[0].lat, lng: order[0].lng } : null);
  order.forEach((p) => {
    if (prev) totalDistanceKm += haversineDistanceKm(prev, p);
    prev = p;
  });
  totalDistanceKm = Math.round(totalDistanceKm * 100) / 100;

  // Distance of each leg, so the staff member can see how far the next stop is
  let previous = start || (order[0] ? { lat: order[0].lat, lng: order[0].lng } : null);
  const stops = order.map((p, i) => {
    const legKm = previous ? Math.round(haversineDistanceKm(previous, p) * 100) / 100 : 0;
    previous = p;
    return { ...p, stop: i + 1, legKm };
  });

  return {
    depot: start || (stops[0] ? { lat: stops[0].lat, lng: stops[0].lng } : null),
    startsFromStaffLocation: !!start,
    plannedByAdmin: fromAdmin.length > 0,
    hasAdminRoute: points.some((p) => p.routeOrder),
    order: stops,
    totalDistanceKm,
    skippedNoCoordinates: skipped,
    note: "Route set by the admin; other tasks ordered by Nearest Neighbor on Haversine (straight-line) distances.",
  };
}

module.exports = { buildStaffRoute };
