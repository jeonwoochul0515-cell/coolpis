import { useEffect, useRef, useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import type { Order } from '../types/order';

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    google: any;
    __googleMapsCallback?: () => void;
  }
}

interface DeliveryMapProps {
  orders: Order[];
  height?: string;
}

const VEHICLE_COLORS: Record<string, string> = {
  '배송차1': '#E53935', // red
  '배송차2': '#1E88E5', // blue
  '배송차3': '#43A047', // green
  '배송차4': '#FB8C00', // orange
  '배송차5': '#8E24AA', // purple
};
const UNASSIGNED_COLOR = '#9E9E9E'; // grey
const ORIGIN_ADDRESS = '부산광역시 사상구 하신번영로 440';

function getVehicleColor(vehicle: string | null | undefined): string {
  if (!vehicle) return UNASSIGNED_COLOR;
  return VEHICLE_COLORS[vehicle] ?? '#795548'; // brown for 6+ vehicles
}

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.maps) {
      resolve();
      return;
    }

    const existing = document.getElementById('google-maps-script');
    if (existing) {
      // Script already loading, wait for callback
      const origCb = window.__googleMapsCallback;
      window.__googleMapsCallback = () => {
        origCb?.();
        resolve();
      };
      return;
    }

    window.__googleMapsCallback = () => {
      resolve();
    };

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=__googleMapsCallback`;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error('Google Maps 스크립트 로드 실패'));
    document.head.appendChild(script);
  });
}

interface GeocodedOrder {
  order: Order;
  lat: number;
  lng: number;
}

export default function DeliveryMap({ orders, height = '500px' }: DeliveryMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylinesRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);
  const geocodeCacheRef = useRef<Map<string, { lat: number; lng: number }>>(new Map());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [geocodingProgress, setGeocodingProgress] = useState('');

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyDuj6NUMUwmaatM1xAuKyIwGBjYyBUUu64';

  const geocodeAddress = useCallback(async (
    geocoder: any,
    address: string,
  ): Promise<{ lat: number; lng: number } | null> => {
    const cached = geocodeCacheRef.current.get(address);
    if (cached) return cached;

    return new Promise((resolve) => {
      geocoder.geocode({ address }, (results: any[], status: string) => {
        if (status === 'OK' && results?.[0]) {
          const loc = results[0].geometry.location;
          const coords = { lat: loc.lat(), lng: loc.lng() };
          geocodeCacheRef.current.set(address, coords);
          resolve(coords);
        } else {
          console.warn(`Geocoding failed for "${address}": ${status}`);
          resolve(null);
        }
      });
    });
  }, []);

  const clearMapOverlays = useCallback(() => {
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];
    if (infoWindowRef.current) {
      infoWindowRef.current.close();
    }
  }, []);

  useEffect(() => {
    if (!apiKey) {
      setLoading(false);
      setError('GOOGLE_MAPS_API_KEY');
      return;
    }

    let cancelled = false;

    const init = async () => {
      try {
        setLoading(true);
        setError(null);

        await loadGoogleMapsScript(apiKey);

        if (cancelled) return;

        const google = window.google;

        // Initialize map if not already done
        if (!mapInstanceRef.current && mapRef.current) {
          mapInstanceRef.current = new google.maps.Map(mapRef.current, {
            center: { lat: 35.152, lng: 129.0, }, // Busan center
            zoom: 12,
            mapTypeControl: false,
            streetViewControl: false,
          });
          infoWindowRef.current = new google.maps.InfoWindow();
        }

        const map = mapInstanceRef.current;
        if (!map) return;

        clearMapOverlays();

        const geocoder = new google.maps.Geocoder();

        // Geocode origin
        setGeocodingProgress('출발지 변환 중...');
        const originCoords = await geocodeAddress(geocoder, ORIGIN_ADDRESS);

        if (cancelled) return;

        // Geocode all order addresses with throttling
        const geocodedOrders: GeocodedOrder[] = [];
        const uniqueAddresses = [...new Set(orders.map((o) => o.address).filter(Boolean))];

        for (let i = 0; i < uniqueAddresses.length; i++) {
          if (cancelled) return;
          const addr = uniqueAddresses[i];
          setGeocodingProgress(`주소 변환 중... (${i + 1}/${uniqueAddresses.length})`);

          // Check cache first - no delay needed for cached results
          if (!geocodeCacheRef.current.has(addr)) {
            // Throttle only for actual API calls
            if (i > 0) {
              await new Promise((r) => setTimeout(r, 200));
            }
          }

          await geocodeAddress(geocoder, addr);
        }

        if (cancelled) return;

        // Map orders to geocoded positions
        for (const order of orders) {
          const coords = geocodeCacheRef.current.get(order.address);
          if (coords) {
            geocodedOrders.push({ order, ...coords });
          }
        }

        setGeocodingProgress('');

        const bounds = new google.maps.LatLngBounds();

        // Add origin marker
        if (originCoords) {
          const originMarker = new google.maps.Marker({
            position: originCoords,
            map,
            title: '출발지 (사상구 하신번영로)',
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 12,
              fillColor: '#000000',
              fillOpacity: 1,
              strokeColor: '#FFFFFF',
              strokeWeight: 3,
            },
            zIndex: 1000,
          });

          originMarker.addListener('click', () => {
            infoWindowRef.current.setContent(
              `<div style="padding:4px;font-family:sans-serif;">
                <strong>출발지</strong><br/>
                ${ORIGIN_ADDRESS}
              </div>`
            );
            infoWindowRef.current.open(map, originMarker);
          });

          markersRef.current.push(originMarker);
          bounds.extend(originCoords);
        }

        // Add order markers
        for (const geo of geocodedOrders) {
          const { order, lat, lng } = geo;
          const color = getVehicleColor(order.deliveryVehicle);
          const label = order.deliverySequence ? String(order.deliverySequence) : '';

          const marker = new google.maps.Marker({
            position: { lat, lng },
            map,
            title: order.businessName,
            label: label ? {
              text: label,
              color: '#FFFFFF',
              fontSize: '11px',
              fontWeight: 'bold',
            } : undefined,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: color,
              fillOpacity: 0.9,
              strokeColor: '#FFFFFF',
              strokeWeight: 2,
            },
            zIndex: 100,
          });

          const statusLabels: Record<string, string> = {
            pending: '접수대기',
            confirmed: '주문확인',
            in_transit: '배송중',
            delivered: '배송완료',
            failed: '배송실패',
          };

          marker.addListener('click', () => {
            infoWindowRef.current.setContent(
              `<div style="padding:4px;font-family:sans-serif;min-width:180px;">
                <strong>${order.businessName}</strong><br/>
                <span style="color:#666;font-size:12px;">${order.address}</span><br/>
                ${order.deliveryVehicle ? `<span style="color:${color};font-weight:bold;">${order.deliveryVehicle}</span> ` : ''}
                ${order.deliverySequence ? `#${order.deliverySequence} ` : ''}
                <span style="font-size:12px;">${statusLabels[order.status] ?? order.status}</span>
              </div>`
            );
            infoWindowRef.current.open(map, marker);
          });

          markersRef.current.push(marker);
          bounds.extend({ lat, lng });
        }

        // Draw polylines for each vehicle
        const vehicleGroups = new Map<string, GeocodedOrder[]>();
        for (const geo of geocodedOrders) {
          if (!geo.order.deliveryVehicle) continue;
          const v = geo.order.deliveryVehicle;
          const list = vehicleGroups.get(v);
          if (list) {
            list.push(geo);
          } else {
            vehicleGroups.set(v, [geo]);
          }
        }

        for (const [vehicle, geoOrders] of vehicleGroups) {
          const sorted = geoOrders
            .filter((g) => typeof g.order.deliverySequence === 'number' && g.order.deliverySequence > 0)
            .sort((a, b) => (a.order.deliverySequence ?? 0) - (b.order.deliverySequence ?? 0));

          if (sorted.length === 0) continue;

          const color = getVehicleColor(vehicle);
          const path: { lat: number; lng: number }[] = [];

          // Start from origin
          if (originCoords) {
            path.push(originCoords);
          }

          for (const geo of sorted) {
            path.push({ lat: geo.lat, lng: geo.lng });
          }

          const polyline = new google.maps.Polyline({
            path,
            geodesic: true,
            strokeColor: color,
            strokeOpacity: 0.7,
            strokeWeight: 3,
            map,
          });

          polylinesRef.current.push(polyline);
        }

        // Fit bounds
        if (geocodedOrders.length > 0 || originCoords) {
          map.fitBounds(bounds, 50);
        }

        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          console.error('Map init error:', err);
          setError(err instanceof Error ? err.message : '지도 로드 중 오류가 발생했습니다.');
          setLoading(false);
        }
      }
    };

    init();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, orders]);

  if (!apiKey) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Alert severity="warning" sx={{ maxWidth: 600, mx: 'auto' }}>
          <Typography variant="body1" fontWeight={600} gutterBottom>
            Google Maps API 키를 설정해주세요
          </Typography>
          <Typography variant="body2">
            .env 파일에 <code>VITE_GOOGLE_MAPS_API_KEY=YOUR_API_KEY</code>를 추가하세요.
            <br />
            Google Cloud Console에서 Maps JavaScript API와 Geocoding API를 활성화해야 합니다.
          </Typography>
        </Alert>
      </Box>
    );
  }

  if (error && error !== 'GOOGLE_MAPS_API_KEY') {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Alert severity="error" sx={{ maxWidth: 600, mx: 'auto' }}>
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Legend */}
      <Box sx={{ display: 'flex', gap: 2, mb: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: '#000', border: '2px solid #fff', boxShadow: '0 0 0 1px #000' }} />
          <Typography variant="caption">출발지</Typography>
        </Box>
        {Object.entries(VEHICLE_COLORS).map(([v, c]) => (
          <Box key={v} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: c }} />
            <Typography variant="caption">{v}</Typography>
          </Box>
        ))}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: UNASSIGNED_COLOR }} />
          <Typography variant="caption">미배정</Typography>
        </Box>
      </Box>

      {/* Loading overlay */}
      {loading && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            bgcolor: 'rgba(255,255,255,0.8)',
            zIndex: 10,
          }}
        >
          <CircularProgress />
          {geocodingProgress && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {geocodingProgress}
            </Typography>
          )}
        </Box>
      )}

      {/* Map container */}
      <Box
        ref={mapRef}
        sx={{
          width: '100%',
          height,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
        }}
      />
    </Box>
  );
}
