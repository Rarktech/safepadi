"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import axios from "axios";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, ShieldCheck, Loader2, ArrowRight, Lock } from "lucide-react";
import Image from "next/image";

function AppleAuthContent() {
  const searchParams = useSearchParams();
  const appleId = searchParams.get("apple_id");

  const [mode, setMode] = useState<"login" | "register">("login");
  const [step, setStep] = useState<"input" | "otp" | "success">("input");
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [safetag, setSafetag] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appleId) {
      toast.error("Invalid link. Missing Apple ID.");
      return;
    }
    if (!safetag) {
      toast.error("Please enter your Safetag");
      return;
    }

    setIsLoading(true);
    try {
      const formattedSafetag = safetag.startsWith("@") ? safetag : `@${safetag}`;
      setSafetag(formattedSafetag);

      await axios.post(`${API_URL}/auth/otp/send`, {
        safetag: formattedSafetag,
        platform: "apple",
        platform_id: appleId
      });
      
      toast.success("Verification code sent!");
      setStep("otp");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "User not found or failed to send OTP.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;

    setIsLoading(true);
    try {
      await axios.post(`${API_URL}/auth/otp/verify`, {
        safetag,
        platform: "apple",
        platform_id: appleId,
        otp
      });
      
      setStep("success");
      toast.success("Account securely linked!");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Invalid verification code.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appleId) {
      toast.error("Invalid link. Missing Apple ID.");
      return;
    }
    
    setIsLoading(true);
    try {
      const formattedSafetag = safetag.startsWith("@") ? safetag : `@${safetag}`;
      
      await axios.post(`${API_URL}/profiles/register`, {
        first_name: firstName,
        last_name: lastName,
        email: email,
        safetag: formattedSafetag,
        primary_platform: "apple",
        platform_id: appleId
      });
      
      setStep("success");
      toast.success("Registration complete!");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Registration failed. Safetag or email may be taken.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!appleId) {
    return (
      <div className="flex h-screen w-full items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg border-red-100">
          <CardHeader>
            <CardTitle className="text-red-500">Invalid Link</CardTitle>
            <CardDescription>This authentication link is missing your secure ID.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="flex min-h-[100dvh] w-full items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md shadow-xl border-green-100 bg-white">
          <CardContent className="flex flex-col items-center justify-center pt-10 pb-6 text-center space-y-4">
            <div className="h-16 w-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2">
              <CheckCircle2 size={32} />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Authentication Successful</h2>
            <p className="text-slate-500 text-sm">
              Your Apple Messages account is now securely linked to Safeeely.
            </p>
            <div className="pt-4 flex flex-col space-y-2 w-full">
              <div className="bg-slate-50 border rounded-lg p-3 text-sm text-slate-600 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-green-600" />
                You may now close this window and return to the chat.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-[100dvh] w-full justify-center bg-[#fafafa] font-sans overflow-hidden">
      {/* Brand Top Gradient Blur */}
      <div className="absolute top-0 left-1/2 w-[150%] h-[350px] -translate-x-1/2 -translate-y-1/3 bg-primary/25 blur-[60px] rounded-[100%] pointer-events-none" />

      {/* Security Notification Banner */}
      <div className="absolute top-0 left-0 w-full z-50 flex items-center justify-center p-3">
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50/80 backdrop-blur-md rounded-full border border-green-200/50 shadow-sm">
          <Lock className="w-3.5 h-3.5 text-green-600" />
          <span className="text-xs font-medium text-green-700">Ensure you're on a secure safeeely.com connection</span>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-[360px] px-4 pt-24 pb-12 flex flex-col">
        <div className="mb-6 flex justify-center">
            <Image 
              src="/favicon.ico.png" 
              alt="Safeeely Logo" 
              width={56} 
              height={56} 
              className="rounded-2xl drop-shadow-sm" 
            />
        </div>
        <div className="mb-10 text-center">
          {step === "input" ? (
             <>
               <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Create an account</h1>
               <p className="text-sm text-slate-500 leading-relaxed px-2">
                 Start planning events, voting on places, and staying connected with your friends.
               </p>
             </>
          ) : (
             <>
               <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Check your inbox</h1>
               <p className="text-sm text-slate-500 leading-relaxed px-2">
                 We've sent a unique code to your email. Type it in here to securely sign in.
               </p>
             </>
          )}
        </div>

        <div className="w-full">
          {step === "input" ? (
            <Tabs value={mode} onValueChange={(val) => setMode(val as any)} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-slate-100 rounded-full p-1 h-12">
                <TabsTrigger value="login" className="rounded-full data-[state=active]:shadow-sm">Login</TabsTrigger>
                <TabsTrigger value="register" className="rounded-full data-[state=active]:shadow-sm">Register</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="mt-0 outline-none">
                <form onSubmit={handleSendOtp} className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="safetag" className="text-xs text-slate-500 px-1">Safetag</Label>
                      <Input 
                        id="safetag" 
                        placeholder="@john_doe" 
                        value={safetag}
                        onChange={(e) => setSafetag(e.target.value)}
                        required
                        className="bg-transparent border-slate-200 h-14 rounded-2xl px-4 text-base shadow-sm focus-visible:ring-primary/20 focus-visible:border-primary transition-all"
                      />
                    </div>
                  </div>
                  
                  <Button type="submit" className="w-full h-14 rounded-full text-base font-medium flex justify-between items-center px-2 pl-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-transform active:scale-[0.98]" disabled={isLoading}>
                    <span>{isLoading ? "Sending Code..." : "Continue"}</span>
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-primary ml-4">
                      {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
                    </div>
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register" className="mt-0 outline-none">
                <form onSubmit={handleRegister} className="space-y-6">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="firstName" className="text-xs text-slate-500 px-1">First Name</Label>
                        <Input id="firstName" required value={firstName} onChange={(e) => setFirstName(e.target.value)} className="bg-transparent border-slate-200 h-14 rounded-2xl px-4 text-base shadow-sm focus-visible:ring-primary/20" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="lastName" className="text-xs text-slate-500 px-1">Last Name</Label>
                        <Input id="lastName" required value={lastName} onChange={(e) => setLastName(e.target.value)} className="bg-transparent border-slate-200 h-14 rounded-2xl px-4 text-base shadow-sm focus-visible:ring-primary/20" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-xs text-slate-500 px-1">Email</Label>
                      <Input id="email" type="email" placeholder="john@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} className="bg-transparent border-slate-200 h-14 rounded-2xl px-4 text-base shadow-sm focus-visible:ring-primary/20" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="regSafetag" className="text-xs text-slate-500 px-1">Safetag</Label>
                      <Input id="regSafetag" placeholder="@john_doe" required value={safetag} onChange={(e) => setSafetag(e.target.value)} className="bg-transparent border-slate-200 h-14 rounded-2xl px-4 text-base shadow-sm focus-visible:ring-primary/20" />
                    </div>
                  </div>
                  
                  <Button type="submit" className="w-full h-14 rounded-full text-base font-medium flex justify-between items-center px-2 pl-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-transform active:scale-[0.98]" disabled={isLoading}>
                    <span>{isLoading ? "Creating Account..." : "Continue"}</span>
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-primary ml-4">
                      {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
                    </div>
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-8 mt-4">
              <div className="flex justify-center">
                {/* For styling, let's make the single input look like separated boxes using tracking wide */}
                <Input 
                  id="otp" 
                  placeholder="------" 
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="text-center text-4xl tracking-[1em] indent-[0.5em] h-20 rounded-2xl border-slate-200 bg-transparent shadow-sm focus-visible:ring-primary/20"
                  required
                />
              </div>
              
              <div className="space-y-4">
                <Button type="submit" className="w-full h-14 rounded-full text-base font-medium flex justify-between items-center px-2 pl-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-transform active:scale-[0.98]" disabled={isLoading}>
                  <span>{isLoading ? "Authenticating..." : "Continue"}</span>
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-primary ml-4">
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
                  </div>
                </Button>
                
                <div className="text-center text-sm text-slate-500">
                  Didn't receive a code? <button type="button" onClick={() => setStep("input")} className="text-primary font-medium hover:underline">Resend</button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AppleAuthPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <AppleAuthContent />
    </Suspense>
  );
}
