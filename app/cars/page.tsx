"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { db } from "../firebase/config"; 
import { collection, query, where, getDocs } from "firebase/firestore";

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  basePrice: number;
  outletLocation: string;
  images: string[];
  category?: string;
  pricingModel?: string; // Added to read the exact pricing rule
  driverProvision?: string;
  discount?: { type: 'percentage' | 'flat'; value: number } | null;
  blockedDates?: { start: string; end: string }[]; 
}

function CarsContent() {
  const searchParams = useSearchParams();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // --- QUICK VIEW MODAL STATE ---
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  // Catch the data sent from the Homepage search bar
  const searchCity = searchParams.get("city") || "";
  const searchPickup = searchParams.get("pickup") || "";
  const searchDropoff = searchParams.get("dropoff") || "";

  // --- FETCH LIVE CARS FROM FIREBASE ---
  useEffect(() => {
    const fetchLiveCars = async () => {
      setIsLoading(true);
      try {
        const q = query(
          collection(db, "vehicles"), 
          where("category", "==", "Car"),
          where("status", "==", "Available")
        );
        
        const querySnapshot = await getDocs(q);
        let liveCars: Vehicle[] = [];
        querySnapshot.forEach((doc) => {
          liveCars.push({ id: doc.id, ...doc.data() } as Vehicle);
        });

        // --- FILTER 1: BY CITY ---
        if (searchCity && searchCity !== "") {
          liveCars = liveCars.filter(car => car.outletLocation === searchCity);
        }

        // --- FILTER 2: PREVENT DOUBLE BOOKING (BLOCKED DATES) ---
        if (searchPickup && searchDropoff) {
          const sStart = new Date(searchPickup).getTime();
          const sEnd = new Date(searchDropoff).getTime();

          liveCars = liveCars.filter(car => {
            if (!car.blockedDates || car.blockedDates.length === 0) return true;

            const hasOverlap = car.blockedDates.some(block => {
              const bStart = new Date(block.start).getTime();
              const bEnd = new Date(block.end).getTime();
              return sStart <= bEnd && sEnd >= bStart;
            });

            return !hasOverlap;
          });
        }
        
        setVehicles(liveCars);
      } catch (error) {
        console.error("Error fetching live cars:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLiveCars();
  }, [searchCity, searchPickup, searchDropoff]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col w-full relative">

      {/* --- LIVE CATALOG SECTION --- */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-2 md:px-6 py-8 md:py-12">
        
        {/* Dynamic Search Indicator / Header */}
        <div className="flex flex-col md:flex-row justify-between md:items-end border-b border-gray-200 pb-2 md:pb-4 mb-6 md:mb-10 px-2 md:px-0 gap-2">
          <h2 className="text-xl md:text-2xl font-black text-black">
            {searchCity ? `Available Cars in ${searchCity}` : "All Available Cars"} ({vehicles.length})
          </h2>
          
          <div className="flex items-center gap-4">
             {searchPickup && searchDropoff && (
                <div className="bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-lg flex items-center gap-2 text-[10px] md:text-xs font-bold text-[#003366]">
                  <span>📅 Search Active</span>
                  <a href="/cars" className="text-red-500 hover:text-red-700 border-l border-blue-200 pl-2 transition">Clear &times;</a>
                </div>
             )}
            <div className="hidden md:block text-xs font-bold text-gray-500 uppercase tracking-widest">Sort by: Lowest Price</div>
          </div>
        </div>

        {isLoading ? (
          <div className="w-full py-20 flex flex-col items-center justify-center gap-4">
             <div className="w-10 h-10 border-4 border-gray-200 border-t-green-600 rounded-full animate-spin"></div>
             <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Loading live fleet...</p>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="w-full py-20 bg-white rounded-xl border border-gray-200 text-center flex flex-col items-center shadow-sm mx-2 md:mx-0 w-auto">
            <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
            <h3 className="text-xl font-black text-black">No cars match your exact search</h3>
            <p className="text-sm text-gray-500 mt-2 mb-6 max-w-md px-4">The cars in this city might be booked for your selected dates. Try changing your dates or location!</p>
            <a href="/cars" className="bg-[#0a0a0a] text-white text-xs font-black uppercase tracking-widest px-8 py-4 rounded hover:bg-green-600 transition shadow-md">
              View All Cars
            </a>
          </div>
        ) : (
          /* --- THE MAGIC MOBILE 3-COL GRID --- */
          <div className="grid grid-cols-3 md:grid-cols-4 gap-2 md:gap-8">
            {vehicles.map((vehicle) => (
              <CarCard 
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
// REUSABLE COMPONENT: INDIVIDUAL CAR CARD
// -----------------------------------------
function CarCard({ vehicle, searchPickup, searchDropoff, onOpenDetails }: { vehicle: Vehicle, searchPickup: string, searchDropoff: string, onOpenDetails: () => void }) {
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
      
      {/* IMAGE CONTAINER WITH CAROUSEL */}
      <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
        {vehicle.images && vehicle.images.length > 0 ? (
          <>
            <img 
              src={vehicle.images[imgIndex]} 
              alt={`${vehicle.model} - Image ${imgIndex + 1}`} 
              className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105" 
            />
            
            {/* Quick View Hover Overlay */}
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none">
               <span className="bg-black/70 text-white text-[10px] md:text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-sm tracking-widest uppercase">Click to view</span>
            </div>
            
            {vehicle.images.length > 1 && (
              <>
                <button 
                  onClick={prevImg} 
                  className="absolute left-1 md:left-2 top-1/2 -translate-y-1/2 w-5 h-5 md:w-8 md:h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black transition opacity-0 group-hover:opacity-100 backdrop-blur-sm text-[10px] md:text-sm z-10"
                >
                  &#10094;
                </button>
                <button 
                  onClick={nextImg} 
                  className="absolute right-1 md:right-2 top-1/2 -translate-y-1/2 w-5 h-5 md:w-8 md:h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black transition opacity-0 group-hover:opacity-100 backdrop-blur-sm text-[10px] md:text-sm z-10"
                >
                  &#10095;
                </button>
                <div className="absolute bottom-1 right-1 md:bottom-2 md:right-2 bg-black/60 text-white text-[8px] md:text-[10px] font-bold px-1.5 py-0.5 md:px-2 md:py-1 rounded backdrop-blur-sm z-10">
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

      {/* CAR DETAILS */}
      <div className="p-2 md:p-6 flex flex-col flex-grow">
        <div className="flex flex-col mb-2 md:mb-4">
          <div className="hidden md:flex justify-between items-start mb-2">
            <div className="text-xs font-bold text-[#003366] uppercase tracking-wider">Car</div>
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
              <span className="text-sm md:text-2xl font-black text-green-600 leading-none">₹{finalPrice}</span>
            </div>
            {vehicle.discount && vehicle.discount.value > 0 && (
              <span className="hidden md:block text-xs text-gray-400 line-through font-bold mt-1">₹{vehicle.basePrice}</span>
            )}
          </div>
          
          <a 
            href={`/book?car=${encodeURIComponent(vehicle.brand + " " + vehicle.model)}&price=${finalPrice}&city=${encodeURIComponent(vehicle.outletLocation)}&pickup=${searchPickup}&dropoff=${searchDropoff}`}
            onClick={(e) => e.stopPropagation()} // Prevents the quick-view modal from opening when clicking 'Book'
            className="w-full md:w-auto text-center bg-[#0a0a0a] text-white text-[8px] md:text-xs font-black uppercase tracking-widest px-2 py-1.5 md:px-6 md:py-3 rounded hover:bg-green-600 transition shadow-md mt-1 md:mt-0"
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
              <span className="text-xs font-black text-[#003366] uppercase tracking-widest bg-blue-50 px-2.5 py-1 rounded">{vehicle.category || "Car"}</span>
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
                <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Driver Provision</span>
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
                <span className="text-4xl font-black text-green-600 leading-none">₹{finalPrice}</span>
              </div>
            </div>

            <a 
              href={smartBookLink}
              className="w-full block text-center bg-[#0a0a0a] text-white font-black text-lg uppercase tracking-widest py-4 rounded-xl hover:bg-green-600 transition shadow-xl"
            >
              PROCEED TO BOOK
            </a>
          </div>

        </div>

      </div>
    </div>
  );
}


// --- NEXT.JS WRAPPER ---
export default function CarsCatalog() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-bold text-green-600">Loading Fleet...</div>}>
      <CarsContent />
    </Suspense>
  );
}