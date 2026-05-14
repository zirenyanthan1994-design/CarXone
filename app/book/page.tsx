"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { db, storage, auth } from "../firebase/config"; 
import { doc, getDoc, collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { onAuthStateChanged, User } from "firebase/auth";

const NAGALAND_CITIES = [
  "Dimapur", "Kohima", "Mokokchung", "Tuensang", "Wokha", "Zunheboto", 
  "Mon", "Phek", "Kiphire", "Longleng", "Peren", "Noklak", "Shamator", 
  "Niuland", "Chumoukedima", "Tseminyu"
];

function BookingFlow() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // --- NEW: FIREBASE AUTH STATE ---
  const [user, setUser] = useState<User | null>(null);

  // --- URL DATA ---
  const dynamicCarName = searchParams.get("car") || "Premium Vehicle";
  const rawPrice = searchParams.get("price")?.replace(/[^0-9]/g, '') || "0"; 
  const baseRate = parseInt(rawPrice);
  const city = searchParams.get("city") || "Dimapur"; 

  // --- FORM STATES ---
  const [pickupDate, setPickupDate] = useState(searchParams.get("pickup") || "");
  const [dropoffDate, setDropoffDate] = useState(searchParams.get("dropoff") || "");
  const [pickupLocation, setPickupLocation] = useState(city);
  const [dropoffLocation, setDropoffLocation] = useState("");
  const [specialRemarks, setSpecialRemarks] = useState("");
  
  // --- ADD-ON STATES ---
  const [needsDriver, setNeedsDriver] = useState(false);
  const [needsDelivery, setNeedsDelivery] = useState(false);
  const [needsHomePickup, setNeedsHomePickup] = useState(false);

  // --- GLOBAL FEES ---
  const [platformFee, setPlatformFee] = useState(100);
  const [driverFee, setDriverFee] = useState(800);
  const [deliveryFee, setDeliveryFee] = useState(500);
  const [pickupFee, setPickupFee] = useState(500);

  // --- UI STATES ---
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // --- VENDOR DATA ---
  const [vendorTerms, setVendorTerms] = useState("");
  const [vendorUpiId, setVendorUpiId] = useState(""); 
  const [isLoadingData, setIsLoadingData] = useState(true);
  const vendorName = "Dimapur Rentals"; 

  // --- SCREENSHOT UPLOAD STATES ---
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null);
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);

  // --- CHECK LOGIN STATUS ON LOAD ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // --- FETCH SETTINGS FROM FIREBASE ---
  useEffect(() => {
    const fetchBookingData = async () => {
      setIsLoadingData(true);
      try {
        const termsRef = doc(db, "vendorSettings", vendorName);
        const termsSnap = await getDoc(termsRef);
        if (termsSnap.exists()) {
          setVendorTerms(termsSnap.data().terms || "Standard rental rules apply.");
          setVendorUpiId(termsSnap.data().upiId || ""); 
        }

        const globalRef = doc(db, "platformSettings", "global");
        const globalSnap = await getDoc(globalRef);
        if (globalSnap.exists()) {
          const gData = globalSnap.data();
          if (gData.platformFee !== undefined) setPlatformFee(gData.platformFee);
          if (gData.driverFee !== undefined) setDriverFee(gData.driverFee);
          if (gData.deliveryFee !== undefined) setDeliveryFee(gData.deliveryFee);
          if (gData.pickupFee !== undefined) setPickupFee(gData.pickupFee);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchBookingData();
  }, [vendorName]);

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(vendorUpiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // --- DYNAMIC MATH ENGINE ---
  const driverTotal = needsDriver ? driverFee : 0;
  const deliveryTotal = needsDelivery ? deliveryFee : 0;
  const homePickupTotal = needsHomePickup ? pickupFee : 0;
  
  const totalToPay = baseRate + platformFee + driverTotal + deliveryTotal + homePickupTotal;

  // --- SECURE BOOKING SUBMISSION ---
  const handleBookingSubmit = async () => {
    if (!paymentScreenshot || !user) return; // Failsafe check
    setIsSubmittingBooking(true);

    try {
      // 1. Upload screenshot
      const imageRef = ref(storage, `booking_payments/${Date.now()}_${paymentScreenshot.name}`);
      await uploadBytes(imageRef, paymentScreenshot);
      const downloadUrl = await getDownloadURL(imageRef);

      // 2. Package booking details (Now using the real user's email!)
      const bookingData = {
        vehicleName: dynamicCarName,
        vendorName: vendorName,
        customerName: user.email, // <--- PERFECT SYNC WITH LOGGED IN USER
        pickupCity: city,
        pickupLocation: pickupLocation,
        dropoffLocation: dropoffLocation,
        pickupDate: pickupDate,
        dropoffDate: dropoffDate,
        specialRemarks: specialRemarks,
        totalPaid: totalToPay,
        addons: {
          driver: needsDriver,
          delivery: needsDelivery,
          homePickup: needsHomePickup
        },
        paymentReceiptUrl: downloadUrl,
        status: "pending_verification", 
        createdAt: new Date().toISOString()
      };

      // 3. Save to database
      await addDoc(collection(db, "bookings"), bookingData);

      // --- NEW: TRIGGER AUTOMATED WHATSAPP TO VENDOR ---
      try {
        await fetch('/api/whatsapp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: "NEW_BOOKING",
            vendorPhone: "919876543210", // You will pull this dynamically from vendorSettings later
            vehicleName: dynamicCarName,
            customerDetails: `Name: ${user.email}\nPickup: ${pickupDate}`,
          })
        });
      } catch (waError) {
        console.error("WhatsApp notification failed silently:", waError);
      }
      // ------------------------------------------------

      setShowPaymentModal(false);
      setPaymentScreenshot(null);
      alert("Success! Your booking request and payment receipt have been sent to the vendor for confirmation.");
      
      // Route them to their new dynamic profile page to see the booking!
      window.location.href = "/profile";
      
    } catch (error) {
      console.error("Error submitting booking:", error);
      alert("Failed to submit booking. Please try again.");
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  return (
    <main className="flex-grow w-full max-w-7xl mx-auto px-4 py-10 flex flex-col lg:flex-row gap-10 relative bg-gray-50 min-h-screen">
      
      {/* ----------------------------------------- */}
      {/* LEFT COLUMN: THE BOOKING FORM */}
      {/* ----------------------------------------- */}
      <div className="flex-grow flex flex-col gap-8">
        
        <a href="javascript:history.back()" className="text-sm font-bold text-gray-500 hover:text-[#003366] transition self-start flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          Back to Vehicles
        </a>

        <section className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-2xl font-black text-[#003366] border-b border-gray-100 pb-4 mb-6 uppercase tracking-tight">1. Trip Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Exact Pickup Location</label>
              <input 
                type="text" 
                value={pickupLocation}
                onChange={(e) => setPickupLocation(e.target.value)}
                className="w-full border-b-2 border-gray-200 focus:border-[#003366] outline-none py-2 text-black text-sm font-bold transition bg-transparent" 
              />
              <p className="text-[10px] text-gray-400 mt-1 font-bold">Auto-filled with the vehicle's home city.</p>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Destination / Drop-off</label>
              <select 
                value={dropoffLocation}
                onChange={(e) => setDropoffLocation(e.target.value)}
                className="w-full border-b-2 border-gray-200 focus:border-[#003366] outline-none py-2 text-black text-sm font-bold transition bg-transparent cursor-pointer" 
              >
                <option value="">-- Select Destination City --</option>
                {NAGALAND_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Pickup Date & Time</label>
              <input 
                type="datetime-local" 
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
                className="w-full border-b-2 border-gray-200 focus:border-[#003366] outline-none py-2 text-black cursor-pointer bg-transparent text-sm font-bold transition" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Drop-off Date & Time</label>
              <input 
                type="datetime-local" 
                value={dropoffDate}
                onChange={(e) => setDropoffDate(e.target.value)}
                className="w-full border-b-2 border-gray-200 focus:border-[#003366] outline-none py-2 text-black cursor-pointer bg-transparent text-sm font-bold transition" 
              />
            </div>
          </div>

          <div className="mt-4 pt-6 border-t border-gray-100">
            <label className="block text-xs font-bold text-[#003366] uppercase tracking-widest mb-3">Special Remarks / Instructions (Optional)</label>
            <textarea 
              rows={3}
              value={specialRemarks}
              onChange={(e) => setSpecialRemarks(e.target.value)}
              placeholder="e.g., Kindly pick me up from Dimapur Airport at Terminal 1..."
              className="w-full border-2 border-gray-200 rounded-lg focus:border-[#003366] outline-none p-4 text-black text-sm font-bold transition bg-gray-50 focus:bg-white"
            />
          </div>
        </section>

        {/* ----------------------------------------- */}
        {/* ADD-ONS SECTION */}
        {/* ----------------------------------------- */}
        <section className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-end border-b border-gray-100 pb-4 mb-6">
            <h2 className="text-2xl font-black text-[#003366] uppercase tracking-tight">2. Optional Add-ons</h2>
          </div>
          <div className="flex flex-col gap-4">
            
            <label className={`flex items-center gap-4 p-4 border-2 rounded-lg cursor-pointer transition group ${needsDriver ? 'border-[#003366] bg-blue-50' : 'border-gray-200 hover:border-[#003366]'}`}>
              <input type="checkbox" checked={needsDriver} onChange={(e) => setNeedsDriver(e.target.checked)} className="w-5 h-5 accent-[#003366]" />
              <div className="flex-grow">
                <h4 className="font-black text-black">Request a Driver</h4>
                <p className="text-xs text-gray-500 font-bold mt-1">A professional chauffeur will drive you.</p>
              </div>
              <span className="font-black text-[#003366] text-lg">+ ₹{driverFee} <span className="text-[10px] text-gray-400 font-bold uppercase">/ day</span></span>
            </label>

            <label className={`flex items-center gap-4 p-4 border-2 rounded-lg cursor-pointer transition group ${needsDelivery ? 'border-[#003366] bg-blue-50' : 'border-gray-200 hover:border-[#003366]'}`}>
              <input type="checkbox" checked={needsDelivery} onChange={(e) => setNeedsDelivery(e.target.checked)} className="w-5 h-5 accent-[#003366]" />
              <div className="flex-grow">
                <h4 className="font-black text-black">Home Delivery</h4>
                <p className="text-xs text-gray-500 font-bold mt-1">Vehicle delivered directly to your door.</p>
              </div>
              <span className="font-black text-[#003366] text-lg">+ ₹{deliveryFee} <span className="text-[10px] text-gray-400 font-bold uppercase">flat</span></span>
            </label>

            <label className={`flex items-center gap-4 p-4 border-2 rounded-lg cursor-pointer transition group ${needsHomePickup ? 'border-[#003366] bg-blue-50' : 'border-gray-200 hover:border-[#003366]'}`}>
              <input type="checkbox" checked={needsHomePickup} onChange={(e) => setNeedsHomePickup(e.target.checked)} className="w-5 h-5 accent-[#003366]" />
              <div className="flex-grow">
                <h4 className="font-black text-black">Home Pickup (After Trip)</h4>
                <p className="text-xs text-gray-500 font-bold mt-1">We will collect the vehicle when you are done.</p>
              </div>
              <span className="font-black text-[#003366] text-lg">+ ₹{pickupFee} <span className="text-[10px] text-gray-400 font-bold uppercase">flat</span></span>
            </label>

          </div>
        </section>

      </div>

      {/* ----------------------------------------- */}
      {/* RIGHT COLUMN: ORDER SUMMARY */}
      {/* ----------------------------------------- */}
      <div className="w-full lg:w-96 flex flex-col gap-6">
        
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm sticky top-24">
          <h3 className="text-xl font-black text-black border-b border-gray-100 pb-4 mb-6 uppercase tracking-tight">Booking Summary</h3>
          
          <div className="flex gap-4 items-center mb-6">
            <div className="w-20 h-16 bg-gray-100 rounded border border-gray-200 flex items-center justify-center text-[10px] uppercase font-bold text-gray-400 tracking-widest">Car</div>
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{vendorName}</p>
              <h4 className="font-black text-black text-lg leading-tight mt-0.5">{dynamicCarName}</h4>
            </div>
          </div>

          <div className="space-y-4 text-sm border-b border-gray-100 pb-6 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-bold text-xs uppercase tracking-wider">Base Rate</span>
              <span className="font-black text-black">₹{baseRate.toLocaleString()}</span>
            </div>
            
            {needsDriver && (
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-bold text-xs uppercase tracking-wider">Driver Add-on</span>
                <span className="font-black text-black">₹{driverTotal.toLocaleString()}</span>
              </div>
            )}
            {needsDelivery && (
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-bold text-xs uppercase tracking-wider">Delivery Fee</span>
                <span className="font-black text-black">₹{deliveryTotal.toLocaleString()}</span>
              </div>
            )}
            {needsHomePickup && (
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-bold text-xs uppercase tracking-wider">Pickup Fee</span>
                <span className="font-black text-black">₹{homePickupTotal.toLocaleString()}</span>
              </div>
            )}
            
            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-bold text-xs uppercase tracking-wider">Platform Fee</span>
              <span className="font-black text-black">₹{platformFee.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex justify-between items-end mb-6">
            <span className="text-sm font-bold text-black uppercase tracking-widest">Total to Pay</span>
            <span className="text-4xl font-black text-[#003366] leading-none">₹{totalToPay.toLocaleString()}</span>
          </div>

          <button 
            onClick={() => setShowTermsModal(true)}
            className="w-full bg-blue-50 text-[#003366] text-xs font-black uppercase tracking-widest py-3 rounded-lg border border-blue-100 hover:bg-blue-100 transition mb-6"
          >
            View Vendor Terms & Conditions
          </button>

          {/* --- THE SMART GATEKEEPER UI --- */}
          {!user ? (
            <div className="bg-orange-50 border border-orange-200 p-5 rounded-lg text-center mt-6">
              <p className="text-xs font-bold text-orange-800 mb-3">You must be logged in to securely complete this booking.</p>
              <button 
                onClick={() => router.push('/login')}
                className="w-full bg-orange-500 text-white font-black text-sm uppercase tracking-widest py-4 rounded-xl hover:bg-orange-600 transition shadow-md"
              >
                Log In or Sign Up
              </button>
            </div>
          ) : (
            <>
              <label className="flex items-start gap-3 mb-6 cursor-pointer group">
                <input 
                  type="checkbox" 
                  className="w-5 h-5 accent-[#003366] mt-0.5" 
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                />
                <span className="text-xs text-gray-500 font-bold leading-relaxed">
                  I have read and explicitly agree to the Vendor's Terms & Conditions.
                </span>
              </label>

              <button 
                onClick={() => setShowPaymentModal(true)}
                className={`w-full font-black text-sm uppercase tracking-widest py-4 rounded-xl transition shadow-md ${agreedToTerms ? 'bg-[#003366] text-white hover:bg-black' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                disabled={!agreedToTerms}
              >
                Proceed to Payment
              </button>
            </>
          )}

        </div>
      </div>

      {/* ----------------------------------------- */}
      {/* THE TERMS & CONDITIONS MODAL */}
      {/* ----------------------------------------- */}
      {showTermsModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col relative max-h-[80vh]">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-4">
              <h2 className="text-xl font-black text-[#003366] uppercase tracking-widest">Rental Rules</h2>
              <button onClick={() => setShowTermsModal(false)} className="text-gray-400 hover:text-red-500 font-black text-2xl">&times;</button>
            </div>
            <div className="overflow-y-auto pr-2 text-sm text-gray-600 font-medium whitespace-pre-wrap leading-relaxed">
              {isLoadingData ? "Loading vendor terms..." : vendorTerms}
            </div>
            <div className="mt-6 pt-4 border-t border-gray-100">
              <button onClick={() => setShowTermsModal(false)} className="w-full bg-[#003366] text-white font-black py-3 rounded-lg hover:bg-black transition shadow-sm">
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------- */}
      {/* THE SMART UPI PAYMENT MODAL & UPLOAD */}
      {/* ----------------------------------------- */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md flex flex-col items-center relative">
            
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
            </div>
            
            <h2 className="text-2xl font-black text-[#003366] mb-2 text-center leading-tight">Complete Your Payment</h2>
            <p className="text-gray-500 text-sm mb-6 text-center font-medium px-4">
              Pay securely via UPI, then upload a screenshot of your successful transaction.
            </p>

            <div className="text-5xl font-black text-black mb-8 border-b-2 border-gray-100 pb-8 w-full text-center">
              ₹{totalToPay.toLocaleString()}
            </div>

            <a 
              href={`upi://pay?pa=${vendorUpiId}&pn=${encodeURIComponent(vendorName)}&am=${totalToPay}&cu=INR`}
              className="w-full bg-[#003366] text-white font-black text-lg tracking-wide py-4 rounded-xl hover:bg-black transition shadow-lg flex items-center justify-center gap-3 mb-4"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
              PAY VIA UPI APP
            </a>

            <div className="w-full flex items-center gap-4 my-4">
              <div className="h-px bg-gray-200 flex-grow"></div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">OR COPY UPI ID</span>
              <div className="h-px bg-gray-200 flex-grow"></div>
            </div>

            <div className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl p-4 flex justify-between items-center mb-6">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Vendor UPI ID</p>
                <p className="font-bold text-black text-lg">{vendorUpiId || "Loading..."}</p>
              </div>
              <button 
                onClick={handleCopyUpi}
                className={`${copied ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'} text-xs font-black uppercase tracking-widest px-4 py-2.5 rounded transition shadow-sm`}
              >
                {copied ? "COPIED!" : "COPY"}
              </button>
            </div>

            <div className="w-full mb-6">
              <label className="block text-xs font-black text-[#003366] uppercase mb-2">Upload Payment Screenshot *</label>
              <input 
                type="file" 
                accept="image/*"
                onChange={(e) => setPaymentScreenshot(e.target.files ? e.target.files[0] : null)}
                className="w-full text-sm font-bold border-2 border-blue-200 bg-blue-50 rounded-lg p-2 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-bold file:bg-[#003366] file:text-white hover:file:bg-black cursor-pointer transition"
              />
            </div>

            <div className="flex gap-4 w-full mt-2">
              <button 
                onClick={() => { setShowPaymentModal(false); setPaymentScreenshot(null); }} 
                className="w-1/3 bg-white border-2 border-gray-200 text-gray-500 font-bold py-3.5 rounded-xl hover:bg-gray-50 transition"
                disabled={isSubmittingBooking}
              >
                Cancel
              </button>
              <button 
                onClick={handleBookingSubmit} 
                disabled={!paymentScreenshot || isSubmittingBooking}
                className={`w-2/3 text-white font-black py-3.5 rounded-xl transition shadow-md flex items-center justify-center gap-2 ${!paymentScreenshot || isSubmittingBooking ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600'}`}
              >
                {isSubmittingBooking ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    UPLOADING...
                  </>
                ) : (
                  "SUBMIT BOOKING"
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </main>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-bold text-[#003366]">Loading Checkout...</div>}>
      <BookingFlow />
    </Suspense>
  );
}