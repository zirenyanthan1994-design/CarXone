"use client";

import { useState } from "react";
// IMPORTING THE FIREBASE BRAIN (Using your working Magic Path!)
import { auth } from "../firebase/config";
import { sendPasswordResetEmail } from "firebase/auth";

export default function ForgotPasswordPage() {
  // THE MEMORY VAULT
  const [email, setEmail] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isError, setIsError] = useState(false);

  // THE FIREBASE RESET FUNCTION
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault(); 
    setStatusMessage("Connecting to server...");
    setIsError(false);

    try {
      // Tell Firebase to send the recovery email!
      await sendPasswordResetEmail(auth, email);
      
      // If it works, show a success message in green
      setIsError(false);
      setStatusMessage("Success! Check your inbox for the password reset link.");
      setEmail(""); // Clear the input box
      
    } catch (error) {
      // If the email isn't in the database, show an error in red
      setIsError(true);
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
        <h2 className="text-2xl font-bold text-[#003366] mt-4">Reset Password</h2>
        <p className="text-sm text-gray-500 mt-2">Enter your email and we'll send you a link to get back into your account.</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm sm:rounded-lg sm:px-10 border border-gray-200">
          
          <form className="space-y-6" onSubmit={handleReset}>
            
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Account Email</label>
              <input 
                type="email" 
                placeholder="john@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-gray-300 rounded p-3 focus:border-[#003366] outline-none bg-gray-50 focus:bg-white transition" 
              />
            </div>

            <button type="submit" className="w-full block text-center bg-black text-white font-black text-lg py-3 rounded shadow hover:bg-[#003366] transition">
              SEND RESET LINK
            </button>
            
            {/* The Dynamic Message Box (Turns green on success, red on error) */}
            {statusMessage && (
              <div className={`mt-4 text-center font-bold text-sm p-3 rounded border ${isError ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                {statusMessage}
              </div>
            )}
            
          </form>

          <div className="mt-6 border-t border-gray-200 pt-6 text-center">
            <p className="text-sm text-gray-500">
              Remember your password? <br/>
              <a href="/login" className="font-bold text-[#003366] hover:underline">Return to Login</a>
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}