"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { db } from "../firebase/config"; 
import { collection, query, where, getDocs } from "firebase/firestore";

// The shape of our live Firebase data 
interface Vehicle {
  id: string;
  brand: string;
  model: string;
  basePrice: number;
  outletLocation: string;
  vendorId: string;
  images: string[];
  type?: string; 
  category?: string; 
  pricingModel?: string; 
  driverProvision?: string;
  discount?: { type: 'percentage' | 'flat'; value: number } | null;
  blockedDates?: { start: string; end: string }[]; 
}

// 1. THE MAIN CATALOG COMPONENT
function TwoWheelersContent() {
  const searchParams = useSearchParams();
  const searchCity = searchParams?.get("city") || "";
  const searchPickup = searchParams?.get("pickup") || "";
  const searchDropoff = searchParams?.get("dropoff") || searchParams?.get("return") || "";

  // --- FIREBASE STATES ---
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // --- QUICK VIEW MODAL STATE ---
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  // --- FETCH LIVE TWO WHEELERS FROM DATABASE ---
  useEffect(() => {
    const fetchLiveVehicles = async () => {
      setIsLoading(true);
      try {
        // MAGIC QUERY: Fetches BOTH Bikes and Scootys!
        const q = query(
          collection(db, "vehicles"),
          where("category", "in", ["Bike", "Scooty"]),
          where("status", "==", "Available")
        );
        
        const querySnapshot = await getDocs(q);
        let liveVehicles: Vehicle[] = [];
        querySnapshot.forEach((doc) => {
          liveVehicles.push({ id: doc.id, ...doc.data() } as Vehicle);
        });

        // --- FILTER 1: BY CITY ---
        if (searchCity && searchCity !== "") {
          liveVehicles = liveVehicles.filter(v => v.outletLocation.toLowerCase() === searchCity.toLowerCase());
        }

        // --- FILTER 2: PREVENT DOUBLE BOOKING (BLOCKED DATES) ---
        if (searchPickup && searchDropoff) {
          const sStart = new Date(searchPickup).getTime();
          const sEnd = new Date(searchDropoff).getTime();

          liveVehicles = liveVehicles.filter(v => {
            if (!v.blockedDates || v.blockedDates.length === 0) return true;

            const hasOverlap = v.blockedDates.some(block => {
              const bStart = new Date(block.start).getTime();
              const bEnd = new Date(block.end).getTime();
              return sStart <= bEnd && sEnd >= bStart;
            });

            return !hasOverlap;
          });
        }
        
        setVehicles(liveVehicles);
      } catch (error) {
        console.error("Error fetching live two wheelers:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLiveVehicles();
  }, [searchCity, searchPickup, searchDropoff]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col w-full relative">
      
      {/* Dynamic Header */}
      <div className="max-w-7xl mx-auto w-full px-2 md:px-6 pt-8 md:pt-12 mb-2 md:mb-6">
        <h1 className="text-2xl md:text-4xl font-black text-[#003366] uppercase mb-2 px-2 md:px-0">
          {searchCity ? `Two Wheelers in ${searchCity}` : "All Premium Two Wheelers"}
        </h1>
        {searchPickup && searchDropoff && (
          <div className="bg-blue-50 border border-blue-100 px-3 md:px-4 py-1.5 md:py-2 mx-2 md:mx-0 rounded-lg inline-flex items-center gap-3 md:gap-4 text-[10px] md:text-xs font-bold text-[#003366] mt-2">
            <span>📅 Search Active</span>
            <a href="/bikes" className="text-red-500 hover:text-red-700 border-l border-blue-200 pl-3 md:pl-4 transition">Clear &times;</a>
          </div>
        )}
      </div>

      <main className="flex-grow max-w-7xl mx-auto w-full px-2 md:px-6 pb-12 md:pb-16">
        {/* Loading State */}
        {isLoading ? (
          <div className="w-full py-20 flex flex-col items-center justify-center gap-4">
             <div className="w-10 h-10 border-4 border-gray-200 border-t-[#003366] rounded-full animate-spin"></div>
             <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Loading live fleet...</p>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="bg-gray-100 p-6 md:p-8 text-center rounded-lg border-2 border-dashed border-gray-300 mx-2 md:mx-0 mt-4">
            <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-2">No two wheelers found!</h3>
            <p className="text-gray-500 text-xs md:text-sm max-w-md mx-auto">
              Sorry, we currently do not have any bikes or scootys available for those dates in {searchCity || "this area"}. Try changing your dates or location!
            </p>
            <a href="/bikes" className="mt-4 inline-block text-white bg-[#003366] px-6 py-3 rounded text-xs md:text-sm font-bold hover:bg-black transition shadow-sm">
              View All Two Wheelers
            </a>
          </div>
        ) : (
          /* --- THE MAGIC MOBILE 3-COL GRID --- */
          <div className="grid grid-cols-3 md:grid-cols-4 gap-2 md:gap-8 mt-4 md:mt-6">
            {vehicles.map((vehicle) => (
              <TwoWheelerCard 
                key={vehicle.id} 
                vehicle={vehicle} 
                searchPickup={searchPickup} 
                searchDropoff={searchDropoff} 
                onOpenDetails={() => setSelectedVehicle(vehicle)} // Triggers the modal
              />
            ))}
          </div>
        )}
      </main>

      {/* --- THE GRAND QUICK VIEW MODAL --- */}
      {selectedVehicle && (
        <VehicleDetailsModal 
          vehicle={selectedVehicle} 
          searchPickup={searchPickup} 
          searchDropoff={searchDropoff} 
          onClose={() => setSelectedVehicle(null)} 
        />
      )}

    </div>
  );
}

// -----------------------------------------
// REUSABLE COMPONENT: MOBILE MICRO-CARD
// -----------------------------------------
function TwoWheelerCard({ vehicle, searchPickup, searchDropoff, onOpenDetails }: { vehicle: Vehicle, searchPickup: string, searchDropoff: string, onOpenDetails: () => void }) {
  const [imgIndex, setImgIndex] = useState(0);

  const calculateDiscountedPrice = (basePrice: number, discount?: { type: string, value: number } | null) => {
    if (!discount) return basePrice;
    if (discount.type === 'flat') return Math.max(0, basePrice - discount.value);
    if (discount.type === 'percentage') return Math.max(0, basePrice - (basePrice * (discount.value / 100)));
    return basePrice;
  };

  const finalPrice = calculateDiscountedPrice(vehicle.basePrice, vehicle.discount);

  // --- DYNAMIC PRICING LABEL LOGIC ---
  let priceLabel = "Per 24 Hours";
  if (vehicle.pricingModel === "per_day") priceLabel = "Per Day";
  else if (vehicle.pricingModel === "flat_rate_km_limit") priceLabel = "Per 24h (KM Limit)";
  else if (vehicle.pricingModel === "per_hire") priceLabel = "Per Hire (Flat)";
  else if (vehicle.pricingModel === "per_hour") priceLabel = "Per Hour";

  const nextImg = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault(); 
    if (vehicle.images && vehicle.images.length > 0) {
      setImgIndex((prev) => (prev + 1) % vehicle.images.length);
    }
  };

  const prevImg = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (vehicle.images && vehicle.images.length > 0) {
      setImgIndex((prev) => (prev === 0 ? vehicle.images.length - 1 : prev - 1));
    }
  };

  return (
    <div className="bg-white rounded-lg md:rounded-xl border border-gray-200 overflow-hidden hover:shadow-xl transition duration-300 group flex flex-col cursor-pointer" onClick={onOpenDetails}>
      
      <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
        {vehicle.images && vehicle.images.length > 0 ? (
          <>
            <img 
              src={vehicle.images[imgIndex]} 
              alt={`${vehicle.model} - Image ${imgIndex + 1}`} 
              className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105" 
            />

            {/* Quick View Hover Overlay */}
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none z-10">
               <span className="bg-black/70 text-white text-[10px] md:text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-sm tracking-widest uppercase">Click to view</span>
            </div>
            
            {vehicle.images.length > 1 && (
              <>
                <button 
                  onClick={prevImg} 
                  className="absolute left-1 md:left-2 top-1/2 -translate-y-1/2 w-4 h-4 md:w-8 md:h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black transition opacity-0 group-hover:opacity-100 backdrop-blur-sm text-[8px] md:text-sm z-20"
                >
                  &#10094;
                </button>
                <button 
                  onClick={nextImg} 
                  className="absolute right-1 md:right-2 top-1/2 -translate-y-1/2 w-4 h-4 md:w-8 md:h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black transition opacity-0 group-hover:opacity-100 backdrop-blur-sm text-[8px] md:text-sm z-20"
                >
                  &#10095;
                </button>
                <div className="absolute bottom-1 right-1 md:bottom-2 md:right-2 bg-black/60 text-white text-[8px] md:text-[10px] font-bold px-1.5 py-0.5 md:px-2 md:py-1 rounded backdrop-blur-sm z-20">
                  {imgIndex + 1} / {vehicle.images.length}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[8px] md:text-xs font-bold text-gray-400">NO IMG</div>
        )}
        
        {vehicle.discount && vehicle.discount.value > 0 && (
          <div className="absolute top-1 left-1 md:top-4 md:left-4 bg-black text-white text-[8px] md:text-[10px] font-black px-1.5 py-0.5 md:px-3 md:py-1.5 uppercase tracking-widest rounded shadow-md z-20">
            {vehicle.discount.type === 'percentage' ? `${vehicle.discount.value}% OFF` : `₹${vehicle.discount.value} OFF`}
          </div>
        )}
      </div>

      <div className="p-2 md:p-6 flex flex-col flex-grow">
        
        <div className="flex flex-col mb-2 md:mb-4">
          <div className="hidden md:flex justify-between items-start mb-2">
            <div className="text-xs font-bold text-[#003366] uppercase tracking-wider">{vehicle.category}</div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">📍 {vehicle.outletLocation}</div>
          </div>
          
          <h3 className="text-[10px] md:text-xl font-black text-black leading-tight md:mt-1 truncate">
            {vehicle.brand} {vehicle.model}
          </h3>
          
          <div className="md:hidden text-[8px] font-bold text-gray-400 uppercase tracking-widest truncate mt-0.5">
            📍 {vehicle.outletLocation}
          </div>
        </div>

        <div className="mt-auto pt-2 md:pt-6 border-t border-gray-100 flex flex-col md:flex-row items-start md:items-end justify-between gap-1 md:gap-0">
          <div className="flex flex-col w-full md:w-auto">
            <p className="text-[7px] leading-tight md:text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-0.5">{priceLabel}</p>
            <div className="flex items-end gap-1 md:gap-2">
              <span className="text-sm md:text-2xl font-black text-[#003366] leading-none">₹{finalPrice}</span>
            </div>
            {vehicle.discount && vehicle.discount.value > 0 && (
              <span className="hidden md:block text-xs text-gray-400 line-through font-bold mt-1">₹{vehicle.basePrice}</span>
            )}
          </div>

          <a 
            href={`/book?car=${encodeURIComponent(vehicle.brand + " " + vehicle.model)}&price=${finalPrice}&city=${encodeURIComponent(vehicle.outletLocation)}&pickup=${searchPickup}&dropoff=${searchDropoff}`}
            onClick={(e) => e.stopPropagation()} // Prevents opening modal when clicking Book
            className="w-full md:w-auto text-center bg-[#003366] text-white text-[8px] md:text-xs font-black uppercase tracking-widest px-2 py-1.5 md:px-6 md:py-3 rounded hover:bg-black transition shadow-md mt-1 md:mt-0"
          >
            Book
          </a>
        </div>

      </div>
    </div>
  );
}

// -----------------------------------------
// REUSABLE COMPONENT: QUICK VIEW MODAL
// -----------------------------------------
function VehicleDetailsModal({ vehicle, searchPickup, searchDropoff, onClose }: { vehicle: Vehicle, searchPickup: string, searchDropoff: string, onClose: () => void }) {
  const [imgIndex, setImgIndex] = useState(0);

  const calculateDiscountedPrice = (basePrice: number, discount?: { type: string, value: number } | null) => {
    if (!discount) return basePrice;
    if (discount.type === 'flat') return Math.max(0, basePrice - discount.value);
    if (discount.type === 'percentage') return Math.max(0, basePrice - (basePrice * (discount.value / 100)));
    return basePrice;
  };

  const finalPrice = calculateDiscountedPrice(vehicle.basePrice, vehicle.discount);

  let priceLabel = "Per 24 Hours";
  if (vehicle.pricingModel === "per_day") priceLabel = "Per Day";
  else if (vehicle.pricingModel === "flat_rate_km_limit") priceLabel = "Per 24h (KM Limit)";
  else if (vehicle.pricingModel === "per_hire") priceLabel = "Per Hire (Flat)";
  else if (vehicle.pricingModel === "per_hour") priceLabel = "Per Hour";

  const smartBookLink = `/book?car=${encodeURIComponent(vehicle.brand + " " + vehicle.model)}&price=${finalPrice}&pickup=${searchPickup}&dropoff=${searchDropoff}&city=${encodeURIComponent(vehicle.outletLocation)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
      
      {/* Modal Container */}
      <div className="bg-white w-full h-full md:h-auto md:max-h-[90vh] md:max-w-5xl md:rounded-2xl overflow-hidden flex flex-col md:flex-row relative shadow-2xl">
        
        {/* Close Button */}
        <button onClick={onClose} className="absolute top-4 right-4 z-50 bg-black/50 hover:bg-black text-white w-10 h-10 rounded-full flex items-center justify-center transition backdrop-blur-sm">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>

        {/* LEFT: BIG IMAGE SLIDER */}
        <div className="w-full md:w-3/5 bg-gray-100 relative h-[40vh] md:h-auto flex-shrink-0">
          {vehicle.images && vehicle.images.length > 0 ? (
            <>
              <img src={vehicle.images[imgIndex]} alt={vehicle.model} className="w-full h-full object-contain md:object-cover bg-black" />
              {vehicle.images.length > 1 && (
                <>
                  <button onClick={() => setImgIndex(prev => prev === 0 ? vehicle.images.length - 1 : prev - 1)} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white text-black rounded-full flex items-center justify-center transition backdrop-blur-md shadow-lg">
                    &#10094;
                  </button>
                  <button onClick={() => setImgIndex(prev => (prev + 1) % vehicle.images.length)} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white text-black rounded-full flex items-center justify-center transition backdrop-blur-md shadow-lg">
                    &#10095;
                  </button>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-sm tracking-widest">
                    {imgIndex + 1} / {vehicle.images.length}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold tracking-widest">NO IMAGE AVAILABLE</div>
          )}
        </div>

        {/* RIGHT: DETAILS & CHECKOUT */}
        <div className="w-full md:w-2/5 p-6 md:p-10 flex flex-col overflow-y-auto">
          
          <div className="mb-6 border-b border-gray-100 pb-6 mt-4 md:mt-0">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-black text-[#003366] uppercase tracking-widest bg-blue-50 px-2.5 py-1 rounded">{vehicle.category || "Two Wheeler"}</span>
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1">📍 {vehicle.outletLocation}</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-black leading-tight mt-3">{vehicle.brand} {vehicle.model}</h2>
          </div>

          <div className="flex flex-col gap-4 mb-8">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Pricing Rule</span>
              <span className="font-bold text-black text-sm">{priceLabel}</span>
            </div>
            {vehicle.driverProvision && (
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Rider Provision</span>
                <span className="font-bold text-black text-sm">{vehicle.driverProvision}</span>
              </div>
            )}
          </div>

          <div className="mt-auto border-t border-gray-200 pt-6">
            <div className="flex justify-between items-end mb-6">
              <div>
                <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Rental Price</span>
                {vehicle.discount && vehicle.discount.value > 0 && (
                  <span className="text-sm text-gray-400 line-through font-bold block mb-1">₹{vehicle.basePrice}</span>
                )}
                <span className="text-4xl font-black text-[#003366] leading-none">₹{finalPrice}</span>
              </div>
            </div>

            <a 
              href={smartBookLink}
              className="w-full block text-center bg-[#0a0a0a] text-white font-black text-lg uppercase tracking-widest py-4 rounded-xl hover:bg-[#003366] transition shadow-xl"
            >
              PROCEED TO BOOK
            </a>
          </div>

        </div>

      </div>
    </div>
  );
}

// 2. NEXT.JS REQUIREMENT: Wrap the URL reader in a Suspense boundary
export default function TwoWheelersPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-[#003366] rounded-full animate-spin"></div>
      </div>
    }>
      <TwoWheelersContent />
    </Suspense>
  );
}