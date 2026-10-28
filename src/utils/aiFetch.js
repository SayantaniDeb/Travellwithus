import { auth } from '../firebaseAuth';
export async function aiFetch(url, options = {}) {
 await auth?.authStateReady();
 const user=auth?.currentUser;
 if(!user || user.isAnonymous)throw new Error('Sign in to use AI generation. You can still write and save your own plan on this device.');
 const token=await user.getIdToken();
 try { const response=await fetch(url,{...options,headers:{...options.headers,Authorization:`Bearer ${token}`}});
  if(url.includes('/api/completions'))window.dispatchEvent(new Event('travelwithus:credits'));
  return response; }
 catch(error) {
  if(error.name === 'AbortError')throw error;
  throw new Error('Could not reach the planning service. Check your connection and try again. Your current itinerary has been kept.');
 }
}
