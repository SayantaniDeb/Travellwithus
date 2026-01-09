import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Bottom from './bottomfoot';
import { db, auth, storage } from '../Firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

function Profile() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const externalUid = params.get('uid');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({
    displayName: '',
    bio: '',
    location: '',
    website: '',
    photoURL: '',
    travelStyle: '',
    favoriteDestination: '',
    countriesVisited: 0,
    joinedAt: null
  });
  // Add editing state
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});

  // Travel style options
  const travelStyles = [
    { id: 'adventure', label: 'Adventure', emoji: '🏔️' },
    { id: 'relaxation', label: 'Relaxation', emoji: '🏖️' },
    { id: 'cultural', label: 'Cultural', emoji: '🏛️' },
    { id: 'foodie', label: 'Foodie', emoji: '🍜' },
    { id: 'budget', label: 'Budget', emoji: '💰' },
    { id: 'luxury', label: 'Luxury', emoji: '✨' },
    { id: 'solo', label: 'Solo', emoji: '🎒' },
    { id: 'family', label: 'Family', emoji: '👨‍👩‍👧‍👦' },
  ];

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (externalUid) {
        await loadProfile(externalUid);
      } else if (currentUser) {
        await loadProfile(currentUser.uid);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [externalUid]);

  // Load profile from Firestore
  const loadProfile = async (userId) => {
    try {
      const profileRef = doc(db, 'user_profiles', userId);
      const profileSnap = await getDoc(profileRef);
      
      // Get Google photo URL from Firebase Auth (for own profile only)
      let googlePhotoURL = '';
      let displayName = '';
      // If viewing own profile, use currentUser info
      if (user && user.uid === userId) {
        googlePhotoURL = user.photoURL || '';
        displayName = user.displayName || user.email?.split('@')[0] || '';
      }
      if (profileSnap.exists()) {
        const data = profileSnap.data();
        setProfile({
          displayName: data.displayName || displayName || userId,
          bio: data.bio || '',
          location: data.location || '',
          website: data.website || '',
          // Use custom photo if set, otherwise use Google photo (only for own profile)
          photoURL: data.photoURL || googlePhotoURL,
          googlePhotoURL: googlePhotoURL, // Store Google photo as fallback
          travelStyle: data.travelStyle || '',
          favoriteDestination: data.favoriteDestination || '',
          countriesVisited: data.countriesVisited || 0,
          joinedAt: data.joinedAt
        });
      } else {
        // Create initial profile
        const initialProfile = {
          displayName: displayName || userId,
          bio: '',
          location: '',
          website: '',
          photoURL: googlePhotoURL, // Only for own profile
          travelStyle: '',
          favoriteDestination: '',
          countriesVisited: 0,
          joinedAt: serverTimestamp(),
          userId: userId,
        };
        await setDoc(profileRef, initialProfile);
        setProfile({ ...initialProfile, googlePhotoURL: googlePhotoURL });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  // Get initials
  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  };

  // Only show edit button if viewing own profile
  const isOwnProfile = !externalUid || (user && user.uid === externalUid);

  // Start editing
  const startEditing = () => {
    setEditForm({ ...profile });
    setEditing(true);
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditForm({});
    setEditing(false);
  };


  // Save profile
  const saveProfile = async () => {
    if (!user) return;
    try {
      const profileRef = doc(db, 'user_profiles', user.uid);
      await updateDoc(profileRef, {
        ...editForm
      });
      setProfile({ ...profile, ...editForm });
      setEditing(false);
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-zinc-100 to-zinc-50">
        <Navbar />
        <div className="pt-24 flex justify-center">
          <div className="w-8 h-8 border-3 border-zinc-200 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-zinc-100 to-zinc-50">
        <Navbar />
        <div className="pt-20 sm:pt-24 pb-24 px-4">
          <div className="max-w-md mx-auto text-center">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-zinc-200/60 shadow-xl p-8">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-zinc-900 mb-2">Your Profile</h2>
              <p className="text-zinc-500 text-sm mb-6">Sign in to view and edit your profile.</p>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-3 bg-black hover:bg-gray-800 text-white rounded-xl text-sm font-medium transition-all shadow-lg"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
        <div className="hidden sm:block">
          <Bottom />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-zinc-100 to-zinc-50">
      <Navbar />
      <div className="pt-20 sm:pt-24 pb-24 px-4">
        <div className="max-w-2xl mx-auto">

          {/* Profile Header Card */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-zinc-200/60 shadow-xl overflow-hidden mb-6">
            {/* Cover gradient */}
            <div className="h-24 sm:h-32 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
            
            {/* Profile section */}
            <div className="px-4 sm:px-6 pb-6">
              {/* Avatar */}
              <div className="flex flex-col items-center">
                {profile.photoURL ? (
                  <img
                    src={profile.photoURL}
                    alt={profile.displayName}
                    className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-3xl border-4 border-white shadow-md">
                    {getInitials(profile.displayName)}
                  </div>
                )}
              </div>

              {/* Name and email */}
              <div className="mb-4">
                <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">
                  {profile.displayName || 'Traveler'}
                </h1>
                
              </div>

              {/* Bio */}
              {profile.bio && (
                <p className="text-zinc-600 text-sm mb-4">{profile.bio}</p>
              )}

              {/* Quick stats */}
              <div className="flex flex-wrap gap-4 text-sm">
                {profile.location && (
                  <div className="flex items-center gap-1 text-zinc-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    {profile.location}
                  </div>
                )}
                {profile.website && (
                  <a 
                    href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    Website
                  </a>
                )}
                {profile.joinedAt && (
                  <div className="flex items-center gap-1 text-zinc-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Joined {profile.joinedAt.toDate?.().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) || 'recently'}
                  </div>
                )}
              </div>

              {/* Edit button */}
              {isOwnProfile && !editing && (
                <button
                  onClick={startEditing}
                  className="mt-4 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg text-sm font-medium transition-colors"
                >
                  Edit Profile
                </button>
              )}
              {isOwnProfile && editing && (
                <div className="mt-4 space-y-2">
                  <input
                    type="text"
                    value={editForm.displayName}
                    onChange={e => setEditForm(f => ({ ...f, displayName: e.target.value }))}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="Display Name"
                  />
                  <textarea
                    value={editForm.bio}
                    onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="Bio"
                  />
                  <input
                    type="text"
                    value={editForm.location}
                    onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="Location"
                  />
                  <input
                    type="text"
                    value={editForm.website}
                    onChange={e => setEditForm(f => ({ ...f, website: e.target.value }))}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="Website"
                  />
                  {/* Travel stats editing */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex-1">
                      <label className="block text-xs text-zinc-500 mb-1">Countries Visited</label>
                      <input
                        type="number"
                        min="0"
                        value={editForm.countriesVisited}
                        onChange={e => setEditForm(f => ({ ...f, countriesVisited: Number(e.target.value) }))}
                        className="w-full px-3 py-2 border rounded"
                        placeholder="Countries Visited"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-zinc-500 mb-1">Travel Style</label>
                      <select
                        value={editForm.travelStyle}
                        onChange={e => setEditForm(f => ({ ...f, travelStyle: e.target.value }))}
                        className="w-full px-3 py-2 border rounded"
                      >
                        <option value="">Select Style</option>
                        {travelStyles.map(style => (
                          <option key={style.id} value={style.id}>{style.emoji} {style.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">Favorite Destination</label>
                    <input
                      type="text"
                      value={editForm.favoriteDestination}
                      onChange={e => setEditForm(f => ({ ...f, favoriteDestination: e.target.value }))}
                      className="w-full px-3 py-2 border rounded"
                      placeholder="Favorite Destination"
                    />
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button onClick={saveProfile} className="px-4 py-2 bg-blue-600 text-white rounded">Save</button>
                    <button onClick={cancelEditing} className="px-4 py-2 bg-zinc-200 text-zinc-700 rounded">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Travel Stats Card */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-zinc-200/60 shadow-xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-zinc-900 mb-4">Travel Stats</h2>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {/* Countries visited */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-blue-600">{profile.countriesVisited || 0}</div>
                <div className="text-xs text-blue-700 font-medium">Countries Visited</div>
              </div>

              {/* Travel style */}
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 text-center">
                <div className="text-2xl mb-1">
                  {travelStyles.find(s => s.id === profile.travelStyle)?.emoji || '✈️'}
                </div>
                <div className="text-xs text-purple-700 font-medium">
                  {travelStyles.find(s => s.id === profile.travelStyle)?.label || 'Travel Style'}
                </div>
              </div>

              {/* Favorite destination */}
              <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl p-4 text-center col-span-2 sm:col-span-1">
                <div className="text-lg font-semibold text-pink-600 truncate">
                  {profile.favoriteDestination || '—'}
                </div>
                <div className="text-xs text-pink-700 font-medium">Favorite Destination</div>
              </div>
            </div>
          </div>

        </div>
      </div>
      
      <div className="w-full fixed bottom-0">
        <Bottom />
      </div>
    </div>
  );
}

export default Profile;
