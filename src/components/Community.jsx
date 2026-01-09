import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import Bottom from './bottomfoot';
import { db, auth, storage } from '../Firebase';
import { onAuthStateChanged } from 'firebase/auth';
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
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

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
    if ((!newPost.trim() && !pollActive) || !user || posting) return;

    setPosting(true);
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
      setNewPost('');
      setPollOptions(['', '']);
      setPollActive(false);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to create post. Please try again.');
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
        await deleteDoc(doc(db, 'community_posts', postId));
      } catch (error) {
        console.error('Error deleting post:', error);
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

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Just now';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
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
      <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-zinc-100 to-zinc-50">
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
          
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 mb-1">Travel Community</h1>
            <p className="text-zinc-500 text-sm">Share your adventures & connect with travelers</p>
          </div>

          {/* Create Post Card */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-zinc-200/60 shadow-lg p-4 mb-6">
            <div className="flex gap-3">
              {(userProfile?.photoURL || user.photoURL) ? (
                <img src={userProfile?.photoURL || user.photoURL} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
                  {getInitials(userProfile?.displayName || user.displayName || user.email)}
                </div>
              )}
              <div className="flex-1">
                <textarea
                  ref={textareaRef}
                  value={newPost}
                  onChange={handleTextareaChange}
                  placeholder="Share your travel story, tips, or ask a question..."
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 text-sm placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none min-h-[80px]"
                  rows={3}
                  maxLength={500}
                />
                <div className="flex items-center gap-2 mt-2">
                  {/* Poll toggle only */}
                  <button type="button" className={`text-xs px-2 py-1 rounded ${pollActive ? 'bg-blue-100 text-blue-700' : 'bg-zinc-100 text-zinc-500 hover:bg-blue-50'}`} onClick={() => setPollActive(v => !v)}>
                    <svg className="w-5 h-5 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 17v-6m4 6V7m4 10v-3" /></svg>
                    Poll
                  </button>
                </div>
                {/* Poll options UI */}
                {pollActive && (
                  <div className="mt-2 space-y-1">
                    {pollOptions.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-1">
                        <input
                          type="text"
                          value={opt}
                          onChange={e => handlePollOptionChange(idx, e.target.value)}
                          className="flex-1 px-2 py-1 border border-zinc-200 rounded text-xs"
                          placeholder={`Option ${idx + 1}`}
                          maxLength={50}
                        />
                        {pollOptions.length > 2 && (
                          <button type="button" className="text-red-500 text-xs px-1" onClick={() => removePollOption(idx)}>&times;</button>
                        )}
                      </div>
                    ))}
                    <button type="button" className="text-blue-600 text-xs mt-1" onClick={addPollOption}>+ Add Option</button>
                  </div>
                )}
                <div className="flex items-center justify-between mt-3">
                  <div className="text-xs text-zinc-400">
                    {newPost.length}/500
                  </div>
                  <button
                    onClick={handleCreatePost}
                    disabled={(!newPost.trim() && !pollActive) || posting || newPost.length > 500}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-all flex items-center gap-2"
                  >
                    {posting ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    )}
                    Post
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Posts Feed */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-3 border-zinc-200 border-t-blue-600 rounded-full animate-spin"></div>
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
                            className="w-10 h-10 rounded-full object-cover cursor-pointer"
                            onClick={() => navigate(`/profile?uid=${post.authorId}`)}
                          />
                        ) : (
                          <div
                            className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-medium text-sm cursor-pointer"
                            onClick={() => navigate(`/profile?uid=${post.authorId}`)}
                          >
                            {getInitials(post.authorName)}
                          </div>
                        )}
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
                          {reply.authorPhoto ? (
                            <img src={reply.authorPhoto} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-medium text-xs flex-shrink-0">
                              {getInitials(reply.authorName)}
                            </div>
                          )}
                          <div className="flex-1 bg-white rounded-xl px-3 py-2">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-zinc-900 text-xs">{reply.authorName}</span>
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
      
      <div className="w-full fixed bottom-0">
        <Bottom />
      </div>
    </div>
  );
}

export default Community;
