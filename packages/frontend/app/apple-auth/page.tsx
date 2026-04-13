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
import { CheckCircle2, ShieldCheck, Loader2 } from "lucide-react";

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
    <div className="flex min-h-[100dvh] w-full flex-col items-center justify-center bg-slate-50 p-4 font-sans">
      <div className="mb-6 flex flex-col items-center space-y-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-sm">
          <ShieldCheck className="h-6 w-6 text-white" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Safeeely</h1>
        <p className="text-sm text-slate-500">Secure Escrow Validation</p>
      </div>

      <Card className="w-full max-w-md shadow-xl border-slate-200 bg-white">
        {step === "input" ? (
          <Tabs value={mode} onValueChange={(val) => setMode(val as any)} className="w-full">
            <CardHeader className="pb-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
            </CardHeader>
            
            <TabsContent value="login">
              <form onSubmit={handleSendOtp}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="safetag" className="text-slate-700">Safetag</Label>
                    <Input 
                      id="safetag" 
                      placeholder="@john_doe" 
                      value={safetag}
                      onChange={(e) => setSafetag(e.target.value)}
                      required
                      className="bg-slate-50"
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Send Verification Code"}
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister}>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-slate-700">First Name</Label>
                      <Input id="firstName" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-slate-700">Last Name</Label>
                      <Input id="lastName" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-700">Email Address</Label>
                    <Input id="email" type="email" placeholder="john@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="regSafetag" className="text-slate-700">Choose Safetag</Label>
                    <Input id="regSafetag" placeholder="@john_doe" required value={safetag} onChange={(e) => setSafetag(e.target.value)} />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Create Account & Link"}
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>
          </Tabs>
        ) : (
          <form onSubmit={handleVerifyOtp}>
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-xl">Verification Code</CardTitle>
              <CardDescription>
                We've sent a secure 6-digit code to your email and linked social accounts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2 text-center">
                <Input 
                  id="otp" 
                  placeholder="123456" 
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="text-center text-2xl tracking-widest h-14 bg-slate-50"
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-2">
              <Button type="submit" className="w-full h-12 text-md" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Verify & Connect"}
              </Button>
              <Button variant="ghost" type="button" onClick={() => setStep("input")} className="w-full text-slate-500">
                Cancel
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>
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
