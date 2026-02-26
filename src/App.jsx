import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  serverTimestamp,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  deleteDoc,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  onAuthStateChanged,
  signOut,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from 'firebase/auth';
import { 
  MessageCircle, Send, User, LayoutGrid, ClipboardList, 
  Plus, Trash2, LogOut, Mail, Lock, Settings, X, Megaphone,
  CheckSquare, Square, ThumbsUp, ThumbsDown, Plane, Map as MapIcon, MapPin, Star, MessageSquare
} from 'lucide-react';

// Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyAUNv_LB9vmv0otd1a9f5xxf49Cj7RiWbM",
  authDomain: "chating-fd863.firebaseapp.com",
  projectId: "chating-fd863",
  storageBucket: "chating-fd863.firebasestorage.app",
  messagingSenderId: "533219040597",
  appId: "1:533219040597:web:87e4a2269bb122bc8523dc",
  measurementId: "G-Q1S7BLJ1ER"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "chating-fd863";

// 공통 반응 핸들러 (좋아요)
const handleReaction = async (collectionName, docId, reactionType, userId) => {
  const docRef = doc(db, 'artifacts', appId, 'public', 'data', collectionName, docId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return;
  const data = snap.data();
  const likes = data.likes || [];
  if (reactionType === 'like') {
    if (likes.includes(userId)) {
      await updateDoc(docRef, { likes: arrayRemove(userId) });
    } else {
      await updateDoc(docRef, { likes: arrayUnion(userId) });
    }
  }
};

// 댓글 섹션
function CommentSection({ collectionName, postId, currentUser, userProfile }) {
  const [comments, setComments] = useState([]);
  const [commentInput, setCommentInput] = useState('');

  useEffect(() => {
    const commentsCol = collection(db, 'artifacts', appId, 'public', 'data', collectionName, postId, 'comments');
    const unsub = onSnapshot(commentsCol, (snap) => {
      const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setComments(docs.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0)));
    }, (err) => console.error(err));
    return () => unsub();
  }, [postId, collectionName]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentInput.trim() || !userProfile) return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', collectionName, postId, 'comments'), {
        text: commentInput,
        author: userProfile.nickname,
        uid: currentUser.uid,
        createdAt: serverTimestamp()
      });
      setCommentInput('');
    } catch (err) { console.error("댓글 등록 실패", err); }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', collectionName, postId, 'comments', commentId));
    } catch (err) { console.error("댓글 삭제 실패", err); }
  };

  return (
    <div className="mt-4 pt-4 border-t border-slate-50">
      <div className="space-y-3 mb-4">
        {comments.map(c => (
          <div key={c.id} className="flex justify-between items-start group">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[11px] font-black text-slate-700">{c.author}</span>
                <span className="text-[9px] text-slate-400">{c.createdAt?.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>
              <p className="text-sm text-slate-600 leading-tight">{c.text}</p>
            </div>
            {c.uid === currentUser?.uid && (
              <button onClick={() => handleDeleteComment(c.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                <Trash2 size={12} />
              </button>
            )}
          </div>
        ))}
      </div>
      <form onSubmit={handleAddComment} className="flex gap-2">
        <input 
          type="text" 
          placeholder="댓글 작성..." 
          value={commentInput}
          onChange={(e) => setCommentInput(e.target.value)}
          className="flex-1 bg-slate-50 border-none rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all"
        />
        <button type="submit" disabled={!commentInput.trim()} className="text-blue-600 disabled:text-slate-300 transition-colors">
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}

// 여행지도
function TravelMap({ places, onAddPlace, userId }) {
  const mapRef = useRef(null);
  const handleMapClick = (e) => {
    const rect = mapRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const name = prompt("장소 이름:");
    if (name) onAddPlace({ name, x, y });
  };

  return (
    <div className="relative w-full aspect-video bg-blue-50 rounded-[2rem] border-2 border-dashed border-blue-200 overflow-hidden cursor-crosshair" ref={mapRef} onClick={handleMapClick}>
      <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
        <MapIcon size={120} className="text-blue-900" />
      </div>
      {places.map((place) => (
        <div key={place.id} className="absolute transform -translate-x-1/2 -translate-y-full" style={{ left: `${place.x}%`, top: `${place.y}%` }}>
          <div className="flex flex-col items-center">
             <div className="bg-white px-2 py-1 rounded-lg shadow-md text-[10px] font-bold mb-1">{place.name}</div>
             <MapPin size={24} className="text-blue-600" fill="currentColor" fillOpacity={0.2} />
          </div>
        </div>
      ))}
      <div className="absolute bottom-4 left-4 bg-white/80 backdrop-blur px-3 py-1 rounded-full text-[10px] font-bold text-blue-600 border border-blue-100 shadow-sm">
        지도를 클릭하여 마커 추가
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('chat');
  const [messages, setMessages] = useState([]);
  const [posts, setPosts] = useState([]);
  const [travelPosts, setTravelPosts] = useState([]);
  const [favoritePlaces, setFavoritePlaces] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [postInput, setPostInput] = useState({ title: '', content: '' });
  const [travelInput, setTravelInput] = useState({ title: '', content: '' });
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [authForm, setAuthForm] = useState({ email: '', password: '', nickname: '' });
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const userDoc = await getDoc(doc(db, 'artifacts', appId, 'users', currentUser.uid, 'profile', 'info'));
        if (userDoc.exists()) setProfile(userDoc.data());
      } else {
        setUser(null);
        setProfile(null);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !profile) return;
    const unsubMsg = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'messages'), (snap) => {
      setMessages(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0)));
    });
    const unsubBoard = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'board'), (snap) => {
      setPosts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    });
    const unsubTravel = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'travel'), (snap) => {
      setTravelPosts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    });
    const unsubPlaces = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'places'), (snap) => {
      setFavoritePlaces(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => { unsubMsg(); unsubBoard(); unsubTravel(); unsubPlaces(); };
  }, [user, profile]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (isLoginMode) {
        await signInWithEmailAndPassword(auth, authForm.email, authForm.password);
      } else {
        const userCred = await createUserWithEmailAndPassword(auth, authForm.email, authForm.password);
        const profileData = { nickname: authForm.nickname, email: authForm.email };
        await setDoc(doc(db, 'artifacts', appId, 'users', userCred.user.uid, 'profile', 'info'), profileData);
        setProfile(profileData);
      }
    } catch (err) { alert("로그인/회원가입 실패"); }
    finally { setIsLoading(false); }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'messages'), {
      text: inputValue, uid: user.uid, displayName: profile.nickname, createdAt: serverTimestamp()
    });
    setInputValue('');
  };

  const handleAddPost = async (e) => {
    e.preventDefault();
    if (!postInput.title.trim() || !postInput.content.trim()) return;
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'board'), {
      title: postInput.title, content: postInput.content, author: profile.nickname,
      uid: user.uid, createdAt: serverTimestamp(), likes: []
    });
    setPostInput({ title: '', content: '' });
  };

  if (!user || (!profile && !isLoginMode)) {
    return (
      <div className="fixed inset-0 bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl border border-slate-100">
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center text-white mx-auto mb-6 shadow-xl shadow-blue-200">
              <LayoutGrid size={36} />
            </div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">{isLoginMode ? '로그인' : '회원가입'}</h2>
          </div>
          <form onSubmit={handleAuth} className="space-y-4">
            <input type="email" placeholder="이메일" className="w-full px-6 py-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20" value={authForm.email} onChange={(e) => setAuthForm({...authForm, email: e.target.value})} required />
            <input type="password" placeholder="비밀번호" className="w-full px-6 py-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20" value={authForm.password} onChange={(e) => setAuthForm({...authForm, password: e.target.value})} required />
            {!isLoginMode && <input type="text" placeholder="닉네임" className="w-full px-6 py-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20" value={authForm.nickname} onChange={(e) => setAuthForm({...authForm, nickname: e.target.value})} required />}
            <button type="submit" className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-lg mt-4 active:scale-95 transition-all">{isLoading ? '처리 중...' : (isLoginMode ? '로그인' : '시작하기')}</button>
          </form>
          <button onClick={() => setIsLoginMode(!isLoginMode)} className="w-full mt-8 text-sm font-bold text-blue-600">{isLoginMode ? '계정이 없으신가요?' : '이미 계정이 있나요?'}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col max-w-2xl mx-auto border-x shadow-2xl font-sans">
      <header className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-30 p-5 flex justify-between items-center">
        <div className="flex items-center gap-2 text-blue-600 font-black text-2xl tracking-tighter italic">
          <LayoutGrid size={28} /> COMMUNITY
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] text-slate-400 font-bold">USER</p>
            <p className="text-sm font-black text-slate-700">{profile?.nickname}</p>
          </div>
          <button onClick={() => signOut(auth)} className="bg-slate-50 p-3 rounded-xl hover:text-red-500 transition-colors"><LogOut size={20}/></button>
        </div>
      </header>

      <nav className="flex bg-white border-b sticky top-[81px] z-20 px-4">
        {[
          { id: 'chat', icon: MessageCircle, label: '채팅' },
          { id: 'board', icon: ClipboardList, label: '게시판' },
          { id: 'travel', icon: Plane, label: '여행지도' }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)} 
            className={`flex-1 py-4 text-sm font-black flex items-center justify-center gap-2 border-b-4 transition-all ${activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-300'}`}
          >
            <tab.icon size={18} /> {tab.label}
          </button>
        ))}
      </nav>

      <main className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
        {activeTab === 'chat' && (
          <div className="flex flex-col h-full">
            <div className="flex-1 space-y-4 mb-6">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex flex-col ${msg.uid === user.uid ? 'items-end' : 'items-start'}`}>
                  <span className="text-[10px] text-slate-400 font-bold mb-1 px-1">{msg.displayName}</span>
                  <div className={`max-w-[85%] px-5 py-3 rounded-2xl text-sm shadow-sm ${msg.uid === user.uid ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={handleSendMessage} className="flex gap-2 sticky bottom-0 bg-white p-2 rounded-2xl border shadow-lg">
              <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="메시지를 입력하세요..." className="flex-1 px-4 outline-none text-sm" />
              <button type="submit" className="bg-blue-600 text-white p-3 rounded-xl shadow-blue-100"><Send size={20} /></button>
            </form>
          </div>
        )}

        {activeTab === 'board' && (
          <div className="space-y-6">
            <form onSubmit={handleAddPost} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
              <input type="text" placeholder="제목을 입력하세요" value={postInput.title} onChange={(e) => setPostInput({...postInput, title: e.target.value})} className="w-full font-black text-lg outline-none" />
              <textarea placeholder="내용을 입력하세요..." value={postInput.content} onChange={(e) => setPostInput({...postInput, content: e.target.value})} className="w-full text-sm min-h-[100px] outline-none resize-none text-slate-600" />
              <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-black shadow-lg">글쓰기</button>
            </form>

            {posts.map(post => (
              <div key={post.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                <div className="flex justify-between mb-2">
                   <h3 className="text-lg font-black">{post.title}</h3>
                   {post.uid === user.uid && <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'board', post.id))} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>}
                </div>
                <p className="text-sm text-slate-600 mb-4">{post.content}</p>
                <div className="pt-4 border-t border-slate-50">
                  <button onClick={() => handleReaction('board', post.id, 'like', user.uid)} className={`flex items-center gap-2 text-xs font-bold ${post.likes?.includes(user.uid) ? 'text-blue-600' : 'text-slate-400'}`}>
                    <ThumbsUp size={16} /> 좋아요 {post.likes?.length || 0}
                  </button>
                  <CommentSection collectionName="board" postId={post.id} currentUser={user} userProfile={profile} />
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'travel' && (
          <div className="space-y-6">
            <TravelMap places={favoritePlaces} onAddPlace={(data) => addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'places'), {...data, uid: user.uid})} userId={user.uid} />
            <div className="grid grid-cols-2 gap-3">
              {favoritePlaces.map(p => (
                <div key={p.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex justify-between items-center shadow-sm">
                  <span className="text-xs font-black">{p.name}</span>
                  {p.uid === user.uid && <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'places', p.id))} className="text-slate-300 hover:text-red-500"><X size={14}/></button>}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
