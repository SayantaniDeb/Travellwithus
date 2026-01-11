const CityComponent = (props) => {
  const { updateCity, fetchWeather, loading, city } = props;
  
  return (
    <div className="text-center">
      <img 
        src="/icons/perfect-day.svg" 
        alt="Weather"
        className="w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36 mx-auto mb-4 sm:mb-6"
      />
      <p className="text-gray-700 font-semibold text-sm sm:text-base md:text-lg mb-4 sm:mb-6">
        Find Weather Of Your City
      </p>
      <form onSubmit={fetchWeather} className="max-w-md mx-auto">
        <label htmlFor="weather-search" className="mb-2 text-sm font-medium text-gray-900 sr-only">
          Search Weather
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <svg 
              aria-hidden="true" 
              className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth="2" 
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input 
            type="text" 
            id="weather-search" 
            value={city || ""}
            onChange={(e) => updateCity(e.target.value)}
            className="block w-full p-3 sm:p-4 pl-9 sm:pl-10 pr-24 sm:pr-28 text-sm sm:text-base text-gray-900 border border-gray-300 rounded-lg bg-white/90 backdrop-blur-sm focus:ring-zinc-500 focus:border-zinc-500 focus:outline-none shadow-lg" 
            placeholder="Enter city name..." 
            required
          />
          <button 
            type="submit"
            disabled={loading}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black hover:bg-zinc-800 text-white font-medium rounded-lg text-xs sm:text-sm px-3 py-2 sm:px-4 sm:py-2.5 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CityComponent;
