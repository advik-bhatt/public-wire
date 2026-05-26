import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Colophon } from "@/components/landing/colophon";
import { Masthead } from "@/components/landing/masthead";
import { demoEditions, getBriefById } from "@/content/public-wire-content";

type BriefPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateStaticParams() {
  return Object.values(demoEditions)
    .flatMap((edition) => edition.briefs)
    .map((brief) => ({ id: brief.slug }));
}

export async function generateMetadata({ params }: BriefPageProps) {
  const { id } = await params;
  const brief = getBriefById(id);

  if (!brief) {
    return {
      title: "Brief not found - PublicWire",
    };
  }

  return {
    title: `${brief.headline} - PublicWire`,
    description: brief.summary,
  };
}

export default async function BriefPage({ params }: BriefPageProps) {
  const { id } = await params;
  const brief = getBriefById(id);

  if (!brief) notFound();

  return (
    <>
      <Masthead variant="solid" />
      <main className="bg-white text-black">
        <section className="border-b border-black/10">
          <div className="max-w-[1100px] mx-auto px-6 md:px-10 pt-14 md:pt-20 pb-12">
            <Link
              href="/local/new-brunswick"
              className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-neutral-500 hover:text-black mb-10"
            >
              <ArrowLeft className="size-4" /> Back to New Brunswick edition
            </Link>

            <div className="flex flex-wrap gap-2 mb-5">
              <span className="text-[0.65rem] uppercase tracking-[0.15em] px-2 py-1 bg-black text-white">
                {brief.verificationStatus}
              </span>
              <span className="text-[0.65rem] uppercase tracking-[0.15em] px-2 py-1 border border-black/20">
                {brief.category}
              </span>
              <span className="text-[0.65rem] uppercase tracking-[0.15em] px-2 py-1 border border-black/20">
                {brief.status}
              </span>
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-[0.96] tracking-tight mb-6 text-balance">
              {brief.headline}
            </h1>
            <p className="text-sm uppercase tracking-[0.18em] text-neutral-500">
              Published {brief.publishedAt} · {brief.area}
            </p>
          </div>
        </section>

        <section className="border-b border-black/10">
          <div className="max-w-[1100px] mx-auto px-6 md:px-10 py-14">
            <article className="grid lg:grid-cols-[1fr_320px] gap-12">
              <div className="space-y-10">
              <BriefSection title="Summary">
                <p>{brief.summary}</p>
              </BriefSection>

              <BriefSection title="Why It Matters">
                <p>{brief.whyItMatters}</p>
              </BriefSection>

              <BriefSection title="Who Is Affected">
                <div className="flex flex-wrap gap-2">
                  {brief.whoIsAffected.map((group) => (
                    <span
                      key={group}
                      className="text-xs uppercase tracking-[0.14em] px-2 py-1 border border-black/20"
                    >
                      {group}
                    </span>
                  ))}
                </div>
              </BriefSection>

              <BriefSection title="What Changed">
                <p>{brief.whatChanged}</p>
              </BriefSection>

              <BriefSection title="Sources">
                <div className="space-y-4">
                  {brief.sources.map((source) => (
                    <div key={source.title} className="border border-black/10 p-4">
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 font-semibold hover:underline"
                      >
                        {source.title} <ExternalLink className="size-4" />
                      </a>
                      <p className="text-sm text-neutral-600 mt-2">{source.role}</p>
                    </div>
                  ))}
                </div>
              </BriefSection>
              </div>

              <aside className="space-y-4">
                <div className="bg-black text-white p-6">
                  <div className="text-[0.65rem] uppercase tracking-[0.2em] text-neutral-400 mb-3">
                    Published artifact
                  </div>
                  <p className="text-sm text-neutral-200">{brief.artifactLabel}</p>
                  {brief.publishedUrl && (
                    <a
                      href={brief.publishedUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] border border-white/30 px-3 py-2 hover:bg-white hover:text-black transition-colors"
                    >
                      View on cited.md <ExternalLink className="size-3" />
                    </a>
                  )}
                </div>
                <div className="border border-black/10 p-6">
                  <div className="text-[0.65rem] uppercase tracking-[0.2em] text-neutral-500 mb-3">
                    Verification
                  </div>
                  <p className="text-2xl font-bold leading-tight">{brief.verificationStatus}</p>
                </div>
              </aside>
            </article>
          </div>
        </section>

        <section className="border-b border-black/10 bg-black text-white">
          <div className="max-w-[1200px] mx-auto px-6 md:px-10 py-16">
            <div className="mb-10 max-w-4xl">
              <h2 className="text-xs uppercase tracking-[0.22em] text-neutral-400 mb-4">
                Datadog-derived agent audit
              </h2>
              <p className="text-3xl md:text-5xl font-bold leading-[1] tracking-tight mb-4">
                How the agents decided this was fit to publish.
              </p>
              <p className="text-base md:text-lg text-neutral-300 leading-relaxed">
                The reliability trace reads raw agent events and explains what each
                agent did. The actual prompts and source queries are preserved in italics.
              </p>
            </div>

            <ol className="grid gap-px bg-white/15 border border-white/15">
              {brief.investigationTrace.map((event, index) => (
                <li
                  key={`${index}-${event.time}-${event.agent}`}
                  className={`grid gap-4 p-5 md:grid-cols-[90px_180px_1fr] ${
                    event.status === "needs-evidence" || event.status === "resent"
                      ? "bg-amber-100 text-black"
                      : "bg-black text-white"
                  }`}
                >
                  <div className="font-mono text-xs opacity-70">
                    {String(index + 1).padStart(2, "0")} · {event.time}
                  </div>
                  <div>
                    <div className="font-bold">{event.agent}</div>
                    <div className="mt-2 inline-flex px-2 py-1 text-[0.6rem] uppercase tracking-[0.14em] border border-current">
                      {event.status === "resent" ? "↩ resend" : event.status.replace("-", " ")}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <p className="text-sm md:text-base leading-relaxed">{event.detail}</p>
                    {event.query && (
                      <p className="border-l border-current/30 pl-4 text-sm italic opacity-80">
                        “{event.query}”
                      </p>
                    )}
                    {event.technicalConfidence && (
                      <p className="font-mono text-xs uppercase tracking-[0.16em] opacity-70">
                        Technical confidence signal: {event.technicalConfidence}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-b border-black/10 bg-neutral-50">
          <div className="max-w-[1100px] mx-auto px-6 md:px-10 py-14 grid lg:grid-cols-2 gap-10">
            <BriefSection title="Reliability Reviewer Review">
              <p>{brief.reliabilityReview}</p>
            </BriefSection>

            <BriefSection title="Update History">
              <ol className="space-y-2">
                {brief.updateHistory.map((item) => (
                  <li key={item} className="text-sm text-neutral-700">
                    {item}
                  </li>
                ))}
              </ol>
            </BriefSection>
          </div>
        </section>
      </main>
      <Colophon />
    </>
  );
}

function BriefSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-xs uppercase tracking-[0.22em] text-neutral-500 mb-3">{title}</h2>
      <div className="text-base md:text-lg text-neutral-800 leading-relaxed">{children}</div>
    </section>
  );
}
