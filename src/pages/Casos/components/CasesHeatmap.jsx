import "mapbox-gl/dist/mapbox-gl.css";
import Map, { Source, Layer } from "react-map-gl";

export default function CasesHeatmap({ points }) {
  const token = import.meta.env.VITE_MAPBOX_TOKEN;

  const fc = {
    type: "FeatureCollection",
    features: points.map((p) => ({
      type: "Feature",
      properties: {
        weight: p.weight ?? 1,
      },
      geometry: {
        type: "Point",
        coordinates: [p.lon, p.lat],
      },
    })),
  };

  return (
    <Map
      mapboxAccessToken={token}
      initialViewState={{
        longitude: -99.1332,
        latitude: 19.4326,
        zoom: 4,
      }}
      mapStyle="mapbox://styles/mapbox/dark-v11"
      style={{ width: "100%", height: "100%" }}
      interactive={false}
    >
      <Source id="cases" type="geojson" data={fc}>
        <Layer
          id="heat"
          type="heatmap"
          paint={{
            "heatmap-weight": ["get", "weight"],
            "heatmap-intensity": 1.0,
            "heatmap-radius": 20,
            "heatmap-opacity": 0.9,
          }}
        />
      </Source>
    </Map>
  );
}
