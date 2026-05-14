export default function AdminLogin() {
  return (
    <div className="min-h-screen bg-black flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <h1 className="text-3xl font-black tracking-widest text-white mb-2">
          CarXone <span className="text-lg font-normal text-red-600">| ADMIN</span>
        </h1>
        <p className="text-xs font-bold text-gray-500 tracking-widest uppercase mt-4">Restricted Access Area</p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[#111] py-8 px-4 shadow-2xl sm:rounded-lg sm:px-10 border border-gray-800">
          <form className="space-y-6">
            
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Admin Username</label>
              <input type="text" placeholder="Enter Username" className="w-full border border-gray-700 rounded p-3 bg-black text-white focus:border-red-600 outline-none transition" />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Master Password</label>
              <input type="password" placeholder="••••••••" className="w-full border border-gray-700 rounded p-3 bg-black text-white focus:border-red-600 outline-none transition" />
            </div>

            {/* Extra Security Layer for Admin */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">2FA Security PIN</label>
              <input type="password" placeholder="6-Digit PIN" maxLength={6} className="w-full border border-gray-700 rounded p-3 bg-black text-white focus:border-red-600 outline-none transition text-center tracking-widest font-mono" />
            </div>

            <a href="/admin" className="w-full block text-center bg-red-700 text-white font-black text-lg py-3 rounded shadow hover:bg-red-600 transition border border-red-500">
              AUTHENTICATE
            </a>
            
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-600">
              Unauthorized access is strictly prohibited and logged.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}