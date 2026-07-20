import Link from "next/link";
import { listEnabledAreas } from "@/lib/areas/registry";

export function Colophon({
  landing = false,
  showcase = false,
}: {
  landing?: boolean;
  showcase?: boolean;
}) {
  const areas = listEnabledAreas();
  return (
    <div
      className="relative h-[400px] sm:h-[600px] lg:h-[800px] max-h-[800px]"
      style={{ clipPath: "polygon(0% 0, 100% 0%, 100% 100%, 0 100%)" }}
    >
      <div className="relative h-[calc(100vh+400px)] sm:h-[calc(100vh+600px)] lg:h-[calc(100vh+800px)] -top-[100vh]">
        <div className="h-[400px] sm:h-[600px] lg:h-[800px] sticky top-[calc(100vh-400px)] sm:top-[calc(100vh-600px)] lg:top-[calc(100vh-800px)]">
          <footer className="bg-neutral-900 py-6 sm:py-8 lg:py-10 px-5 sm:px-6 lg:px-10 h-full w-full flex flex-col justify-between">
            <div className="flex flex-wrap shrink-0 gap-10 sm:gap-12 lg:gap-24">
              <div className="flex flex-col gap-1 sm:gap-2">
                <h3 className="mb-2 uppercase text-neutral-400 text-xs sm:text-sm tracking-[0.22em]">
                  Desk
                </h3>
                {landing ? (
                  <a
                    href="#how"
                    className="text-white hover:text-neutral-400 transition-colors duration-300 text-sm sm:text-base"
                  >
                    How it works
                  </a>
                ) : (
                  <Link
                    href="/"
                    className="text-white hover:text-neutral-400 transition-colors duration-300 text-sm sm:text-base"
                  >
                    About PublicWire
                  </Link>
                )}
                {landing && showcase && (
                  <a
                    href="#agents"
                    className="text-white hover:text-neutral-400 transition-colors duration-300 text-sm sm:text-base"
                  >
                    Durable workflow
                  </a>
                )}
                {landing && showcase && (
                  <a
                    href="#trust"
                    className="text-white hover:text-neutral-400 transition-colors duration-300 text-sm sm:text-base"
                  >
                    Trust layer
                  </a>
                )}
              </div>
              <div className="flex flex-col gap-1 sm:gap-2">
                <h3 className="mb-2 uppercase text-neutral-400 text-xs sm:text-sm tracking-[0.22em]">
                  Editions
                </h3>
                {areas.map((area) => (
                  <Link
                    key={area.areaKey}
                    href={`/local/${area.areaKey}`}
                    className="text-white hover:text-neutral-400 transition-colors duration-300 text-sm sm:text-base"
                  >
                    {area.displayName}
                  </Link>
                ))}
              </div>
              <div className="flex flex-col gap-1 sm:gap-2">
                <h3 className="mb-2 uppercase text-neutral-400 text-xs sm:text-sm tracking-[0.22em]">
                  Tooling
                </h3>
                <span className="text-white text-sm sm:text-base">Nimble</span>
                <span className="text-white text-sm sm:text-base">
                  ClickHouse
                </span>
                <span className="text-white text-sm sm:text-base">
                  Senso · cited.md
                </span>
                <span className="text-white text-sm sm:text-base">Datadog</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 sm:gap-0">
              <div className="max-w-full overflow-hidden text-[clamp(3.5rem,20vw,14rem)] sm:text-[18vw] lg:text-[15vw] leading-[0.8] mt-2 sm:mt-4 lg:mt-6 text-white font-bold tracking-tight">
                PublicWire
              </div>
              <div className="max-w-sm text-neutral-400 text-xs sm:text-sm uppercase tracking-[0.22em] sm:text-right">
                <p className="mb-2">
                  Google ADK civic newsroom · evidence first
                </p>
                <p>© Civic Edition · Vol. I</p>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
