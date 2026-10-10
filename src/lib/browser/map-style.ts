import type { StyleSpecification } from "maplibre-gl";

export function quietMapStyle(style: StyleSpecification): StyleSpecification {
  return {
    ...style,
    layers: style.layers.filter((layer) => layer.type !== "symbol"),
  };
}
