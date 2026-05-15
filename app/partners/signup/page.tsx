"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../firebase/config"; 
import { createUserWithEmailAndPassword } from "firebase/auth";
import { setDoc, doc } from "firebase/firestore";

export default function VendorSignUp() {
  const router = useRouter();

  // --- FORM STATES ---
  const [agencyName, setAgencyName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [city, setCity] = useState("Dimapur");
  const [email, setEmail] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [fleetSize, setFleetSize] = useState("1 - 5 Vehicles");
  const [password, setPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- SECURE REGISTRATION LOGIC ---
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreedToTerms) {
      alert("You must agree to the Terms of Service to apply.");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Securely create the user's login credentials in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Save their application profile in the "vendors" collection 
      // (This is what the Dashboard Gatekeeper checks!)
      await setDoc(doc(db, "vendors", user.uid), {
        agencyName: agencyName,
        ownerName: ownerName,
        city: city,
        email: email,
        whatsappNumber: whatsappNumber,
        fleetSize: fleetSize,
        status: "pending_approval", 
        createdAt: new Date().toISOString()
      });

      // 3. Pre-fill their vendor settings so their WhatsApp number is ready
      await setDoc(doc(db, "vendorSettings", agencyName), {
        whatsappNumber: whatsappNumber,
        commissionRate: 5, // Default starting commission
        terms: "Standard rental rules apply.",
        upiId: ""
      });

      alert("Success! Your partner account has been created. Welcome to CarXone!");
      
      // Send them directly to their new dashboard
      router.push("/partners");

    } catch (error: any) {
      console.error("Signup Error:", error);
      // Make Firebase errors easy to read for the user
      if (error.code === 'auth/email-already-in-use') {
        alert("This email is already registered. Please log in instead.");
      } else if (error.code === 'auth/weak-password') {
        alert("Password is too weak. Please use at least 6 characters.");
      } else {
        alert("Failed to create account: " + error.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans text-black">
      
      {/* ----------------------------------------- */}
      {/* BRANDING HEADER */}
      {/* ----------------------------------------- */}
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl text-center">
        <a href="/">
          <h1 className="text-4xl font-black tracking-widest text-[#003366] mb-2 hover:text-black transition">
            CarXone <span className="text-2xl font-normal text-gray-500">| PARTNERS</span>
          </h1>
        </a>
        <h2 className="text-2xl font-bold text-black mt-4">Apply to Become our Partner</h2>
        <p className="text-sm text-gray-500 mt-2">Join India's first vehicle rental network.</p>
      </div>

      {/* ----------------------------------------- */}
      {/* APPLICATION FORM */}
      {/* ----------------------------------------- */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="bg-white py-8 px-4 shadow-sm sm:rounded-lg sm:px-10 border border-gray-200">
          
          <form onSubmit={handleSignup} className="space-y-8">

            {/* Business Information */}
            <div className="border-b pb-6">
              <h3 className="text-lg font-black text-[#003366] mb-4">1. Business Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Rental Agency Name (or Individual)</label>
                  <input 
                    type="text" 
                    required
                    value={agencyName}
                    onChange={(e) => setAgencyName(e.target.value)}
                    placeholder="e.g. Dimapur Rentals" 
                    className="w-full border border-gray-300 rounded p-3 focus:border-[#003366] outline-none bg-gray-50 focus:bg-white transition" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Owner Full Name</label>
                  <input 
                    type="text" 
                    required
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="John Doe" 
                    className="w-full border border-gray-300 rounded p-3 focus:border-[#003366] outline-none bg-gray-50 focus:bg-white transition" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Primary Operating City</label>
                  <select 
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full border border-gray-300 rounded p-3 focus:border-[#003366] outline-none bg-gray-50 focus:bg-white transition cursor-pointer"
                  >
                    <option>Dimapur</option>
                    <option>Kohima</option>
                    <option>Mokokchung</option>
                    <option>Tuensang</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Contact & Fleet Details */}
            <div className="border-b pb-6">
              <h3 className="text-lg font-black text-[#003366] mb-4">2. Contact & Login Setup</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Business Email (Login ID)</label>
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contact@agency.com" 
                    className="w-full border border-gray-300 rounded p-3 focus:border-[#003366] outline-none bg-gray-50 focus:bg-white transition" 
                  />
                </div>
                
                {/* --- UPGRADED WHATSAPP FIELD --- */}
                <div>
                  <label className="block text-xs font-black text-green-600 uppercase mb-1 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.405-.883-.733-1.479-1.639-1.653-1.935-.173-.298-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                    Business WhatsApp Number *
                  </label>
                  <input 
                    type="tel" 
                    required 
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="+91" 
                    className="w-full border-2 border-green-200 rounded p-3 focus:border-green-600 outline-none bg-green-50 focus:bg-white transition" 
                  />
                  <p className="text-[10px] text-green-700 font-bold mt-1 leading-tight">
                    ⚠️ MUST be an active WhatsApp number. All automated booking requests and verifications are sent here.
                  </p>
                </div>

                <div className="md:col-span-2 mt-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Estimated Fleet Size</label>
                  <select 
                    value={fleetSize}
                    onChange={(e) => setFleetSize(e.target.value)}
                    className="w-full border border-gray-300 rounded p-3 focus:border-[#003366] outline-none bg-gray-50 focus:bg-white transition cursor-pointer"
                  >
                    <option>1 - 5 Vehicles</option>
                    <option>6 - 15 Vehicles</option>
                    <option>16 - 30 Vehicles</option>
                    <option>30+ Vehicles</option>
                  </select>
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Create Password</label>
                  <input 
                    type="password" 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••" 
                    className="w-full border border-gray-300 rounded p-3 focus:border-[#003366] outline-none bg-gray-50 focus:bg-white transition" 
                  />
                </div>
              </div>
            </div>

            {/* Submit Area */}
            <div className="pt-2">
              <label className="flex items-start gap-3 mb-6 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="w-5 h-5 accent-[#003366] mt-0.5 cursor-pointer" 
                />
                <span className="text-xs text-gray-600 group-hover:text-black transition">
                  I confirm that all provided information is accurate and I agree to the CarXone <a href="#" className="font-bold text-[#003366] hover:underline">Partner's Terms of Service</a>. I understand my account must be approved by an Admin before I can list vehicles.
                </span>
              </label>

              <button 
                type="submit" 
                disabled={isSubmitting || !agreedToTerms}
                className={`w-full font-black text-lg py-4 rounded shadow-lg transition ${
                  isSubmitting || !agreedToTerms 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : 'bg-[#003366] text-white hover:bg-black'
                }`}
              >
                {isSubmitting ? "CREATING PARTNER ACCOUNT..." : "SUBMIT APPLICATION"}
              </button>
            </div>
            
            <p className="text-center text-sm text-gray-500 mt-4">
              Already a registered partner? <a href="/partners/login" className="font-bold text-[#003366] hover:underline">Log in here</a>
            </p>

          </form>
        </div>
      </div>
    </div>
  );
}