import Link from "next/link";

export function Colophon() {
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
                <a href="#how" className="text-white hover:text-neutral-400 transition-colors duration-300 text-sm sm:text-base">
                  How it works
                </a>
                <a href="#agents" className="text-white hover:text-neutral-400 transition-colors duration-300 text-sm sm:text-base">
                  Newsroom agents
                </a>
                <a href="#trust" className="text-white hover:text-neutral-400 transition-colors duration-300 text-sm sm:text-base">
                  Trust layer
                </a>
              </div>
              <div className="flex flex-col gap-1 sm:gap-2">
                <h3 className="mb-2 uppercase text-neutral-400 text-xs sm:text-sm tracking-[0.22em]">
                  Editions
                </h3>
                <Link
                  href="/local/new-brunswick"
                  className="text-white hover:text-neutral-400 transition-colors duration-300 text-sm sm:text-base"
                >
                  New Brunswick
                </Link>
                <Link
                  href="/local/newark"
                  className="text-white hover:text-neutral-400 transition-colors duration-300 text-sm sm:text-base"
                >
                  Newark
                </Link>
                <Link
                  href="/local/jersey-city"
                  className="text-white hover:text-neutral-400 transition-colors duration-300 text-sm sm:text-base"
                >
                  Jersey City
                </Link>
              </div>
              <div className="flex flex-col gap-1 sm:gap-2">
                <h3 className="mb-2 uppercase text-neutral-400 text-xs sm:text-sm tracking-[0.22em]">
                  Tooling
                </h3>
                <span className="text-white text-sm sm:text-base">Nimble</span>
                <span className="text-white text-sm sm:text-base">ClickHouse</span>
                <span className="text-white text-sm sm:text-base">Senso · cited.md</span>
                <span className="text-white text-sm sm:text-base">Datadog</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 sm:gap-0">
              <h1 className="text-[22vw] sm:text-[18vw] lg:text-[15vw] leading-[0.8] mt-2 sm:mt-4 lg:mt-6 text-white font-bold tracking-tight">
                PublicWire
              </h1>
              <div className="text-neutral-400 text-xs sm:text-sm uppercase tracking-[0.22em] sm:text-right">
                <p className="mb-2 whitespace-nowrap">
                  <span className="live-record-dot mr-2 inline-block size-2 rounded-full bg-red-600 align-middle shadow-[0_0_12px_rgba(220,38,38,0.9)]" />
                  LIVE - Agents hard at work
                </p>
                <p className="whitespace-nowrap">© Civic Edition · Vol. I</p>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
