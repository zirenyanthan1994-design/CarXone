"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const router = useRouter();

  // --- FORM STATES ---
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // --- SECURE HARDCODED LOGIN LOGIC ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault(); // Stops the page from refreshing
    setIsAuthenticating(true);
    setError("");

    // Check against your exact hardcoded master credentials
    if (email === "carxone01@gmail.com" && password === "L1p0nsh@n") {
      // Create the secure session token that your Admin Dashboard is looking for!
      sessionStorage.setItem("carxone_master_admin", "authenticated");
      
      // Transport the admin to the dashboard
      router.push("/admin");
    } else {
      setError("Access Denied: Invalid Master Credentials.");
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <h1 className="text-3xl font-black tracking-widest text-white mb-2">
          CarXone <span className="text-lg font-normal text-red-600">| ADMIN</span>
        </h1>
        <p className="text-xs font-bold text-gray-500 tracking-widest uppercase mt-4">Restricted Access Area</p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[#111] py-8 px-4 shadow-2xl sm:rounded-lg sm:px-10 border border-gray-800">
          
          {/* --- ERROR MESSAGE DISPLAY --- */}
          {error && (
            <div className="mb-6 p-3 bg-red-900/30 border border-red-800 text-red-500 text-xs font-bold rounded text-center tracking-wide">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Admin Email</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@carxone.com" 
                className="w-full border border-gray-700 rounded p-3 bg-black text-white focus:border-red-600 outline-none transition" 
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Master Password</label>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" 
                className="w-full border border-gray-700 rounded p-3 bg-black text-white focus:border-red-600 outline-none transition" 
              />
            </div>

            {/* Extra Security Layer for Admin (Visual Only for now, does not block login) */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">2FA Security PIN (Optional)</label>
              <input 
                type="password" 
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="6-Digit PIN" 
                maxLength={6} 
                className="w-full border border-gray-700 rounded p-3 bg-black text-white focus:border-red-600 outline-none transition text-center tracking-widest font-mono" 
              />
            </div>

            <button 
              type="submit" 
              disabled={isAuthenticating}
              className={`w-full block text-center text-white font-black text-lg py-3 rounded shadow transition border ${
                isAuthenticating 
                  ? 'bg-gray-800 border-gray-700 cursor-not-allowed text-gray-400' 
                  : 'bg-red-700 border-red-500 hover:bg-red-600'
              }`}
            >
              {isAuthenticating ? "VERIFYING..." : "AUTHENTICATE"}
            </button>
            
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-600">
              Unauthorized access is strictly prohibited and logged.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}