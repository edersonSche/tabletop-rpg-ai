export function isUnknownLocation(location: string | null | undefined): boolean {
  if (!location) return true;
  const normalized = location.toLowerCase().trim();
  return normalized === 'unknown location' || normalized === 'local desconhecido';
}
