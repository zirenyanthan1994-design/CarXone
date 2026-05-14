export default function VendorLogin() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans text-black">
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <h1 className="text-3xl font-black tracking-widest text-[#003366] mb-2">
          CarXone <span className="text-lg font-normal text-gray-500">| PARTNERS</span>
        </h1>
        <h2 className="text-xl font-bold text-black mt-4">Vendor Portal Login</h2>
        <p className="text-sm text-gray-500 mt-2">Manage your fleet, track earnings, and verify bookings.</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-md sm:rounded-lg sm:px-10 border border-gray-200">
          <form className="space-y-6">
            
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Business Email or Phone</label>
              <input type="text" placeholder="vendor@example.com" className="w-full border border-gray-300 rounded p-3 focus:border-[#003366] outline-none bg-gray-50 focus:bg-white transition" />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Password</label>
              <input type="password" placeholder="••••••••" className="w-full border border-gray-300 rounded p-3 focus:border-[#003366] outline-none bg-gray-50 focus:bg-white transition" />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 accent-[#003366]" />
                <span className="text-xs font-bold text-gray-600">Remember me</span>
              </label>
              <a href="/forgot-password" className="text-xs font-bold text-[#003366] hover:underline">Forgot password?</a>
            </div>

            <a href="/partners" className="w-full block text-center bg-[#003366] text-white font-black text-lg py-3 rounded shadow hover:bg-black transition">
              SECURE LOGIN
            </a>
            
          </form>

          <div className="mt-6 border-t border-gray-200 pt-6 text-center">
            <p className="text-sm text-gray-500">
              Want to list your vehicles? <br/>
              <a href="/partners/signup" className="font-bold text-[#003366] hover:underline">Apply to become a CarXone Partner</a>
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}