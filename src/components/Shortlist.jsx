import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../Firebase';
import { doc, getDoc, updateDoc, arrayRemove } from 'firebase/firestore';
import Navbar from './Navbar';
import Bottom from './bottomfoot';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import { MapPinIcon, StarIcon } from '@heroicons/react/24/outline';

export default function Shortlist() {
  const [shortlistedHotels, setShortlistedHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.currentUser) {
      navigate('/login');
      return;
    }
    loadShortlistedHotels();
  }, [navigate]);

  const loadShortlistedHotels = async () => {
    try {
      const userDocRef = doc(db, 'user_shortlists', auth.currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        setShortlistedHotels(data.hotelDetails || []);
      }
    } catch (error) {
      console.error('Error loading shortlisted hotels:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeFromShortlist = async (hotelId, hotelData) => {
    try {
      const userDocRef = doc(db, 'user_shortlists', auth.currentUser.uid);
      
      await updateDoc(userDocRef, {
        hotels: arrayRemove(hotelId),
        hotelDetails: arrayRemove(hotelData)
      });
      
      setShortlistedHotels(prev => prev.filter(hotel => hotel.id !== hotelId));
    } catch (error) {
      console.error('Error removing from shortlist:', error);
      alert('Failed to remove hotel from shortlist');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 py-8 pt-24">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-zinc-200/60 shadow-xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <HeartSolidIcon className="w-8 h-8 text-red-500" />
            <h1 className="text-3xl font-bold text-zinc-900">My Shortlisted Hotels</h1>
          </div>

          {shortlistedHotels.length === 0 ? (
            <div className="text-center py-12">
              <HeartSolidIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-600 mb-2">No hotels shortlisted yet</h2>
              <p className="text-gray-500 mb-6">Start exploring hotels and add your favorites to your shortlist!</p>
              <button
                onClick={() => navigate('/hotels')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
              >
                Browse Hotels
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-600 mb-4">
                You have {shortlistedHotels.length} hotel{shortlistedHotels.length !== 1 ? 's' : ''} in your shortlist
              </p>
              
              {shortlistedHotels.map((hotel) => (
                <div key={hotel.id} className="bg-white/60 backdrop-blur-sm rounded-xl border border-zinc-200/40 shadow-md p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-zinc-900 text-lg">{hotel.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <MapPinIcon className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">{hotel.location}</span>
                      </div>
                      {hotel.budgetRelevance && (
                        <span className={`inline-block px-2 py-1 text-xs rounded-full mt-2 ${
                          hotel.budgetRelevance === 'high' ? 'bg-green-100 text-green-800' :
                          hotel.budgetRelevance === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {hotel.budgetRelevance === 'high' ? 'Best Match' :
                           hotel.budgetRelevance === 'medium' ? 'Good Match' : 'Budget Stretch'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <StarIcon className="w-4 h-4 text-yellow-500" />
                        <span className="text-sm text-zinc-500">{hotel.rating}</span>
                      </div>
                      <button
                        onClick={() => removeFromShortlist(hotel.id, hotel)}
                        className="p-2 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                        title="Remove from shortlist"
                      >
                        <HeartSolidIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-xl font-bold text-green-600 mb-2">{hotel.price}</p>
                  <p className="text-sm text-zinc-600 mb-3">
                    Amenities: {hotel.amenities?.join(', ')}
                  </p>
                  
                  {hotel.dateAdded && (
                    <p className="text-xs text-gray-500 mb-3">
                      Added on {new Date(hotel.dateAdded).toLocaleDateString()}
                    </p>
                  )}
                  
                  {hotel.bookingLink && (
                    <a
                      href={hotel.bookingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                    >
                      View on Maps
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="w-full fixed bottom-0">
        <div className="hidden sm:block">
          <Bottom />
        </div>
      </div>
    </div>
  );
}