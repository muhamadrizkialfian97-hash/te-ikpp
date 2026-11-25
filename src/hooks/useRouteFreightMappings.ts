import { useState, useEffect, useCallback } from "react";
import { 
  getStoredRouteMappings, 
  saveRouteMapping, 
  deriveFreightTypes 
} from "../lib/freightTypeLookup";

export function useRouteFreightMappings() {
  const [mappings, setMappings] = useState<Record<string, string>>(() => getStoredRouteMappings());

  useEffect(() => {
    const handleUpdate = () => {
      setMappings(getStoredRouteMappings());
    };

    window.addEventListener("pancaran_route_mappings_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("pancaran_route_mappings_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const updateMapping = useCallback((route: string, newType: string) => {
    const updated = saveRouteMapping(route, newType);
    setMappings(updated);
  }, []);

  const resolveFreightType2 = useCallback((
    route?: string, 
    origin?: string, 
    destination?: string, 
    notes?: string
  ): "EXPORT" | "REPO FULL" | "REPO EMPTY" | "IMPORT" => {
    return deriveFreightTypes(route, origin, destination, notes, mappings).freightType2;
  }, [mappings]);

  return {
    mappings,
    updateMapping,
    resolveFreightType2
  };
}
