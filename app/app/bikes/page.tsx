"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { db } from "../firebase/config"; 
import { collection, query, where, getDocs } from "firebase/firestore";

// The shape of our live Firebase data (Now fully updated without errors!)
interface Bike {
  id: string;
  brand: string;
  model: string;
  basePrice: number;
  outletLocation: string;
  vendorId: string;
  images: string[];
  type?: string; 
  category?: string; // <--- The crucial fix that stops the error!
  discount?: { type: 'percentage' | 'flat'; value: number } | null;
}

// 1. THE MAIN CATALOG COMPONENT
function BikesCatalog() {
  // --- READ THE URL MEMORY ---
  const searchParams = useSearchParams();
  const searchedCity = searchParams?.get("city");
  const pickupDate = searchParams?.get("pickup");
  const returnDate = searchParams?.get("return");

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
        const liveBikes: Bike[] = [];
        querySnapshot.forEach((doc) => {
          liveBikes.push({ id: doc.id, ...doc.data() } as Bike);
        });
        
        setBikes(liveBikes);
      } catch (error) {
        console.error("Error fetching live bikes:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLiveBikes();
  }, []);

  // --- DISCOUNT CALCULATOR ---
  const calculateDiscountedPrice = (basePrice: number, discount?: { type: string, value: number } | null) => {
    if (!discount) return basePrice;
    if (discount.type === 'flat') return Math.max(0, basePrice - discount.value);
    if (discount.type === 'percentage') return Math.max(0, basePrice - (basePrice * (discount.value / 100)));
    return basePrice;
  };

  // --- THE SMART FILTER ---
  const filteredBikes = searchedCity 
    ? bikes.filter(bike => bike.outletLocation.toLowerCase() === searchedCity.toLowerCase())
    : bikes;

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col min-h-[60vh]">
      
      {/* Dynamic Header */}
      <div className="mb-10">
        <h1 className="text-4xl font-black text-[#003366] uppercase mb-2">
          {searchedCity ? `Available Bikes in ${searchedCity}` : "All Premium Bikes"}
        </h1>
        {pickupDate && returnDate && (
          <p className="text-gray-500 font-medium">
            Showing results for your trip from {pickupDate} to {returnDate}.
          </p>
        )}
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="w-full py-20 flex flex-col items-center justify-center gap-4">
           <div className="w-10 h-10 border-4 border-gray-200 border-t-[#003366] rounded-full animate-spin"></div>
           <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Loading live fleet...</p>
        </div>
      ) : filteredBikes.length === 0 ? (
        <div className="bg-gray-100 p-8 text-center rounded-lg border-2 border-dashed border-gray-300">
          <h3 className="text-xl font-bold text-gray-800 mb-2">No bikes found!</h3>
          <p className="text-gray-500">Sorry, we currently do not have any vendors stationed in {searchedCity || "this area"}.</p>
          <a href="/" className="mt-4 inline-block text-[#003366] font-bold hover:underline">Change Search Location</a>
        </div>
      ) : (
        /* Grid of Filtered Bikes */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredBikes.map((bike) => {
            const finalPrice = calculateDiscountedPrice(bike.basePrice, bike.discount);

            return (
              <div key={bike.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition flex flex-col">
                
                {/* IMAGE CONTAINER WITH DISCOUNT BADGE */}
                <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
                  {bike.images && bike.images[0] ? (
                    <img src={bike.images[0]} alt={bike.model} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-400">NO IMAGE</div>
                  )}
                  
                  {bike.discount && bike.discount.value > 0 && (
                    <div className="absolute top-4 left-4 bg-black text-white text-[10px] font-black px-3 py-1.5 uppercase tracking-widest rounded shadow-md">
                      {bike.discount.type === 'percentage' ? `${bike.discount.value}% OFF` : `₹${bike.discount.value} OFF`}
                    </div>
                  )}
                </div>

                <div className="p-6 flex flex-col flex-grow">
                  
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-xl font-bold text-black">{bike.brand} {bike.model}</h3>
                      <p className="text-xs font-bold text-gray-400 uppercase">By {bike.vendorId || "Verified Vendor"}</p>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <span className="text-xl font-black text-[#003366]">₹{finalPrice}</span>
                      {bike.discount && bike.discount.value > 0 && (
                        <span className="text-[10px] text-gray-400 line-through font-bold">₹{bike.basePrice}</span>
                      )}
                      <span className="text-xs text-gray-500 block">/ day</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-500 font-medium my-4">
                    <span className="flex items-center gap-1">📍 {bike.outletLocation}</span>
                    <span className="flex items-center gap-1">🏍️ {bike.category}</span>
                  </div>

                  {/* The Magic Booking Link -> Points to your new /book page! */}
                  <Link 
                    href={`/book?car=${bike.brand} ${bike.model}&price=${finalPrice}&city=${bike.outletLocation}&pickup=${pickupDate || ""}&dropoff=${returnDate || ""}`}
                    className="mt-auto block w-full text-center bg-[#003366] text-white py-3 rounded font-bold hover:bg-black transition shadow-sm"
                  >
                    Book This Bike
                  </Link>

                </div>
              </div>
            );
          })}
        </div>
      )}
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
      <BikesCatalog />
    </Suspense>
  );
}