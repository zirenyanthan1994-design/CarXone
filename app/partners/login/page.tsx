"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../firebase/config"; 
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export default function VendorLogin() {
  const router = useRouter();

  // --- FORM STATES ---
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // --- SECURE LOGIN LOGIC ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevents the page from refreshing
    setIsLoading(true);
    setErrorMessage("");

    try {
      // 1. Check credentials with Firebase Authentication
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Double-check that this user is actually a registered Vendor
      const vendorRef = doc(db, "vendors", user.uid);
      const vendorSnap = await getDoc(vendorRef);

      if (!vendorSnap.exists()) {
        // If they don't exist in the vendors collection, kick them out!
        await auth.signOut();
        setErrorMessage("Access Denied: This account is not registered as a Vendor.");
        setIsLoading(false);
        return;
      }

      // 3. Success! Send them to the Partner Dashboard
      router.push("/partners");

    } catch (error: any) {
      console.error("Login Error:", error);
      // Make errors easy to understand
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        setErrorMessage("Invalid email or password. Please try again.");
      } else {
        setErrorMessage("Failed to log in. Please check your connection.");
      }
    } finally {
      if (errorMessage === "") {
        // Keep loading state true if successful to prevent button flashing before redirect
      } else {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans text-black">
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <a href="/">
          <h1 className="text-3xl font-black tracking-widest text-[#003366] mb-2 hover:text-black transition">
            CarXone <span className="text-lg font-normal text-gray-500">| PARTNERS</span>
          </h1>
        </a>
        <h2 className="text-xl font-bold text-black mt-4">Vendor Portal Login</h2>
        <p className="text-sm text-gray-500 mt-2">Manage your fleet, track earnings, and verify bookings.</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-md sm:rounded-lg sm:px-10 border border-gray-200">
          
          {/* Show error messages if login fails */}
          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-bold rounded text-center">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Business Email</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vendor@example.com" 
                className="w-full border border-gray-300 rounded p-3 focus:border-[#003366] outline-none bg-gray-50 focus:bg-white transition" 
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Password</label>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" 
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

            <button 
              type="submit" 
              disabled={isLoading}
              className={`w-full block text-center font-black text-lg py-3 rounded shadow transition ${
                isLoading ? 'bg-gray-400 text-gray-600 cursor-not-allowed' : 'bg-[#003366] text-white hover:bg-black'
              }`}
            >
              {isLoading ? "AUTHENTICATING..." : "SECURE LOGIN"}
            </button>
            
          </form>

          <div className="mt-6 border-t border-gray-200 pt-6 text-center">
            <p className="text-sm text-gray-500">
              Want to list your vehicles? <br/>
              <a href="/partners/signup" className="font-bold text-[#003366] hover:underline">Apply to become a CarXone Partner</a>
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}