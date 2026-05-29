export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[#f6f1e8] px-5 py-8 text-[#111] sm:px-8 lg:px-10">
      <div className="mx-auto max-w-4xl">
        <a href="/" className="text-sm font-semibold uppercase tracking-[0.18em] underline underline-offset-4">Rolemate</a>
        <h1 className="mt-10 text-5xl font-semibold tracking-[-0.05em] sm:text-7xl">Contact</h1>
        <p className="mt-5 text-lg leading-8 text-black/65">For pilots, partnerships, candidate support, data questions, or security reports, contact the Rolemate team.</p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <a className="border border-black bg-white p-5" href="mailto:advik.bhatt.work@gmail.com?subject=Rolemate%20pilot">
            <h2 className="text-2xl font-semibold">Pilots and partnerships</h2>
            <p className="mt-3 text-sm leading-7 text-black/65">For employers, student orgs, career centers, accelerators, and technical communities.</p>
          </a>
          <a className="border border-black bg-white p-5" href="mailto:advik.bhatt.work@gmail.com?subject=Rolemate%20support">
            <h2 className="text-2xl font-semibold">Support</h2>
            <p className="mt-3 text-sm leading-7 text-black/65">For account questions, candidate requests, data requests, and product feedback.</p>
          </a>
          <a className="border border-black bg-white p-5" href="mailto:advik.bhatt.work@gmail.com?subject=Rolemate%20security">
            <h2 className="text-2xl font-semibold">Security</h2>
            <p className="mt-3 text-sm leading-7 text-black/65">For vulnerability reports, suspicious activity, and access-control concerns.</p>
          </a>
          <a className="border border-black bg-white p-5" href="mailto:advik.bhatt.work@gmail.com?subject=Rolemate%20investor%20update">
            <h2 className="text-2xl font-semibold">Investor updates</h2>
            <p className="mt-3 text-sm leading-7 text-black/65">For angels, VC scouts, startup programs, and accelerator contacts.</p>
          </a>
        </div>
      </div>
    </main>
  );
}
