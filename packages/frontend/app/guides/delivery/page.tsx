import { Navbar } from "@/components/Navbar";

const sections = [
    {
        id: "physical",
        icon: "📦",
        title: "Physical Goods",
        color: "blue",
        steps: [
            { icon: "🎥", tip: "Record a video of the item before and during packaging — show the item is intact." },
            { icon: "📸", tip: "Take clear photos of the item from multiple angles before sealing the package." },
            { icon: "🧾", tip: "Get a shipping receipt with a tracking number — never skip this step." },
            { icon: "✍️", tip: "Request a delivery confirmation or signature from the recipient on arrival." },
            { icon: "🚫", tip: "Never mark the transaction complete until the buyer physically receives the item." },
            { icon: "📬", tip: "Share the tracking number with the buyer immediately after shipping." },
        ],
    },
    {
        id: "digital",
        icon: "💻",
        title: "Digital Products & Files",
        color: "purple",
        steps: [
            { icon: "📸", tip: "Screenshot the completed file or product before sending it to the buyer." },
            { icon: "📤", tip: "Upload via the Proof Portal — don't just share in chat; those messages can be deleted." },
            { icon: "📧", tip: "Send deliverables to the buyer's email as an additional paper trail." },
            { icon: "💬", tip: "Ask the buyer to confirm receipt in writing before you close the transaction." },
            { icon: "🔗", tip: "If it's a download link, record the URL and screenshot of the file before sharing." },
            { icon: "⏱️", tip: "Set a clear timeline for download or access — and document when it was sent." },
        ],
    },
    {
        id: "services",
        icon: "🛠️",
        title: "Services & Freelance Work",
        color: "amber",
        steps: [
            { icon: "🎥", tip: "Screen-record your finished deliverable — a walkthrough video is the strongest proof." },
            { icon: "📝", tip: "Get written confirmation from the buyer before marking the transaction done." },
            { icon: "💼", tip: "Export and save a copy of all work you have produced — code, designs, documents." },
            { icon: "🔗", tip: "Share live links or portfolio URLs as additional, timestamped evidence." },
            { icon: "📧", tip: "Deliver final work via email — gives you a timestamped delivery record." },
            { icon: "📋", tip: "Keep a task checklist and tick items off as you complete them — share it with the buyer." },
        ],
    },
    {
        id: "milestone",
        icon: "🪜",
        title: "Milestone Projects",
        color: "emerald",
        steps: [
            { icon: "📸", tip: "Document each phase separately with screenshots — treat every milestone like its own mini-delivery." },
            { icon: "📝", tip: "Get written sign-off from the buyer after each completed phase before moving forward." },
            { icon: "🎥", tip: "Record a short walkthrough video of each deliverable as you hand it over." },
            { icon: "💬", tip: "Keep all milestone-related messages — they serve as a communication log during disputes." },
            { icon: "📂", tip: "Save phase-specific files in clearly labelled folders so you can locate them quickly." },
            { icon: "🔄", tip: "Never start the next phase until the previous one is signed off in writing." },
        ],
    },
];

const colorMap: Record<string, { bg: string; border: string; badge: string; icon: string }> = {
    blue:    { bg: "bg-blue-50",    border: "border-blue-100",    badge: "bg-blue-100 text-blue-700",    icon: "text-blue-500" },
    purple:  { bg: "bg-purple-50",  border: "border-purple-100",  badge: "bg-purple-100 text-purple-700", icon: "text-purple-500" },
    amber:   { bg: "bg-amber-50",   border: "border-amber-100",   badge: "bg-amber-100 text-amber-700",   icon: "text-amber-500" },
    emerald: { bg: "bg-emerald-50", border: "border-emerald-100", badge: "bg-emerald-100 text-emerald-700", icon: "text-emerald-500" },
};

export default function DeliveryGuidelines() {
    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
            <Navbar />
            <div className="max-w-4xl mx-auto px-6 pt-56 pb-20">

                <div className="mb-12">
                    <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 mb-4 bg-gradient-to-r from-emerald-600 to-emerald-400 bg-clip-text text-transparent">
                        Delivery Guidelines
                    </h1>
                    <p className="text-slate-500 text-lg max-w-2xl">
                        How to deliver safely and protect your funds. Follow these steps for every transaction — documented proof is your strongest defence in any dispute.
                    </p>
                </div>

                {/* Alert banner */}
                <div className="mb-10 p-5 bg-red-50 border border-red-200 rounded-2xl flex gap-4 items-start">
                    <span className="text-2xl">⚠️</span>
                    <div>
                        <p className="font-bold text-red-800 mb-1">No proof = no protection</p>
                        <p className="text-red-700 text-sm leading-relaxed">
                            If a buyer disputes your delivery and you have no documented evidence on file, funds may be automatically returned to them.
                            The 7-day auto-release rule also applies — if a buyer does not respond within 7 days of you marking delivery complete, funds are automatically released to you.
                            Document everything, every time.
                        </p>
                    </div>
                </div>

                {/* Category sections */}
                <div className="space-y-10">
                    {sections.map((section) => {
                        const c = colorMap[section.color];
                        return (
                            <div key={section.id} className={`rounded-2xl border ${c.border} ${c.bg} overflow-hidden`}>
                                <div className="px-6 py-5 border-b border-inherit flex items-center gap-3">
                                    <span className="text-3xl">{section.icon}</span>
                                    <h2 className="text-xl font-bold text-slate-800">{section.title}</h2>
                                    <span className={`ml-auto text-xs font-semibold px-2.5 py-1 rounded-full ${c.badge}`}>
                                        {section.steps.length} steps
                                    </span>
                                </div>
                                <ul className="divide-y divide-white/60">
                                    {section.steps.map((step, i) => (
                                        <li key={i} className="px-6 py-4 flex items-start gap-4 bg-white/50">
                                            <span className={`text-xl mt-0.5 ${c.icon}`}>{step.icon}</span>
                                            <p className="text-slate-700 text-sm leading-relaxed">{step.tip}</p>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        );
                    })}
                </div>

                {/* General rules */}
                <div className="mt-12 p-6 bg-slate-900 rounded-2xl text-white">
                    <h2 className="text-xl font-bold mb-5 flex items-center gap-2">
                        <span>📋</span> General Rules for All Sellers
                    </h2>
                    <ul className="space-y-3">
                        {[
                            { icon: "🔍", rule: "If in doubt, document it — over-documenting never hurt anyone." },
                            { icon: "📤", rule: "Always upload proof via the Proof Portal, not just the chat window — chat messages can be deleted." },
                            { icon: "🚫", rule: "Never mark a transaction complete before the buyer has actually received the item or service." },
                            { icon: "⏱️",  rule: "Buyers have 7 days to confirm receipt after you mark delivery done. After 7 days, funds are automatically released to you." },
                            { icon: "💬", rule: "Communicate any delays or issues to the buyer in writing — it demonstrates good faith during disputes." },
                            { icon: "🔐", rule: "Safeeely's escrow holds funds until confirmation — this protects both sides. Use it correctly." },
                        ].map((item, i) => (
                            <li key={i} className="flex items-start gap-3">
                                <span className="text-lg">{item.icon}</span>
                                <p className="text-slate-300 text-sm leading-relaxed">{item.rule}</p>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Footer note */}
                <p className="mt-10 text-center text-slate-400 text-sm">
                    Need help? Contact Safeeely support through your messaging bot or visit{" "}
                    <a href="/dashboard" className="text-emerald-600 hover:underline font-medium">your dashboard</a>.
                </p>
            </div>
        </div>
    );
}
