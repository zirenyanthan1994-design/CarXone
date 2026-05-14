export default function VendorSignUp() {
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
        <h2 className="text-2xl font-bold text-black mt-4">Apply to Become a Vendor</h2>
        <p className="text-sm text-gray-500 mt-2">Join India's first zero-fee vehicle rental network. Keep 100% of what you earn.</p>
      </div>

      {/* ----------------------------------------- */}
      {/* APPLICATION FORM */}
      {/* ----------------------------------------- */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="bg-white py-8 px-4 shadow-sm sm:rounded-lg sm:px-10 border border-gray-200">
          <form className="space-y-8">

            {/* Business Information */}
            <div className="border-b pb-6">
              <h3 className="text-lg font-black text-[#003366] mb-4">1. Business Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Rental Agency Name (or Individual)</label>
                  <input type="text" placeholder="e.g. Dimapur Rentals" className="w-full border border-gray-300 rounded p-3 focus:border-[#003366] outline-none bg-gray-50 focus:bg-white transition" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Owner Full Name</label>
                  <input type="text" placeholder="John Doe" className="w-full border border-gray-300 rounded p-3 focus:border-[#003366] outline-none bg-gray-50 focus:bg-white transition" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Primary Operating City</label>
                  <select className="w-full border border-gray-300 rounded p-3 focus:border-[#003366] outline-none bg-gray-50 focus:bg-white transition cursor-pointer">
                    <option>Dimapur</option>
                    <option>Kohima</option>
                    <option>Guwahati</option>
                    <option>Shillong</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Contact & Fleet Details */}
            <div className="border-b pb-6">
              <h3 className="text-lg font-black text-[#003366] mb-4">2. Contact & Fleet Setup</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Business Email</label>
                  <input type="email" placeholder="contact@agency.com" className="w-full border border-gray-300 rounded p-3 focus:border-[#003366] outline-none bg-gray-50 focus:bg-white transition" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Business Phone Number</label>
                  <input type="tel" placeholder="+91" className="w-full border border-gray-300 rounded p-3 focus:border-[#003366] outline-none bg-gray-50 focus:bg-white transition" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Estimated Fleet Size</label>
                  <select className="w-full border border-gray-300 rounded p-3 focus:border-[#003366] outline-none bg-gray-50 focus:bg-white transition cursor-pointer">
                    <option>1 - 5 Vehicles</option>
                    <option>6 - 15 Vehicles</option>
                    <option>16 - 30 Vehicles</option>
                    <option>30+ Vehicles</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Create Password</label>
                  <input type="password" placeholder="••••••••" className="w-full border border-gray-300 rounded p-3 focus:border-[#003366] outline-none bg-gray-50 focus:bg-white transition" />
                </div>
              </div>
            </div>

            {/* Submit Area */}
            <div className="pt-2">
              <label className="flex items-start gap-3 mb-6 cursor-pointer">
                <input type="checkbox" className="w-5 h-5 accent-[#003366] mt-0.5" />
                <span className="text-xs text-gray-600">
                  I confirm that all provided information is accurate and I agree to the CarXone <a href="#" className="font-bold text-[#003366] hover:underline">Vendor Terms of Service</a>. I understand my account must be approved by an Admin before I can list vehicles.
                </span>
              </label>

              <button type="button" className="w-full bg-[#003366] text-white font-black text-lg py-4 rounded shadow-lg hover:bg-black transition">
                SUBMIT VENDOR APPLICATION
              </button>
            </div>
            
            <p className="text-center text-sm text-gray-500 mt-4">
              Already an approved vendor? <a href="/partners/login" className="font-bold text-[#003366] hover:underline">Log in here</a>
            </p>

          </form>
        </div>
      </div>
    </div>
  );
}