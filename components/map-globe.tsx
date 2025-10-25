"use client";

import { useEffect, useRef, useState } from "react";
import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";

export function MapGlobe() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maptilersdk.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    // Configure MapTiler API key
    maptilersdk.config.apiKey = "juWOnUfBiT65zoOK43Aq";

    // Initialize the map with globe projection - simple and clean
    map.current = new maptilersdk.Map({
      container: mapContainer.current,
      style: maptilersdk.MapStyle.STREETS,
      center: [-90.0, 20.0],
      zoom: 2.2,
      pitch: 0,
      bearing: 0,
      projection: "globe",
      navigationControl: false,
      geolocateControl: false,
      terrainControl: false,
      scaleControl: false,
    });

    map.current.on("load", () => {
      setIsLoaded(true);
      
      if (!map.current) return;

      // Customize colors - ocean indigo, land white, borders indigo
      const style = map.current.getStyle();
      if (style && style.layers) {
        style.layers.forEach((layer: any) => {
          // Set ocean/water to indigo
          if (layer["source-layer"] === "water" && layer.type === "fill") {
            map.current!.setPaintProperty(layer.id, "fill-color", "#4f46e5");
          }
          // Make land/terrain white by overriding landcover and landuse fills
          if (
            layer.type === "fill" &&
            (layer["source-layer"] === "landcover" ||
              layer["source-layer"] === "landuse" ||
              layer.id.toLowerCase().includes("land") ||
              layer.id.toLowerCase().includes("park") ||
              layer.id.toLowerCase().includes("green") ||
              layer.id.toLowerCase().includes("residential"))
          ) {
            map.current!.setPaintProperty(layer.id, "fill-color", "#ffffff");
            map.current!.setPaintProperty(layer.id, "fill-opacity", 1);
          }
          // Set country borders to indigo
          if (layer.type === "line" && layer["source-layer"] === "boundary") {
            map.current!.setPaintProperty(layer.id, "line-color", "#6366f1");
          }
        });
      }

      // Simple approach: Add markers for each country
      const countries = [
        { name: "Ecuador", coords: [-78.4678, -1.8312] as [number, number], emoji: "✅", color: "#ffffff", status: "active" },
        { name: "Colombia", coords: [-74.2973, 4.5709] as [number, number], emoji: "🔜", color: "#f59e0b", status: "soon" },
        { name: "Mexico", coords: [-102.5528, 23.6345] as [number, number], emoji: "🔜", color: "#f59e0b", status: "soon" },
        { name: "USA", coords: [-95.7129, 37.0902] as [number, number], emoji: "🔜", color: "#f59e0b", status: "soon" },
        { name: "Paraguay", coords: [-58.4438, -23.4425] as [number, number], emoji: "🔜", color: "#f59e0b", status: "soon" },
        { name: "Chile", coords: [-71.5430, -35.6751] as [number, number], emoji: "🔜", color: "#f59e0b", status: "soon" },
      ];

      // Add markers for each country - smaller size
      countries.forEach(country => {
        // Create a custom marker element
        const el = document.createElement("div");
        el.className = "country-marker";
        el.style.cssText = `
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: ${country.color};
          border: 2px solid white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          transition: transform 0.2s;
        `;
        el.innerHTML = country.emoji;
        el.title = country.name;
        
        el.addEventListener("mouseenter", () => {
          el.style.transform = "scale(1.2)";
        });
        
        el.addEventListener("mouseleave", () => {
          el.style.transform = "scale(1)";
        });

        // Add the marker to the map
        new maptilersdk.Marker({ element: el })
          .setLngLat(country.coords)
          .addTo(map.current!);
      });

      // Animate to show more of the globe
      setTimeout(() => {
        if (!map.current) return;
        map.current.flyTo({
          center: [-78.4678, -1.8312], // Ecuador coordinates
          zoom: 2.8,
          pitch: 15,
          bearing: -5,
          duration: 3000,
          essential: true,
          easing: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
        });
      }, 500);
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  return (
    <div className="relative w-full h-full min-h-[400px] rounded-2xl overflow-hidden bg-white">
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-indigo-600">Cargando mapa...</p>
          </div>
        </div>
      )}
    </div>
  );
}

