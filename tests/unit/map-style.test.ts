import { expect, test } from "bun:test";
import { quietMapStyle } from "../../src/lib/browser/map-style";
import type { StyleSpecification } from "maplibre-gl";

test("quiet basemap keeps roads and terrain but removes labels and POI symbols", () => {
  const style: StyleSpecification = {
    version: 8,
    sources: {},
    layers: [
      { id: "background", type: "background" },
      { id: "road", type: "line", source: "streets" },
      { id: "street-name", type: "symbol", source: "streets" },
      { id: "poi", type: "symbol", source: "streets" },
    ],
  };
  expect(quietMapStyle(style).layers.map((layer) => layer.id)).toEqual([
    "background",
    "road",
  ]);
  expect(style.layers).toHaveLength(4);
});
