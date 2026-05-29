export default function LegalPage() {
  return (
    <main className="min-h-screen bg-[#f6f1e8] px-5 py-8 text-[#111] sm:px-8 lg:px-10">
      <div className="mx-auto max-w-4xl">
        <a href="/" className="text-sm font-semibold uppercase tracking-[0.18em] underline underline-offset-4">Rolemate</a>
        <h1 className="mt-10 text-5xl font-semibold tracking-[-0.05em] sm:text-7xl">Legal</h1>
        <p className="mt-5 text-lg leading-8 text-black/65">Startup-stage product terms, privacy notes, and data-handling information for Rolemate.</p>
        <div className="mt-10 grid gap-4">
          <section className="border border-black bg-white p-5"><h2 className="text-2xl font-semibold">Terms</h2><p className="mt-3 text-sm leading-7 text-black/65">Rolemate is an early-stage product for proof missions, role-fit analysis, proof maps, and hiring context. Users are responsible for the accuracy of materials they submit and share.</p></section>
          <section className="border border-black bg-white p-5"><h2 className="text-2xl font-semibold">Privacy</h2><p className="mt-3 text-sm leading-7 text-black/65">Rolemate may process career materials, project links, GitHub links, role descriptions, proof mission artifacts, contact details, and account information to provide the product.</p></section>
          <section className="border border-black bg-white p-5"><h2 className="text-2xl font-semibold">Security</h2><p className="mt-3 text-sm leading-7 text-black/65">Rolemate should use account-based access, server-side authorization, rate limits, environment variables for secrets, and clear sharing controls before employer pilots.</p></section>
          <section className="border border-black bg-white p-5"><h2 className="text-2xl font-semibold">Contact</h2><p className="mt-3 text-sm leading-7 text-black/65">Use the contact page for support, business inquiries, data questions, and security reports.</p></section>
        </div>
        <p className="mt-8 text-xs uppercase tracking-[0.18em] text-black/45">Last updated: May 29, 2026</p>
      </div>
    </main>
  );
}
