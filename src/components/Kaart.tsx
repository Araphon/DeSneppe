export default function Kaart({ lat, lng, titel }: { lat: number; lng: number; titel: string }) {
  const d = 0.004
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - d * 1.6}%2C${lat - d}%2C${lng + d * 1.6}%2C${lat + d}&layer=mapnik&marker=${lat}%2C${lng}`
  return (
    <iframe title={titel} src={src} loading="lazy" className="h-72 w-full rounded-2xl border-0 shadow-card grayscale-[30%]" />
  )
}
