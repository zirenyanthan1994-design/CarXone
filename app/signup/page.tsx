"use client";

import { useState } from "react";
// 1. IMPORT THE TELEPORTER
import { useRouter } from "next/navigation"; 
import { auth } from "../firebase/config";
import { createUserWithEmailAndPassword } from "firebase/auth";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  
  // 2. ACTIVATE THE TELEPORTER
  const router = useRouter(); 

  const handleRegistration = async (e: React.FormEvent) => {
    e.preventDefault(); 
    setStatusMessage("Connecting to CarXone servers...");

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      setStatusMessage("Account created successfully! Redirecting...");
      
      // 3. TELEPORT THE USER!
      router.push("/profile");
      
    } catch (error) {
      setStatusMessage("Error: " + (error as Error).message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans text-black">
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <a href="/">
          <h1 className="text-4xl font-black tracking-widest text-black mb-2 hover:text-[#003366] transition">
            CarXone
          </h1>
        </a>
        <h2 className="text-2xl font-bold text-[#003366]">Create your account</h2>
        <p className="text-sm text-gray-500 mt-2">Upload your KYC once. Book instantly forever.</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="bg-white py-8 px-4 shadow-sm sm:rounded-lg sm:px-10 border border-gray-200">
          
          <form className="space-y-8" onSubmit={handleRegistration}>

            <div className="border-b pb-6">
              <h3 className="text-lg font-black text-[#003366] mb-4">1. Personal Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name (As per ID)</label>
                  <input type="text" placeholder="John Doe" className="w-full border border-gray-300 rounded p-3 focus:border-[#003366] outline-none bg-gray-50 focus:bg-white transition" />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email Address</label>
                  <input 
                    type="email" 
                    placeholder="john@example.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full border border-gray-300 rounded p-3 focus:border-[#003366] outline-none bg-gray-50 focus:bg-white transition" 
                  />
                </div>
                
                {/* --- UPGRADED WHATSAPP FIELD --- */}
                <div>
                  <label className="block text-xs font-black text-green-600 uppercase mb-1 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.405-.883-.733-1.479-1.639-1.653-1.935-.173-.298-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                    WhatsApp Number *
                  </label>
                  <input type="tel" required placeholder="+91" className="w-full border-2 border-green-200 rounded p-3 focus:border-green-600 outline-none bg-green-50 focus:bg-white transition" />
                  <p className="text-[10px] text-green-700 font-bold mt-1 leading-tight">
                    ⚠️ MUST be an active WhatsApp number. Your booking confirmations and vendor details will be sent here.
                  </p>
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Create Password</label>
                  <input 
                    type="password" 
                    placeholder="••••••••" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full border border-gray-300 rounded p-3 focus:border-[#003366] outline-none bg-gray-50 focus:bg-white transition" 
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-black text-[#003366] mb-4">2. Identity Verification (KYC)</h3>
              <p className="text-xs text-gray-500 mb-4">These details are securely sent to the vendor only when you make a booking.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="bg-blue-50 p-4 rounded border border-blue-100 flex flex-col gap-3">
                  <h4 className="font-bold text-[#003366] text-sm">Driving License</h4>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">DL Number</label>
                    <input type="text" placeholder="e.g. NL-07..." className="w-full border border-gray-300 rounded p-2 focus:border-[#003366] outline-none uppercase" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Upload Photo (Front & Back)</label>
                    <input type="file" accept="image/*" className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:font-bold file:bg-[#003366] file:text-white hover:file:bg-black cursor-pointer transition" />
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded border border-blue-100 flex flex-col gap-3">
                  <h4 className="font-bold text-[#003366] text-sm">Aadhaar Card</h4>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Aadhaar Number</label>
                    <input type="text" placeholder="12-Digit Number" className="w-full border border-gray-300 rounded p-2 focus:border-[#003366] outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Upload Photo (Front & Back)</label>
                    <input type="file" accept="image/*" className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:font-bold file:bg-[#003366] file:text-white hover:file:bg-black cursor-pointer transition" />
                  </div>
                </div>

              </div>
            </div>

            <div className="pt-4">
              <button type="submit" className="w-full bg-[#003366] text-white font-black text-lg py-4 rounded shadow-lg hover:bg-black transition">
                VERIFY & CREATE ACCOUNT
              </button>
              
              {statusMessage && (
                <div className="mt-4 text-center font-bold text-sm bg-blue-50 p-3 rounded border border-blue-200 text-[#003366]">
                  {statusMessage}
                </div>
              )}
            </div>
            
            <p className="text-center text-sm text-gray-500 mt-4">
              Already have an account? <a href="/login" className="font-bold text-[#003366] hover:underline">Log in</a>
            </p>

          </form>
        </div>
      </div>
    </div>
  );
}