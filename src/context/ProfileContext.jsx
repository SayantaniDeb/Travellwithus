import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../Firebase';

const ProfileContext = createContext(null);
const styles = ['adventurer', 'adventurer-neutral', 'avataaars', 'big-ears', 'big-smile', 'bottts', 'croodles', 'fun-emoji', 'icons', 'lorelei', 'micah', 'miniavs', 'notionists', 'open-peeps', 'personas', 'pixel-art', 'thumbs'];
function fallbackAvatar(uid) {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) hash = uid.charCodeAt(i) + ((hash << 5) - hash);
  return `https://api.dicebear.com/7.x/${styles[Math.abs(hash) % styles.length]}/svg?seed=${uid}&backgroundColor=ffffff`;
}

export function ProfileProvider({ children }) {
  const [identity, setIdentity] = useState(() => ({ user: auth.currentUser, profile: null }));
  useEffect(() => {
    let stopProfile;
    let activeUid;
    const stopAuth = onAuthStateChanged(auth, user => {
      stopProfile?.();
      activeUid = user?.uid;
      setIdentity(previous => ({ user, profile: previous.user?.uid === user?.uid ? previous.profile : null }));
      if (!user) return;
      stopProfile = onSnapshot(doc(db, 'user_profiles', user.uid), snapshot => {
        if (activeUid === user.uid) setIdentity({ user, profile: snapshot.exists() ? snapshot.data() : null });
      }, error => console.error('Could not load navigation profile:', error));
    });
    return () => { activeUid = undefined; stopAuth(); stopProfile?.(); };
  }, []);
  const { user, profile } = identity;
  const value = {
    user,
    userName: profile?.displayName || user?.displayName || user?.email?.split('@')[0] || '',
    userPhoto: user ? profile?.photoURL || fallbackAvatar(user.uid) : null,
  };
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfileIdentity() {
  const identity = useContext(ProfileContext);
  if (!identity) throw new Error('ProfileProvider is required');
  return identity;
}
