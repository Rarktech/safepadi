"use client";

import { useState } from "react";
import AdminSidebar from "@/components/admin/Sidebar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Megaphone, Send, Image as ImageIcon, Video, X, Bold, Italic, Link as LinkIcon, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

const TARGET_PLATFORMS = [
    { id: "all", label: "All Platforms" },
    { id: "telegram", label: "Telegram" },
    { id: "discord", label: "Discord" },
    { id: "whatsapp", label: "WhatsApp" },
    { id: "instagram", label: "Instagram" }
];

export default function MarketingPage() {
    const [message, setMessage] = useState("");
    const [platforms, setPlatforms] = useState<string[]>(["all"]);
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

    const showToast = (msg: string, type: "success" | "error" = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 4000);
    };

    const togglePlatform = (id: string) => {
        if (id === "all") {
            setPlatforms(["all"]);
            return;
        }
        
        let newPlatforms = [...platforms];
        if (newPlatforms.includes("all")) {
            newPlatforms = [id];
        } else if (newPlatforms.includes(id)) {
            newPlatforms = newPlatforms.filter(p => p !== id);
        } else {
            newPlatforms.push(id);
        }
        
        if (newPlatforms.length === 0) newPlatforms = ["all"];
        setPlatforms(newPlatforms);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const insertFormatting = (prefix: string, suffix: string = "") => {
        const textarea = document.getElementById("broadcast-message") as HTMLTextAreaElement;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;

        const before = text.substring(0, start);
        const selected = text.substring(start, end);
        const after = text.substring(end);

        let newText = "";
        if (prefix === "<a>") {
            const url = prompt("Enter URL:");
            if (!url) return;
            newText = `${before}<a href="${url}">${selected || "Link Text"}</a>${after}`;
        } else {
            newText = `${before}${prefix}${selected || "text"}${suffix}${after}`;
        }

        setMessage(newText);
        
        setTimeout(() => {
            textarea.focus();
        }, 0);
    };

    const handleBroadcast = async () => {
        if (!message.trim()) {
            showToast("Message cannot be empty", "error");
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('message', message);
            formData.append('platforms', JSON.stringify(platforms));
            if (file) {
                formData.append('attachment', file);
            }

            const res = await axios.post(`${API_URL}/admin/broadcast`, formData, {
                headers: { 'Content-Type': 'multipart/form-data', 'ngrok-skip-browser-warning': 'true' }
            });

            if (res.data.success) {
                showToast("Broadcast successfully queued for dispatch!", "success");
                setMessage("");
                setFile(null);
            }
        } catch (err: any) {
            console.error("Broadcast failed:", err);
            showToast(err.response?.data?.error || "Failed to send broadcast", "error");
        } finally {
            setLoading(false);
        }
    };

    // Render HTML Preview safely natively (mocking chat platforms)
    const renderPreviewHTML = (text: string) => {
        let html = text.replace(/\\n/g, '<br />'); // Handle newlines
        // Add basic link targeting
        html = html.replace(/<a href=/g, '<a target="_blank" class="text-emerald-500 hover:underline" href=');
        return html;
    };

    return (
        <div className="flex bg-[#F8FAFC] min-h-screen font-sans">
            <AdminSidebar />
            
            <main className="flex-1 overflow-y-auto px-10 py-8">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white">
                        <Megaphone className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-[#0F172A] tracking-tight">Marketing Broadcast</h1>
                        <p className="text-sm font-bold text-slate-400 mt-1">Send messages to all active customers across platforms</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
                    {/* Left Column: Editor Config */}
                    <div className="xl:col-span-3 space-y-6">
                        <Card className="p-8 rounded-[32px] border-slate-100 shadow-sm ring-1 ring-slate-100">
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-indigo-500" /> Target Audience
                            </h3>
                            
                            <div className="flex flex-wrap gap-2 mb-8">
                                {TARGET_PLATFORMS.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => togglePlatform(p.id)}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                                            platforms.includes(p.id) 
                                                ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm" 
                                                : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                                        }`}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>

                            <hr className="border-slate-100 my-8" />

                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Message Content
                                </h3>
                                
                                <div className="flex items-center bg-slate-50 p-1 rounded-xl border border-slate-200">
                                    <button onClick={() => insertFormatting("<b>", "</b>")} className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-slate-600 transition-all group" title="Bold">
                                        <Bold className="w-4 h-4 group-hover:text-slate-900" />
                                    </button>
                                    <button onClick={() => insertFormatting("<i>", "</i>")} className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-slate-600 transition-all group" title="Italic">
                                        <Italic className="w-4 h-4 group-hover:text-slate-900" />
                                    </button>
                                    <button onClick={() => insertFormatting("<a>")} className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-slate-600 transition-all group" title="Link">
                                        <LinkIcon className="w-4 h-4 group-hover:text-slate-900" />
                                    </button>
                                </div>
                            </div>

                            <textarea
                                id="broadcast-message"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Type your marketing message here... Use formatting buttons above for bold, italics, and links."
                                className="w-full h-48 p-5 bg-slate-50 border border-slate-200 rounded-2xl text-[14px] text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white resize-none transition-all"
                            />

                            <div className="mt-8">
                                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Optional Media Attachment</h3>
                                {file ? (
                                    <div className="flex items-center justify-between p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-500">
                                                {file.type.includes('video') ? <Video className="w-5 h-5"/> : <ImageIcon className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-indigo-900">{file.name}</p>
                                                <p className="text-[10px] font-black text-indigo-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                            </div>
                                        </div>
                                        <button onClick={() => setFile(null)} className="p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-200 border-dashed rounded-2xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors group">
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                                <ImageIcon className="w-5 h-5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                                            </div>
                                            <p className="text-xs font-bold text-slate-500">Click to upload image or video</p>
                                            <p className="text-[10px] text-slate-400 mt-1 font-medium">PNG, JPG, MP4 up to 50MB</p>
                                        </div>
                                        <input type="file" className="hidden" accept="image/*,video/mp4" onChange={handleFileChange} />
                                    </label>
                                )}
                            </div>

                            <div className="flex justify-end mt-8 pt-8 border-t border-slate-100">
                                <Button 
                                    onClick={handleBroadcast}
                                    disabled={loading || !message.trim()}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-8 h-12 font-bold shadow-lg shadow-indigo-600/20 transition-all text-sm"
                                >
                                    {loading ? "Sending..." : "Send Broadcast Now"}
                                    {!loading && <Send className="w-4 h-4 ml-2" />}
                                </Button>
                            </div>
                        </Card>
                    </div>

                    {/* Right Column: Live Preview */}
                    <div className="xl:col-span-2">
                        <div className="sticky top-8 space-y-6">
                            <div className="flex items-center justify-between px-2">
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" /> Live Preview
                                </h3>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white px-3 py-1 rounded-full shadow-sm">
                                    Simulating Telegram & Discord
                                </div>
                            </div>

                            {/* Preview Mockup Container */}
                            <div className="bg-[#f0f2f5] rounded-[32px] border border-slate-200 shadow-inner overflow-hidden flex flex-col h-[600px] relative">
                                {/* Header */}
                                <div className="bg-white px-6 py-4 border-b border-slate-200 flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold shrink-0">
                                        <Megaphone className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black text-slate-900">Safeeely Alerts</h4>
                                        <p className="text-[11px] font-bold text-slate-400">bot</p>
                                    </div>
                                </div>

                                {/* Chat Area */}
                                <div className="flex-1 p-6 overflow-y-auto w-full">
                                    {message || file ? (
                                        <div className="flex mb-4 relative max-w-[85%]">
                                            <div className="bg-white text-slate-800 p-1 rounded-2xl rounded-tl-sm shadow-sm border border-slate-100">
                                                {file && (
                                                    <div className="w-full aspect-video bg-slate-100 rounded-xl mb-2 flex flex-col items-center justify-center text-slate-400 border border-slate-200 relative overflow-hidden">
                                                        {file.type.includes('image') ? (
                                                            <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt="Preview"/>
                                                        ) : (
                                                            <div className="flex flex-col items-center justify-center z-10">
                                                                <Video className="w-8 h-8 mb-2" />
                                                                <span className="text-xs font-bold">Video Attached</span>
                                                            </div>
                                                        )}
                                                        <div className="absolute inset-0 bg-black/5" />
                                                    </div>
                                                )}
                                                {message && (
                                                    <div 
                                                        className="text-[14px] leading-[1.4] p-2 whitespace-pre-wrap font-medium message-content"
                                                        dangerouslySetInnerHTML={{ __html: renderPreviewHTML(message) }}
                                                    />
                                                )}
                                                <div className="text-[10px] text-right text-slate-400 font-bold px-2 pb-1">
                                                    Now
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                                            <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-4">
                                                <AlertCircle className="w-8 h-8 text-slate-400" />
                                            </div>
                                            <p className="text-sm font-bold text-slate-500">Preview empty</p>
                                            <p className="text-xs text-slate-400 mt-1 max-w-[200px]">Start typing your message to see how it looks to users.</p>
                                        </div>
                                    )}
                                </div>
                                {/* Footer Input Mock */}
                                <div className="bg-[#f0f2f5] p-4 text-center">
                                    <div className="bg-white rounded-full py-2.5 px-4 text-xs font-bold text-slate-300 shadow-sm border border-slate-200">
                                        Users cannot reply to this conversation
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Global Styles for preview strong/em parsing */}
            <style dangerouslySetInnerHTML={{__html: `
                .message-content b { font-weight: 800; color: #020617; }
                .message-content i { font-style: italic; color: #475569; }
            `}} />

            {/* Toast notification */}
            {toast && (
                <div className={'fixed top-6 right-6 z-[100] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl text-white text-sm font-bold animate-in slide-in-from-top duration-300 ' + (toast.type === "success" ? "bg-emerald-600" : "bg-rose-600")}>
                    <span>{toast.type === "success" ? "✅" : "❌"}</span>
                    {toast.msg}
                </div>
            )}
        </div>
    );
}
