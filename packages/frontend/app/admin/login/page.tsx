"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Shield, Lock, Mail, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

export default function AdminLogin() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({ email: "", password: "" });

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await axios.post(`${API_URL}/admin/auth/login`, formData, {
                headers: { 'ngrok-skip-browser-warning': 'true' },
                withCredentials: true,
            });

            // Store token for cross-origin API calls (cookie domain mismatch in prod)
            if (res.data.token) {
                localStorage.setItem('sf_admin_token', res.data.token);
            }

            toast.success("Authentication Validated", {
                description: `Welcome back, ${res.data.user.name}`
            });

            router.push("/admin/dashboard");
        } catch (err: any) {
            toast.error("Access Denied", {
                description: err.response?.data?.error || "Invalid intelligence credentials"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-emerald-900/10" />
            
            <div className="relative w-full max-w-md bg-white/[0.02] border border-white/10 rounded-[40px] p-8 md:p-12 shadow-2xl backdrop-blur-3xl overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
                
                <div className="mb-12 text-center relative z-10">
                    <div className="w-16 h-16 mx-auto bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20 ring-1 ring-white/10 mb-6 group hover:scale-110 transition-transform duration-500">
                        <Shield className="w-8 h-8 text-white" />
                    </div>
                    <span className="text-3xl font-black tracking-tighter text-white leading-none block">Safeeely.</span>
                    <span className="text-[10px] font-bold text-emerald-400 tracking-widest uppercase mt-2 block">Admin Operations Nexus</span>
                </div>

                <form onSubmit={handleLogin} className="space-y-6 relative z-10">
                    <div className="space-y-4">
                        <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
                            <Input 
                                type="email"
                                placeholder="Command Email"
                                required
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                className="h-14 pl-12 bg-white/5 border-white/10 text-white placeholder:text-slate-500 rounded-2xl focus-visible:ring-emerald-500 focus-visible:border-emerald-500 transition-all font-bold"
                            />
                        </div>

                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
                            <Input 
                                type="password"
                                placeholder="Access Key"
                                required
                                value={formData.password}
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                className="h-14 pl-12 bg-white/5 border-white/10 text-white placeholder:text-slate-500 rounded-2xl focus-visible:ring-emerald-500 focus-visible:border-emerald-500 transition-all font-bold"
                            />
                        </div>
                    </div>

                    <Button 
                        type="submit" 
                        disabled={loading}
                        className="w-full h-14 bg-emerald-500 hover:bg-emerald-600 text-[#020617] font-black tracking-widest text-[11px] uppercase rounded-2xl transition-all shadow-lg hover:shadow-emerald-500/20 group overflow-hidden relative"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <div className="flex items-center gap-2">
                                Authenticate Node
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </div>
                        )}
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                    </Button>
                </form>
            </div>
            
            <p className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[9px] font-bold text-slate-600 uppercase tracking-widest">
                Safeeely Encrypted Pipeline © 2026
            </p>
        </div>
    );
}
