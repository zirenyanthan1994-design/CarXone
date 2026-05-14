"use client";

import { useState } from "react";
// IMPORT THE TELEPORTER AND FIREBASE BRAIN
import { useRouter } from "next/navigation";
import { auth } from "../firebase/config";
import { signInWithEmailAndPassword } from "firebase/auth";

export default function CustomerLogin() {
  // THE MEMORY VAULT
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  
  const router = useRouter();

  // THE LOGIN FUNCTION
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); 
    setStatusMessage("Authenticating...");

    try {
      // Tell Firebase to check the credentials
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      setStatusMessage("Login successful! Redirecting...");
      
      // Teleport them to their profile!
      router.push("/profile");
      
    } catch (error) {
      // If they type the wrong password, Firebase tells them!
      setStatusMessage("Error: Invalid email or password.");
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
        <h2 className="text-2xl font-bold text-[#003366] mt-4">Welcome Back</h2>
        <p className="text-sm text-gray-500 mt-2">Log in to book your next ride.</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm sm:rounded-lg sm:px-10 border border-gray-200">
          
          {/* We added onSubmit to trigger the login function! */}
          <form className="space-y-6" onSubmit={handleLogin}>
            
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
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Password</label>
              <input 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full border border-gray-300 rounded p-3 focus:border-[#003366] outline-none bg-gray-50 focus:bg-white transition" 
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 accent-[#003366]" />
                <span className="text-xs font-bold text-gray-600">Remember me</span>
              </label>
              <a href="/forgot-password" className="text-xs font-bold text-[#003366] hover:underline">Forgot password?</a>
            </div>

            {/* Changed from type="button" to type="submit" */}
            <button type="submit" className="w-full block text-center bg-black text-white font-black text-lg py-3 rounded shadow hover:bg-[#003366] transition">
              LOG IN
            </button>
            
            {statusMessage && (
              <div className="mt-4 text-center font-bold text-sm bg-blue-50 p-3 rounded border border-blue-200 text-[#003366]">
                {statusMessage}
              </div>
            )}
            
          </form>

          <div className="mt-6 border-t border-gray-200 pt-6 text-center">
            <p className="text-sm text-gray-500">
              Don't have an account? <br/>
              <a href="/signup" className="font-bold text-[#003366] hover:underline">Sign up and verify your KYC</a>
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}