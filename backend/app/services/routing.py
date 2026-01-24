import httpx
from typing import List, Optional

async def fetch_osrm_route(start_coords: List[float], end_coords: List[float]) -> Optional[List[List[float]]]:
    """
    Fetch exact driving route from OSRM (Open Source Routing Machine).
    Coords format: [lat, lon]
    Returns: List of [lat, lon] waypoints
    """
    # OSRM Public Demo Server (Free)
    base_url = "http://router.project-osrm.org/route/v1/driving/"
    
    # Format: {lon},{lat};{lon},{lat}
    coords_str = f"{start_coords[1]},{start_coords[0]};{end_coords[1]},{end_coords[0]}"
    url = f"{base_url}{coords_str}?overview=full&geometries=geojson"
    
    print(f"Fetching route data from OSRM: {url}")
    
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(url, timeout=30.0)
            resp.raise_for_status()
            data = resp.json()
            
            if "routes" in data and len(data["routes"]) > 0:
                # OSRM returns [lon, lat], we need [lat, lon]
                geometry = data["routes"][0]["geometry"]["coordinates"]
                flipped_geom = [[p[1], p[0]] for p in geometry]
                return flipped_geom
            else:
                print("No route found by OSRM.")
                return None
        except Exception as e:
            print(f"Error fetching OSRM route: {e}")
            return None

async def get_route_metrics_with_path(start_coords: List[float], end_coords: List[float]) -> dict:
    """
    Fetch exact route with metrics (Distance, Duration) from OSRM.
    Returns: { 'distance_km': float, 'duration_hours': float, 'waypoints': [...] }
    """
    base_url = "http://router.project-osrm.org/route/v1/driving/"
    coords_str = f"{start_coords[1]},{start_coords[0]};{end_coords[1]},{end_coords[0]}"
    url = f"{base_url}{coords_str}?overview=full&geometries=geojson"
    
    print(f"Fetching estimate from OSRM: {url}")
    
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(url, timeout=30.0)
            resp.raise_for_status()
            data = resp.json()
            
            if "routes" in data and len(data["routes"]) > 0:
                route = data["routes"][0]
                geometry = route["geometry"]["coordinates"]
                flipped_geom = [[p[1], p[0]] for p in geometry]
                
                # Metrics
                distance_meters = route.get("distance", 0)
                duration_seconds = route.get("duration", 0)
                
                return {
                    "distance_km": round(distance_meters / 1000.0, 2),
                    "duration_hours": round(duration_seconds / 3600.0, 2),
                    "waypoints": flipped_geom
                }
            else:
                return None
        except Exception as e:
            print(f"Error fetching OSRM estimate: {e}")
            return None
