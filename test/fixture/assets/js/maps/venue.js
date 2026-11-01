// Map script of the location page (`map.script`): marks the venue
export default function (map) {
  L.circleMarker(map.getCenter(), { radius: 8 }).addTo(map);
}
