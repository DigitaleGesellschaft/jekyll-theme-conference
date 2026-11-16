// Map script of the location page (`map.script`): marks the venue
export default function (map) {
  const center = map.getCenter();

  L.circleMarker(center, { radius: 8 }).addTo(map);
  L.polygon([center, [center.lat + 0.001, center.lng], [center.lat, center.lng + 0.001]], { className: "map-area" }).addTo(map);
  L.marker(center, { icon: L.divIcon({ className: "map-label", html: "Venue", iconSize: null }) }).addTo(map);
}
