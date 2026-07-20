import Image from "next/image";

export function Problem() {
  return (
    <section className="flex flex-col lg:flex-row lg:justify-between lg:items-stretch min-h-screen bg-white">
      <div className="flex-1 lg:order-1 px-6 md:px-10 py-16 lg:py-0 lg:pr-12 flex flex-col justify-center max-w-3xl">
        <h3 className="uppercase mb-6 text-xs md:text-sm tracking-[0.22em] text-neutral-500">
          § 02 · The problem
        </h3>
        <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold leading-[0.95] tracking-tight mb-6 text-balance">
          Public information,
          <br />
          privately ignored.
        </h2>
        <p className="text-lg md:text-2xl lg:text-3xl mb-6 leading-snug font-light text-neutral-800 text-balance">
          Every day, your town hall posts agendas. Your county posts notices.
          Transit posts service changes. Permits get filed. PDFs get uploaded.
        </p>
        <p className="text-base md:text-lg text-neutral-600 mb-8 leading-relaxed max-w-xl">
          All of it is public. None of it is readable. Most of it stays buried
          until it affects someone, and by then it&apos;s too late to do
          anything about it.
        </p>
        <p className="text-sm md:text-base text-neutral-500 border-l-2 border-black pl-4 uppercase tracking-wide max-w-xl">
          The information isn&apos;t hidden. It&apos;s just shaped like
          government, not like a newspaper.
        </p>
      </div>
      <div className="group relative h-[60vh] flex-1 overflow-hidden lg:order-2 lg:h-screen">
        <Image
          src="/images/newspaper2.webp"
          alt="Newspaper pages and civic reporting"
          fill
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="civic-source-photo object-cover grayscale"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-tr from-black/45 via-transparent to-black/10"
        />
        <svg
          aria-hidden="true"
          className="source-signal-map absolute inset-0 h-full w-full"
          viewBox="0 0 700 900"
          preserveAspectRatio="none"
        >
          <path d="M-20 690 C150 560 170 290 355 345 S520 680 740 210" />
          <path d="M40 180 C220 310 320 95 505 250 S610 500 735 455" />
          <circle cx="175" cy="520" r="7" />
          <circle cx="355" cy="345" r="7" />
          <circle cx="555" cy="542" r="7" />
        </svg>
        <div className="absolute bottom-6 left-6 right-6 flex items-center gap-3 border border-white/35 bg-black/45 px-4 py-3 text-[.65rem] font-bold uppercase tracking-[.14em] text-white backdrop-blur-sm md:bottom-10 md:left-10 md:right-auto">
          <span
            aria-hidden="true"
            className="live-record-dot size-2 rounded-full bg-white"
          />
          Source signal captured
        </div>
      </div>
    </section>
  );
}
