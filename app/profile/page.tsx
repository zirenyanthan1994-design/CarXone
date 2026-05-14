"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../firebase/config"; 
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { collection, query, getDocs, doc, updateDoc } from "firebase/firestore";

interface Booking {
  id: string;
  vehicleName: string;
  vendorName: string;
  pickupLocation: string;
  dropoffLocation: string;
  pickupDate: string;
  dropoffDate: string;
  specialRemarks?: string;
  totalPaid: number;
  status: string;
  addons?: {
    driver: boolean;
    delivery: boolean;
    homePickup: boolean;
  };
  // Tracking fields for our request features
  cancellationRequested?: boolean;
  cancellationReason?: string;
  changeRequested?: boolean;
  changeMessage?: string;
  newPickupDate?: string; // NEW: Added to track date changes
  newDropoffDate?: string; // NEW: Added to track date changes
  vendorRemark?: string;  // NEW: The message from the vendor
}

export default function CustomerProfile() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // --- BOOKING STATES ---
  const [activeBookings, setActiveBookings] = useState<Booking[]>([]);
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [pastBookings, setPastBookings] = useState<Booking[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);

  // --- MODAL & REQUEST STATES ---
  const [actionBooking, setActionBooking] = useState<Booking | null>(null);
  
  // Cancellation States
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  
  // Change Request States
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [changeMessage, setChangeMessage] = useState("");
  const [newPickupDate, setNewPickupDate] = useState(""); 
  const [newDropoffDate, setNewDropoffDate] = useState(""); 
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser); 
        fetchUserBookings(currentUser.email); 
      } else {
        router.push("/login"); 
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  // --- FETCH BOOKINGS ---
  const fetchUserBookings = async (userEmail: string | null) => {
    setIsLoadingBookings(true);
    try {
      const q = query(collection(db, "bookings"));
      const querySnapshot = await getDocs(q);
      
      const now = new Date();
      const active: Booking[] = [];
      const upcoming: Booking[] = [];
      const past: Booking[] = [];

      querySnapshot.forEach((doc) => {
        const data = { id: doc.id, ...doc.data() } as Booking;
        
        // Optional: Filter by logged in user here when auth is fully linked
        // if(data.customerName !== userEmail) return;

        const pickup = new Date(data.pickupDate);
        const dropoff = new Date(data.dropoffDate);

        if (dropoff < now) {
          past.push(data);
        } else if (pickup > now) {
          upcoming.push(data); 
        } else {
          active.push(data); 
        }
      });

      setActiveBookings(active);
      setUpcomingBookings(upcoming);
      setPastBookings(past);

    } catch (error) {
      console.error("Error fetching bookings:", error);
    } finally {
      setIsLoadingBookings(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  // --- HANDLE CANCELLATION SUBMIT ---
  const handleCancelSubmit = async () => {
    if (!actionBooking) return;
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, "bookings", actionBooking.id), {
        cancellationRequested: true,
        cancellationReason: cancelReason,
        status: "cancellation_pending"
      });
      
      const updateList = (list: Booking[]) => list.map(b => b.id === actionBooking.id ? {...b, cancellationRequested: true, status: "cancellation_pending"} : b);
      setActiveBookings(updateList(activeBookings));
      setUpcomingBookings(updateList(upcomingBookings));
      
      setShowCancelModal(false);
      setCancelReason("");
      setActionBooking(null);
      alert("Cancellation request sent directly to the vendor for approval.");
    } catch (error) {
      console.error("Cancel Error:", error);
      alert("Error sending request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- UPDATED: HANDLE CHANGE REQUEST SUBMIT ---
  const handleChangeSubmit = async () => {
    if (!actionBooking) return;
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, "bookings", actionBooking.id), {
        changeRequested: true,
        newPickupDate: newPickupDate,
        newDropoffDate: newDropoffDate,
        changeMessage: changeMessage
      });
      
      const updateList = (list: Booking[]) => list.map(b => b.id === actionBooking.id ? {...b, changeRequested: true} : b);
      setActiveBookings(updateList(activeBookings));
      setUpcomingBookings(updateList(upcomingBookings));
      
      setShowChangeModal(false);
      setChangeMessage("");
      setNewPickupDate("");
      setNewDropoffDate("");
      setActionBooking(null);
      alert("Your change request (with new dates) has been securely sent to the vendor.");
    } catch (error) {
      console.error("Change Error:", error);
      alert("Error sending request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- HELPER TO OPEN CHANGE MODAL WITH PRE-FILLED DATES ---
  const openChangeModal = (booking: Booking) => {
    setActionBooking(booking);
    setNewPickupDate(booking.pickupDate);
    setNewDropoffDate(booking.dropoffDate);
    setShowChangeModal(true);
  };

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center w-full min-h-screen bg-gray-50">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 animate-pulse">Loading Secure Profile...</p>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "TBD";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <main className="flex-grow w-full max-w-7xl mx-auto px-6 py-16 flex flex-col lg:flex-row gap-16 min-h-screen bg-white">
      
      {/* ----------------------------------------- */}
      {/* LEFT COLUMN: PERSONAL DETAILS & KYC */}
      {/* ----------------------------------------- */}
      <div className="w-full lg:w-1/3 flex flex-col gap-8">
        <div className="bg-white p-8 border border-gray-200 flex flex-col items-center shadow-sm rounded-xl">
          <div className="w-24 h-24 bg-[#003366] text-white rounded-full flex items-center justify-center text-3xl font-black mb-6 uppercase shadow-md">
            {user?.email ? user.email[0] : 'U'}
          </div>
          <h2 className="text-2xl font-black text-black tracking-tight">{user?.email?.split('@')[0]}</h2>
          <p className="text-[10px] font-bold text-gray-400 mt-1 mb-8 uppercase tracking-widest">{user?.email}</p>
          
          <div className="w-full flex flex-col gap-3">
            <button className="text-[11px] font-bold text-white bg-black uppercase tracking-widest px-6 py-4 rounded-lg hover:bg-[#003366] transition w-full shadow-sm">
              Edit Profile
            </button>
            <button onClick={handleLogout} className="text-[11px] font-bold text-black border-2 border-gray-200 rounded-lg uppercase tracking-widest px-6 py-4 hover:border-black transition w-full">
              Sign Out
            </button>
          </div>
        </div>

        <div className="bg-white p-8 border border-gray-200 shadow-sm rounded-xl">
          <h3 className="text-xs font-black text-black uppercase tracking-widest border-b border-gray-100 pb-4 mb-6">Document Vault</h3>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between p-4 border border-green-100 bg-green-50/50 rounded-lg">
              <div className="flex items-center gap-4">
                <span className="text-green-600 text-lg">✓</span>
                <div>
                  <p className="text-[11px] font-bold text-black uppercase tracking-wider">Driving License</p>
                  <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest mt-0.5">Verified</p>
                </div>
              </div>
              <button className="text-[10px] font-bold text-gray-400 hover:text-[#003366] uppercase tracking-widest transition">View</button>
            </div>
          </div>
        </div>
      </div>

      {/* ----------------------------------------- */}
      {/* RIGHT COLUMN: DYNAMIC BOOKING HISTORY */}
      {/* ----------------------------------------- */}
      <div className="flex-grow flex flex-col gap-12">
        <div>
          <h2 className="text-3xl font-black text-black tracking-tight border-b border-gray-200 pb-4 mb-8">My Bookings</h2>

          {isLoadingBookings ? (
            <div className="w-full py-20 flex flex-col items-center justify-center gap-4">
              <div className="w-10 h-10 border-4 border-gray-200 border-t-[#003366] rounded-full animate-spin"></div>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Fetching your trips...</p>
            </div>
          ) : (
            <>
              {activeBookings.length > 0 && (
                <div className="mb-10 animate-in fade-in duration-300">
                  <h3 className="text-[10px] font-bold text-[#003366] uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 bg-[#003366] rounded-full animate-pulse"></span>
                    Active Now
                  </h3>
                  <div className="flex flex-col gap-6">
                    {activeBookings.map(booking => <BookingCard key={booking.id} booking={booking} isActive={true} />)}
                  </div>
                </div>
              )}

              {upcomingBookings.length > 0 && (
                <div className="mb-10 animate-in fade-in duration-300 delay-100">
                  <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Upcoming Trips</h3>
                  <div className="flex flex-col gap-6">
                    {upcomingBookings.map(booking => <BookingCard key={booking.id} booking={booking} />)}
                  </div>
                </div>
              )}

              {pastBookings.length > 0 && (
                <div className="mb-10 animate-in fade-in duration-300 delay-200">
                  <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Past Trips</h3>
                  <div className="flex flex-col gap-4">
                    {pastBookings.map(booking => <PastBookingCard key={booking.id} booking={booking} />)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ----------------------------------------- */}
      {/* MODAL 1: CANCELLATION REQUEST */}
      {/* ----------------------------------------- */}
      {showCancelModal && actionBooking && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md flex flex-col relative">
            <h2 className="text-xl font-black text-red-600 mb-2 uppercase tracking-tight">Request Cancellation</h2>
            <p className="text-sm text-gray-500 font-medium mb-6">
              You are requesting to cancel your booking for the <span className="font-bold text-black">{actionBooking.vehicleName}</span>. Please provide a reason below.
            </p>
            
            <textarea 
              rows={4}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. My travel plans changed unexpectedly..."
              className="w-full border-2 border-gray-200 rounded-lg p-4 text-sm font-bold focus:border-red-500 outline-none mb-6 bg-gray-50 focus:bg-white transition"
            />
            
            <div className="flex gap-4 w-full">
              <button 
                onClick={() => { setShowCancelModal(false); setCancelReason(""); }} 
                className="w-1/3 bg-white border-2 border-gray-200 text-gray-500 font-bold py-3.5 rounded-xl hover:bg-gray-50 transition"
              >
                Go Back
              </button>
              <button 
                onClick={handleCancelSubmit} 
                disabled={isSubmitting}
                className={`w-2/3 text-white font-black py-3.5 rounded-xl transition shadow-md flex items-center justify-center ${isSubmitting ? 'bg-red-400' : 'bg-red-600 hover:bg-red-700'}`}
              >
                {isSubmitting ? "SENDING..." : "SUBMIT REQUEST"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------- */}
      {/* MODAL 2: CHANGE REQUEST (WITH DATES) */}
      {/* ----------------------------------------- */}
      {showChangeModal && actionBooking && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col relative max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-black text-[#003366] mb-2 uppercase tracking-tight">Request a Change</h2>
            <p className="text-sm text-gray-500 font-medium mb-6">
              Need to alter your dates or instructions? Adjust your new preferred dates below and leave a message for the vendor.
            </p>
            
            {/* Date Selection Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">New Pickup Date & Time</label>
                <input 
                  type="datetime-local" 
                  value={newPickupDate}
                  onChange={(e) => setNewPickupDate(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-lg p-3 text-sm font-bold focus:border-[#003366] outline-none transition" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">New Drop-off Date & Time</label>
                <input 
                  type="datetime-local" 
                  value={newDropoffDate}
                  onChange={(e) => setNewDropoffDate(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-lg p-3 text-sm font-bold focus:border-[#003366] outline-none transition" 
                />
              </div>
            </div>

            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Additional Instructions</label>
            <textarea 
              rows={3}
              value={changeMessage}
              onChange={(e) => setChangeMessage(e.target.value)}
              placeholder="e.g. Can we change the pickup time to 4:00 PM and add a driver?"
              className="w-full border-2 border-gray-200 rounded-lg p-4 text-sm font-bold focus:border-[#003366] outline-none mb-6 bg-gray-50 focus:bg-white transition"
            />
            
            <div className="flex gap-4 w-full">
              <button 
                onClick={() => { setShowChangeModal(false); setChangeMessage(""); }} 
                className="w-1/3 bg-white border-2 border-gray-200 text-gray-500 font-bold py-3.5 rounded-xl hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button 
                onClick={handleChangeSubmit} 
                disabled={isSubmitting}
                className={`w-2/3 text-white font-black py-3.5 rounded-xl transition shadow-md flex items-center justify-center ${isSubmitting ? 'bg-blue-400' : 'bg-[#003366] hover:bg-black'}`}
              >
                {isSubmitting ? "SENDING..." : "SEND TO VENDOR"}
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );

  // -----------------------------------------
  // REUSABLE UI COMPONENT: DETAILED BOOKING CARD
  // -----------------------------------------
  function BookingCard({ booking, isActive = false }: { booking: Booking, isActive?: boolean }) {
    
    const isCancelPending = booking.cancellationRequested || booking.status === "cancellation_pending";
    const isChangePending = booking.changeRequested;
    const isRejected = booking.status === "rejected";
    const isCancelled = booking.status === "cancelled";

    return (
      <div className={`bg-white p-6 border rounded-xl flex flex-col gap-4 transition duration-300 shadow-sm ${isActive ? 'border-l-4 border-l-[#003366] border-gray-200 hover:shadow-md' : 'border-gray-200 hover:border-black opacity-95 hover:opacity-100'}`}>
        
        {/* Top Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-5">
            <div className="w-16 h-12 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-[8px] font-black uppercase tracking-widest border border-gray-200">
              CAR
            </div>
            <div>
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">{booking.vendorName}</div>
              <h4 className="text-xl font-black text-black tracking-tight leading-none">{booking.vehicleName}</h4>
            </div>
          </div>
          <div className="flex flex-col items-start md:items-end">
            <span className="text-2xl font-black text-[#003366]">₹{booking.totalPaid.toLocaleString()}</span>
            {/* --- UPGRADED STATUS BADGES --- */}
            {booking.status === "pending_verification" ? (
               <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded uppercase tracking-widest mt-1">Payment Pending</span>
            ) : isRejected ? (
               <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded uppercase tracking-widest mt-1">Booking Rejected</span>
            ) : isCancelled ? (
               <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded uppercase tracking-widest mt-1">Cancelled</span>
            ) : isCancelPending ? (
               <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded uppercase tracking-widest mt-1">Cancellation Pending</span>
            ) : (
               <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded uppercase tracking-widest mt-1">Confirmed</span>
            )}
          </div>
        </div>

        {/* Middle Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Pickup</p>
              <p className="font-bold text-black">{formatDate(booking.pickupDate)}</p>
              <p className="text-xs text-gray-500 font-medium mt-0.5">{booking.pickupLocation}</p>
            </div>
            <div>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Drop-off</p>
              <p className="font-bold text-black">{formatDate(booking.dropoffDate)}</p>
              <p className="text-xs text-gray-500 font-medium mt-0.5">{booking.dropoffLocation}</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 bg-gray-50 p-4 rounded-lg border border-gray-100">
            <p className="text-[9px] font-black text-[#003366] uppercase tracking-widest mb-1">Included Add-ons</p>
            <div className="flex flex-wrap gap-2">
              {booking.addons?.driver && <span className="bg-white border border-gray-200 text-xs font-bold px-2.5 py-1 rounded text-gray-700">👨‍✈️ Driver</span>}
              {booking.addons?.delivery && <span className="bg-white border border-gray-200 text-xs font-bold px-2.5 py-1 rounded text-gray-700">🏠 Delivery</span>}
              {booking.addons?.homePickup && <span className="bg-white border border-gray-200 text-xs font-bold px-2.5 py-1 rounded text-gray-700">🤝 Home Pickup</span>}
              {!booking.addons?.driver && !booking.addons?.delivery && !booking.addons?.homePickup && (
                <span className="text-xs text-gray-400 font-medium">None selected</span>
              )}
            </div>
          </div>
        </div>

        {/* --- NEW: THE VENDOR REMARK DISPLAY --- */}
        {booking.vendorRemark && (
          <div className={`p-4 rounded-lg mt-2 ${isRejected || isCancelled ? 'bg-red-50 border border-red-100' : 'bg-blue-50 border border-blue-100'}`}>
            <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${isRejected || isCancelled ? 'text-red-800' : 'text-[#003366]'}`}>Message from Vendor</p>
            <p className={`text-sm font-bold italic ${isRejected || isCancelled ? 'text-red-900' : 'text-blue-900'}`}>"{booking.vendorRemark}"</p>
          </div>
        )}

        {/* --- CUSTOMER ACTIONS PANEL --- */}
        <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-2">
          
          <button 
            onClick={() => openChangeModal(booking)}
            disabled={isChangePending || isCancelPending || isRejected || isCancelled}
            className={`text-[10px] font-bold px-6 py-2.5 uppercase tracking-widest rounded transition ${isChangePending || isRejected || isCancelled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'text-[#003366] bg-blue-50 hover:bg-[#003366] hover:text-white'}`}
          >
            {isChangePending ? "⏳ Change Pending" : "Request Change"}
          </button>
          
          <button 
            onClick={() => { setActionBooking(booking); setShowCancelModal(true); }}
            disabled={isCancelPending || isRejected || isCancelled}
            className={`text-[10px] font-bold px-6 py-2.5 uppercase tracking-widest rounded transition ${isCancelPending || isRejected || isCancelled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'text-red-500 border border-red-100 bg-red-50 hover:bg-red-500 hover:text-white'}`}
          >
            {isCancelPending ? "⏳ Cancellation Pending" : "Request Cancellation"}
          </button>

        </div>
      </div>
    );
  }

  // -----------------------------------------
  // REUSABLE UI COMPONENT: PAST BOOKING SLIVER
  // -----------------------------------------
  function PastBookingCard({ booking }: { booking: Booking }) {
    const router = useRouter();
    return (
      <div className="bg-white p-5 border border-gray-200 rounded-xl flex justify-between items-center hover:border-black transition cursor-pointer group shadow-sm hover:shadow-md">
        <div className="flex items-center gap-5">
          <div className="w-10 h-10 bg-green-50 text-green-600 rounded-full flex items-center justify-center font-black group-hover:bg-green-500 group-hover:text-white transition">✓</div>
          <div>
            <h4 className="text-sm font-black text-black tracking-tight">{booking.vehicleName}</h4>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
              {formatDate(booking.dropoffDate)} • {booking.vendorName}
            </p>
          </div>
        </div>
        <div className="text-right flex flex-col items-end">
          <span className="font-black text-black text-sm">₹{booking.totalPaid.toLocaleString()}</span>
          <button onClick={() => router.push('/')} className="text-[9px] font-black text-[#003366] bg-blue-50 px-3 py-1.5 rounded uppercase tracking-widest hover:bg-[#003366] hover:text-white transition mt-2">
            Book Again
          </button>
        </div>
      </div>
    );
  }
}