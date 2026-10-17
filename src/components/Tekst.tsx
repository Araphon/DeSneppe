export default function Tekst({ tekst, className = '' }: { tekst: string; className?: string }) {
  return (
    <div className={className}>
      {tekst.split(/\n\s*\n/).map((p, i) => <p key={i} className="mb-4 leading-relaxed last:mb-0">{p}</p>)}
    </div>
  )
}
