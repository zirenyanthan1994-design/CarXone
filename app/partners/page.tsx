"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db, storage, auth } from "../firebase/config"; 
import { collection, query, where, getDocs, doc, deleteDoc, updateDoc, setDoc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { onAuthStateChanged } from "firebase/auth";

const NAGALAND_CITIES = [
  "Dimapur", "Kohima", "Mokokchung", "Tuensang", "Wokha", "Zunheboto", 
  "Mon", "Phek", "Kiphire", "Longleng", "Peren", "Noklak", "Shamator", 
  "Niuland", "Chumoukedima", "Tseminyu"
];

const ADMIN_UPI_ID = "admin@oksbi"; 
const ADMIN_NAME = "CarXone Admin";
const FEATURE_RATE_PER_DAY = 100; 

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  registration: string;
  basePrice: number;
  outletLocation: string;
  status: string;
  images: string[];
  category?: string;
  driverProvision?: string;
  pricingModel?: string;
  blockedDates?: { start: string; end: string }[];
  discount?: { type: 'percentage' | 'flat'; value: number } | null;
  kmTiers?: { km: number | string; price: number | string }[];
  destinations?: { city: string; price: number | string }[];
  featuredUntil?: string; 
  featureRequest?: { 
    status: string;
    days: number;
    amount: number;
    screenshotUrl: string;
    submittedAt: string;
  } | null;
}

interface Booking {
  id: string;
  vehicleName: string;
  customerName: string;
  pickupLocation: string;
  dropoffLocation: string;
  pickupDate: string;
  dropoffDate: string;
  specialRemarks?: string;
  totalPaid: number;
  status: string;
  addons?: { driver: boolean; delivery: boolean; homePickup: boolean; };
  cancellationRequested?: boolean;
  cancellationReason?: string;
  changeRequested?: boolean;
  changeMessage?: string;
  newPickupDate?: string;
  newDropoffDate?: string;
  vendorRemark?: string; 
  paymentReceiptUrl?: string;
}

export default function PartnersDashboard() {
  const router = useRouter();
  
  // --- AUTHENTICATION GATEKEEPER STATE ---
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  const [activeTab, setActiveTab] = useState("overview");

  // --- FIREBASE STATES ---
  const [myVehicles, setMyVehicles] = useState<Vehicle[]>([]);
  const [vendorBookings, setVendorBookings] = useState<Booking[]>([]); 
  const [isLoading, setIsLoading] = useState(true);

  // --- PROFILE & SETTINGS STATES ---
  const [termsText, setTermsText] = useState("");
  const [upiId, setUpiId] = useState(""); 
  const [commissionRate, setCommissionRate] = useState<number>(0); 
  const [globalPlatformFeeRate, setGlobalPlatformFeeRate] = useState<number>(0); 
  const [whatsappNumber, setWhatsappNumber] = useState(""); 
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // --- MODAL STATES ---
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [blockingVehicle, setBlockingVehicle] = useState<Vehicle | null>(null);
  const [blockStart, setBlockStart] = useState("");
  const [blockEnd, setBlockEnd] = useState("");
  const [discountTarget, setDiscountTarget] = useState<Vehicle | 'all' | null>(null);
  const [discountType, setDiscountType] = useState<'percentage' | 'flat'>('percentage');
  const [discountValue, setDiscountValue] = useState("");

  const [featuringVehicle, setFeaturingVehicle] = useState<Vehicle | null>(null);
  const [featureDays, setFeatureDays] = useState<number>(1);
  const [showAdminPaymentModal, setShowAdminPaymentModal] = useState(false);
  const [copiedAdminUpi, setCopiedAdminUpi] = useState(false);
  const [featureScreenshot, setFeatureScreenshot] = useState<File | null>(null);
  const [isSubmittingFeature, setIsSubmittingFeature] = useState(false);

  // --- REJECTION MODAL STATES ---
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectType, setRejectType] = useState<"cancel" | "change" | "booking" | null>(null);
  const [actionBooking, setActionBooking] = useState<Booking | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);

  // --- VERIFICATION MODAL STATES ---
  const [verifyingBooking, setVerifyingBooking] = useState<Booking | null>(null);
  const [isSubmittingVerify, setIsSubmittingVerify] = useState(false);

  // ==========================================
  // THE GATEKEEPER SECURITY CHECK
  // ==========================================
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/partners/login"); 
      } else {
        try {
          const vendorRef = doc(db, "vendors", user.uid);
          const vendorSnap = await getDoc(vendorRef);

          if (!vendorSnap.exists()) {
            alert("Access Denied: You are logged in with a Customer account. You must use a registered Vendor account to access this dashboard.");
            await auth.signOut();
            router.push("/partners/login");
          } else {
            setIsAuthChecking(false);
            fetchDashboardData(); 
          }
        } catch (error) {
          console.error("Auth check failed:", error);
          router.push("/partners/login");
        }
      }
    });

    return () => unsubscribe();
  }, [router]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const fleetQ = query(collection(db, "vehicles"), where("vendorId", "==", "Dimapur Rentals"));
      const fleetSnap = await getDocs(fleetQ);
      const vehicles: Vehicle[] = [];
      fleetSnap.forEach((doc) => vehicles.push({ id: doc.id, ...doc.data() } as Vehicle));
      setMyVehicles(vehicles);

      const bookingsQ = query(collection(db, "bookings"), where("vendorName", "==", "Dimapur Rentals"));
      const bookingsSnap = await getDocs(bookingsQ);
      const bookings: Booking[] = [];
      bookingsSnap.forEach((doc) => bookings.push({ id: doc.id, ...doc.data() } as Booking));
      setVendorBookings(bookings);

      // Fetch Global Platform Fee Rate (%) set by Admin
      const globalSettingsSnap = await getDoc(doc(db, "platformSettings", "global"));
      if (globalSettingsSnap.exists()) {
        setGlobalPlatformFeeRate(globalSettingsSnap.data().platformFee || 0);
      }

      // Fetch Vendor Specific Settings
      const settingsRef = doc(db, "vendorSettings", "Dimapur Rentals");
      const settingsSnap = await getDoc(settingsRef);
      if (settingsSnap.exists()) {
        const data = settingsSnap.data();
        setTermsText(data.terms || "");
        setUpiId(data.upiId || ""); 
        setCommissionRate(data.commissionRate || 0); 
        setWhatsappNumber(data.whatsappNumber || ""); 
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => { 
    e.preventDefault(); 
    setIsSavingSettings(true); 
    try { 
      await setDoc(doc(db, "vendorSettings", "Dimapur Rentals"), { 
        terms: termsText, 
        upiId: upiId, 
        // NOTE: commissionRate is strictly excluded so vendors cannot overwrite admin settings
        whatsappNumber: whatsappNumber, 
        updatedAt: new Date().toISOString() 
      }, { merge: true }); 
      alert("Profile Settings successfully saved!"); 
    } catch (error) { 
      alert("Failed to save profile settings."); 
    } finally { 
      setIsSavingSettings(false); 
    } 
  };
  
  const handleDelete = async (vehicleId: string) => { const isConfirmed = window.confirm("Are you sure you want to delete this vehicle? This action cannot be undone."); if (!isConfirmed) return; try { await deleteDoc(doc(db, "vehicles", vehicleId)); setMyVehicles(prev => prev.filter(v => v.id !== vehicleId)); alert("Vehicle successfully deleted."); } catch (error) { alert("Failed to delete vehicle."); } };
  const handleSaveEdit = async (e: React.FormEvent) => { e.preventDefault(); if (!editingVehicle) return; try { const vehicleRef = doc(db, "vehicles", editingVehicle.id); let finalBasePrice = Number(editingVehicle.basePrice); const updateData: any = { brand: editingVehicle.brand, model: editingVehicle.model, category: editingVehicle.category || "Car", driverProvision: editingVehicle.driverProvision || "Self-Drive Only (Without Driver)", registration: editingVehicle.registration, outletLocation: editingVehicle.outletLocation, pricingModel: editingVehicle.pricingModel || "per_24h", status: editingVehicle.status }; if (editingVehicle.pricingModel === "flat_rate_km_limit") { updateData.kmTiers = (editingVehicle.kmTiers || []).filter(tier => tier.km !== "" && tier.price !== "").map(tier => ({ km: Number(tier.km), price: Number(tier.price) })); } if (editingVehicle.pricingModel === "per_hire") { const validDests = (editingVehicle.destinations || []).filter(d => d.city !== "" && d.price !== "").map(d => ({ city: d.city, price: Number(d.price) })); updateData.destinations = validDests; if (validDests.length > 0) { finalBasePrice = Math.min(...validDests.map(d => d.price)); } } updateData.basePrice = finalBasePrice; await updateDoc(vehicleRef, updateData); setMyVehicles(prev => prev.map(v => v.id === editingVehicle.id ? { ...v, ...updateData } : v)); setEditingVehicle(null); alert("Vehicle details updated successfully!"); } catch (error) { alert("Failed to update vehicle details."); } };
  
  const handleEditDestChange = (index: number, field: 'city' | 'price', value: string) => { if (!editingVehicle) return; const currentDests = editingVehicle.destinations && editingVehicle.destinations.length > 0 ? [...editingVehicle.destinations] : [{city: "", price: ""}]; if (!currentDests[index]) currentDests[index] = {city: "", price: ""}; currentDests[index] = { ...currentDests[index], [field]: value }; setEditingVehicle({ ...editingVehicle, destinations: currentDests }); };
  const addEditDest = () => { if (!editingVehicle) return; const currentDests = editingVehicle.destinations && editingVehicle.destinations.length > 0 ? [...editingVehicle.destinations] : [{city: "", price: ""}]; setEditingVehicle({ ...editingVehicle, destinations: [...currentDests, { city: "", price: "" }] }); };
  const removeEditDest = (index: number) => { if (!editingVehicle || !editingVehicle.destinations) return; const newDests = editingVehicle.destinations.filter((_, i) => i !== index); setEditingVehicle({ ...editingVehicle, destinations: newDests }); };
  const handleEditKmTierChange = (index: number, field: 'km' | 'price', value: string) => { if (!editingVehicle) return; const currentTiers = editingVehicle.kmTiers && editingVehicle.kmTiers.length > 0 ? [...editingVehicle.kmTiers] : [{km: "", price: ""}]; if (!currentTiers[index]) currentTiers[index] = {km: "", price: ""}; currentTiers[index] = { ...currentTiers[index], [field]: value }; setEditingVehicle({ ...editingVehicle, kmTiers: currentTiers }); };
  const addEditKmTier = () => { if (!editingVehicle) return; const currentTiers = editingVehicle.kmTiers && editingVehicle.kmTiers.length > 0 ? [...editingVehicle.kmTiers] : [{km: "", price: ""}]; setEditingVehicle({ ...editingVehicle, kmTiers: [...currentTiers, { km: "", price: "" }] }); };
  const removeEditKmTier = (index: number) => { if (!editingVehicle || !editingVehicle.kmTiers) return; const newTiers = editingVehicle.kmTiers.filter((_, i) => i !== index); setEditingVehicle({ ...editingVehicle, kmTiers: newTiers }); };
  
  const handleSaveBlockedDates = async (e: React.FormEvent) => { e.preventDefault(); if (!blockingVehicle || !blockStart || !blockEnd) return; const newBlock = { start: blockStart, end: blockEnd }; const updatedBlocks = [...(blockingVehicle.blockedDates || []), newBlock]; try { const vehicleRef = doc(db, "vehicles", blockingVehicle.id); await updateDoc(vehicleRef, { blockedDates: updatedBlocks }); setMyVehicles(prev => prev.map(v => v.id === blockingVehicle.id ? { ...v, blockedDates: updatedBlocks } : v)); setBlockStart(""); setBlockEnd(""); setBlockingVehicle(null); alert("Dates and times successfully blocked!"); } catch (error) { alert("Failed to block dates."); } };
  const handleSaveDiscount = async (e: React.FormEvent) => { e.preventDefault(); if (!discountTarget) return; const numValue = Number(discountValue); const newDiscountData = numValue > 0 ? { type: discountType, value: numValue } : null; try { if (discountTarget === 'all') { const updatePromises = myVehicles.map(v => updateDoc(doc(db, "vehicles", v.id), { discount: newDiscountData })); await Promise.all(updatePromises); setMyVehicles(prev => prev.map(v => ({ ...v, discount: newDiscountData }))); alert("Success! Global discount applied to your entire fleet."); } else { await updateDoc(doc(db, "vehicles", discountTarget.id), { discount: newDiscountData }); setMyVehicles(prev => prev.map(v => v.id === discountTarget.id ? { ...v, discount: newDiscountData } : v)); alert("Success! Discount applied to the selected vehicle."); } setDiscountTarget(null); setDiscountValue(""); } catch (error) { alert("Failed to apply discount."); } };
  const calculateDiscountedPrice = (basePrice: number, discount?: { type: string, value: number } | null) => { if (!discount) return basePrice; if (discount.type === 'flat') return Math.max(0, basePrice - discount.value); if (discount.type === 'percentage') return Math.max(0, basePrice - (basePrice * (discount.value / 100))); return basePrice; };
  const handleFeatureSubmit = async () => { if (!featuringVehicle || !featureScreenshot) return; setIsSubmittingFeature(true); try { const imageRef = ref(storage, `feature_payments/${featuringVehicle.id}_${Date.now()}_${featureScreenshot.name}`); await uploadBytes(imageRef, featureScreenshot); const downloadUrl = await getDownloadURL(imageRef); const featureData = { status: "pending", days: featureDays, amount: featureDays * FEATURE_RATE_PER_DAY, screenshotUrl: downloadUrl, submittedAt: new Date().toISOString() }; await updateDoc(doc(db, "vehicles", featuringVehicle.id), { featureRequest: featureData }); setMyVehicles(prev => prev.map(v => v.id === featuringVehicle.id ? { ...v, featureRequest: featureData } : v)); setFeaturingVehicle(null); setShowAdminPaymentModal(false); setFeatureDays(1); setFeatureScreenshot(null); alert(`Success! Your feature request and payment screenshot for ${featuringVehicle.model} have been sent to the Admin for approval.`); } catch (error) { alert("Failed to submit feature request. Please try again."); } finally { setIsSubmittingFeature(false); } };
  const handleCopyAdminUpi = () => { navigator.clipboard.writeText(ADMIN_UPI_ID); setCopiedAdminUpi(true); setTimeout(() => setCopiedAdminUpi(false), 2000); };

  const handleAcceptCancel = async (booking: Booking) => {
    const isConfirmed = window.confirm("Are you sure you want to accept this cancellation?");
    if (!isConfirmed) return;
    try {
      await updateDoc(doc(db, "bookings", booking.id), { status: "cancelled", cancellationRequested: false, vendorRemark: "Cancellation accepted by vendor." });
      setVendorBookings(prev => prev.map(b => b.id === booking.id ? {...b, status: "cancelled", cancellationRequested: false} : b));
      alert("Cancellation Accepted.");
    } catch (error) { alert("Error updating booking."); }
  };

  const handleAcceptChange = async (booking: Booking) => {
    const isConfirmed = window.confirm("Are you sure you want to accept these new dates?");
    if (!isConfirmed) return;
    try {
      await updateDoc(doc(db, "bookings", booking.id), { pickupDate: booking.newPickupDate, dropoffDate: booking.newDropoffDate, changeRequested: false, changeMessage: "", newPickupDate: "", newDropoffDate: "", vendorRemark: "Change request approved." });
      setVendorBookings(prev => prev.map(b => b.id === booking.id ? {...b, pickupDate: booking.newPickupDate!, dropoffDate: booking.newDropoffDate!, changeRequested: false} : b));
      alert("Changes Accepted and dates updated.");
    } catch (error) { alert("Error updating booking."); }
  };

  const handleRejectSubmit = async () => {
    if (!actionBooking || !rejectType) return;
    setIsSubmittingReject(true);
    try {
      const updates: any = { vendorRemark: rejectReason };
      if (rejectType === "cancel") {
        updates.cancellationRequested = false;
        updates.status = "confirmed"; 
      } else if (rejectType === "change") {
        updates.changeRequested = false;
        updates.newPickupDate = "";
        updates.newDropoffDate = "";
      } else if (rejectType === "booking") {
        updates.status = "rejected";
      }

      await updateDoc(doc(db, "bookings", actionBooking.id), updates);
      setVendorBookings(prev => prev.map(b => b.id === actionBooking.id ? {...b, ...updates} : b));
      
      setShowRejectModal(false);
      setRejectReason("");
      setActionBooking(null);
      setRejectType(null);
      alert(rejectType === "booking" ? "Booking Rejected." : "Rejection sent to customer.");
    } catch (error) { alert("Error rejecting request."); }
    finally { setIsSubmittingReject(false); }
  };

  const openRejectModal = (booking: Booking, type: "cancel" | "change" | "booking") => {
    setActionBooking(booking);
    setRejectType(type);
    setShowRejectModal(true);
  };

  const handleConfirmBooking = async () => {
    if (!verifyingBooking) return;
    setIsSubmittingVerify(true);
    try {
      await updateDoc(doc(db, "bookings", verifyingBooking.id), {
        status: "confirmed"
      });
      setVendorBookings(prev => prev.map(b => b.id === verifyingBooking.id ? {...b, status: "confirmed"} : b));

      try {
        await fetch('/api/whatsapp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: "BOOKING_CONFIRMED",
            customerPhone: "911234567890", 
            vehicleName: verifyingBooking.vehicleName,
            vendorDetails: `Vendor: Dimapur Rentals\nPickup: ${verifyingBooking.pickupLocation}`,
          })
        });
      } catch (waError) {
        console.error("WhatsApp notification failed silently:", waError);
      }

      setVerifyingBooking(null);
      alert("Success! The booking is now confirmed and the customer has been notified via WhatsApp.");
    } catch (error) {
      alert("Error confirming booking. Please try again.");
    } finally {
      setIsSubmittingVerify(false);
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    router.push("/partners/login");
  };

  let totalGrossRevenue = 0;
  let totalVendorNet = 0;
  let totalPlatformShare = 0;

  const activeEarningsBookings = vendorBookings.filter(b => b.status === "confirmed");

  const calculatedBookings = activeEarningsBookings.map(booking => {
    const bookingBaseTotal = booking.totalPaid; 
    
    // Calculate both deductions dynamically via percentage
    const commissionAmount = (bookingBaseTotal * commissionRate) / 100; 
    const platformFeeAmount = (bookingBaseTotal * globalPlatformFeeRate) / 100;
    
    const vendorKeeps = bookingBaseTotal - commissionAmount - platformFeeAmount; 
    const platformKeeps = commissionAmount + platformFeeAmount; 

    totalGrossRevenue += bookingBaseTotal;
    totalVendorNet += vendorKeeps;
    totalPlatformShare += platformKeeps;

    return { ...booking, commissionAmount, platformFeeAmount, vendorKeeps, platformKeeps };
  });

  const formatDate = (d: string) => {
    if (!d) return "TBD";
    return new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const actionRequiredBookings = vendorBookings.filter(b => b.cancellationRequested || b.changeRequested || b.status === "pending_verification");
  const normalBookings = vendorBookings.filter(b => !b.cancellationRequested && !b.changeRequested && b.status !== "pending_verification" && b.status !== "cancelled" && b.status !== "rejected");

  // --- THE SECURE LOADING SCREEN ---
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-[#003366] rounded-full animate-spin"></div>
        <p className="text-[#003366] font-black tracking-widest mt-4 uppercase text-xs">Verifying Vendor Credentials...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-black font-sans flex flex-col relative overflow-x-hidden">
      
      <header className="sticky top-0 z-40 bg-[#003366] border-b border-gray-800 shadow-sm text-white">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between px-4 py-4 max-w-7xl mx-auto gap-4">
          <div className="flex items-center justify-between w-full md:w-auto">
            <a href="/" className="flex items-center space-x-4">
              <h1 className="text-xl sm:text-2xl font-black tracking-widest text-white">
                CarXone <span className="text-xs sm:text-sm font-normal text-blue-300">| PARTNERS</span>
              </h1>
            </a>
          </div>
          
          <div className="flex items-center space-x-4 md:space-x-6 text-sm font-bold w-full overflow-x-auto pb-2 md:pb-0 snap-x hide-scrollbar">
            <button onClick={() => setActiveTab("overview")} className={`snap-start whitespace-nowrap transition ${activeTab === 'overview' ? 'text-blue-200' : 'hover:text-blue-300'}`}>Dashboard</button>
            <button onClick={() => setActiveTab("bookings")} className={`snap-start whitespace-nowrap transition ${activeTab === 'bookings' ? 'text-blue-200' : 'hover:text-blue-300'} relative`}>
              Bookings & Requests
              {actionRequiredBookings.length > 0 && <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">{actionRequiredBookings.length}</span>}
            </button>
            <button onClick={() => setActiveTab("fleet")} className={`snap-start whitespace-nowrap transition ${activeTab === 'fleet' ? 'text-blue-200' : 'hover:text-blue-300'}`}>My Fleet</button>
            <button onClick={() => setActiveTab("earnings")} className={`snap-start whitespace-nowrap transition ${activeTab === 'earnings' ? 'text-blue-200' : 'hover:text-blue-300'}`}>Earnings</button>
            <button onClick={() => setActiveTab("terms")} className={`snap-start whitespace-nowrap transition ${activeTab === 'terms' ? 'text-blue-200' : 'hover:text-blue-300'}`}>Profile & Settings</button>
            <button onClick={handleLogout} className="snap-start whitespace-nowrap bg-white text-[#003366] px-4 py-1.5 rounded hover:bg-black hover:text-white transition">Log Out</button>
          </div>
        </div>
      </header>

      <main className="flex-grow w-full max-w-7xl mx-auto px-4 py-6 sm:py-8 flex flex-col gap-6 sm:gap-8">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200 gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-black">Welcome back, Dimapur Rentals!</h2>
            <p className="text-gray-500 text-sm">Here is what is happening with your fleet today.</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 w-full md:w-auto overflow-x-auto pb-1">
            {activeTab !== "overview" && (
              <button onClick={() => setActiveTab("overview")} className="whitespace-nowrap text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200 px-4 py-3 rounded hover:bg-gray-200 transition">
                ← Back
              </button>
            )}
            <a href="/partners/add-vehicle" className="whitespace-nowrap bg-[#003366] text-white font-bold px-4 sm:px-6 py-3 rounded hover:bg-black transition shadow-md flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
              Add Vehicle
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          <StatCard title="Action Required" value={actionRequiredBookings.length.toString()} subtitle="Customer Requests" onClick={() => setActiveTab("bookings")} isActive={activeTab === "bookings"} highlight={actionRequiredBookings.length > 0} />
          <StatCard title="Total Bookings" value={vendorBookings.length.toString()} subtitle="All time" onClick={() => setActiveTab("bookings")} isActive={activeTab === "bookings"} />
          <StatCard title="Total Vehicles" value={myVehicles.length.toString()} subtitle="Across all categories" onClick={() => setActiveTab("fleet")} isActive={activeTab === "fleet"} />
          <StatCard title="Net Earnings" value={`₹${totalVendorNet.toLocaleString()}`} subtitle="After commission splits" onClick={() => setActiveTab("earnings")} isActive={activeTab === "earnings"} />
        </div>

        {activeTab === "overview" && (
          <div className="text-center py-16 sm:py-20 bg-white rounded-lg border border-gray-200 px-4">
            <h3 className="text-lg sm:text-xl font-black text-[#003366] mb-2">Dashboard Overview</h3>
            <p className="text-gray-500 font-bold text-sm">Use the tabs above to manage your Fleet, Bookings, and Earnings.</p>
          </div>
        )}

        {activeTab === "bookings" && (
          <div className="flex flex-col gap-6 sm:gap-8">
            
            {actionRequiredBookings.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border-2 border-red-200 overflow-hidden">
                <div className="bg-red-50 text-red-800 p-4 border-b border-red-200 flex justify-between items-center">
                  <h3 className="font-black text-sm sm:text-lg flex items-center gap-2">⚠️ ACTION REQUIRED</h3>
                </div>
                <div className="p-4 sm:p-6 flex flex-col gap-4 sm:gap-6">
                  {actionRequiredBookings.map(booking => (
                    <div key={booking.id} className="border border-gray-200 rounded-lg p-4 sm:p-6 bg-gray-50 shadow-sm">
                      
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                        <div>
                          <h4 className="font-black text-lg sm:text-xl text-black">{booking.vehicleName}</h4>
                          <p className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Customer: {booking.customerName}</p>
                        </div>
                        <span className="font-black text-[#003366] text-xl sm:text-2xl">₹{booking.totalPaid.toLocaleString()}</span>
                      </div>

                      {booking.status === "pending_verification" && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-5 mb-4">
                          <p className="text-[10px] font-black text-[#003366] uppercase tracking-widest mb-2">New Booking Request</p>
                          <p className="text-xs sm:text-sm font-bold text-black mb-4">Customer uploaded payment screenshot and awaits confirmation.</p>
                          <button onClick={() => setVerifyingBooking(booking)} className="bg-[#003366] text-white text-xs font-black uppercase tracking-widest px-4 sm:px-6 py-3 rounded hover:bg-black transition shadow-sm w-full sm:w-auto">
                            Review & Verify Payment
                          </button>
                        </div>
                      )}

                      {booking.cancellationRequested && (
                        <div className="bg-red-100 border border-red-200 rounded-lg p-4 mb-4">
                          <p className="text-[10px] font-black text-red-800 uppercase tracking-widest mb-1">Cancellation Requested</p>
                          <p className="text-xs sm:text-sm font-bold text-red-900">Reason: "{booking.cancellationReason}"</p>
                          
                          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4">
                            <button onClick={() => handleAcceptCancel(booking)} className="w-full sm:w-auto bg-red-600 text-white text-xs font-black uppercase tracking-widest px-4 sm:px-6 py-2.5 rounded hover:bg-red-700 transition shadow-sm">
                              Accept Cancellation
                            </button>
                            <button onClick={() => openRejectModal(booking, "cancel")} className="w-full sm:w-auto bg-white border border-red-300 text-red-600 text-xs font-black uppercase tracking-widest px-4 sm:px-6 py-2.5 rounded hover:bg-red-50 transition">
                              Reject Request
                            </button>
                          </div>
                        </div>
                      )}

                      {booking.changeRequested && (
                        <div className="bg-blue-100 border border-blue-200 rounded-lg p-4 mb-4">
                          <p className="text-[10px] font-black text-blue-800 uppercase tracking-widest mb-1">Date Change Requested</p>
                          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 mb-2">
                            <div><span className="text-[10px] text-blue-600 font-bold uppercase block">New Pickup</span><span className="font-black text-black text-xs sm:text-sm">{formatDate(booking.newPickupDate!)}</span></div>
                            <div><span className="text-[10px] text-blue-600 font-bold uppercase block">New Dropoff</span><span className="font-black text-black text-xs sm:text-sm">{formatDate(booking.newDropoffDate!)}</span></div>
                          </div>
                          <p className="text-xs sm:text-sm font-bold text-blue-900 mt-2">Message: "{booking.changeMessage}"</p>
                          
                          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4">
                            <button onClick={() => handleAcceptChange(booking)} className="w-full sm:w-auto bg-[#003366] text-white text-xs font-black uppercase tracking-widest px-4 sm:px-6 py-2.5 rounded hover:bg-black transition shadow-sm">
                              Accept New Dates
                            </button>
                            <button onClick={() => openRejectModal(booking, "change")} className="w-full sm:w-auto bg-white border border-blue-300 text-[#003366] text-xs font-black uppercase tracking-widest px-4 sm:px-6 py-2.5 rounded hover:bg-blue-50 transition">
                              Reject Request
                            </button>
                          </div>
                        </div>
                      )}

                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-800 text-white p-4">
                <h3 className="font-black text-lg">Confirmed Bookings Queue</h3>
              </div>
              <div className="p-0 overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap min-w-[600px]">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-[10px] font-black tracking-widest">
                    <tr>
                      <th className="px-4 sm:px-6 py-4">Customer & Vehicle</th>
                      <th className="px-4 sm:px-6 py-4">Schedule</th>
                      <th className="px-4 sm:px-6 py-4">Total Paid</th>
                      <th className="px-4 sm:px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {normalBookings.length === 0 ? (
                      <tr><td colSpan={4} className="text-center py-8 text-gray-400 font-bold">No confirmed bookings currently.</td></tr>
                    ) : (
                      normalBookings.map((bk) => (
                        <tr key={bk.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                          <td className="px-4 sm:px-6 py-4">
                            <div className="font-bold text-black">{bk.customerName}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{bk.vehicleName}</div>
                          </td>
                          <td className="px-4 sm:px-6 py-4">
                            <div className="text-xs font-bold text-gray-600">Pick: {formatDate(bk.pickupDate)}</div>
                            <div className="text-xs font-bold text-gray-600 mt-1">Drop: {formatDate(bk.dropoffDate)}</div>
                          </td>
                          <td className="px-4 sm:px-6 py-4 font-black text-[#003366]">₹{bk.totalPaid.toLocaleString()}</td>
                          <td className="px-4 sm:px-6 py-4">
                            <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded bg-green-100 text-green-700">
                              Confirmed
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {activeTab === "earnings" && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 flex flex-col justify-center items-center text-center shadow-sm">
                <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Gross Revenue (Customers)</span>
                <span className="text-2xl sm:text-4xl font-black text-gray-800">₹{totalGrossRevenue.toLocaleString()}</span>
              </div>
              <div className="bg-green-50 rounded-xl border border-green-200 p-4 sm:p-6 flex flex-col justify-center items-center text-center shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
                <span className="text-[10px] sm:text-xs font-bold text-green-800 uppercase tracking-widest mb-1">My Net Earnings</span>
                <span className="text-2xl sm:text-4xl font-black text-green-600">₹{totalVendorNet.toLocaleString()}</span>
              </div>
              <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 sm:p-6 flex flex-col justify-center items-center text-center shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-[#003366]"></div>
                <span className="text-[10px] sm:text-xs font-bold text-[#003366] uppercase tracking-widest mb-1">Platform Share</span>
                <span className="text-2xl sm:text-4xl font-black text-[#003366]">₹{totalPlatformShare.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-800 text-white p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <h3 className="font-black text-lg">Detailed Booking Ledger</h3>
                <div className="flex flex-wrap gap-2">
                  <span className="bg-gray-700 text-[10px] sm:text-xs font-bold px-3 py-1 rounded text-gray-300">
                    Platform Fee: {globalPlatformFeeRate}%
                  </span>
                  <span className="bg-gray-700 text-[10px] sm:text-xs font-bold px-3 py-1 rounded text-gray-300">
                    Commission: {commissionRate}%
                  </span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap min-w-[700px]">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-[10px] font-black tracking-widest">
                    <tr>
                      <th className="px-4 sm:px-6 py-4">Customer & Vehicle</th>
                      <th className="px-4 sm:px-6 py-4">Gross Total Paid</th>
                      <th className="px-4 sm:px-6 py-4 bg-blue-50 text-blue-800 border-l border-r border-blue-100">- Platform Fee ({globalPlatformFeeRate}%)</th>
                      <th className="px-4 sm:px-6 py-4 bg-orange-50 text-orange-800 border-r border-orange-100">- Commission ({commissionRate}%)</th>
                      <th className="px-4 sm:px-6 py-4 text-green-600 bg-green-50 font-black border-r border-green-100">Vendor Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calculatedBookings.length === 0 ? (
                       <tr><td colSpan={5} className="text-center py-8 text-gray-400 font-bold">No active bookings yet.</td></tr>
                    ) : (
                      calculatedBookings.map((bk) => (
                        <tr key={bk.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                          <td className="px-4 sm:px-6 py-4">
                            <div className="font-bold text-black">{bk.customerName}</div>
                            <div className="text-xs text-gray-500">{bk.vehicleName}</div>
                          </td>
                          <td className="px-4 sm:px-6 py-4 font-black text-gray-700">₹{bk.totalPaid.toLocaleString()}</td>
                          <td className="px-4 sm:px-6 py-4 font-bold text-blue-600 bg-blue-50/50 border-r border-blue-50">- ₹{bk.platformFeeAmount.toLocaleString()}</td>
                          <td className="px-4 sm:px-6 py-4 font-bold text-orange-600 bg-orange-50/50 border-r border-orange-50">- ₹{bk.commissionAmount.toLocaleString()}</td>
                          <td className="px-4 sm:px-6 py-4 font-black text-green-600 text-base bg-green-50/50 border-r border-green-50">₹{bk.vendorKeeps.toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "terms" && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-800 text-white p-4">
              <h3 className="font-black text-lg">My Profile & Settings</h3>
            </div>
            <div className="p-4 sm:p-8">
              <p className="text-sm text-gray-500 mb-6 sm:mb-8 font-medium">
                Manage your payment information, platform splits, and rental rules.
              </p>
              
              <form onSubmit={handleSaveSettings} className="space-y-6 sm:space-y-8 max-w-3xl">
                <div className="bg-blue-50 border border-blue-100 p-4 sm:p-6 rounded-lg">
                  <label className="block text-sm font-black text-[#003366] uppercase tracking-widest mb-2">Business UPI ID *</label>
                  <p className="text-xs text-[#003366] mb-4">Every payment for your vehicles will be sent directly to this UPI address.</p>
                  <input type="text" required value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="e.g. yourbusiness@sbi or 9876543210@paytm" className="w-full border-2 border-white rounded-lg p-3 sm:p-4 focus:border-[#003366] outline-none text-sm font-bold text-black shadow-sm" />
                </div>

                <div className="bg-green-50 border border-green-200 p-4 sm:p-6 rounded-lg shadow-sm">
                  <label className="flex items-center gap-2 text-sm font-black text-green-800 uppercase tracking-widest mb-2">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.405-.883-.733-1.479-1.639-1.653-1.935-.173-.298-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                    Business WhatsApp Number *
                  </label>
                  <p className="text-xs text-green-700 mb-4 font-medium">All automated booking requests and customer verifications will be sent to this number.</p>
                  <input type="tel" required value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} placeholder="+91" className="w-full border-2 border-white rounded-lg p-3 sm:p-4 focus:border-green-600 outline-none text-sm font-bold text-black shadow-sm" />
                </div>

                {/* --- READ-ONLY COMMISSION RATE DISPLAY --- */}
                <div className="bg-gray-50 border border-gray-200 p-4 sm:p-6 rounded-lg shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <label className="block text-sm font-black text-gray-800 uppercase tracking-widest">Platform Commission (%)</label>
                    <span className="bg-blue-100 text-[#003366] text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">Admin Configured</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-4 font-medium">This is the platform commission rate applied to your confirmed bookings. This rate is managed and set directly by the platform administration.</p>
                  <div className="relative w-full md:w-1/3">
                    <input type="number" value={commissionRate} disabled readOnly className="w-full bg-gray-200 border-2 border-gray-200 rounded-lg p-3 sm:p-4 pl-10 sm:pl-12 text-base sm:text-lg font-black text-gray-600 shadow-inner cursor-not-allowed outline-none" />
                    <span className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 font-black text-gray-500 text-base sm:text-lg">%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Standard Rental Conditions</label>
                  <textarea rows={6} value={termsText} onChange={(e) => setTermsText(e.target.value)} placeholder="- Fuel must be returned at the same level." className="w-full border border-gray-300 rounded-lg p-3 sm:p-4 focus:border-[#003366] outline-none bg-gray-50 focus:bg-white transition text-sm font-bold text-black" />
                </div>
                
                <div className="pt-4 sm:pt-6 border-t border-gray-100">
                  <button type="submit" disabled={isSavingSettings} className="bg-black text-white font-black text-sm uppercase tracking-widest px-6 sm:px-8 py-4 rounded shadow hover:bg-[#003366] transition w-full md:w-auto">
                    {isSavingSettings ? "SAVING..." : "SAVE PROFILE SETTINGS"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {activeTab === "fleet" && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-800 text-white p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <h3 className="font-black text-lg">Your Complete Fleet ({myVehicles.length})</h3>
              <button onClick={() => setDiscountTarget('all')} className="w-full sm:w-auto bg-green-500 hover:bg-green-400 text-white text-xs font-black px-4 py-2 rounded shadow transition flex justify-center items-center gap-2">
                % Apply Global Discount
              </button>
            </div>
            <div className="p-0 overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap min-w-[800px]">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-xs">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 font-bold">Image</th>
                    <th className="px-4 sm:px-6 py-3 font-bold">Vehicle Info</th>
                    <th className="px-4 sm:px-6 py-3 font-bold">Daily Rate</th>
                    <th className="px-4 sm:px-6 py-3 font-bold">Status</th>
                    <th className="px-4 sm:px-6 py-3 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {myVehicles.map((vehicle) => {
                    const finalPrice = calculateDiscountedPrice(vehicle.basePrice, vehicle.discount);
                    const isFeatured = vehicle.featuredUntil && new Date(vehicle.featuredUntil) > new Date();
                    const isFeaturePending = vehicle.featureRequest?.status === "pending";

                    return (
                      <tr key={vehicle.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                        <td className="px-4 sm:px-6 py-4">
                          <div className="w-16 h-12 bg-gray-200 rounded overflow-hidden shadow-sm relative flex-shrink-0">
                            {vehicle.images?.[0] ? <img src={vehicle.images[0]} alt="car" className="w-full h-full object-cover" /> : <div className="text-[8px] flex items-center justify-center h-full text-gray-400">NO IMG</div>}
                            {isFeatured && (
                              <div className="absolute top-0 left-0 bg-yellow-400 text-yellow-900 text-[8px] font-black px-1 py-0.5 rounded-br">★</div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <div className="font-bold text-black whitespace-normal min-w-[150px]">{vehicle.brand} {vehicle.model}</div>
                          <div className="text-xs text-gray-500 font-mono">{vehicle.registration}</div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 flex flex-col">
                          {vehicle.discount && vehicle.discount.value > 0 ? (
                            <>
                              <span className="text-[10px] text-gray-400 line-through font-bold">₹{vehicle.basePrice}</span>
                              <span className="font-black text-green-600 text-base sm:text-lg">
                                ₹{finalPrice} 
                                <span className="ml-1 text-[10px] bg-green-100 text-green-800 px-1.5 py-0.5 rounded">
                                  {vehicle.discount.type === 'percentage' ? `${vehicle.discount.value}% OFF` : `₹${vehicle.discount.value} OFF`}
                                </span>
                              </span>
                            </>
                          ) : (
                            <span className="font-bold text-[#003366] mt-2 text-base">₹{vehicle.basePrice}</span>
                          )}
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${vehicle.status === "Available" ? "bg-green-100 text-green-700" : vehicle.status === "Maintenance" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
                            {vehicle.status}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-right flex justify-end gap-2 flex-wrap max-w-[280px] sm:max-w-[320px] ml-auto">
                          
                          <button 
                            onClick={() => {
                              if (!isFeaturePending) setFeaturingVehicle(vehicle);
                            }} 
                            className={`text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1.5 rounded border transition ${isFeatured ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : isFeaturePending ? 'bg-orange-100 text-orange-800 border-orange-300 cursor-not-allowed' : 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-400 hover:text-yellow-900'}`}
                            disabled={isFeaturePending}
                          >
                            {isFeatured ? '★ Featured' : isFeaturePending ? '⏳ Pending' : '🌟 Feature'}
                          </button>
                          
                          <button onClick={() => setDiscountTarget(vehicle)} className="text-[10px] sm:text-xs font-bold bg-green-50 text-green-700 px-2 sm:px-3 py-1.5 rounded border border-green-200 hover:bg-green-600 hover:text-white transition">% Discount</button>
                          <button onClick={() => setBlockingVehicle(vehicle)} className="text-[10px] sm:text-xs font-bold bg-orange-50 text-orange-700 px-2 sm:px-3 py-1.5 rounded border border-orange-200 hover:bg-orange-100 transition">Block Dates</button>
                          <button onClick={() => setEditingVehicle(vehicle)} className="text-[10px] sm:text-xs font-bold bg-gray-100 text-gray-700 px-2 sm:px-3 py-1.5 rounded border border-gray-200 hover:bg-gray-200 transition">Full Edit</button>
                          <button onClick={() => handleDelete(vehicle.id)} className="text-[10px] sm:text-xs font-bold bg-red-50 text-red-600 px-2 sm:px-3 py-1.5 rounded border border-red-200 hover:bg-red-600 hover:text-white transition">Delete</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* ========================================= */}
      {/* MODAL 1: FULL EDIT VEHICLE */}
      {/* ========================================= */}
      {editingVehicle && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
            <div className="bg-[#003366] text-white p-4 sm:p-5 flex justify-between items-center sticky top-0 z-10 shadow-md">
              <h3 className="font-black text-lg sm:text-xl truncate pr-2">Edit: {editingVehicle.brand} {editingVehicle.model}</h3>
              <button onClick={() => setEditingVehicle(null)} className="text-white hover:text-red-400 font-bold text-2xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-4 sm:p-8 flex flex-col gap-6 sm:gap-8 bg-gray-50">
              <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm flex flex-col gap-4">
                <h4 className="text-base sm:text-lg font-black text-[#003366] border-b border-gray-100 pb-2">1. Basic Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category</label>
                    <select value={editingVehicle.category || "Car"} onChange={(e) => setEditingVehicle({...editingVehicle, category: e.target.value})} className="w-full border border-gray-300 rounded p-2 focus:border-[#003366] outline-none bg-white cursor-pointer font-bold">
                      <option>Car</option><option>Bike</option><option>Scooty</option><option>Truck</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Driver Provision</label>
                    <select value={editingVehicle.driverProvision || "Self-Drive Only (Without Driver)"} onChange={(e) => setEditingVehicle({...editingVehicle, driverProvision: e.target.value})} className="w-full border border-gray-300 rounded p-2 focus:border-[#003366] outline-none bg-white cursor-pointer font-bold">
                      <option>Self-Drive Only (Without Driver)</option><option>Chauffeur Driven Only (With Driver)</option><option>Both Options Available</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Brand</label>
                    <input type="text" value={editingVehicle.brand} onChange={(e) => setEditingVehicle({...editingVehicle, brand: e.target.value})} required className="w-full border border-gray-300 rounded p-2 focus:border-[#003366] outline-none font-bold" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Model</label>
                    <input type="text" value={editingVehicle.model} onChange={(e) => setEditingVehicle({...editingVehicle, model: e.target.value})} required className="w-full border border-gray-300 rounded p-2 focus:border-[#003366] outline-none font-bold" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Registration Number</label>
                    <input type="text" value={editingVehicle.registration} onChange={(e) => setEditingVehicle({...editingVehicle, registration: e.target.value})} required className="w-full border border-gray-300 rounded p-2 focus:border-[#003366] outline-none uppercase font-bold" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#003366] uppercase mb-1">Outlet Location</label>
                    <select value={editingVehicle.outletLocation} onChange={(e) => setEditingVehicle({...editingVehicle, outletLocation: e.target.value})} required className="w-full border-2 border-[#003366] rounded p-2 font-bold text-[#003366] focus:outline-none bg-blue-50 cursor-pointer">
                      {NAGALAND_CITIES.map(city => <option key={city} value={city}>{city}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm flex flex-col gap-4">
                <h4 className="text-base sm:text-lg font-black text-[#003366] border-b border-gray-100 pb-2">2. Pricing Strategy</h4>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Pricing Model</label>
                  <select value={editingVehicle.pricingModel || "per_24h"} onChange={(e) => setEditingVehicle({...editingVehicle, pricingModel: e.target.value})} className="w-full border-2 border-[#003366] rounded p-3 text-black font-bold outline-none bg-blue-50 cursor-pointer">
                    <option value="per_24h">Flat Rate (Per 24 Hours) - Unlimited KM</option>
                    <option value="flat_rate_km_limit">Flat Rate (Per 24 Hours) - With KM Tiers</option>
                    <option value="per_hire">Per Hire (One-Time Flat Fee per Destination)</option>
                    <option value="per_day">Per Calendar Day</option>
                  </select>
                </div>
                {editingVehicle.pricingModel !== "per_hire" && (
                  <div className="bg-gray-50 p-4 border border-gray-200 rounded mt-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Starting Base Price (₹)</label>
                    <input type="number" value={editingVehicle.basePrice} onChange={(e) => setEditingVehicle({...editingVehicle, basePrice: Number(e.target.value)})} required className="w-full md:w-1/2 border border-gray-300 rounded p-2 focus:border-[#003366] outline-none font-bold text-lg text-[#003366]" />
                  </div>
                )}
                {editingVehicle.pricingModel === "per_hire" && (
                  <div className="bg-white p-4 border border-blue-200 rounded-lg shadow-sm mt-4">
                    <h4 className="font-black text-[#003366] text-sm mb-4">Destination Pricing</h4>
                    <div className="flex flex-col gap-3">
                      {(editingVehicle.destinations && editingVehicle.destinations.length > 0 ? editingVehicle.destinations : [{city: "", price: ""}]).map((dest, index) => (
                        <div key={index} className="flex flex-col sm:flex-row items-end gap-3 bg-white p-3 rounded border border-blue-100">
                          <div className="w-full"><label className="block text-[10px] font-bold text-blue-800 uppercase mb-1">End Destination</label><select required value={dest.city} onChange={(e) => handleEditDestChange(index, 'city', e.target.value)} className="w-full border border-blue-200 rounded p-2 text-sm font-bold bg-white"><option value="">- Select City -</option>{NAGALAND_CITIES.filter(c => c !== editingVehicle.outletLocation).map(city => <option key={city} value={city}>{editingVehicle.outletLocation} to {city}</option>)}</select></div>
                          <div className="w-full"><label className="block text-[10px] font-bold text-blue-800 uppercase mb-1">Price (₹)</label><input type="number" required value={dest.price} onChange={(e) => handleEditDestChange(index, 'price', e.target.value)} className="w-full border border-blue-200 rounded p-2 text-sm font-bold" /></div>
                          {((editingVehicle.destinations && editingVehicle.destinations.length > 0 ? editingVehicle.destinations : [{city: "", price: ""}]).length) > 1 && <button type="button" onClick={() => removeEditDest(index)} className="w-full sm:w-auto bg-red-100 text-red-600 p-2.5 rounded hover:bg-red-600 hover:text-white transition">X</button>}
                        </div>
                      ))}
                      <button type="button" onClick={addEditDest} className="mt-2 text-xs font-bold text-[#003366] border border-[#003366] bg-white px-4 py-2 rounded w-max hover:bg-blue-50">+ Add Destination</button>
                    </div>
                  </div>
                )}
                {editingVehicle.pricingModel === "flat_rate_km_limit" && (
                  <div className="bg-white p-4 border border-blue-200 rounded-lg shadow-sm mt-4">
                    <h4 className="font-black text-[#003366] text-sm mb-4">Distance Limits & Pricing Tiers</h4>
                    <div className="flex flex-col gap-3">
                      {(editingVehicle.kmTiers && editingVehicle.kmTiers.length > 0 ? editingVehicle.kmTiers : [{km: "", price: ""}]).map((tier, index) => (
                        <div key={index} className="flex flex-col sm:flex-row items-end gap-3 bg-white p-3 rounded border border-blue-100">
                          <div className="w-full"><label className="block text-[10px] font-bold text-blue-800 uppercase mb-1">Up to distance (KM)</label><input type="number" required value={tier.km} onChange={(e) => handleEditKmTierChange(index, 'km', e.target.value)} className="w-full border border-blue-200 rounded p-2 focus:border-[#003366] outline-none text-sm font-bold" /></div>
                          <div className="w-full"><label className="block text-[10px] font-bold text-blue-800 uppercase mb-1">Total Price (₹)</label><input type="number" required value={tier.price} onChange={(e) => handleEditKmTierChange(index, 'price', e.target.value)} className="w-full border border-blue-200 rounded p-2 focus:border-[#003366] outline-none text-sm font-bold" /></div>
                          {((editingVehicle.kmTiers && editingVehicle.kmTiers.length > 0 ? editingVehicle.kmTiers : [{km: "", price: ""}]).length) > 1 && <button type="button" onClick={() => removeEditKmTier(index)} className="w-full sm:w-auto bg-red-100 text-red-600 p-2.5 rounded hover:bg-red-600 hover:text-white transition">X</button>}
                        </div>
                      ))}
                      <button type="button" onClick={addEditKmTier} className="mt-2 text-xs font-bold text-[#003366] border border-[#003366] bg-white px-4 py-2 rounded w-max hover:bg-blue-50">+ Add Distance Tier</button>
                    </div>
                  </div>
                )}
              </div>
              <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm flex flex-col gap-4">
                <h4 className="text-base sm:text-lg font-black text-[#003366] border-b border-gray-100 pb-2">3. Visibility & Status</h4>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Update Vehicle Status</label>
                  <select value={editingVehicle.status} onChange={(e) => setEditingVehicle({...editingVehicle, status: e.target.value})} className="w-full border-2 border-gray-300 rounded-lg p-3 font-bold text-black focus:border-[#003366] outline-none cursor-pointer">
                    <option value="Available">Available (Live on website)</option>
                    <option value="Maintenance">Maintenance (Hidden from searches)</option>
                    <option value="Rented">Currently Rented</option>
                  </select>
                </div>
              </div>
              <div className="text-[10px] font-bold text-center text-gray-400">Note: To update the vehicle images, please delete this listing and add it as a new vehicle.</div>
              <button type="submit" className="w-full bg-[#003366] text-white font-black text-lg py-4 rounded-lg hover:bg-black transition shadow-lg sticky bottom-4 z-20 border-2 border-white">SAVE ALL CHANGES</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: BLOCK DATES & TIMES */}
      {blockingVehicle && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-orange-500 text-white p-4 flex justify-between items-center">
              <h3 className="font-black text-lg truncate pr-2">Block: {blockingVehicle.model}</h3>
              <button onClick={() => setBlockingVehicle(null)} className="text-white hover:text-black font-bold text-xl">&times;</button>
            </div>
            <div className="p-4 sm:p-6 flex flex-col gap-6">
              <form onSubmit={handleSaveBlockedDates} className="flex flex-col gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex flex-col gap-4">
                  <div><label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Start Date & Time</label><input type="datetime-local" required value={blockStart} onChange={(e) => setBlockStart(e.target.value)} className="w-full border border-gray-300 rounded p-2 text-sm font-bold" /></div>
                  <div><label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">End Date & Time</label><input type="datetime-local" required value={blockEnd} onChange={(e) => setBlockEnd(e.target.value)} className="w-full border border-gray-300 rounded p-2 text-sm font-bold" /></div>
                </div>
                <button type="submit" className="w-full bg-orange-500 text-white font-bold py-2 rounded hover:bg-orange-600 transition text-sm mt-2">+ Add to Blocked List</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: DISCOUNTS CONTROLLER */}
      {discountTarget && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-green-600 text-white p-4 flex justify-between items-center">
              <h3 className="font-black text-lg truncate pr-2">{discountTarget === 'all' ? 'Apply Global Discount' : `Discount: ${discountTarget.model}`}</h3>
              <button onClick={() => setDiscountTarget(null)} className="text-white hover:text-black font-bold text-xl">&times;</button>
            </div>
            <form onSubmit={handleSaveDiscount} className="p-4 sm:p-6 flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="w-full sm:w-1/2">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Discount Type</label>
                  <select value={discountType} onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'flat')} className="w-full border-2 border-gray-200 rounded-lg p-3 font-bold text-black outline-none focus:border-green-600 cursor-pointer">
                    <option value="percentage">Percentage (%)</option><option value="flat">Flat Amount (₹)</option>
                  </select>
                </div>
                <div className="w-full sm:w-1/2">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Discount Value</label>
                  <input type="number" placeholder="e.g. 15" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} className="w-full border-2 border-gray-200 rounded-lg p-3 font-bold text-black outline-none focus:border-green-600" />
                </div>
              </div>
              <button type="submit" className="w-full bg-green-600 text-white font-black py-3 rounded-lg hover:bg-green-700 transition shadow-lg">ACTIVATE DISCOUNT</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: FEATURE CONFIGURATION & DAYS SELECTION */}
      {featuringVehicle && !showAdminPaymentModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-yellow-400 text-yellow-900 p-4 flex justify-between items-center">
              <h3 className="font-black text-lg truncate pr-2">Feature: {featuringVehicle.model}</h3>
              <button onClick={() => setFeaturingVehicle(null)} className="text-yellow-900 hover:text-black font-bold text-xl">&times;</button>
            </div>
            <div className="p-4 sm:p-6 flex flex-col gap-6">
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <p className="text-sm font-bold text-yellow-800 mb-2">Push your car to the Homepage!</p>
                <p className="text-xs text-yellow-700">Featured vehicles get up to 5x more bookings by appearing on the front page. Admin charge: <span className="font-black">₹{FEATURE_RATE_PER_DAY} per day</span>.</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">How many days?</label>
                <select value={featureDays} onChange={(e) => setFeatureDays(Number(e.target.value))} className="w-full border-2 border-gray-200 rounded-lg p-3 sm:p-4 font-black text-black outline-none focus:border-yellow-400 cursor-pointer">
                  {[...Array(30)].map((_, i) => <option key={i+1} value={i+1}>{i+1} Day{i+1 > 1 ? 's' : ''}</option>)}
                </select>
              </div>
              <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg border border-gray-200">
                <span className="text-sm font-bold text-gray-600 uppercase tracking-widest">Total Cost:</span>
                <span className="text-2xl sm:text-3xl font-black text-black">₹{featureDays * FEATURE_RATE_PER_DAY}</span>
              </div>
              <button onClick={() => setShowAdminPaymentModal(true)} className="w-full bg-black text-yellow-400 font-black tracking-wider py-4 rounded-lg hover:bg-gray-800 transition shadow-lg flex items-center justify-center gap-2">
                PROCEED TO PAY ₹{featureDays * FEATURE_RATE_PER_DAY}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: ADMIN PAYMENT (UPI DEEP LINK) & UPLOAD */}
      {featuringVehicle && showAdminPaymentModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white p-5 sm:p-8 rounded-2xl shadow-2xl w-full max-w-md flex flex-col items-center relative">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mb-4 sm:mb-6">
              <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path></svg>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-black mb-2 text-center leading-tight">Pay Platform Admin</h2>
            <p className="text-gray-500 text-xs sm:text-sm mb-4 sm:mb-6 text-center font-medium px-2 sm:px-4">Pay securely via UPI, then upload a screenshot of your successful transaction.</p>
            <div className="text-4xl sm:text-5xl font-black text-black mb-6 sm:mb-8 border-b-2 border-gray-100 pb-6 sm:pb-8 w-full text-center">₹{featureDays * FEATURE_RATE_PER_DAY}</div>
            
            <a href={`upi://pay?pa=${ADMIN_UPI_ID}&pn=${encodeURIComponent(ADMIN_NAME)}&am=${featureDays * FEATURE_RATE_PER_DAY}&cu=INR`} className="w-full bg-[#003366] text-white font-black text-base sm:text-lg tracking-wide py-3 sm:py-4 rounded-xl hover:bg-black transition shadow-lg flex items-center justify-center gap-2 sm:gap-3 mb-4">
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
              PAY VIA UPI APP
            </a>

            <div className="w-full flex items-center gap-4 my-2 sm:my-4">
              <div className="h-px bg-gray-200 flex-grow"></div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">OR COPY UPI ID</span>
              <div className="h-px bg-gray-200 flex-grow"></div>
            </div>

            <div className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl p-3 sm:p-4 flex justify-between items-center mb-4 sm:mb-6">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Admin UPI ID</p>
                <p className="font-bold text-black text-base sm:text-lg">{ADMIN_UPI_ID}</p>
              </div>
              <button onClick={handleCopyAdminUpi} className={`${copiedAdminUpi ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'} text-[10px] sm:text-xs font-black uppercase tracking-widest px-3 sm:px-4 py-2 sm:py-2.5 rounded transition shadow-sm`}>
                {copiedAdminUpi ? "COPIED!" : "COPY"}
              </button>
            </div>

            <div className="w-full mb-4 sm:mb-6">
              <label className="block text-xs font-black text-[#003366] uppercase mb-2">Upload Payment Screenshot *</label>
              <input type="file" accept="image/*" onChange={(e) => setFeatureScreenshot(e.target.files ? e.target.files[0] : null)} className="w-full text-xs sm:text-sm font-bold border-2 border-blue-200 bg-blue-50 rounded-lg p-2 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-[10px] sm:file:text-xs file:font-bold file:bg-[#003366] file:text-white hover:file:bg-black cursor-pointer transition" />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full mt-2">
              <button onClick={() => { setShowAdminPaymentModal(false); setFeaturingVehicle(null); setFeatureScreenshot(null); }} className="w-full sm:w-1/3 bg-white border-2 border-gray-200 text-gray-500 font-bold py-3 sm:py-3.5 rounded-xl hover:bg-gray-50 transition" disabled={isSubmittingFeature}>Cancel</button>
              <button onClick={handleFeatureSubmit} disabled={!featureScreenshot || isSubmittingFeature} className={`w-full sm:w-2/3 text-white font-black py-3 sm:py-3.5 rounded-xl transition shadow-md flex items-center justify-center gap-2 ${!featureScreenshot || isSubmittingFeature ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600'}`}>
                {isSubmittingFeature ? (<><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>UPLOADING...</>) : ("SUBMIT FOR APPROVAL")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* CUSTOMER BOOKING VERIFICATION MODAL */}
      {/* ========================================= */}
      {verifyingBooking && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden relative">
            <div className="bg-[#003366] text-white p-4 sm:p-5 flex justify-between items-center">
              <h3 className="font-black text-base sm:text-lg uppercase tracking-widest">Verify Booking</h3>
              <button onClick={() => setVerifyingBooking(null)} className="text-gray-400 hover:text-white font-bold text-xl sm:text-2xl">&times;</button>
            </div>
            
            <div className="p-4 sm:p-8 flex flex-col gap-4 sm:gap-6">
              
              <div className="flex items-center gap-3 sm:gap-4 bg-gray-50 p-3 sm:p-4 rounded-lg border border-gray-200">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#003366] text-white rounded-full flex items-center justify-center text-lg sm:text-xl font-black uppercase flex-shrink-0">
                  {verifyingBooking.customerName[0]}
                </div>
                <div className="truncate w-full">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-0.5">Customer Profile</p>
                  <p className="font-bold text-black text-sm sm:text-base truncate">{verifyingBooking.customerName}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="bg-gray-50 p-3 sm:p-0 sm:bg-transparent rounded sm:rounded-none">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Vehicle</p>
                  <p className="font-bold text-black text-sm">{verifyingBooking.vehicleName}</p>
                </div>
                <div className="bg-gray-50 p-3 sm:p-0 sm:bg-transparent rounded sm:rounded-none">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Paid</p>
                  <p className="font-black text-[#003366] text-base sm:text-lg">₹{verifyingBooking.totalPaid.toLocaleString()}</p>
                </div>
                <div className="bg-gray-50 p-3 sm:p-0 sm:bg-transparent rounded sm:rounded-none">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Pickup Date</p>
                  <p className="font-bold text-black text-xs sm:text-sm">{formatDate(verifyingBooking.pickupDate)}</p>
                </div>
                <div className="bg-gray-50 p-3 sm:p-0 sm:bg-transparent rounded sm:rounded-none">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Drop-off Date</p>
                  <p className="font-bold text-black text-xs sm:text-sm">{formatDate(verifyingBooking.dropoffDate)}</p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 p-3 sm:p-4 rounded-lg">
                <p className="text-[10px] font-black text-[#003366] uppercase tracking-widest mb-2">Trip Extras</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {verifyingBooking.addons?.driver && <span className="bg-white text-[10px] font-bold px-2 py-1 rounded border border-blue-200 text-[#003366]">Driver Requested</span>}
                  {verifyingBooking.addons?.delivery && <span className="bg-white text-[10px] font-bold px-2 py-1 rounded border border-blue-200 text-[#003366]">Home Delivery</span>}
                  {verifyingBooking.addons?.homePickup && <span className="bg-white text-[10px] font-bold px-2 py-1 rounded border border-blue-200 text-[#003366]">Home Pickup</span>}
                  {!verifyingBooking.addons?.driver && !verifyingBooking.addons?.delivery && !verifyingBooking.addons?.homePickup && <span className="text-xs text-gray-500 font-bold">No add-ons selected</span>}
                </div>
                {verifyingBooking.specialRemarks && (
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Special Instructions:</p>
                    <p className="text-xs sm:text-sm font-bold text-gray-700 italic">"{verifyingBooking.specialRemarks}"</p>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer Uploaded Receipt</p>
                <a 
                  href={verifyingBooking.paymentReceiptUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full bg-gray-100 text-gray-600 border border-gray-200 font-bold text-xs sm:text-sm uppercase tracking-widest py-3 rounded-lg hover:bg-gray-200 hover:text-black transition text-center flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                  View Payment Screenshot
                </a>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full mt-2 pt-4 border-t border-gray-100">
                <button 
                  onClick={() => openRejectModal(verifyingBooking, "booking")} 
                  className="w-full sm:w-1/3 bg-white border-2 border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 font-bold py-3 sm:py-3.5 rounded-xl transition"
                  disabled={isSubmittingVerify}
                >
                  Reject
                </button>
                <button 
                  onClick={handleConfirmBooking} 
                  disabled={isSubmittingVerify}
                  className={`w-full sm:w-2/3 text-white font-black py-3 sm:py-3.5 rounded-xl transition shadow-md ${isSubmittingVerify ? 'bg-green-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600'}`}
                >
                  {isSubmittingVerify ? "CONFIRMING..." : "CONFIRM BOOKING"}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* THE REJECTION REMARK MODAL */}
      {/* ========================================= */}
      {showRejectModal && actionBooking && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative">
            <div className="bg-gray-900 text-white p-4 sm:p-5 flex justify-between items-center">
              <h3 className="font-black text-base sm:text-lg uppercase tracking-widest">Reject Request</h3>
              <button onClick={() => setShowRejectModal(false)} className="text-gray-400 hover:text-white font-bold text-xl sm:text-2xl">&times;</button>
            </div>
            
            <div className="p-4 sm:p-8 flex flex-col gap-4 sm:gap-6">
              <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
                <p className="text-xs sm:text-sm font-bold text-orange-900">
                  You are rejecting the <span className="font-black">{rejectType === 'cancel' ? 'Cancellation' : rejectType === 'change' ? 'Date Change' : 'New Booking'}</span> request for the {actionBooking.vehicleName}.
                </p>
              </div>

              <div>
                <label className="block text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Reason for Rejection (Required) *</label>
                <textarea 
                  rows={4}
                  required
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder={rejectType === 'booking' ? "e.g. Sorry, the payment screenshot is not valid." : "e.g. Sorry, we cannot accept this change as the car is already booked by someone else on those new dates."}
                  className="w-full border-2 border-gray-200 rounded-lg p-3 sm:p-4 text-sm font-bold text-black focus:border-gray-900 outline-none transition bg-gray-50 focus:bg-white"
                />
              </div>

              <button 
                onClick={handleRejectSubmit} 
                disabled={!rejectReason || isSubmittingReject}
                className={`w-full text-white font-black text-xs sm:text-sm uppercase tracking-widest py-3 sm:py-4 rounded-xl transition shadow-md ${!rejectReason || isSubmittingReject ? 'bg-gray-300 cursor-not-allowed' : 'bg-gray-900 hover:bg-black'}`}
              >
                {isSubmittingReject ? "SENDING..." : "CONFIRM REJECTION"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function StatCard({ title, value, subtitle, highlight = false, onClick, isActive = false }: { title: string, value: string, subtitle: string, highlight?: boolean, onClick?: () => void, isActive?: boolean }) {
  const baseStyle = "p-4 sm:p-6 rounded-lg border shadow-sm flex flex-col cursor-pointer transition transform hover:-translate-y-1";
  let colorStyle = highlight ? (isActive ? "bg-red-50 border-red-400" : "bg-white border-gray-200 hover:border-red-400") : (isActive ? "bg-blue-50 border-[#003366]" : "bg-white border-gray-200 hover:border-[#003366]");
  return (
    <div className={`${baseStyle} ${colorStyle}`} onClick={onClick}>
      <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{title}</span>
      <span className={`text-2xl sm:text-3xl font-black ${highlight ? 'text-red-600' : 'text-[#003366]'} mb-1`}>{value}</span>
      <span className="text-[10px] sm:text-xs text-gray-400">{subtitle}</span>
    </div>
  );
}