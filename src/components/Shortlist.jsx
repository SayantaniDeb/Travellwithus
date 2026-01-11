import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../Firebase';
import { doc, getDoc, updateDoc, arrayRemove } from 'firebase/firestore';
import Navbar from './Navbar';
import Bottom from './bottomfoot';
import MobileBottomNav from './MobileBottomNav';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import { MapPinIcon, StarIcon, TrashIcon } from '@heroicons/react/24/outline';

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
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="flex items-center justify-center min-h-[70vh] px-4">
          <div className="text-center space-y-4">
            <div className="relative">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-300 border-t-slate-600 mx-auto"></div>
            </div>
            <p className="text-sm text-slate-600">Loading your shortlist...</p>
          </div>
        </div>
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 sm:pb-0">
      <Navbar />

      <div className="container max-w-2xl mx-auto px-4 py-4 sm:py-8 pt-20 sm:pt-24">
        <div className="space-y-6">
          {/* Header Section */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
              <HeartSolidIcon className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Shortlist</h1>
              <p className="text-sm text-slate-600">Your favorite hotels in one place</p>
            </div>
          </div>

          {/* Content */}
          {shortlistedHotels.length === 0 ? (
            <div className="flex flex-col items-center justify-center space-y-4 py-12 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">
                <HeartSolidIcon className="h-10 w-10 text-slate-400" />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-medium text-slate-900">No hotels shortlisted</h2>
                <p className="text-sm text-slate-600 max-w-sm">
                  Start exploring hotels and save your favorites to your shortlist for easy access.
                </p>
              </div>
              <button
                onClick={() => navigate('/hotels')}
                className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 touch-manipulation"
              >
                Browse Hotels
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600">
                  {shortlistedHotels.length} hotel{shortlistedHotels.length !== 1 ? 's' : ''} saved
                </p>
              </div>

              <div className="space-y-3">
                {shortlistedHotels.map((hotel) => (
                  <div
                    key={hotel.id}
                    className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="flex flex-col space-y-3 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
                      <div className="flex-1 space-y-2">
                        <div className="space-y-1">
                          <h3 className="font-medium text-slate-900 text-base leading-tight">{hotel.name}</h3>
                          <div className="flex items-center gap-1.5 text-sm text-slate-600">
                            <MapPinIcon className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{hotel.location}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <StarIcon className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm font-medium text-slate-900">{hotel.rating}</span>
                          </div>

                          {hotel.budgetRelevance && (
                            <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                              hotel.budgetRelevance === 'high'
                                ? 'bg-green-100 text-green-800'
                                : hotel.budgetRelevance === 'medium'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {hotel.budgetRelevance === 'high' ? 'Best Match' :
                               hotel.budgetRelevance === 'medium' ? 'Good Match' : 'Budget Stretch'}
                            </span>
                          )}
                        </div>

                        {hotel.amenities && hotel.amenities.length > 0 && (
                          <p className="text-sm text-slate-600">
                            <span className="font-medium">Amenities:</span> {hotel.amenities.join(', ')}
                          </p>
                        )}

                        {hotel.dateAdded && (
                          <p className="text-xs text-slate-500">
                            Added {new Date(hotel.dateAdded).toLocaleDateString()}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-3 sm:flex-col">
                        <div className="text-right">
                          <p className="text-lg font-semibold text-green-600">{hotel.price}</p>
                        </div>

                        <div className="flex gap-2">
                          {hotel.bookingLink && (
                            <a
                              href={hotel.bookingLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 touch-manipulation"
                            >
                              View
                            </a>
                          )}

                          <button
                            onClick={() => removeFromShortlist(hotel.id, hotel)}
                            className="inline-flex items-center justify-center rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 shadow-sm transition-colors hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 touch-manipulation"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="sm:hidden">
        <MobileBottomNav />
      </div>

      {/* Desktop Bottom Footer */}
      <div className="hidden sm:block w-full fixed bottom-0">
        <Bottom />
      </div>
    </div>
  );
}