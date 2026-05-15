"use client";

import { useState } from "react";
import { db, storage } from "../../firebase/config"; 
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// We define the cities here so we can reuse them easily in our dropdowns
const NAGALAND_CITIES = [
  "Dimapur", "Kohima", "Mokokchung", "Tuensang", "Wokha", "Zunheboto", 
  "Mon", "Phek", "Kiphire", "Longleng", "Peren", "Noklak", "Shamator", 
  "Niuland", "Chumoukedima", "Tseminyu"
];

export default function AddVehicle() {
  const [pricingModel, setPricingModel] = useState("per_24h");
  const [category, setCategory] = useState("Car");
  const [driverProvision, setDriverProvision] = useState("Self-Drive Only (Without Driver)");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [regNumber, setRegNumber] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [outletLocation, setOutletLocation] = useState("");
  
  // -----------------------------------------
  // THE PRICING ENGINES
  // -----------------------------------------
  const [kmTiers, setKmTiers] = useState([{ km: "", price: "" }]);
  const [destinations, setDestinations] = useState([{ city: "", price: "" }]); 
  
  // NEW: Multi-Day Tier Billing Logic State
  const [tierBillingLogic, setTierBillingLogic] = useState("all_days");

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imageCount, setImageCount] = useState(0);
  const [imageError, setImageError] = useState("");
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // --- KM TIER HELPER FUNCTIONS ---
  const handleKmTierChange = (index: number, field: 'km' | 'price', value: string) => {
    const newTiers = [...kmTiers];
    newTiers[index][field] = value;
    setKmTiers(newTiers);
  };

  const addKmTier = () => {
    setKmTiers([...kmTiers, { km: "", price: "" }]);
  };

  const removeKmTier = (index: number) => {
    const newTiers = kmTiers.filter((_, i) => i !== index);
    setKmTiers(newTiers);
  };

  // --- DESTINATION HELPER FUNCTIONS ---
  const handleDestinationChange = (index: number, field: 'city' | 'price', value: string) => {
    const newDests = [...destinations];
    newDests[index][field] = value;
    setDestinations(newDests);
  };

  const addDestination = () => {
    setDestinations([...destinations, { city: "", price: "" }]);
  };

  const removeDestination = (index: number) => {
    const newDests = destinations.filter((_, i) => i !== index);
    setDestinations(newDests);
  };

  // --- IMAGE UPLOAD LOGIC ---
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError(""); 
    setImageFiles([]); 
    
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    setPreviewUrls([]);

    if (e.target.files) {
      const files = Array.from(e.target.files);
      
      if (files.length > 0 && (files.length < 3 || files.length > 6)) {
         setImageCount(files.length);
         return; 
      }

      let hasSizeError = false;
      for (let i = 0; i < files.length; i++) {
        const fileSize = files[i].size;
        if (fileSize < 51200 || fileSize > 1048576) {
          hasSizeError = true;
          break;
        }
      }

      if (hasSizeError) {
        setImageError("Error: Every image must be exactly between 50KB and 1MB.");
        setImageCount(0);
        e.target.value = ""; 
        return;
      }

      const generatedUrls = files.map(file => URL.createObjectURL(file));
      setPreviewUrls(generatedUrls);
      setImageCount(files.length);
      setImageFiles(files);
    }
  };

  // --- FIREBASE SAVE FUNCTION ---
  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    setIsSuccess(false);

    try {
      setStatusMessage("Preparing to upload images to the vault...");
      
      const uploadedImageUrls = [];
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        setStatusMessage(`Uploading image ${i + 1} of ${imageFiles.length}...`);
        
        const imageRef = ref(storage, `vehicles/dimapur_rentals_${Date.now()}_${file.name}`);
        await uploadBytes(imageRef, file);
        const downloadUrl = await getDownloadURL(imageRef);
        uploadedImageUrls.push(downloadUrl);
      }

      setStatusMessage("Images secured! Saving vehicle details...");
      
      // AUTO-CALCULATE LOWEST PRICE IF PER_HIRE IS SELECTED
      let finalBasePrice = Number(basePrice);
      let finalDestinations: any[] = [];

      if (pricingModel === "per_hire") {
        finalDestinations = destinations
          .filter(d => d.city !== "" && d.price !== "")
          .map(d => ({ city: d.city, price: Number(d.price) }));
        
        if (finalDestinations.length > 0) {
          finalBasePrice = Math.min(...finalDestinations.map(d => d.price));
        }
      }

      // Package the data for Firebase
      const vehicleData: any = {
        category,
        driverProvision,
        brand,
        model,
        registration: regNumber,
        pricingModel,
        basePrice: finalBasePrice, 
        outletLocation: outletLocation, 
        images: uploadedImageUrls, 
        status: "Available", 
        vendorId: "Dimapur Rentals", 
        addedOn: new Date().toISOString()
      };

      // Attach KM Tiers AND Billing Logic if chosen
      if (pricingModel === "flat_rate_km_limit") {
        vehicleData.kmTiers = kmTiers
          .filter(tier => tier.km !== "" && tier.price !== "")
          .map(tier => ({ km: Number(tier.km), price: Number(tier.price) }));
        
        // NEW: Save the vendor's billing choice to the database
        vehicleData.tierBillingLogic = tierBillingLogic; 
      }

      // Attach Destinations if chosen
      if (pricingModel === "per_hire") {
        vehicleData.destinations = finalDestinations;
      }

      await addDoc(collection(db, "vehicles"), vehicleData);

      setStatusMessage("Success! Vehicle is now LIVE on the platform.");
      setIsSuccess(true);
      
      // RESET FORM
      setBrand("");
      setModel("");
      setRegNumber("");
      setBasePrice("");
      setOutletLocation(""); 
      setKmTiers([{ km: "", price: "" }]); 
      setDestinations([{ city: "", price: "" }]); 
      setTierBillingLogic("all_days"); // Reset billing logic
      setImageCount(0);
      setImageFiles([]);
      previewUrls.forEach(url => URL.revokeObjectURL(url));
      setPreviewUrls([]);
      
    } catch (error) {
      setStatusMessage("Error: " + (error as Error).message);
      setIsSuccess(false);
    } finally {
      setIsUploading(false); 
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-black font-sans flex flex-col">
      
      <header className="sticky top-0 z-50 bg-[#003366] border-b border-gray-800 shadow-sm text-white">
        <div className="flex items-center justify-between px-4 py-4 max-w-7xl mx-auto">
          <div className="flex items-center space-x-4">
            <a href="/partners" className="flex items-center space-x-4">
              <h1 className="text-2xl font-black tracking-widest text-white">
                CarXone <span className="text-sm font-normal text-blue-300">| PARTNERS</span>
              </h1>
            </a>
          </div>
          <div className="flex items-center space-x-6 text-sm font-bold">
            <a href="/partners" className="hover:text-blue-300 transition">Dashboard</a>
            <button className="bg-white text-[#003366] px-5 py-1.5 rounded hover:bg-black hover:text-white transition">
              Log Out
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow w-full max-w-3xl mx-auto px-4 py-10 flex flex-col gap-8">
        
        <div className="border-b pb-4">
          <h2 className="text-3xl font-black text-black">Add New Vehicle</h2>
          <p className="text-gray-500 mt-1">Enter the vehicle details and set your custom pricing rules.</p>
        </div>

        <form onSubmit={handleAddVehicle} className="flex flex-col gap-8 bg-white p-8 rounded-lg shadow-sm border border-gray-200">
          
          <div className="flex flex-col gap-4">
            <h3 className="text-xl font-bold text-[#003366] border-b pb-2">1. Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full border border-gray-300 rounded p-2 focus:border-[#003366] outline-none bg-white cursor-pointer">
                  <option>Car</option>
                  <option>Bike</option>
                  <option>Scooty</option>
                  <option>Truck</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Driver Provision</label>
                <select value={driverProvision} onChange={(e) => setDriverProvision(e.target.value)} className="w-full border border-gray-300 rounded p-2 focus:border-[#003366] outline-none bg-white cursor-pointer">
                  <option>Self-Drive Only (Without Driver)</option>
                  <option>Chauffeur Driven Only (With Driver)</option>
                  <option>Both Options Available</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Brand</label>
                <input type="text" value={brand} onChange={(e) => setBrand(e.target.value)} required placeholder="e.g. Toyota, Royal Enfield" className="w-full border border-gray-300 rounded p-2 focus:border-[#003366] outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Model</label>
                <input type="text" value={model} onChange={(e) => setModel(e.target.value)} required placeholder="e.g. Glanza, Classic 350" className="w-full border border-gray-300 rounded p-2 focus:border-[#003366] outline-none" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Registration Number</label>
                <input type="text" value={regNumber} onChange={(e) => setRegNumber(e.target.value)} required placeholder="e.g. NL-07-C-1234" className="w-full border border-gray-300 rounded p-2 focus:border-[#003366] outline-none uppercase" />
              </div>
              
              <div className="md:col-span-2 bg-blue-50 p-4 border border-blue-200 rounded-lg mt-2">
                <label className="block text-xs font-bold text-[#003366] uppercase mb-1">Outlet Location (Home City) *</label>
                <select 
                  required
                  value={outletLocation}
                  onChange={(e) => setOutletLocation(e.target.value)}
                  className="w-full border-2 border-[#003366] rounded p-2 font-bold text-[#003366] focus:outline-none bg-white cursor-pointer"
                >
                  <option value="">-- Select Your City --</option>
                  {NAGALAND_CITIES.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
                <p className="text-[10px] text-[#003366] mt-1 font-medium">Where is this vehicle stationed? This links directly to customer searches.</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="text-xl font-bold text-[#003366] border-b pb-2">2. Pricing Strategy</h3>
            <div>
              <label className="block text-sm font-bold text-black mb-2">How do you want to charge for this vehicle?</label>
              <select value={pricingModel} onChange={(e) => setPricingModel(e.target.value)} className="w-full border-2 border-[#003366] rounded p-3 text-black font-bold outline-none bg-blue-50 cursor-pointer">
                <option value="per_24h">Flat Rate (Per 24 Hours) - Unlimited KM</option>
                <option value="flat_rate_km_limit">Flat Rate (Per 24 Hours) - With KM Tiers</option>
                <option value="per_hire">Per Hire (One-Time Flat Fee per Destination)</option>
                <option value="per_day">Per Calendar Day</option>
                <option value="per_hour">Short Term (Per Hour)</option>
              </select>
            </div>
            
            {pricingModel !== "per_hire" && (
              <div className="bg-gray-50 p-4 border border-gray-200 rounded mt-2">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Starting Base Price (₹)</label>
                  <input type="number" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} required placeholder="e.g. 4000" className="w-full md:w-1/2 border border-gray-300 rounded p-2 focus:border-[#003366] outline-none" />
                  <p className="text-[10px] text-gray-500 mt-1">This is the default price shown to customers before any extra mileage is calculated.</p>
                </div>
              </div>
            )}

            {/* ----------------------------------------- */}
            {/* DYNAMIC KM TIER BUILDER */}
            {/* ----------------------------------------- */}
            {pricingModel === "flat_rate_km_limit" && (
              <div className="bg-white p-4 border border-blue-200 rounded-lg mt-2 shadow-sm">
                <h4 className="font-black text-[#003366] text-sm mb-1">Create Distance Limits & Pricing</h4>
                <p className="text-xs text-gray-500 mb-4">Set up your distance tiers (e.g. Up to 100km = ₹3000, Up to 200km = ₹4500).</p>
                
                <div className="flex flex-col gap-3">
                  {kmTiers.map((tier, index) => (
                    <div key={index} className="flex items-end gap-3 bg-blue-50/50 p-3 rounded border border-blue-100">
                      <div className="w-full">
                        <label className="block text-[10px] font-bold text-blue-800 uppercase mb-1">Up to distance (KM)</label>
                        <input 
                          type="number" 
                          required
                          placeholder="e.g. 100" 
                          value={tier.km} 
                          onChange={(e) => handleKmTierChange(index, 'km', e.target.value)}
                          className="w-full border border-blue-200 rounded p-2 focus:border-[#003366] outline-none text-sm font-bold" 
                        />
                      </div>
                      <div className="w-full">
                        <label className="block text-[10px] font-bold text-blue-800 uppercase mb-1">Total Price (₹)</label>
                        <input 
                          type="number" 
                          required
                          placeholder="e.g. 3000" 
                          value={tier.price} 
                          onChange={(e) => handleKmTierChange(index, 'price', e.target.value)}
                          className="w-full border border-blue-200 rounded p-2 focus:border-[#003366] outline-none text-sm font-bold" 
                        />
                      </div>
                      {kmTiers.length > 1 && (
                        <button 
                          type="button" 
                          onClick={() => removeKmTier(index)} 
                          className="bg-red-100 text-red-600 p-2.5 rounded hover:bg-red-600 hover:text-white transition flex-shrink-0"
                          title="Remove Tier"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                      )}
                    </div>
                  ))}
                  
                  <button 
                    type="button" 
                    onClick={addKmTier} 
                    className="mt-2 text-xs font-bold text-[#003366] border border-[#003366] bg-white px-4 py-2 rounded hover:bg-blue-50 transition w-max"
                  >
                    + Add Another Distance Tier
                  </button>
                </div>

                {/* --- NEW: MULTI-DAY BILLING LOGIC DROPDOWN --- */}
                <div className="mt-6 pt-5 border-t border-blue-100">
                  <label className="block text-xs font-black text-[#003366] uppercase mb-1">Multi-Day Tier Billing Logic</label>
                  <p className="text-[10px] text-gray-500 mb-3 leading-relaxed">
                    If a customer books for multiple days (e.g., 3 days) and their destination triggers a higher KM tier, how do you want the system to calculate the total?
                  </p>
                  <select 
                    value={tierBillingLogic}
                    onChange={(e) => setTierBillingLogic(e.target.value)}
                    className="w-full border-2 border-blue-200 rounded p-3 text-sm font-bold bg-white focus:border-[#003366] outline-none cursor-pointer shadow-sm text-black"
                  >
                    <option value="all_days">Charge the higher tier price for ALL days of the trip</option>
                    <option value="first_day_only">Charge the higher tier price for the FIRST day only, then revert to Starting Base Price</option>
                  </select>
                </div>

              </div>
            )}

            {/* ----------------------------------------- */}
            {/* DYNAMIC DESTINATION BUILDER */}
            {/* ----------------------------------------- */}
            {pricingModel === "per_hire" && (
              <div className="bg-white p-4 border border-blue-200 rounded-lg mt-2 shadow-sm">
                <h4 className="font-black text-[#003366] text-sm mb-1">Destination Pricing Builder</h4>
                <p className="text-xs text-gray-500 mb-4">Set prices for specific drop-offs. The lowest price will automatically display on the main website.</p>
                
                <div className="flex flex-col gap-3">
                  {destinations.map((dest, index) => (
                    <div key={index} className="flex items-end gap-3 bg-blue-50/50 p-3 rounded border border-blue-100">
                      <div className="w-full">
                        <label className="block text-[10px] font-bold text-blue-800 uppercase mb-1">End Destination</label>
                        <select 
                          required 
                          value={dest.city} 
                          onChange={(e) => handleDestinationChange(index, 'city', e.target.value)} 
                          className="w-full border border-blue-200 rounded p-2 text-sm font-bold bg-white focus:border-[#003366] outline-none"
                        >
                          <option value="">- Select Drop-off City -</option>
                          {NAGALAND_CITIES.filter(c => c !== outletLocation).map(city => (
                            <option key={city} value={city}>{outletLocation || "Start"} to {city}</option>
                          ))}
                        </select>
                      </div>
                      <div className="w-full">
                        <label className="block text-[10px] font-bold text-blue-800 uppercase mb-1">Flat Price (₹)</label>
                        <input 
                          type="number" 
                          required 
                          placeholder="e.g. 5000" 
                          value={dest.price} 
                          onChange={(e) => handleDestinationChange(index, 'price', e.target.value)} 
                          className="w-full border border-blue-200 rounded p-2 text-sm font-bold focus:border-[#003366] outline-none" 
                        />
                      </div>
                      {destinations.length > 1 && (
                        <button 
                          type="button" 
                          onClick={() => removeDestination(index)} 
                          className="bg-red-100 text-red-600 p-2.5 rounded hover:bg-red-600 hover:text-white transition flex-shrink-0"
                          title="Remove Destination"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                      )}
                    </div>
                  ))}
                  
                  <button 
                    type="button" 
                    onClick={addDestination} 
                    className="mt-2 text-xs font-bold text-[#003366] border border-[#003366] bg-white px-4 py-2 rounded hover:bg-blue-50 transition w-max"
                  >
                    + Add Another Destination
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-end border-b pb-2">
              <h3 className="text-xl font-bold text-[#003366]">3. Vehicle Images</h3>
              <span className={`text-xs font-bold ${imageCount >= 3 && imageCount <= 6 ? 'text-green-600' : 'text-red-500'}`}>
                {imageCount} Selected (Min 3, Max 6)
              </span>
            </div>
            
            <label className={`p-8 rounded-lg border-2 border-dashed ${imageError ? 'bg-red-50 border-red-300' : 'bg-blue-50 border-blue-300'} text-center flex flex-col items-center gap-3 hover:bg-blue-100 transition cursor-pointer relative`}>
              <svg className={`w-12 h-12 ${imageError ? 'text-red-500' : 'text-[#003366]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
              <div>
                <p className="text-lg font-black text-[#003366] mb-2">Click anywhere here to browse your files</p>
                <p className="text-xs font-bold text-gray-600 bg-white inline-block px-3 py-1.5 rounded shadow-sm border border-gray-200">
                  <span className="text-blue-600">PRO TIP:</span> Hold down the <kbd className="bg-gray-100 border border-gray-300 rounded px-1">Ctrl</kbd> or <kbd className="bg-gray-100 border border-gray-300 rounded px-1">Command</kbd> key while clicking your photos to select multiple at once!
                </p>
                <p className="text-xs text-gray-500 mt-4">Size required: 50KB - 1MB per image. Formats: JPG, PNG only.</p>
              </div>
              <input type="file" multiple accept="image/jpeg, image/png" onChange={handleImageUpload} disabled={isUploading} className="hidden" />
            </label>

            {previewUrls.length > 0 && !imageError && (
              <div className="grid grid-cols-3 gap-4 mt-2">
                {previewUrls.map((url, index) => (
                  <div key={index} className="relative aspect-[4/3] bg-gray-100 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                    <img src={url} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute top-2 left-2 bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded">
                      Image {index + 1}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {imageCount > 0 && imageCount < 3 && !imageError && (
              <p className="text-xs text-red-600 font-bold bg-red-50 p-3 rounded border border-red-200">You only selected {imageCount} image(s). Please click the box above again and select at least 3.</p>
            )}
            {imageCount > 6 && (
              <p className="text-xs text-red-600 font-bold bg-red-50 p-3 rounded border border-red-200">Error: You selected {imageCount} images. Maximum is 6.</p>
            )}
            {imageError && (
              <p className="text-xs text-red-600 font-bold bg-red-50 p-3 rounded border border-red-200">{imageError}</p>
            )}
          </div>

          {statusMessage && (
            <div className={`text-center font-bold text-sm p-4 rounded border ${isSuccess ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-[#003366] border-blue-200'}`}>
              {statusMessage}
            </div>
          )}

          <button 
            type="submit" 
            className={`w-full font-black text-lg py-4 rounded shadow-lg transition mt-4 ${(imageCount >= 3 && imageCount <= 6) && !imageError && !isUploading ? 'bg-[#003366] text-white hover:bg-black' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
            disabled={imageCount < 3 || imageCount > 6 || imageError !== "" || isUploading}
          >
            {isUploading ? 'UPLOADING FILES TO SERVER...' : imageCount < 3 ? 'UPLOAD 3 TO 6 IMAGES TO UNLOCK' : imageCount > 6 ? 'TOO MANY IMAGES SELECTED' : imageError ? 'FIX IMAGE ERRORS TO CONTINUE' : 'PUBLISH VEHICLE LIVE'}
          </button>

        </form>
      </main>
    </div>
  );
}