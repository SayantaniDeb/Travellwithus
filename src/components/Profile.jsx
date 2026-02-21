import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import Navbar from './Navbar';
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

// Random avatar options - using DiceBear API with different styles
const AVATAR_STYLES = [
  'adventurer',
  'adventurer-neutral', 
  'avataaars',
  'big-ears',
  'big-smile',
  'bottts',
  'croodles',
  'fun-emoji',
  'icons',
  'lorelei',
  'micah',
  'miniavs',
  'notionists',
  'open-peeps',
  'personas',
  'pixel-art',
  'thumbs',
];

// Generate a consistent random avatar URL based on user ID
const generateRandomAvatar = (seed) => {
  // Use the seed to deterministically select a style
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const styleIndex = Math.abs(hash) % AVATAR_STYLES.length;
  const style = AVATAR_STYLES[styleIndex];
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}&backgroundColor=ffffff`;
};

// Pre-defined avatar collection for picker
const AVATAR_COLLECTION = [
  // Fun emoji avatars
  { url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=happy&backgroundColor=ffffff', name: 'Happy' },
  { url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=cool&backgroundColor=ffffff', name: 'Cool' },
  { url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=adventurer&backgroundColor=ffffff', name: 'Adventurer' },
  { url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=traveler&backgroundColor=ffffff', name: 'Traveler' },
  // Adventurer avatars
  { url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=felix&backgroundColor=ffffff', name: 'Felix' },
  { url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=luna&backgroundColor=ffffff', name: 'Luna' },
  { url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=max&backgroundColor=ffffff', name: 'Max' },
  { url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=bella&backgroundColor=ffffff', name: 'Bella' },
  // Avataaars
  { url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alex&backgroundColor=ffffff', name: 'Alex' },
  { url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sam&backgroundColor=ffffff', name: 'Sam' },
  { url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=jordan&backgroundColor=ffffff', name: 'Jordan' },
  { url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=taylor&backgroundColor=ffffff', name: 'Taylor' },
  // Lorelei avatars
  { url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=aria&backgroundColor=ffffff', name: 'Aria' },
  { url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=nova&backgroundColor=ffffff', name: 'Nova' },
  { url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=sky&backgroundColor=ffffff', name: 'Sky' },
  { url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=star&backgroundColor=ffffff', name: 'Star' },
  // Micah avatars
  { url: 'https://api.dicebear.com/7.x/micah/svg?seed=ocean&backgroundColor=ffffff', name: 'Ocean' },
  { url: 'https://api.dicebear.com/7.x/micah/svg?seed=forest&backgroundColor=ffffff', name: 'Forest' },
  { url: 'https://api.dicebear.com/7.x/micah/svg?seed=desert&backgroundColor=ffffff', name: 'Desert' },
  { url: 'https://api.dicebear.com/7.x/micah/svg?seed=mountain&backgroundColor=ffffff', name: 'Mountain' },
  // Notionists
  { url: 'https://api.dicebear.com/7.x/notionists/svg?seed=explorer&backgroundColor=ffffff', name: 'Explorer' },
  { url: 'https://api.dicebear.com/7.x/notionists/svg?seed=wanderer&backgroundColor=ffffff', name: 'Wanderer' },
  { url: 'https://api.dicebear.com/7.x/notionists/svg?seed=nomad&backgroundColor=ffffff', name: 'Nomad' },
  { url: 'https://api.dicebear.com/7.x/notionists/svg?seed=pilgrim&backgroundColor=ffffff', name: 'Pilgrim' },
  // Pixel art
  { url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=retro&backgroundColor=ffffff', name: 'Retro' },
  { url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=classic&backgroundColor=ffffff', name: 'Classic' },
  { url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=vintage&backgroundColor=ffffff', name: 'Vintage' },
  { url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=arcade&backgroundColor=ffffff', name: 'Arcade' },
];

function Profile() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const externalUid = searchParams.get('uid');
  
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
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

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

  const [authChecked, setAuthChecked] = useState(false);

  // Auth listener - runs once
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthChecked(true);
    });
    return () => unsubscribe();
  }, []);

  // Load profile when externalUid changes or auth is determined
  useEffect(() => {
    if (!authChecked) return; // Wait for auth to be checked first
    
    const loadProfileData = async () => {
      setLoading(true);
      if (externalUid) {
        // Viewing someone else's profile
        await loadProfile(externalUid, user);
      } else if (user) {
        // Viewing own profile
        await loadProfile(user.uid, user);
      } else {
        // Not logged in and no externalUid - will show login prompt
        setLoading(false);
      }
      setLoading(false);
    };
    
    loadProfileData();
  }, [externalUid, user, authChecked]);

  // Load profile from Firestore
  const loadProfile = async (userId, currentUser) => {
    try {
      const profileRef = doc(db, 'user_profiles', userId);
      const profileSnap = await getDoc(profileRef);
      
      // Check if viewing own profile - use currentUser passed as parameter
      const isOwnProfileView = currentUser && currentUser.uid === userId;
      
      // Get Google photo URL from Firebase Auth (for own profile only)
      let googlePhotoURL = '';
      let displayName = '';
      
      if (isOwnProfileView) {
        googlePhotoURL = currentUser.photoURL || '';
        // For email/password users, always prioritize email username
        if (currentUser.email && !currentUser.displayName) {
          displayName = currentUser.email.split('@')[0];
        } else {
          displayName = currentUser.displayName || localStorage.getItem('displayName') || currentUser.email?.split('@')[0] || currentUser.email || '';
        }
        // If still no displayName, try to get it from localStorage with a fallback
        if (!displayName) {
          displayName = localStorage.getItem('displayName') || localStorage.getItem('email')?.split('@')[0] || 'Traveler';
        }
      }
      
      if (profileSnap.exists()) {
        const data = profileSnap.data();
        
        // For own profile, ensure we have a proper displayName
        let finalDisplayName = data.displayName;
        if (isOwnProfileView) {
          // For Google/Apple users, use their displayName
          if (currentUser.displayName) {
            finalDisplayName = currentUser.displayName;
            // Update Firestore if the displayName doesn't match
            if (data.displayName !== currentUser.displayName) {
              await updateDoc(profileRef, { displayName: currentUser.displayName });
            }
          } 
          // For email/password users, always use email username as displayName
          else if (currentUser.email) {
            const emailUsername = currentUser.email.split('@')[0];
            finalDisplayName = emailUsername;
            // Update Firestore if the displayName is not the email username
            if (data.displayName !== emailUsername) {
              await updateDoc(profileRef, { displayName: emailUsername });
            }
          }
        }
        
        // Generate random DiceBear avatar if no photo, using Google photo, or missing white background
        let photoToUse = data.photoURL;
        // Check if it's a DiceBear avatar WITH white background
        if (!photoToUse || !photoToUse.includes('dicebear.com') || !photoToUse.includes('backgroundColor=ffffff')) {
          photoToUse = generateRandomAvatar(userId);
          // Only save if it's the user's own profile
          if (isOwnProfileView) {
            await updateDoc(profileRef, { photoURL: photoToUse });
          }
        }
        
        setProfile({
          // For external profiles, ONLY use data from Firestore, not current user's data
          displayName: isOwnProfileView 
            ? (finalDisplayName || displayName || 'Traveler')
            : (data.displayName || 'Traveler'),
          bio: data.bio || '',
          location: data.location || '',
          website: data.website || '',
          photoURL: photoToUse,
          googlePhotoURL: isOwnProfileView ? googlePhotoURL : '', // Only for own profile
          travelStyle: data.travelStyle || '',
          favoriteDestination: data.favoriteDestination || '',
          countriesVisited: data.countriesVisited || 0,
          joinedAt: data.joinedAt
        });
      } else {
        // Profile doesn't exist
        if (!isOwnProfileView) {
          // For external profiles that don't exist, show empty profile
          setProfile({
            displayName: 'Unknown User',
            bio: '',
            location: '',
            website: '',
            photoURL: generateRandomAvatar(userId),
            googlePhotoURL: '',
            travelStyle: '',
            favoriteDestination: '',
            countriesVisited: 0,
            joinedAt: null
          });
          return;
        }
        
        // Create initial profile ONLY for own profile
        let initialDisplayName = displayName;
        
        // For email/password users, ensure we have the email username
        if (currentUser && currentUser.email && !currentUser.displayName) {
          initialDisplayName = currentUser.email.split('@')[0];
        }
        
        // Fallback to localStorage or email from localStorage
        if (!initialDisplayName) {
          initialDisplayName = localStorage.getItem('displayName') || localStorage.getItem('email')?.split('@')[0] || 'Traveler';
        }
        
        // Always generate random DiceBear avatar (ignore Google photo)
        const randomAvatar = generateRandomAvatar(userId);
        
        const initialProfile = {
          displayName: initialDisplayName,
          bio: '',
          location: '',
          website: '',
          photoURL: randomAvatar, // Always use random DiceBear avatar
          travelStyle: '',
          favoriteDestination: '',
          countriesVisited: 0,
          joinedAt: serverTimestamp(),
          userId: userId,
        };
        await setDoc(profileRef, initialProfile);
        setProfile({ ...initialProfile });
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

  // Only require login for own profile, not for viewing others
  if (!user && !externalUid) {
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
              <div className="flex flex-col items-center -mt-12 relative">
                {profile.photoURL ? (
                  <img
                    src={profile.photoURL}
                    alt={profile.displayName}
                    className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md bg-zinc-100"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div 
                  className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 items-center justify-center text-white font-bold text-3xl border-4 border-white shadow-md"
                  style={{ display: profile.photoURL ? 'none' : 'flex' }}
                >
                  {getInitials(profile.displayName)}
                </div>
                {/* Change avatar button */}
                {isOwnProfile && (
                  <button
                    onClick={() => setShowAvatarPicker(true)}
                    className="absolute -bottom-1 right-1/2 translate-x-8 w-8 h-8 bg-white border border-zinc-200 rounded-full shadow-md flex items-center justify-center hover:bg-zinc-50 transition-colors"
                    title="Change avatar"
                  >
                    <svg className="w-4 h-4 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
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

      {/* Avatar Picker Modal */}
      {showAvatarPicker && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="p-4 border-b border-zinc-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-zinc-900">Choose Avatar</h3>
                <p className="text-sm text-zinc-500">Select an avatar for your profile</p>
              </div>
              <button
                onClick={() => setShowAvatarPicker(false)}
                className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Avatar Grid */}
            <div className="p-4 overflow-y-auto max-h-[50vh]">
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                {AVATAR_COLLECTION.map((avatar, index) => (
                  <button
                    key={index}
                    onClick={async () => {
                      try {
                        // Update in Firestore
                        const profileRef = doc(db, 'user_profiles', user.uid);
                        await updateDoc(profileRef, { photoURL: avatar.url });
                        // Update local state
                        setProfile({ ...profile, photoURL: avatar.url });
                        setShowAvatarPicker(false);
                      } catch (error) {
                        console.error('Error updating avatar:', error);
                        alert('Failed to update avatar');
                      }
                    }}
                    className={`aspect-square rounded-xl border-2 overflow-hidden hover:border-blue-500 hover:shadow-lg transition-all ${
                      profile.photoURL === avatar.url ? 'border-blue-500 ring-2 ring-blue-200' : 'border-zinc-200'
                    }`}
                  >
                    <img src={avatar.url} alt={avatar.name} className="w-full h-full object-cover bg-zinc-50" />
                  </button>
                ))}
              </div>
            </div>

            {/* Footer with Random & Google options */}
            <div className="p-4 border-t border-zinc-200 space-y-3">
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    try {
                      const newAvatar = generateRandomAvatar(Date.now().toString());
                      const profileRef = doc(db, 'user_profiles', user.uid);
                      await updateDoc(profileRef, { photoURL: newAvatar });
                      setProfile({ ...profile, photoURL: newAvatar });
                      setShowAvatarPicker(false);
                    } catch (error) {
                      console.error('Error generating random avatar:', error);
                    }
                  }}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl text-sm font-medium hover:from-purple-600 hover:to-pink-600 transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Random Avatar
                </button>
                {profile.googlePhotoURL && (
                  <button
                    onClick={async () => {
                      try {
                        const profileRef = doc(db, 'user_profiles', user.uid);
                        await updateDoc(profileRef, { photoURL: profile.googlePhotoURL });
                        setProfile({ ...profile, photoURL: profile.googlePhotoURL });
                        setShowAvatarPicker(false);
                      } catch (error) {
                        console.error('Error setting Google photo:', error);
                      }
                    }}
                    className="flex-1 px-4 py-3 bg-zinc-100 text-zinc-700 rounded-xl text-sm font-medium hover:bg-zinc-200 transition-all flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Use Google Photo
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowAvatarPicker(false)}
                className="w-full px-4 py-2.5 text-zinc-500 hover:text-zinc-700 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;
