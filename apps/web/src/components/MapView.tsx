import type { GeoJsonLineString } from '@mapeando/shared';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef } from 'react';

export interface MapPoint {
  lat: number;
  lng: number;
  cor?: string;
  titulo?: string;
}

interface MapViewProps {
  points?: MapPoint[];
  route?: GeoJsonLineString | null;
  cluster?: boolean;
  className?: string;
}

// Estilo externo (basemap com ruas) é opcional via VITE_MAP_STYLE_URL.
// Sem ele, usamos um estilo embutido (fundo liso) — garante que os pontos e a
// rota sempre renderizem, mesmo offline / sem acesso a servidores de tiles.
const STYLE_URL = import.meta.env.VITE_MAP_STYLE_URL || undefined;
const FALLBACK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#dbe7f1' } }],
};

export function MapView({ points = [], route, cluster = true, className }: MapViewProps) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: ref.current,
      style: STYLE_URL ?? FALLBACK_STYLE,
      center: [-48.0, -20.0],
      zoom: 3.4,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.on('load', () => {
      loaded.current = true;
      render();
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      loaded.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // re-render quando dados mudam
  useEffect(() => {
    if (loaded.current) render();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, route]);

  function render() {
    const map = mapRef.current;
    if (!map) return;

    const fc = {
      type: 'FeatureCollection' as const,
      features: points.map((p) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] },
        properties: { cor: p.cor ?? '#1b66db', titulo: p.titulo ?? '' },
      })),
    };

    // fonte de pontos
    const src = map.getSource('pts') as maplibregl.GeoJSONSource | undefined;
    if (src) {
      src.setData(fc);
    } else {
      map.addSource('pts', { type: 'geojson', data: fc, cluster, clusterRadius: 45 });
      if (cluster) {
        map.addLayer({
          id: 'clusters',
          type: 'circle',
          source: 'pts',
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': '#1b66db',
            'circle-opacity': 0.75,
            'circle-radius': ['step', ['get', 'point_count'], 14, 50, 20, 200, 28, 1000, 36],
          },
        });
        // contagem do cluster (círculo interno) — evita dependência de glyphs/fontes
        map.addLayer({
          id: 'cluster-core',
          type: 'circle',
          source: 'pts',
          filter: ['has', 'point_count'],
          paint: { 'circle-color': '#fff', 'circle-opacity': 0.9, 'circle-radius': 4 },
        });
      }
      map.addLayer({
        id: 'pts-unclustered',
        type: 'circle',
        source: 'pts',
        filter: cluster ? ['!', ['has', 'point_count']] : ['all'],
        paint: {
          'circle-color': ['get', 'cor'],
          'circle-radius': 6,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#fff',
        },
      });
      map.on('click', 'pts-unclustered', (e) => {
        const f = e.features?.[0];
        const titulo = f?.properties?.titulo as string;
        if (titulo) {
          new maplibregl.Popup()
            .setLngLat((f!.geometry as unknown as { coordinates: [number, number] }).coordinates)
            .setText(titulo)
            .addTo(map);
        }
      });
    }

    // rota
    const routeData = route ?? { type: 'LineString' as const, coordinates: [] };
    const rsrc = map.getSource('route') as maplibregl.GeoJSONSource | undefined;
    const feature = { type: 'Feature' as const, geometry: routeData, properties: {} };
    if (rsrc) {
      rsrc.setData(feature);
    } else {
      map.addSource('route', { type: 'geojson', data: feature });
      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#16a34a', 'line-width': 4 },
      });
    }

    // ajusta o enquadramento
    const coords: [number, number][] = [
      ...points.map((p) => [p.lng, p.lat] as [number, number]),
      ...(route?.coordinates ?? []),
    ];
    if (coords.length) {
      const b = coords.reduce(
        (acc, c) => acc.extend(c),
        new maplibregl.LngLatBounds(coords[0], coords[0]),
      );
      map.fitBounds(b, { padding: 50, maxZoom: 12, duration: 400 });
    }
  }

  return <div ref={ref} className={className ?? 'h-full w-full'} />;
}
