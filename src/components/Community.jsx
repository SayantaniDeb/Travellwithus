import { LoadingOverlay } from './NavigationLoading';
import { API_BASE } from '../utils/apiBase';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import Spinner from './ui/Spinner';
import LoadingImage from './ui/LoadingImage';
import { Plus, X, ChartNoAxesColumnIncreasing } from 'lucide-react';
import { db, auth } from '../Firebase';
import { onAuthStateChanged } from '../Firebase';
import { 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy,
  updateDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
const API_URL = API_BASE;
const PHOTO_LIMIT = 5 * 1024 * 1024;

function Community() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState('');
  const [posting, setPosting] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [expandedPosts, setExpandedPosts] = useState({});
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [pollActive, setPollActive] = useState(false);
  const [pollVoting, setPollVoting] = useState({}); // { [postId]: true/false }
  const textareaRef = useRef(null);
  const replyInputRef = useRef(null);
  const photoInputRef = useRef(null);
  const [choosingPhoto, setChoosingPhoto] = useState(false);
  const [postStage, setPostStage] = useState('');
  const [slowPost, setSlowPost] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [photoPermission, setPhotoPermission] = useState(false);
  const [checkingPhotoStatus, setCheckingPhotoStatus] = useState(true);
  const [photoStatus, setPhotoStatus] = useState({ ready: false, message: 'Checking photo availability…' });
  const [postError, setPostError] = useState('');
  const [reportedPhotos, setReportedPhotos] = useState({});

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timer = setTimeout(() => controller.abort(), 15000);
    fetch(`${API_URL}/api/community/image-status`, { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error(); return response.json(); })
      .then(status => { if (active) setPhotoStatus(status); })
      .catch(() => { if (active) setPhotoStatus({ ready: false, message: 'Photo posting is unavailable. You can still share text and polls.' }); })
      .finally(() => { clearTimeout(timer); if (active) setCheckingPhotoStatus(false); });
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, []);
  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo.preview); }, [photo]);

  useEffect(() => {
    const input = photoInputRef.current;
    const cancelled = () => setChoosingPhoto(false);
    input?.addEventListener('cancel', cancelled);
    return () => input?.removeEventListener('cancel', cancelled);
  }, [user]);
  useEffect(() => {
    if (!choosingPhoto) return;
    // Older embedded browsers may return focus without dispatching input cancel.
    const returned = () => setChoosingPhoto(false);
    window.addEventListener('focus', returned);
    return () => window.removeEventListener('focus', returned);
  }, [choosingPhoto]);
  useEffect(() => {
    setSlowPost(false);
    if (!posting) return;
    const timer = setTimeout(() => setSlowPost(true), 10000);
    return () => clearTimeout(timer);
  }, [posting]);

  const selectPhoto = event => {
    setChoosingPhoto(false);
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setPostError('Choose a JPEG, PNG or WebP photo.'); return; }
    if (file.size > PHOTO_LIMIT) { setPostError('Choose a photo no larger than 5 MB.'); return; }
    setPhoto({ file, preview: URL.createObjectURL(file) });
    setPhotoPermission(false);
    setPostError('');
  };

  const photoRequest = async (path, method = 'POST', payload) => {
    const token = await user.getIdToken();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 90000);
    try {
      const response = await fetch(`${API_URL}/api/community/${path}`, {
        method, signal: controller.signal,
        headers: { Authorization: `Bearer ${token}`, ...(payload ? { 'Content-Type': 'application/json' } : {}) },
        ...(payload ? { body: JSON.stringify(payload) } : {})
      });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'Photo posting could not complete. Please try again.');
      return data;
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('The photo request took too long. Your draft is kept. Check the feed before trying again in case it was published.');
      throw error;
    } finally {
      clearTimeout(timer);
    }
  };

  const reportPhoto = async postId => {
    if (!user || reportedPhotos[postId]) return;
    try { await photoRequest(`image-post/${encodeURIComponent(postId)}/report`); setReportedPhotos(current => ({ ...current, [postId]: true })); }
    catch (error) { setPostError(error.message); }
  };

  // Auth listener and fetch profile
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Fetch user profile from Firestore
        try {
          const profileRef = doc(db, 'user_profiles', currentUser.uid);
          const profileSnap = await getDoc(profileRef);
          if (profileSnap.exists()) {
            setUserProfile(profileSnap.data());
          }
        } catch (error) {
          console.error('Error fetching profile:', error);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch posts
  useEffect(() => {
    const postsRef = collection(db, 'community_posts');
    const q = query(postsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPosts(postsData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching posts:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Auto-resize textarea
  const handleTextareaChange = (e) => {
    setNewPost(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  };


  // Handle poll option change
  const handlePollOptionChange = (idx, value) => {
    setPollOptions((opts) => opts.map((opt, i) => (i === idx ? value : opt)));
  };

  const addPollOption = () => {
    setPollOptions((opts) => [...opts, '']);
  };

  const removePollOption = (idx) => {
    if (pollOptions.length > 2) {
      setPollOptions((opts) => opts.filter((_, i) => i !== idx));
    }
  };

  // Create new post
  const handleCreatePost = async () => {
    if ((!newPost.trim() && !pollActive && !photo) || !user || posting || (photo && (!photoPermission || !photoStatus.ready))) return;

    setPosting(true);
    setPostStage(photo ? 'Preparing photo…' : 'Publishing…');
    setPostError('');
    try {
      // Use profile data if available, otherwise fallback to auth data
      const authorName = userProfile?.displayName || user.displayName || user.email?.split('@')[0] || 'Anonymous';
      const authorPhoto = userProfile?.photoURL || user.photoURL || null;
      // Poll data
      let poll = null;
      if (pollActive) {
        poll = pollOptions.filter(opt => opt.trim()).map(opt => ({ option: opt.trim(), votes: [] }));
        if (poll.length < 2) poll = null;
      }
      if (photo) {
        const encoded = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error('The photo could not be read. Please select it again.'));
          reader.readAsDataURL(photo.file);
        });
        setPostStage('Checking & publishing…');
        await photoRequest('image-post', 'POST', { image: encoded, content: newPost.trim(), permission: photoPermission, poll: poll ? poll.map(option => option.option) : [] });
      } else {
      await addDoc(collection(db, 'community_posts'), {
        content: newPost.trim(),
        authorId: user.uid,
        authorName: authorName,
        authorPhoto: authorPhoto,
        createdAt: serverTimestamp(),
        likes: [],
        replies: [],
        poll: poll || null
      });
      }
      setPhoto(null);
      setPhotoPermission(false);
      setNewPost('');
      setPollOptions(['', '']);
      setPollActive(false);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('Error creating post:', error);
      setPostError(error.message || 'Failed to create post. Please try again.');
    }
    setPosting(false);
  };

  // Like/Unlike post
  const handleLike = async (postId) => {
    if (!user) return;

    const postRef = doc(db, 'community_posts', postId);
    const post = posts.find(p => p.id === postId);
    
    if (post?.likes?.includes(user.uid)) {
      await updateDoc(postRef, {
        likes: arrayRemove(user.uid)
      });
    } else {
      await updateDoc(postRef, {
        likes: arrayUnion(user.uid)
      });
    }
  };

  // Add reply
  const handleReply = async (postId) => {
    if (!replyText.trim() || !user) return;

    const postRef = doc(db, 'community_posts', postId);
    
    // Use profile data if available
    const authorName = userProfile?.displayName || user.displayName || user.email?.split('@')[0] || 'Anonymous';
    const authorPhoto = userProfile?.photoURL || user.photoURL || null;
    
    const newReply = {
      id: Date.now().toString(),
      content: replyText.trim(),
      authorId: user.uid,
      authorName: authorName,
      authorPhoto: authorPhoto,
      createdAt: new Date().toISOString()
    };

    try {
      await updateDoc(postRef, {
        replies: arrayUnion(newReply)
      });
      setReplyText('');
      setReplyingTo(null);
      // Expand replies after adding one
      setExpandedPosts(prev => ({ ...prev, [postId]: true }));
    } catch (error) {
      console.error('Error adding reply:', error);
    }
  };

  // Delete post
  const handleDeletePost = async (postId, authorId) => {
    if (!user || user.uid !== authorId) return;
    
    if (window.confirm('Are you sure you want to delete this post?')) {
      try {
        const post = posts.find(item => item.id === postId);
        if (post?.media) await photoRequest(`image-post/${encodeURIComponent(postId)}`, 'DELETE');
        else await deleteDoc(doc(db, 'community_posts', postId));
      } catch (error) {
        console.error('Error deleting post:', error);
        setPostError(error.message || 'Could not delete this post.');
      }
    }
  };

  // Handle poll vote
  const handlePollVote = async (postId, optionIdx) => {
    if (!user) return;
    const post = posts.find(p => p.id === postId);
    if (!post || !post.poll) return;
    // Remove user from all options, add to selected
    const newPoll = post.poll.map((opt, idx) => {
      let votes = Array.isArray(opt.votes) ? opt.votes.filter(uid => uid !== user.uid) : [];
      if (idx === optionIdx) votes.push(user.uid);
      return { ...opt, votes };
    });
    setPollVoting(v => ({ ...v, [postId]: true }));
    try {
      await updateDoc(doc(db, 'community_posts', postId), { poll: newPoll });
    } catch (e) { console.error(e); }
    setPollVoting(v => ({ ...v, [postId]: false }));
  };

  // Format date as relative time
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Just now';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    if (diffSecs < 60) return diffSecs <= 5 ? 'Just now' : `${diffSecs}s ago`;
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
    if (diffWeeks < 4) return diffWeeks === 1 ? '1 week ago' : `${diffWeeks} weeks ago`;
    if (diffMonths < 12) return diffMonths === 1 ? '1 month ago' : `${diffMonths} months ago`;
    return diffYears === 1 ? '1 year ago' : `${diffYears} years ago`;
  };

  // Get initials for avatar
  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  };

  // Toggle replies visibility
  const toggleReplies = (postId) => {
    setExpandedPosts(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  if (!user) {
    return (
      <div className="min-h-screen trip-page-background community-background">
        <Navbar />
        <div className="pt-20 sm:pt-24 pb-24 px-4">
          <div className="max-w-md mx-auto text-center">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-zinc-200/60 shadow-xl p-8">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-zinc-900 mb-2">Join the Community</h2>
              <p className="text-zinc-500 text-sm mb-6">Sign in to share your travel experiences and connect with fellow travelers.</p>
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
    <div className="min-h-screen trip-page-background community-background">
      <Navbar />
      <div className="pt-20 sm:pt-24 pb-24 px-4">
        <div className="max-w-2xl mx-auto">
          
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 mb-1">Travel Community</h1>
            <p className="text-zinc-500 text-sm">Share your adventures & connect with travelers</p>
          </div>

          {/* Create Post Card */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-zinc-200/60 shadow-lg p-4 mb-6">
            <div className="flex gap-3">
              {(userProfile?.photoURL || user.photoURL) ? (
                <img 
                  src={userProfile?.photoURL || user.photoURL} 
                  alt="" 
                  className="w-10 h-10 rounded-full object-cover flex-shrink-0 bg-zinc-100"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div 
                className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 items-center justify-center text-white font-medium text-sm flex-shrink-0"
                style={{ display: (userProfile?.photoURL || user.photoURL) ? 'none' : 'flex' }}
              >
                {getInitials(userProfile?.displayName || user.displayName || user.email)}
              </div>
              <div className="min-w-0 flex-1">
                <textarea
                  ref={textareaRef}
                  value={newPost}
                  onChange={handleTextareaChange}
                  placeholder="Share your travel story, tips, or ask a question..."
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 text-sm placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none min-h-[80px]"
                  rows={3}
                  maxLength={500}
                  disabled={posting}
                />
                <div className="flex items-center gap-2 mt-2">
                  <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={selectPhoto} disabled={posting} className="hidden" aria-label="Choose a community photo" />
                  <button type="button" disabled={posting} aria-busy={choosingPhoto || (posting && !!photo)} onClick={() => { setChoosingPhoto(true); photoInputRef.current?.click(); }} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-blue-50 disabled:opacity-50">{(choosingPhoto || (posting && photo)) && <Spinner/>}{choosingPhoto ? 'Choosing photo…' : posting && photo ? 'Processing…' : 'Add photo'}</button>
                  {/* Poll toggle */}
                  <button type="button" disabled={posting} aria-pressed={pollActive} className={`inline-flex items-center rounded-lg border border-transparent px-3 py-2 text-xs font-medium transition ${pollActive ? 'bg-blue-100 text-blue-700' : 'bg-zinc-100 text-zinc-500 hover:bg-blue-50'}`} onClick={() => setPollActive(v => !v)}>
                    <svg className="w-5 h-5 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 17v-6m4 6V7m4 10v-3" /></svg>
                    Poll
                  </button>
                </div>
                {photo && <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2"><p className="text-xs font-medium text-slate-600">Local preview · not uploaded yet</p><button type="button" disabled={posting} onClick={() => { setPhoto(null); setPhotoPermission(false); }} className="rounded-lg px-2 py-1 text-xs text-red-600">Remove photo</button></div>
                  <LoadingImage src={photo.preview} alt="Selected community photo preview" className="min-h-32 max-h-64 w-full rounded-lg object-contain" />
                  <label className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-slate-600"><input type="checkbox" checked={photoPermission} disabled={posting} onChange={event => setPhotoPermission(event.target.checked)} className="mt-0.5" /><span>I own this photo or have permission to share it, including consent from identifiable people pictured.</span></label>
                  <p className="mt-2 text-[11px] leading-relaxed text-slate-500">Before publishing, the photo and caption are sent to OpenAI for an automated safety check. Location metadata is removed. Checks may miss unwanted content; they cannot verify consent.</p>
                  <p role="status" className={`mt-2 flex items-center gap-2 text-xs ${photoStatus.ready ? 'text-slate-500' : 'text-amber-700'}`}>{checkingPhotoStatus && <Spinner/>}{photoStatus.message}</p>
                </div>}
                {postError && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{postError}</p>}
                {posting && <p role="status" aria-live="polite" className="mt-3 flex items-center gap-2 text-xs text-blue-600"><Spinner/>{slowPost ? 'Still working. Photo checks can take a little longer; please keep this page open.' : postStage}</p>}
                {/* Poll options UI */}
                {pollActive && (
                  <section aria-label="Poll options" className="community-poll-editor mt-3 rounded-2xl border border-blue-100 bg-slate-50 p-3 sm:p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700"><ChartNoAxesColumnIncreasing size={17} aria-hidden="true" /></span>
                      <div className="min-w-0"><h3 className="text-sm font-semibold text-slate-900">Ask the community</h3><p className="text-[11px] text-slate-500">Add choices for travelers to vote on.</p></div>
                    </div>
                    <div className="space-y-2">
                      {pollOptions.map((opt, idx) => (
                        <div key={idx} className="flex min-w-0 items-center gap-2">
                          <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-semibold tabular-nums text-blue-700">{idx + 1}</span>
                          <input type="text" value={opt} onChange={e => handlePollOptionChange(idx, e.target.value)} disabled={posting}
                            aria-label={`Poll option ${idx + 1}`} className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
                            placeholder={`Option ${idx + 1}`} maxLength={50} />
                          {pollOptions.length > 2 && <button type="button" disabled={posting} aria-label={`Remove option ${idx + 1}`} title="Remove option" className="flex h-9 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500" onClick={() => removePollOption(idx)}><X size={15} aria-hidden="true" /></button>}
                        </div>
                      ))}
                    </div>
                    <button type="button" disabled={posting} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:border-blue-400 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 disabled:opacity-50" onClick={addPollOption}><Plus size={15} aria-hidden="true" />Add option</button>
                  </section>
                )}
                <div className="flex items-center justify-between mt-3">
                  <div className="text-xs text-zinc-400">
                    {newPost.length}/500
                  </div>
                  <button
                    aria-busy={posting}
                    onClick={handleCreatePost}
                    disabled={(!newPost.trim() && !pollActive && !photo) || posting || newPost.length > 500 || (photo && (!photoPermission || !photoStatus.ready))}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-all flex items-center gap-2"
                  >
                    {posting ? (
                      <Spinner/>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    )}
                    {posting ? postStage : 'Post'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Posts Feed */}
          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingOverlay label="Loading community…"/>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-zinc-900 font-medium mb-1">No posts yet</h3>
              <p className="text-zinc-500 text-sm">Be the first to share your travel experience!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <div key={post.id} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-zinc-200/60 shadow-lg overflow-hidden">
                  {/* Post Header */}
                  <div className="p-4 pb-0">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-3">
                        {post.authorPhoto ? (
                          <img
                            src={post.authorPhoto}
                            alt=""
                            className="w-10 h-10 rounded-full object-cover cursor-pointer bg-zinc-100"
                            onClick={() => navigate(`/profile?uid=${post.authorId}`)}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div
                          className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 items-center justify-center text-white font-medium text-sm cursor-pointer"
                          style={{ display: post.authorPhoto ? 'none' : 'flex' }}
                          onClick={() => navigate(`/profile?uid=${post.authorId}`)}
                        >
                          {getInitials(post.authorName)}
                        </div>
                        <div>
                          <h4
                            className="font-medium text-zinc-900 text-sm cursor-pointer hover:underline"
                            onClick={() => navigate(`/profile?uid=${post.authorId}`)}
                          >
                            {post.authorName}
                          </h4>
                          <p className="text-xs text-zinc-400">{formatDate(post.createdAt)}</p>
                        </div>
                      </div>
                      {user.uid === post.authorId && (
                        <button
                          onClick={() => handleDeletePost(post.id, post.authorId)}
                          className="p-2 hover:bg-zinc-100 rounded-lg transition-colors text-zinc-400 hover:text-red-500"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Post Content */}
                  <div className="px-4 py-3">
                    <p className="text-zinc-700 text-sm whitespace-pre-wrap">{post.content}</p>

                    {post.media?.moderationStatus === 'approved' && post.media.url && <figure className="mt-3">
                      <LoadingImage src={post.media.url} alt="Travel photo shared by this post's author" loading="lazy" className="min-h-32 max-h-[32rem] w-full rounded-xl object-contain bg-slate-50" />
                      <figcaption className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500"><span>Automated photo check completed</span><button type="button" disabled={Boolean(reportedPhotos[post.id])} onClick={() => reportPhoto(post.id)} className="text-slate-500 underline disabled:no-underline">{reportedPhotos[post.id] ? 'Photo reported for review' : 'Report photo'}</button></figcaption>
                    </figure>}
                    {/* Poll display */}
                    {post.poll && Array.isArray(post.poll) && post.poll.length > 1 && (
                      <div className="mt-3">
                        <div className="font-semibold text-xs text-zinc-600 mb-1">Poll:</div>
                        <ul className="space-y-1">
                          {post.poll.map((opt, idx) => {
                            const voted = Array.isArray(opt.votes) && opt.votes.includes(user.uid);
                            return (
                              <li key={idx} className="flex items-center gap-2">
                                <button
                                  disabled={pollVoting[post.id]}
                                  onClick={() => handlePollVote(post.id, idx)}
                                  className={`flex-1 text-xs text-zinc-700 text-left px-2 py-1 rounded transition-colors ${voted ? 'bg-blue-100 text-blue-700 font-semibold' : 'hover:bg-zinc-100'}`}
                                >
                                  {opt.option}
                                </button>
                                <span className="text-xs text-zinc-400">{opt.votes?.length || 0} votes</span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Post Actions */}
                  <div className="px-4 py-3 border-t border-zinc-100 flex items-center gap-4">
                    <button
                      onClick={() => handleLike(post.id)}
                      className={`flex items-center gap-1.5 text-sm transition-colors ${
                        post.likes?.includes(user.uid) 
                          ? 'text-red-500' 
                          : 'text-zinc-500 hover:text-red-500'
                      }`}
                    >
                      <svg className="w-5 h-5" fill={post.likes?.includes(user.uid) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      <span>{post.likes?.length || 0}</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        setReplyingTo(replyingTo === post.id ? null : post.id);
                        setReplyText('');
                      }}
                      className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-blue-500 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span>Reply</span>
                    </button>

                    {post.replies?.length > 0 && (
                      <button
                        onClick={() => toggleReplies(post.id)}
                        className="text-sm text-zinc-500 hover:text-zinc-700 ml-auto transition-colors"
                      >
                        {expandedPosts[post.id] ? 'Hide' : 'View'} {post.replies.length} {post.replies.length === 1 ? 'reply' : 'replies'}
                      </button>
                    )}
                  </div>

                  {/* Reply Input */}
                  {replyingTo === post.id && (
                    <div className="px-4 pb-4">
                      <div className="flex gap-2">
                        <input
                          ref={replyInputRef}
                          type="text"
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleReply(post.id)}
                          placeholder="Write a reply..."
                          className="flex-1 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                          autoFocus
                        />
                        <button
                          onClick={() => handleReply(post.id)}
                          disabled={!replyText.trim()}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 text-white rounded-lg text-sm font-medium transition-all"
                        >
                          Send
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Replies */}
                  {expandedPosts[post.id] && post.replies?.length > 0 && (
                    <div className="bg-zinc-50 px-4 py-3 space-y-3">
                      {post.replies.map((reply) => (
                        <div key={reply.id} className="flex gap-2">
                          {/* Make avatar clickable */}
                          {reply.authorPhoto ? (
                            <img
                              src={reply.authorPhoto}
                              alt=""
                              className="w-8 h-8 rounded-full object-cover flex-shrink-0 cursor-pointer bg-zinc-100"
                              onClick={() => navigate(`/profile?uid=${reply.authorId}`)}
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div
                            className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-green-600 items-center justify-center text-white font-medium text-xs flex-shrink-0 cursor-pointer"
                            style={{ display: reply.authorPhoto ? 'none' : 'flex' }}
                            onClick={() => navigate(`/profile?uid=${reply.authorId}`)}
                          >
                            {getInitials(reply.authorName)}
                          </div>
                          <div className="flex-1 bg-white rounded-xl px-3 py-2">
                            <div className="flex items-center gap-2 mb-1">
                              {/* Make name clickable */}
                              <span
                                className="font-medium text-zinc-900 text-xs cursor-pointer hover:underline"
                                onClick={() => navigate(`/profile?uid=${reply.authorId}`)}
                              >
                                {reply.authorName}
                              </span>
                              <span className="text-xs text-zinc-400">{formatDate(reply.createdAt)}</span>
                            </div>
                            <p className="text-sm text-zinc-700">{reply.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Community;
