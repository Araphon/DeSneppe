export default function Faq({ faq }: { faq: { v: string; a: string }[] }) {
  return (
    <div className="divide-y divide-ink/10 rounded-2xl bg-white shadow-card">
      {faq.map((f, i) => (
        <details key={i} className="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
            <h3>{f.v}</h3>
            <span className="text-brand transition group-open:rotate-45 text-2xl leading-none">+</span>
          </summary>
          <p className="mt-2 leading-relaxed text-ink/75">{f.a}</p>
        </details>
      ))}
    </div>
  )
}
