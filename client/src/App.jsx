import React, { useEffect, useRef, useState } from 'react';
import {
  Bell,
  Heart,
  Home,
  Image,
  MessageCircle,
  MessageSquare,
  Phone,
  PhoneOff,
  Search,
  Send,
  Settings,
  Share2,
  Smile,
  Users,
  Video,
} from 'lucide-react';

// Dùng biến môi trường để trỏ vào IP backend, tránh cố định localhost
// Ví dụ: tạo client/.env với VITE_API_URL=http://192.168.1.9:3000/api
const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3000/api`;
const SEARCH_DEBOUNCE = 350;

const SocialNetworkApp = () => {
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home');

  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
  });
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [newPost, setNewPost] = useState('');

  // Dữ liệu thực từ backend
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState({});
  const [activeChat, setActiveChat] = useState(null);
  const [newMessage, setNewMessage] = useState('');

  const [isVideoCalling, setIsVideoCalling] = useState(false);
  const [callPartner, setCallPartner] = useState(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStream = useRef(null);
  const messagesPollRef = useRef(null);

  const authorizedFetch = async (path, options = {}) => {
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || res.statusText);
    }
    if (res.status === 204) return null;
    return res.json();
  };

  const loadProfile = async () => {
    if (!token) return;
    try {
      const user = await authorizedFetch('/users/me');
      setCurrentUser(user);
      await Promise.all([loadPosts(), loadFriends(), loadFriendRequests(), loadConversations()]);
    } catch (err) {
      console.error(err);
      handleLogout();
    }
  };

  const loadPosts = async () => {
    if (!token) return;
    setPostsLoading(true);
    try {
      const data = await authorizedFetch('/posts');
      const mapped = data.map((p) => ({
        id: p._id,
        userId: p.user?._id,
        userName: p.user?.name || p.user?.username || 'Ẩn danh',
        userAvatar: p.user?.avatar || '👤',
        content: p.content,
        image: p.image,
        likes: p.likes?.length || 0,
        comments: p.comments?.length || 0,
        timestamp: new Date(p.createdAt || Date.now()).toLocaleString('vi-VN'),
        isLiked: (p.likes || []).includes(currentUser?._id),
      }));
      setPosts(mapped);
    } catch (err) {
      console.error(err);
    } finally {
      setPostsLoading(false);
    }
  };

  const handleAuth = async () => {
    setAuthError('');
    setAuthLoading(true);
    try {
      const body =
        authMode === 'register'
          ? {
            name: authForm.name,
            username: authForm.username,
            email: authForm.email,
            password: authForm.password,
          }
          : {
            email: authForm.email,
            password: authForm.password,
          };

      const endpoint = authMode === 'register' ? '/auth/register' : '/auth/login';
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Đăng nhập/Đăng ký thất bại');
      }

      const data = await res.json();
      const authToken = data.token;
      localStorage.setItem('token', authToken);
      setToken(authToken);
      setCurrentUser({
        id: data.user.id || data.user._id,
        name: data.user.name,
        username: data.user.username,
        avatar: data.user.avatar || '👤',
        email: data.user.email,
        status: 'online',
      });
      await loadPosts();
    } catch (err) {
      console.error(err);
      setAuthError(err.message || 'Có lỗi xảy ra');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken('');
    setCurrentUser(null);
    setPosts([]);
  };

  const handleCreatePost = async () => {
    if (!newPost.trim() || !token) return;
    try {
      const created = await authorizedFetch('/posts', {
        method: 'POST',
        body: JSON.stringify({ content: newPost }),
      });
      setPosts((prev) => [
        {
          id: created._id,
          userId: currentUser.id,
          userName: currentUser.name,
          userAvatar: currentUser.avatar,
          content: created.content,
          image: created.image,
          likes: created.likes?.length || 0,
          comments: created.comments?.length || 0,
          timestamp: new Date(created.createdAt || Date.now()).toLocaleString('vi-VN'),
          isLiked: false,
        },
        ...prev,
      ]);
      setNewPost('');
    } catch (err) {
      alert('Tạo bài viết thất bại, thử lại sau.');
    }
  };

  const handleLikePost = async (postId) => {
    if (!token) return;
    try {
      const updated = await authorizedFetch(`/posts/${postId}/like`, { method: 'POST' });
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
              ...p,
              likes: updated.likes?.length || 0,
              isLiked: updated.likes?.includes(currentUser.id),
            }
            : p
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  // Friends & requests
  const loadFriends = async () => {
    if (!token) return;
    try {
      const data = await authorizedFetch('/friends');
      const mapped = data.map((u) => ({
        id: u._id,
        name: u.name,
        username: u.username,
        avatar: u.avatar || '👤',
        status: u.status || 'offline',
      }));
      setFriends(mapped);
    } catch (err) {
      console.error(err);
    }
  };

  const loadFriendRequests = async () => {
    if (!token) return;
    try {
      const data = await authorizedFetch('/friends/requests');
      const mapped = data.map((r) => ({
        id: r._id,
        name: r.requester?.name,
        username: r.requester?.username,
        avatar: r.requester?.avatar || '👤',
        mutualFriends: 0,
      }));
      setFriendRequests(mapped);
    } catch (err) {
      console.error(err);
    }
  };

  const acceptFriend = async (id) => {
    try {
      await authorizedFetch(`/friends/accept/${id}`, { method: 'POST' });
      await Promise.all([loadFriends(), loadFriendRequests()]);
    } catch (err) {
      console.error(err);
    }
  };

  const rejectFriend = async (id) => {
    try {
      await authorizedFetch(`/friends/reject/${id}`, { method: 'POST' });
      await loadFriendRequests();
    } catch (err) {
      console.error(err);
    }
  };

  const sendFriendRequest = async (userId) => {
    try {
      await authorizedFetch('/friends/request', {
        method: 'POST',
        body: JSON.stringify({ recipientId: userId }),
      });
      alert('Đã gửi lời mời kết bạn');
    } catch (err) {
      alert('Gửi lời mời thất bại hoặc đã tồn tại');
    }
  };

  // Search users (debounced)
  useEffect(() => {
    if (!token) return;
    const handler = setTimeout(async () => {
      const q = searchQuery.trim();
      if (!q) {
        setSearchResults([]);
        return;
      }
      setSearchLoading(true);
      try {
        const data = await authorizedFetch(`/users/search?q=${encodeURIComponent(q)}`);
        setSearchResults(
          data.map((u) => ({
            id: u._id,
            name: u.name,
            username: u.username,
            avatar: u.avatar || '👤',
            status: u.status || 'offline',
          }))
        );
      } catch (err) {
        console.error(err);
      } finally {
        setSearchLoading(false);
      }
    }, SEARCH_DEBOUNCE);
    return () => clearTimeout(handler);
  }, [searchQuery, token]);

  // Conversations & messages
  const loadConversations = async () => {
    if (!token) return;
    try {
      const data = await authorizedFetch('/messages/conversations');
      const mapped = data.map((c) => {
        const other = (c.participants || []).find((p) => p._id !== currentUser?._id);
        return {
          id: c._id,
          friendId: other?._id,
          friendName: other?.name || other?.username || 'Ẩn danh',
          friendAvatar: other?.avatar || '👤',
          lastMessage: c.lastMessage?.content || '',
          timestamp: new Date(c.updatedAt || c.createdAt || Date.now()).toLocaleString('vi-VN'),
          unread: 0,
          isOnline: other?.status === 'online',
        };
      });
      setConversations(mapped);
    } catch (err) {
      console.error(err);
    }
  };

  const loadMessages = async (conversationId) => {
    if (!token || !conversationId) return;
    try {
      const data = await authorizedFetch(`/messages/${conversationId}`);
      setMessages((prev) => ({
        ...prev,
        [conversationId]: data.map((m) => ({
          id: m._id,
          senderId: m.sender?._id,
          content: m.content,
          timestamp: new Date(m.createdAt || Date.now()).toLocaleString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
          }),
        })),
      }));
    } catch (err) {
      console.error(err);
    }
  };

  // Poll tin nhắn cho cuộc chat đang mở (đơn giản, không realtime socket)
  useEffect(() => {
    if (!activeChat) {
      if (messagesPollRef.current) clearInterval(messagesPollRef.current);
      return;
    }
    loadMessages(activeChat.id);
    messagesPollRef.current = setInterval(() => {
      loadMessages(activeChat.id);
    }, 3000);
    return () => {
      if (messagesPollRef.current) clearInterval(messagesPollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChat?.id, token]);

  const openChatWithUser = async (userId) => {
    try {
      const conv = await authorizedFetch('/messages/conversations', {
        method: 'POST',
        body: JSON.stringify({ participantId: userId }),
      });
      const other = (conv.participants || []).find((p) => p._id !== currentUser._id);
      const convState = {
        id: conv._id,
        friendId: other?._id,
        friendName: other?.name || other?.username || 'Ẩn danh',
        friendAvatar: other?.avatar || '👤',
        lastMessage: conv.lastMessage?.content || '',
        timestamp: new Date(conv.updatedAt || conv.createdAt || Date.now()).toLocaleString('vi-VN'),
        unread: 0,
        isOnline: other?.status === 'online',
      };
      setConversations((prev) => {
        const exists = prev.find((c) => c.id === convState.id);
        if (exists) return prev.map((c) => (c.id === convState.id ? convState : c));
        return [convState, ...prev];
      });
      setActiveChat(convState);
      await loadMessages(convState.id);
      setActiveTab('messages');
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeChat) return;
    try {
      const sent = await authorizedFetch('/messages', {
        method: 'POST',
        body: JSON.stringify({
          conversationId: activeChat.id,
          content: newMessage,
        }),
      });
      const formatted = {
        id: sent._id,
        senderId: currentUser.id || currentUser._id,
        content: sent.content,
        timestamp: new Date(sent.createdAt || Date.now()).toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };
      setMessages((prev) => ({
        ...prev,
        [activeChat.id]: [...(prev[activeChat.id] || []), formatted],
      }));
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeChat.id
            ? { ...c, lastMessage: sent.content, timestamp: 'Vừa xong' }
            : c
        )
      );
      setNewMessage('');
    } catch (err) {
      console.error(err);
    }
  };

  const startVideoCall = async (friend) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStream.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      setCallPartner(friend);
      setIsVideoCalling(true);
      setTimeout(() => {
        if (remoteVideoRef.current && localStream.current) {
          remoteVideoRef.current.srcObject = localStream.current;
        }
      }, 1000);
    } catch (err) {
      alert('Không thể truy cập camera/mic, kiểm tra quyền truy cập.');
    }
  };

  const endVideoCall = () => {
    if (localStream.current) localStream.current.getTracks().forEach((t) => t.stop());
    setIsVideoCalling(false);
    setCallPartner(null);
  };

  useEffect(() => {
    if (token && !currentUser) {
      loadProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const renderAuthForm = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="bg-white shadow-xl rounded-2xl p-8 w-full max-w-xl">
        <h1 className="text-2xl font-bold text-blue-600 mb-2 text-center">SocialNet</h1>
        <p className="text-center text-gray-600 mb-6">
          {authMode === 'login' ? 'Đăng nhập để tiếp tục' : 'Tạo tài khoản để tham gia'}
        </p>

        <div className="grid gap-3">
          {authMode === 'register' && (
            <>
              <input
                className="border rounded-lg px-4 py-2"
                placeholder="Họ tên"
                value={authForm.name}
                onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
              />
              <input
                className="border rounded-lg px-4 py-2"
                placeholder="Username"
                value={authForm.username}
                onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
              />
            </>
          )}
          <input
            className="border rounded-lg px-4 py-2"
            placeholder="Email"
            type="email"
            value={authForm.email}
            onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
          />
          <input
            className="border rounded-lg px-4 py-2"
            placeholder="Mật khẩu"
            type="password"
            value={authForm.password}
            onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
          />

          {authError && <div className="text-red-500 text-sm">{authError}</div>}

          <button
            onClick={handleAuth}
            disabled={authLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold flex justify-center items-center"
          >
            {authLoading ? 'Đang xử lý...' : authMode === 'login' ? 'Đăng nhập' : 'Đăng ký'}
          </button>

          <button
            className="text-sm text-blue-600 hover:underline"
            onClick={() => {
              setAuthMode(authMode === 'login' ? 'register' : 'login');
              setAuthError('');
            }}
          >
            {authMode === 'login' ? 'Chưa có tài khoản? Đăng ký' : 'Đã có tài khoản? Đăng nhập'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderHome = () => (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center space-x-3 mb-3">
          <div className="text-3xl">{currentUser?.avatar || '👤'}</div>
          <input
            type="text"
            placeholder="Bạn đang nghĩ gì?"
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            className="flex-1 bg-gray-100 rounded-full px-4 py-2 outline-none"
          />
        </div>
        <div className="flex items-center justify-between pt-3 border-t">
          <button className="flex items-center space-x-2 text-gray-600 hover:bg-gray-100 px-4 py-2 rounded">
            <Image size={20} className="text-green-500" />
            <span>Ảnh/Video</span>
          </button>
          <button className="flex items-center space-x-2 text-gray-600 hover:bg-gray-100 px-4 py-2 rounded">
            <Smile size={20} className="text-yellow-500" />
            <span>Cảm xúc</span>
          </button>
          <button onClick={handleCreatePost} className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600">
            Đăng
          </button>
        </div>
      </div>

      {postsLoading && <div className="text-center text-gray-500">Đang tải bài viết...</div>}

      {posts.map((post) => (
        <div key={post.id} className="bg-white rounded-lg shadow">
          <div className="p-4">
            <div className="flex items-center space-x-3 mb-3">
              <div className="text-3xl">{post.userAvatar}</div>
              <div>
                <div className="font-semibold">{post.userName}</div>
                <div className="text-sm text-gray-500">{post.timestamp}</div>
              </div>
            </div>
            <p className="mb-3">{post.content}</p>
            {post.image && <img src={post.image} alt="Post" className="w-full rounded-lg mb-3" />}
          </div>

          <div className="px-4 py-2 border-t border-b flex items-center justify-between text-sm text-gray-600">
            <span>{post.likes} lượt thích</span>
            <span>{post.comments} bình luận</span>
          </div>

          <div className="p-2 flex items-center justify-around">
            <button
              onClick={() => handleLikePost(post.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded hover:bg-gray-100 ${
                post.isLiked ? 'text-blue-500' : 'text-gray-600'
              }`}
            >
              <Heart size={20} fill={post.isLiked ? 'currentColor' : 'none'} />
              <span>Thích</span>
            </button>
            <button className="flex items-center space-x-2 px-4 py-2 rounded hover:bg-gray-100 text-gray-600">
              <MessageSquare size={20} />
              <span>Bình luận</span>
            </button>
            <button className="flex items-center space-x-2 px-4 py-2 rounded hover:bg-gray-100 text-gray-600">
              <Share2 size={20} />
              <span>Chia sẻ</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  const renderFriends = () => (
    <div className="space-y-4">
      {friendRequests.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold text-lg mb-4">Lời mời kết bạn ({friendRequests.length})</h3>
          <div className="space-y-3">
            {friendRequests.map((req) => (
              <div key={req.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="text-3xl">{req.avatar}</div>
                  <div>
                    <div className="font-semibold">{req.name}</div>
                    <div className="text-sm text-gray-500">{req.mutualFriends} bạn chung</div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => acceptFriend(req.id)}
                    className="bg-blue-500 text-white px-4 py-1 rounded hover:bg-blue-600"
                  >
                    Chấp nhận
                  </button>
                  <button
                    onClick={() => rejectFriend(req.id)}
                    className="bg-gray-200 text-gray-700 px-4 py-1 rounded hover:bg-gray-300"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="font-semibold text-lg mb-4">Bạn bè ({friends.length})</h3>
        <div className="grid grid-cols-2 gap-4">
          {friends.map((f) => (
            <div key={f.id} className="border rounded-lg p-3">
              <div className="flex items-center space-x-3 mb-3">
                <div className="relative">
                  <div className="text-3xl">{f.avatar}</div>
                  {f.status === 'online' && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />}
                </div>
                <div className="font-semibold">{f.name}</div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    const conv = conversations.find((c) => c.friendId === f.id);
                    if (conv) {
                      setActiveChat(conv);
                      setActiveTab('messages');
                      loadMessages(conv.id);
                    } else {
                      openChatWithUser(f.id);
                    }
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-300"
                >
                  <MessageCircle size={16} className="inline mr-1" />
                  Nhắn tin
                </button>
                <button
                  onClick={() => startVideoCall(f)}
                  className="flex-1 bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                >
                  <Video size={16} className="inline mr-1" />
                  Gọi
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderMessages = () => (
    <div className="bg-white rounded-lg shadow flex h-[600px]">
      <div className="w-1/3 border-r">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-lg">Tin nhắn</h3>
        </div>
        <div className="overflow-y-auto h-[calc(100%-60px)]">
          {conversations.map((c) => (
            <div
              key={c.id}
              onClick={() => setActiveChat(c)}
              className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${activeChat?.id === c.id ? 'bg-blue-50' : ''}`}
            >
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="text-2xl">{c.friendAvatar}</div>
                  {c.isOnline && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <div className="font-semibold truncate">{c.friendName}</div>
                    <div className="text-xs text-gray-500">{c.timestamp}</div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-600 truncate">{c.lastMessage}</div>
                    {c.unread > 0 && (
                      <div className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center ml-2">
                        {c.unread}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {activeChat ? (
          <>
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">{activeChat.friendAvatar}</div>
                <div>
                  <div className="font-semibold">{activeChat.friendName}</div>
                  <div className="text-xs text-gray-500">{activeChat.isOnline ? 'Đang hoạt động' : 'Không hoạt động'}</div>
                </div>
              </div>
              <div className="flex space-x-2">
                <button className="p-2 hover:bg-gray-100 rounded-full">
                  <Phone size={20} className="text-blue-500" />
                </button>
                <button
                  onClick={() => startVideoCall(friends.find((f) => f.id === activeChat.friendId))}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <Video size={20} className="text-blue-500" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages[activeChat.id]?.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${
                    m.senderId === (currentUser?.id || currentUser?._id) ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-xs px-4 py-2 rounded-lg ${
                      m.senderId === (currentUser?.id || currentUser?._id)
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-800'
                    }`}
                  >
                    <div>{m.content}</div>
                    <div className={`text-xs mt-1 ${m.senderId === 'me' ? 'text-blue-100' : 'text-gray-500'}`}>{m.timestamp}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t flex items-center space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Nhập tin nhắn..."
                className="flex-1 bg-gray-100 rounded-full px-4 py-2 outline-none"
              />
              <button onClick={handleSendMessage} className="bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600">
                <Send size={20} />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <MessageCircle size={64} className="mx-auto mb-4" />
              <p>Chọn một cuộc trò chuyện để bắt đầu</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (!token || !currentUser) {
    return renderAuthForm();
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-blue-500">SocialNet</h1>
            <div className="relative">
              <Search size={20} className="absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-gray-100 rounded-full outline-none w-64"
              />
              {searchQuery && (
                <div className="absolute z-20 mt-2 w-full bg-white rounded-lg shadow border max-h-64 overflow-y-auto">
                  {searchLoading && <div className="px-4 py-2 text-sm text-gray-500">Đang tìm...</div>}
                  {!searchLoading && searchResults.length === 0 && (
                    <div className="px-4 py-2 text-sm text-gray-500">Không có kết quả</div>
                  )}
                  {searchResults.map((u) => (
                    <div
                      key={u.id}
                      className="px-4 py-2 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-xl">{u.avatar}</span>
                        <div>
                          <div className="font-semibold">{u.name}</div>
                          <div className="text-xs text-gray-500">@{u.username}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          openChatWithUser(u.id);
                        }}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        Nhắn tin
                      </button>
                      <button
                        onClick={() => sendFriendRequest(u.id)}
                        className="text-sm text-gray-600 hover:underline ml-2"
                      >
                        Kết bạn
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-3 mr-4">
              <div className="text-2xl">{currentUser.avatar}</div>
              <span className="font-semibold">{currentUser.name}</span>
            </div>
            <button className="p-2 hover:bg-gray-100 rounded-full relative">
              <Bell size={24} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-full">
              <Settings size={24} />
            </button>
            <button onClick={handleLogout} className="px-3 py-1 text-sm bg-gray-200 rounded-lg hover:bg-gray-300">
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      <nav className="bg-white shadow-sm mb-4">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('home')}
              className={`flex items-center space-x-2 px-6 py-3 border-b-2 ${
                activeTab === 'home' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Home size={20} />
              <span className="font-semibold">Trang chủ</span>
            </button>
            <button
              onClick={() => setActiveTab('friends')}
              className={`flex items-center space-x-2 px-6 py-3 border-b-2 ${
                activeTab === 'friends' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Users size={20} />
              <span className="font-semibold">Bạn bè</span>
              {friendRequests.length > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">{friendRequests.length}</span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('messages')}
              className={`flex items-center space-x-2 px-6 py-3 border-b-2 ${
                activeTab === 'messages' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-600 hover:bg-gray-50'
              }`}
            >
              <MessageCircle size={20} />
              <span className="font-semibold">Tin nhắn</span>
              {conversations.reduce((sum, c) => sum + c.unread, 0) > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                  {conversations.reduce((sum, c) => sum + c.unread, 0)}
                </span>
              )}
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 pb-8">
        {activeTab === 'home' && renderHome()}
        {activeTab === 'friends' && renderFriends()}
        {activeTab === 'messages' && renderMessages()}
      </main>

      {isVideoCalling && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
          <div className="relative w-full h-full">
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <div className="absolute top-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden shadow-lg">
              <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            </div>
            <div className="absolute top-4 left-4 text-white">
              <div className="flex items-center space-x-3 bg-black bg-opacity-50 px-4 py-2 rounded-lg">
                <div className="text-2xl">{callPartner?.avatar}</div>
                <div>
                  <div className="font-semibold">{callPartner?.name}</div>
                  <div className="text-sm text-gray-300">Đang gọi...</div>
                </div>
              </div>
            </div>
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center space-x-4">
              <button className="bg-gray-700 text-white p-4 rounded-full hover:bg-gray-600">
                <Video size={24} />
              </button>
              <button className="bg-gray-700 text-white p-4 rounded-full hover:bg-gray-600">
                <Phone size={24} />
              </button>
              <button onClick={endVideoCall} className="bg-red-500 text-white p-4 rounded-full hover:bg-red-600">
                <PhoneOff size={24} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SocialNetworkApp;

