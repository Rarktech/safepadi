import { Navbar } from "@/components/Navbar";

export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
            <Navbar />
            <div className="max-w-4xl mx-auto px-6 pt-56 pb-20">
                <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 mb-6 bg-gradient-to-r from-emerald-600 to-emerald-400 bg-clip-text text-transparent">
                    Privacy Policy
                </h1>
                <p className="text-slate-500 mb-10 border-b border-slate-200 pb-4 italic">
                    Effective Date: March 9, 2026
                </p>

                <section className="space-y-8">
                    <div>
                        <h2 className="text-2xl font-bold mb-4">1. Introduction</h2>
                        <p className="leading-relaxed text-slate-700">
                            Welcome to Safeeely. Your privacy is critical to us. We build escrow technology to facilitate trust
                            between buyers and sellers on social media. This policy explains how we collect, use, and protect your
                            information when you use our bots or web platform.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-2xl font-bold mb-4">2. Information We Collect</h2>
                        <div className="grid md:grid-cols-3 gap-4">
                            <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100">
                                <h3 className="font-bold text-emerald-600 mb-2">Platform Data</h3>
                                <p className="text-sm text-slate-600">Unique IDs and handles from Telegram, Discord, or Instagram to link your account across services.</p>
                            </div>
                            <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100">
                                <h3 className="font-bold text-emerald-600 mb-2">Contact Info</h3>
                                <p className="text-sm text-slate-600">Your email address for transaction receipts, dispute updates, and security notifications.</p>
                            </div>
                            <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100">
                                <h3 className="font-bold text-emerald-600 mb-2">Transactions</h3>
                                <p className="text-sm text-slate-600">Order details including product name, amount, and status to ensure successful delivery.</p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h2 className="text-2xl font-bold mb-4">3. How We Use Your Data</h2>
                        <ul className="list-disc pl-6 space-y-2 text-slate-700">
                            <li>To provide the Safeeely escrow service and finalize payments.</li>
                            <li>To maintain a public reputation system (Trust Scores) based on transaction history.</li>
                            <li>To prevent fraudulent activities and resolve transaction disputes fairly.</li>
                            <li>To comply with regulatory requirements for electronic financial services.</li>
                        </ul>
                    </div>

                    <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
                        <h2 className="text-2xl font-bold text-emerald-900 mb-4">4. Your Rights & Data Deletion</h2>
                        <p className="text-emerald-800 mb-4">
                            Meta policies and GDPR grant you significant control over your data. You have the right to access,
                            modify, or request the deletion of your personal data at any time.
                        </p>
                        <p className="font-semibold text-emerald-900">How to delete your data:</p>
                        <p className="text-emerald-800">
                            You can initiate a full account deletion by typing <code>/delete_account</code> in any of our bots
                            or by sending an email request to <b>privacy@safeeely.io</b>.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-2xl font-bold mb-4">5. Third-Party Services</h2>
                        <p className="leading-relaxed text-slate-700">
                            We leverage premium service providers to power Safeeely:
                        </p>
                        <div className="flex gap-4 mt-4">
                            <div className="px-4 py-2 bg-slate-100 rounded-full text-sm font-medium">Supabase (Storage)</div>
                            <div className="px-4 py-2 bg-slate-100 rounded-full text-sm font-medium">OPay (Payments)</div>
                            <div className="px-4 py-2 bg-slate-100 rounded-full text-sm font-medium">Meta Developers Portal</div>
                        </div>
                    </div>
                </section>

                <footer className="mt-20 pt-8 border-t border-slate-200 text-sm text-slate-500">
                    Built for secure transactions. &copy; 2026 Safeeely Technology.
                </footer>
            </div>
        </div>
    );
}
