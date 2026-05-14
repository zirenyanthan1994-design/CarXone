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
                
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone Number</label>
                  <input type="tel" placeholder="+91" className="w-full border border-gray-300 rounded p-3 focus:border-[#003366] outline-none bg-gray-50 focus:bg-white transition" />
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