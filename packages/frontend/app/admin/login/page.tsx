"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

const API_URL = "/api";

export default function AdminLogin() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await axios.post(`${API_URL}/admin/auth/login`, formData, {
        headers: { "ngrok-skip-browser-warning": "true" },
        withCredentials: true,
      });

      if (res.data.token) {
        localStorage.setItem("sf_admin_token", res.data.token);
      }

      toast.success(`Welcome back, ${res.data.user?.name ?? "Admin"}`);
      router.push("/admin/dashboard");
    } catch (err: any) {
      const msg = err.response?.data?.error || "Invalid credentials";
      setError(msg);
      toast.error("Access Denied", { description: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-white flex flex-col items-center justify-center p-4 relative overflow-hidden"
    >
      {/* Radial green glow */}
      <div
        className="pointer-events-none absolute left-1/2 -translate-x-1/2"
        style={{
          top: "-80px",
          width: 920,
          height: 560,
          background: "radial-gradient(ellipse 50% 50% at 50% 50%, rgba(16,185,129,.14) 0%, rgba(16,185,129,0) 70%)",
        }}
      />

      {/* Floating coin - top left */}
      <img
        src="/assets/coin-whatsapp.webp"
        alt=""
        aria-hidden
        className="admin-bob-a pointer-events-none absolute hidden md:block"
        style={{
          top: 80, left: 60, width: 90, opacity: 0.85,
          filter: "drop-shadow(0 8px 24px rgba(16,185,129,.25))",
        }}
      />

      {/* Floating coin - bottom right */}
      <img
        src="/assets/coin-telegram.webp"
        alt=""
        aria-hidden
        className="admin-bob-b pointer-events-none absolute hidden md:block"
        style={{
          bottom: 80, right: 60, width: 90, opacity: 0.85,
          filter: "drop-shadow(0 8px 24px rgba(16,185,129,.25))",
        }}
      />

      {/* Card */}
      <div
        className="relative w-full z-10"
        style={{ maxWidth: 480 }}
      >
        <div
          className="overflow-hidden"
          style={{
            borderRadius: 26,
            border: "1px solid #edeff3",
            boxShadow: "0 24px 60px rgba(15,23,42,.08)",
          }}
        >
          {/* Card header band */}
          <div
            className="px-7 pt-6 pb-5 flex flex-col gap-3"
            style={{ borderBottom: "1px solid #f1f3f6" }}
          >
            {/* Logo */}
            <img src="/logo-main.svg" alt="Safeeely" className="h-9 w-auto" />

            {/* Label + heading */}
            <div>
              <p
                className="text-[11px] font-bold uppercase mb-1"
                style={{ color: "#a4adba", letterSpacing: "0.08em" }}
              >
                Admin sign in
              </p>
              <h1
                className="font-tight text-[28px] font-bold leading-tight"
                style={{ color: "#0f172a" }}
              >
                Welcome back
              </h1>
            </div>

            {/* Admin access pill */}
            <div
              className="inline-flex items-center gap-1.5 self-start px-3 py-1.5 rounded-full text-[11px] font-bold uppercase"
              style={{ background: "#f0fdf4", border: "1px solid #d1fae5", color: "#059669", letterSpacing: "0.1em" }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Authorized Access
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="px-7 py-6 bg-white space-y-4">
            {/* Email */}
            <div>
              <label
                className="block text-[12px] font-semibold mb-1.5"
                style={{ color: "#a4adba" }}
              >
                Email address
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: "#a4adba" }}
                  strokeWidth={1.75}
                />
                <input
                  type="email"
                  required
                  placeholder="admin@safeeely.com"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-11 pr-4 text-[14.5px] font-medium outline-none transition-all"
                  style={{
                    height: 50,
                    background: "#f7f8f9",
                    border: `1.5px solid ${error ? "#e11d48" : "#edeff3"}`,
                    borderRadius: 13,
                    color: "#0f172a",
                    boxShadow: error ? "0 0 0 3px rgba(225,29,72,.08)" : undefined,
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = "#10b981";
                    e.target.style.background = "#fff";
                    e.target.style.boxShadow = "0 0 0 3px rgba(16,185,129,.1)";
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = error ? "#e11d48" : "#edeff3";
                    e.target.style.background = "#f7f8f9";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                className="block text-[12px] font-semibold mb-1.5"
                style={{ color: "#a4adba" }}
              >
                Password
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: "#a4adba" }}
                  strokeWidth={1.75}
                />
                <input
                  type={showPass ? "text" : "password"}
                  required
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-11 pr-11 text-[14.5px] font-medium outline-none transition-all"
                  style={{
                    height: 50,
                    background: "#f7f8f9",
                    border: `1.5px solid ${error ? "#e11d48" : "#edeff3"}`,
                    borderRadius: 13,
                    color: "#0f172a",
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = "#10b981";
                    e.target.style.background = "#fff";
                    e.target.style.boxShadow = "0 0 0 3px rgba(16,185,129,.1)";
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = error ? "#e11d48" : "#edeff3";
                    e.target.style.background = "#f7f8f9";
                    e.target.style.boxShadow = "none";
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#a4adba] hover:text-[#64748b] transition-colors"
                >
                  {showPass
                    ? <EyeOff className="w-4 h-4" strokeWidth={1.75} />
                    : <Eye className="w-4 h-4" strokeWidth={1.75} />
                  }
                </button>
              </div>
            </div>

            {error && (
              <p className="text-[12px] text-[#e11d48] font-medium">{error}</p>
            )}

            {/* CTA button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full font-tight text-[16px] font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-60"
              style={{
                height: 52,
                background: "#0f172a",
                borderRadius: 999,
                boxShadow: "0 12px 26px rgba(15,23,42,.2)",
                marginTop: 8,
              }}
              onMouseEnter={e => {
                (e.target as HTMLButtonElement).style.background = "#1e293b";
                (e.target as HTMLButtonElement).style.transform = "translateY(-2px)";
              }}
              onMouseLeave={e => {
                (e.target as HTMLButtonElement).style.background = "#0f172a";
                (e.target as HTMLButtonElement).style.transform = "translateY(0)";
              }}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign in to Admin"}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-[#94a3b8] mt-6">
          Safeeely Admin Console · Authorized personnel only
        </p>
      </div>
    </div>
  );
}
