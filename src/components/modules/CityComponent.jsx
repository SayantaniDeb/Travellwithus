import React from 'react';

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
      <form 
        onSubmit={fetchWeather}
        className="flex flex-col sm:flex-row gap-2 sm:gap-0 border border-gray-300 rounded-lg overflow-hidden"
      >
        <input 
          placeholder="Enter city name..." 
          value={city || ""}
          onChange={(e) => updateCity(e.target.value)}
          className="flex-1 px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base outline-none border-none"
          required
        />
        <button 
          type="submit"
          disabled={loading}
          className="bg-gray-800 text-white px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base font-semibold hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>
    </div>
  );
};

export default CityComponent;
