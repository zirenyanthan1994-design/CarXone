"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { db } from "../firebase/config"; 
import { collection, query, where, getDocs } from "firebase/firestore";

// The shape of our live Firebase data (Now with blockedDates!)
interface Bike {
  id: string;
  brand: string;
  model: string;
  basePrice: number;
  outletLocation: string;
  vendorId: string;
  images: string[];
  type?: string; 
  category?: string; 
  discount?: { type: 'percentage' | 'flat'; value: number } | null;
  blockedDates?: { start: string; end: string }[]; // NEW: Added to prevent double bookings
}

// 1. THE MAIN CATALOG COMPONENT
function BikesContent() {
  // --- READ THE URL MEMORY ---
  const searchParams = useSearchParams();
  const searchCity = searchParams?.get("city") || "";
  const searchPickup = searchParams?.get("pickup") || "";
  // The homepage passes "dropoff", but we will also check "return" just in case of old links
  const searchDropoff = searchParams?.get("dropoff") || searchParams?.get("return") || "";

  // --- FIREBASE STATES ---
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- FETCH LIVE BIKES FROM DATABASE ---
  useEffect(() => {
    const fetchLiveBikes = async () => {
      setIsLoading(true);
      try {
        const q = query(
          collection(db, "vehicles"),
          where("category", "==", "Bike"),
          where("status", "==", "Available")
        );
        
        const querySnapshot = await getDocs(q);
        let liveBikes: Bike[] = [];
        querySnapshot.forEach((doc) => {
          liveBikes.push({ id: doc.id, ...doc.data() } as Bike);
        });

        // --- FILTER 1: BY CITY ---
        if (searchCity && searchCity !== "") {
          liveBikes = liveBikes.filter(bike => bike.outletLocation.toLowerCase() === searchCity.toLowerCase());
        }

        // --- FILTER 2: PREVENT DOUBLE BOOKING (BLOCKED DATES) ---
        if (searchPickup && searchDropoff) {
          const sStart = new Date(searchPickup).getTime();
          const sEnd = new Date(searchDropoff).getTime();

          liveBikes = liveBikes.filter(bike => {
            // Safe to show if there are no blocked dates
            if (!bike.blockedDates || bike.blockedDates.length === 0) return true;

            // Check if customer dates overlap with vendor blocked dates
            const hasOverlap = bike.blockedDates.some(block => {
              const bStart = new Date(block.start).getTime();
              const bEnd = new Date(block.end).getTime();
              return sStart <= bEnd && sEnd >= bStart;
            });

            // Keep only if NO overlap
            return !hasOverlap;
          });
        }
        
        setBikes(liveBikes);
      } catch (error) {
        console.error("Error fetching live bikes:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLiveBikes();
  }, [searchCity, searchPickup, searchDropoff]);

  return (
    <div className="max-w-7xl mx-auto px-2 md:px-6 py-8 md:py-12 flex flex-col min-h-[60vh]">
      
      {/* Dynamic Header */}
      <div className="mb-6 md:mb-10 px-2 md:px-0">
        <h1 className="text-2xl md:text-4xl font-black text-[#003366] uppercase mb-2">
          {searchCity ? `Available Bikes in ${searchCity}` : "All Premium Bikes"}
        </h1>
        {searchPickup && searchDropoff && (
          <div className="bg-blue-50 border border-blue-100 px-3 md:px-4 py-1.5 md:py-2 rounded-lg inline-flex items-center gap-3 md:gap-4 text-[10px] md:text-xs font-bold text-[#003366] mt-2">
            <span>📅 Search Active</span>
            <a href="/bikes" className="text-red-500 hover:text-red-700 border-l border-blue-200 pl-3 md:pl-4 transition">Clear &times;</a>
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="w-full py-20 flex flex-col items-center justify-center gap-4">
           <div className="w-10 h-10 border-4 border-gray-200 border-t-[#003366] rounded-full animate-spin"></div>
           <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Loading live fleet...</p>
        </div>
      ) : bikes.length === 0 ? (
        <div className="bg-gray-100 p-6 md:p-8 text-center rounded-lg border-2 border-dashed border-gray-300 mx-2 md:mx-0">
          <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-2">No bikes found!</h3>
          <p className="text-gray-500 text-xs md:text-sm max-w-md mx-auto">
            Sorry, we currently do not have any bikes available for those dates in {searchCity || "this area"}. Try changing your dates or location!
          </p>
          <a href="/bikes" className="mt-4 inline-block text-white bg-[#003366] px-6 py-3 rounded text-xs md:text-sm font-bold hover:bg-black transition shadow-sm">
            View All Bikes
          </a>
        </div>
      ) : (
        /* --- THE MAGIC MOBILE 3-COL GRID --- */
        <div className="grid grid-cols-3 md:grid-cols-4 gap-2 md:gap-8">
          {bikes.map((bike) => (
            <BikeCard 
              key={bike.id} 
              bike={bike} 
              searchPickup={searchPickup} 
              searchDropoff={searchDropoff} 
            />
          ))}
        </div>
      )}
    </div>
  );
}

// -----------------------------------------
// REUSABLE COMPONENT: INDIVIDUAL BIKE CARD (MOBILE OPTIMIZED)
// -----------------------------------------
function BikeCard({ bike, searchPickup, searchDropoff }: { bike: Bike, searchPickup: string, searchDropoff: string }) {
  // State for the Image Slider
  const [imgIndex, setImgIndex] = useState(0);

  // --- DISCOUNT CALCULATOR ---
  const calculateDiscountedPrice = (basePrice: number, discount?: { type: string, value: number } | null) => {
    if (!discount) return basePrice;
    if (discount.type === 'flat') return Math.max(0, basePrice - discount.value);
    if (discount.type === 'percentage') return Math.max(0, basePrice - (basePrice * (discount.value / 100)));
    return basePrice;
  };

  const finalPrice = calculateDiscountedPrice(bike.basePrice, bike.discount);

  // --- IMAGE SLIDER CONTROLS ---
  const nextImg = (e: React.MouseEvent) => {
    e.preventDefault(); 
    if (bike.images && bike.images.length > 0) {
      setImgIndex((prev) => (prev + 1) % bike.images.length);
    }
  };

  const prevImg = (e: React.MouseEvent) => {
    e.preventDefault();
    if (bike.images && bike.images.length > 0) {
      setImgIndex((prev) => (prev === 0 ? bike.images.length - 1 : prev - 1));
    }
  };

  return (
    <div className="bg-white rounded-lg md:rounded-xl border border-gray-200 overflow-hidden hover:shadow-xl transition duration-300 group flex flex-col">
      
      {/* IMAGE CONTAINER WITH SLIDER & DISCOUNT BADGE */}
      <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
        {bike.images && bike.images.length > 0 ? (
          <>
            <img 
              src={bike.images[imgIndex]} 
              alt={`${bike.model} - Image ${imgIndex + 1}`} 
              className="w-full h-full object-cover transition-all duration-300" 
            />
            
            {/* Show Arrows Only if there is more than 1 image */}
            {bike.images.length > 1 && (
              <>
                <button 
                  onClick={prevImg} 
                  className="absolute left-1 md:left-2 top-1/2 -translate-y-1/2 w-4 h-4 md:w-8 md:h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black transition opacity-0 group-hover:opacity-100 backdrop-blur-sm text-[8px] md:text-sm"
                >
                  &#10094;
                </button>
                <button 
                  onClick={nextImg} 
                  className="absolute right-1 md:right-2 top-1/2 -translate-y-1/2 w-4 h-4 md:w-8 md:h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black transition opacity-0 group-hover:opacity-100 backdrop-blur-sm text-[8px] md:text-sm"
                >
                  &#10095;
                </button>
                {/* Image Counter Badge */}
                <div className="absolute bottom-1 right-1 md:bottom-2 md:right-2 bg-black/60 text-white text-[8px] md:text-[10px] font-bold px-1.5 py-0.5 md:px-2 md:py-1 rounded backdrop-blur-sm">
                  {imgIndex + 1} / {bike.images.length}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[8px] md:text-xs font-bold text-gray-400">NO IMG</div>
        )}
        
        {bike.discount && bike.discount.value > 0 && (
          <div className="absolute top-1 left-1 md:top-4 md:left-4 bg-black text-white text-[8px] md:text-[10px] font-black px-1.5 py-0.5 md:px-3 md:py-1.5 uppercase tracking-widest rounded shadow-md z-10">
            {bike.discount.type === 'percentage' ? `${bike.discount.value}% OFF` : `₹${bike.discount.value} OFF`}
          </div>
        )}
      </div>

      {/* BIKE DETAILS */}
      <div className="p-2 md:p-6 flex flex-col flex-grow">
        
        <div className="flex flex-col mb-2 md:mb-4">
          <div className="hidden md:flex justify-between items-start mb-2">
            <div className="text-xs font-bold text-[#003366] uppercase tracking-wider">Bike</div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">📍 {bike.outletLocation}</div>
          </div>
          
          <h3 className="text-[10px] md:text-xl font-black text-black leading-tight md:mt-1 truncate">
            {bike.brand} {bike.model}
          </h3>
          
          <div className="md:hidden text-[8px] font-bold text-gray-400 uppercase tracking-widest truncate mt-0.5">
            📍 {bike.outletLocation}
          </div>
        </div>

        <div className="mt-auto pt-2 md:pt-6 border-t border-gray-100 flex flex-col md:flex-row items-start md:items-end justify-between gap-1 md:gap-0">
          <div className="flex flex-col w-full md:w-auto">
            <span className="hidden md:block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Starting At</span>
            <div className="flex items-end gap-1 md:gap-2">
              <span className="text-sm md:text-2xl font-black text-[#003366] leading-none">₹{finalPrice}</span>
              <span className="text-[8px] md:text-xs font-bold text-gray-500 md:mb-1">/d</span>
            </div>
            {bike.discount && bike.discount.value > 0 && (
              <span className="hidden md:block text-xs text-gray-400 line-through font-bold mt-1">₹{bike.basePrice}</span>
            )}
          </div>

          {/* The Magic Booking Link -> Passes exact search parameters straight to the checkout! */}
          <Link 
            href={`/book?car=${encodeURIComponent(bike.brand + " " + bike.model)}&price=${finalPrice}&city=${encodeURIComponent(bike.outletLocation)}&pickup=${searchPickup}&dropoff=${searchDropoff}`}
            className="w-full md:w-auto text-center bg-[#003366] text-white text-[8px] md:text-xs font-black uppercase tracking-widest px-2 py-1.5 md:px-6 md:py-3 rounded hover:bg-black transition shadow-md"
          >
            Book
          </Link>
        </div>

      </div>
    </div>
  );
}

// 2. NEXT.JS REQUIREMENT: Wrap the URL reader in a Suspense boundary
export default function BikesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-[#003366] rounded-full animate-spin"></div>
      </div>
    }>
      <BikesContent />
    </Suspense>
  );
}