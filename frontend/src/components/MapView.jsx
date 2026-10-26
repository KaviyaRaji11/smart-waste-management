import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER = [13.0827, 80.2707]; // Chennai

export const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const pinIcon = ({ color = "#1b7f4f", label = "", size = 30 }) =>
  L.divIcon({
    className: "map-pin-wrap",
    html: `<span class="map-pin" style="--pin:${escapeHtml(color)};width:${size}px;height:${size}px">${escapeHtml(label)}</span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });

const pickIcon = L.divIcon({
  className: "map-pin-wrap",
  html: '<span class="map-pick"></span>',
  iconSize: [38, 38],
  iconAnchor: [19, 19],
});

const userIcon = L.divIcon({
  className: "map-pin-wrap",
  html: '<span class="map-user"></span>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

/**
 * Leaflet + OpenStreetMap map.
 *   markers   [{ id, lat, lng, color, label, popup(html) }]
 *   polyline  [[lat, lng], ...]            route line
 *   user      { lat, lng, accuracy }       live position (blue dot)
 *   picker    { lat, lng } + onPick(latlng) draggable pin; map click also picks
 *   focus     { id } — pan to that marker and open it (a new object re-triggers)
 */
export default function MapView({
  markers = [],
  polyline = [],
  user = null,
  picker = null,
  onPick,
  focus = null,
  height = 380,
  autoFit = true,
}) {
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const layersRef = useRef({});
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  // ---- create the map once ----
  useEffect(() => {
    const map = L.map(elRef.current, {
      center: DEFAULT_CENTER,
      zoom: 12,
      scrollWheelZoom: false,
    });

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    layersRef.current = { markers: L.layerGroup().addTo(map), byId: {} };

    // Scroll-zoom only after the map is clicked, so the page can still scroll
    map.on("focus", () => map.scrollWheelZoom.enable());
    map.on("blur", () => map.scrollWheelZoom.disable());
    map.on("click", (e) => {
      if (onPickRef.current) onPickRef.current({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    const resizer = new ResizeObserver(() => map.invalidateSize());
    resizer.observe(elRef.current);

    mapRef.current = map;
    return () => {
      resizer.disconnect();
      map.remove();
      mapRef.current = null;
      layersRef.current = {};
    };
  }, []);

  // ---- markers + route line ----
  const signature = JSON.stringify([markers, polyline]);
  useEffect(() => {
    const map = mapRef.current;
    const layers = layersRef.current;
    if (!map || !layers.markers) return;

    layers.markers.clearLayers();
    layers.byId = {};
    markers.forEach((m) => {
      const marker = L.marker([m.lat, m.lng], { icon: pinIcon(m) });
      if (m.popup) marker.bindPopup(m.popup, { maxWidth: 260 });
      marker.addTo(layers.markers);
      layers.byId[m.id] = marker;
    });

    if (layers.line) {
      layers.line.remove();
      layers.line = null;
    }
    if (polyline.length > 1) {
      layers.line = L.polyline(polyline, {
        color: "#1b7f4f",
        weight: 4,
        opacity: 0.9,
        dashArray: "1 9",
        lineCap: "round",
      }).addTo(map);
    }

    if (autoFit) {
      const points = [...markers.map((m) => [m.lat, m.lng]), ...polyline];
      if (user) points.push([user.lat, user.lng]);
      if (points.length === 1) map.setView(points[0], 16);
      else if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [44, 44], maxZoom: 17 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  // ---- live position (blue dot + accuracy circle) ----
  useEffect(() => {
    const map = mapRef.current;
    const layers = layersRef.current;
    if (!map) return;

    if (!user) {
      layers.user?.remove();
      layers.accuracy?.remove();
      layers.user = layers.accuracy = null;
      return;
    }
    const at = [user.lat, user.lng];
    if (!layers.user) layers.user = L.marker(at, { icon: userIcon, zIndexOffset: 1000, interactive: false }).addTo(map);
    else layers.user.setLatLng(at);

    if (user.accuracy && user.accuracy < 1500) {
      if (!layers.accuracy) {
        layers.accuracy = L.circle(at, { radius: user.accuracy, color: "#2f7de1", weight: 1, fillOpacity: 0.08, interactive: false }).addTo(map);
      } else {
        layers.accuracy.setLatLng(at);
        layers.accuracy.setRadius(user.accuracy);
      }
    }
  }, [user?.lat, user?.lng, user?.accuracy]);

  // ---- draggable pin ----
  useEffect(() => {
    const map = mapRef.current;
    const layers = layersRef.current;
    if (!map) return;

    if (!picker) {
      layers.picker?.remove();
      layers.picker = null;
      return;
    }
    const at = [picker.lat, picker.lng];
    if (!layers.picker) {
      layers.picker = L.marker(at, { icon: pickIcon, draggable: true, zIndexOffset: 900 }).addTo(map);
      layers.picker.on("dragend", () => {
        const p = layers.picker.getLatLng();
        if (onPickRef.current) onPickRef.current({ lat: p.lat, lng: p.lng });
      });
    } else {
      layers.picker.setLatLng(at);
    }

    // Only move the view if the pin is off-screen or the map is zoomed far out
    if (map.getZoom() < 15 || !map.getBounds().pad(-0.15).contains(at)) {
      map.setView(at, Math.max(map.getZoom(), 17));
    }
  }, [picker?.lat, picker?.lng]);

  // ---- focus one marker ----
  useEffect(() => {
    const map = mapRef.current;
    const marker = layersRef.current.byId?.[focus?.id];
    if (!map || !marker) return;
    map.panTo(marker.getLatLng());
    marker.openPopup();
  }, [focus]);

  return <div className="map-box" style={{ height }}><div ref={elRef} className="map-el" /></div>;
}
