import { useState, useEffect, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { WebRTCManager } from '@/lib/webrtc';

type UserStatus = 'online' | 'offline' | 'dnd';

type User = {
  id: number;
  username: string;
  nickname: string;
  invite_code: string;
  avatar_url?: string;
  status: UserStatus;
};

type Chat = {
  id: number;
  display_name: string;
  display_avatar?: string;
  last_message?: string;
  last_message_time?: string;
  unread: number;
  is_group: boolean;
  friend_status?: UserStatus;
  is_muted: boolean;
};

type Message = {
  id: number;
  content?: string;
  nickname: string;
  avatar_url?: string;
  sender_id: number;
  message_type: string;
  file_url?: string;
  file_name?: string;
  created_at: string;
};

const Index = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [friends, setFriends] = useState<any[]>([]);
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [isInCall, setIsInCall] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  
  const webrtcRef = useRef<WebRTCManager | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('moonly_user');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setCurrentUser(user);
      setIsLoggedIn(true);
      loadChats(user.id);
      loadFriends(user.id);
    }
  }, []);

  const loadChats = async (userId: number) => {
    try {
      const data = await api.chats.list(userId);
      setChats(data.chats || []);
    } catch (error) {
      console.error('Failed to load chats:', error);
    }
  };

  const loadFriends = async (userId: number) => {
    try {
      const [friendsData, requestsData] = await Promise.all([
        api.friends.list(userId),
        api.friends.requests(userId),
      ]);
      setFriends(friendsData.friends || []);
      setFriendRequests(requestsData.requests || []);
    } catch (error) {
      console.error('Failed to load friends:', error);
    }
  };

  const loadMessages = async (chatId: number, search?: string) => {
    if (!currentUser) return;
    try {
      const data = await api.chats.messages(currentUser.id, chatId, search);
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;

    try {
      const data = await api.auth.login(username, password);
      if (data.user) {
        setCurrentUser(data.user);
        setIsLoggedIn(true);
        localStorage.setItem('moonly_user', JSON.stringify(data.user));
        loadChats(data.user.id);
        loadFriends(data.user.id);
        toast.success('Добро пожаловать!');
      } else {
        toast.error(data.error || 'Ошибка входа');
      }
    } catch (error) {
      toast.error('Ошибка подключения');
    }
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const username = formData.get('username') as string;
    const nickname = formData.get('nickname') as string;
    const password = formData.get('password') as string;

    try {
      const data = await api.auth.register(username, nickname, password);
      if (data.user) {
        setCurrentUser(data.user);
        setIsLoggedIn(true);
        localStorage.setItem('moonly_user', JSON.stringify(data.user));
        toast.success('Регистрация успешна!');
        setIsRegistering(false);
      } else {
        toast.error(data.error || 'Ошибка регистрации');
      }
    } catch (error) {
      toast.error('Ошибка подключения');
    }
  };

  const handleLogout = async () => {
    if (currentUser) {
      await api.auth.logout(currentUser.id);
    }
    setCurrentUser(null);
    setIsLoggedIn(false);
    localStorage.removeItem('moonly_user');
    toast.info('Вы вышли из аккаунта');
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedChat || !currentUser) return;

    try {
      await api.chats.sendMessage(currentUser.id, selectedChat.id, messageInput);
      setMessageInput('');
      loadMessages(selectedChat.id);
      loadChats(currentUser.id);
    } catch (error) {
      toast.error('Не удалось отправить сообщение');
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!selectedChat || !currentUser) return;

    try {
      toast.info('Загрузка файла...');
      const data: any = await api.files.upload(file);
      
      const messageType = file.type.startsWith('image/') ? 'image' : 
                         file.type.startsWith('audio/') ? 'voice' : 
                         file.type.startsWith('video/') ? 'video' : 'file';
      
      await api.chats.sendMessage(
        currentUser.id,
        selectedChat.id,
        file.name,
        messageType,
        data.file_url,
        data.file_name,
        data.file_size
      );
      
      loadMessages(selectedChat.id);
      loadChats(currentUser.id);
      toast.success('Файл отправлен');
    } catch (error) {
      toast.error('Ошибка загрузки файла');
    }
  };

  const handleVoiceRecord = async () => {
    if (!selectedChat || !currentUser) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const file = new File([blob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });
        await handleFileUpload(file);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      toast.info('Запись голосового сообщения...');
      
      setTimeout(() => {
        mediaRecorder.stop();
      }, 60000);

      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }, 5000);
    } catch (error) {
      toast.error('Ошибка записи голосового сообщения');
    }
  };

  const startCall = async (video: boolean = false) => {
    if (!webrtcRef.current) {
      webrtcRef.current = new WebRTCManager();
    }

    try {
      const stream = await webrtcRef.current.startCall(true, video);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      setIsInCall(true);
      setIsVideoEnabled(video);
      toast.success(video ? 'Видеозвонок начат' : 'Звонок начат');
    } catch (error) {
      toast.error('Ошибка начала звонка');
    }
  };

  const endCall = () => {
    if (webrtcRef.current) {
      webrtcRef.current.endCall();
    }
    setIsInCall(false);
    setIsScreenSharing(false);
    toast.info('Звонок завершен');
  };

  const toggleAudio = () => {
    if (webrtcRef.current) {
      webrtcRef.current.toggleAudio(!isAudioEnabled);
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  const toggleVideo = () => {
    if (webrtcRef.current) {
      webrtcRef.current.toggleVideo(!isVideoEnabled);
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const toggleScreenShare = async () => {
    if (!webrtcRef.current) return;

    try {
      if (isScreenSharing) {
        webrtcRef.current.stopScreenShare();
        setIsScreenSharing(false);
        toast.info('Демонстрация экрана остановлена');
      } else {
        await webrtcRef.current.startScreenShare();
        setIsScreenSharing(true);
        toast.success('Демонстрация экрана начата');
      }
    } catch (error) {
      toast.error('Ошибка демонстрации экрана');
    }
  };

  const handleAddFriend = async (method: 'username' | 'invite', value: string) => {
    if (!currentUser) return;

    try {
      const data = method === 'username' 
        ? await api.friends.addByUsername(currentUser.id, value)
        : await api.friends.addByInvite(currentUser.id, value);
      
      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success(data.message);
        loadFriends(currentUser.id);
        loadChats(currentUser.id);
      }
    } catch (error) {
      toast.error('Ошибка добавления друга');
    }
  };

  const handleChatSelect = (chat: Chat) => {
    setSelectedChat(chat);
    loadMessages(chat.id);
    setMessageSearchQuery('');
  };

  const handleStartChatWithFriend = async (friendId: number) => {
    if (!currentUser) return;
    
    try {
      const data = await api.chats.createChat(currentUser.id, friendId);
      loadChats(currentUser.id);
      const newChat = chats.find(c => c.id === data.chat_id);
      if (newChat) {
        setSelectedChat(newChat);
        loadMessages(data.chat_id);
      }
    } catch (error) {
      toast.error('Ошибка создания чата');
    }
  };

  const handleMuteChat = async () => {
    if (!currentUser || !selectedChat) return;
    
    try {
      await api.chats.muteChat(currentUser.id, selectedChat.id, !selectedChat.is_muted);
      toast.success(selectedChat.is_muted ? 'Звук включен' : 'Звук выключен');
      loadChats(currentUser.id);
    } catch (error) {
      toast.error('Ошибка');
    }
  };

  const handleMessageSearch = () => {
    if (selectedChat) {
      loadMessages(selectedChat.id, messageSearchQuery);
    }
  };

  const getStatusColor = (status: UserStatus) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'dnd': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: UserStatus) => {
    switch (status) {
      case 'online': return 'В сети';
      case 'dnd': return 'Не беспокоить';
      default: return 'Не в сети';
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="w-full max-w-md p-8 space-y-6">
          <div className="text-center space-y-4">
            <div className="relative w-24 h-24 mx-auto">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl" />
              <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center">
                <Icon name="Moon" size={48} className="text-primary-foreground" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-foreground">Moonly</h1>
            <p className="text-muted-foreground">Минималистичный мессенджер</p>
          </div>

          {isRegistering ? (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label>Логин</Label>
                <Input name="username" placeholder="username" required />
              </div>
              <div className="space-y-2">
                <Label>Никнейм</Label>
                <Input name="nickname" placeholder="Ваше имя" required />
              </div>
              <div className="space-y-2">
                <Label>Пароль</Label>
                <Input name="password" type="password" placeholder="••••••" required />
              </div>
              <Button type="submit" className="w-full">Зарегистрироваться</Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setIsRegistering(false)}
              >
                Уже есть аккаунт? Войти
              </Button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label>Логин</Label>
                <Input name="username" placeholder="username" required />
              </div>
              <div className="space-y-2">
                <Label>Пароль</Label>
                <Input name="password" type="password" placeholder="••••••" required />
              </div>
              <Button type="submit" className="w-full">Войти</Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setIsRegistering(true)}
              >
                Создать аккаунт
              </Button>
            </form>
          )}
        </div>
      </div>
    );
  }

  const filteredChats = chats.filter(chat =>
    chat.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
      />

      {/* Sidebar */}
      <div className="w-80 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Dialog>
                <DialogTrigger asChild>
                  <button className="relative group">
                    <Avatar className="h-10 w-10 rounded-xl cursor-pointer ring-2 ring-primary/20 group-hover:ring-primary/50 transition-all">
                      <AvatarImage src={currentUser?.avatar_url} />
                      <AvatarFallback className="rounded-xl bg-primary text-primary-foreground">
                        {currentUser?.nickname.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ${getStatusColor(currentUser?.status || 'offline')} ring-2 ring-background`} />
                  </button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Профиль</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="flex justify-center">
                      <Avatar className="h-24 w-24 rounded-2xl">
                        <AvatarImage src={currentUser?.avatar_url} />
                        <AvatarFallback className="rounded-2xl bg-primary text-primary-foreground text-3xl">
                          {currentUser?.nickname.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="space-y-2">
                      <Label>Никнейм</Label>
                      <Input value={currentUser?.nickname} readOnly />
                    </div>
                    <div className="space-y-2">
                      <Label>Логин</Label>
                      <Input value={currentUser?.username} readOnly />
                    </div>
                    <div className="space-y-2">
                      <Label>Статус</Label>
                      <Select
                        value={currentUser?.status}
                        onValueChange={(value: UserStatus) => {
                          if (currentUser) {
                            api.auth.updateStatus(currentUser.id, value);
                            setCurrentUser({ ...currentUser, status: value });
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="online">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-green-500" />
                              В сети
                            </div>
                          </SelectItem>
                          <SelectItem value="offline">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-gray-500" />
                              Не в сети
                            </div>
                          </SelectItem>
                          <SelectItem value="dnd">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-red-500" />
                              Не беспокоить
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button variant="outline" className="w-full" onClick={handleLogout}>
                      Выйти
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-foreground">
                  {currentUser?.nickname}
                </span>
                <span className="text-xs text-muted-foreground">
                  {getStatusText(currentUser?.status || 'offline')}
                </span>
              </div>
            </div>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button size="icon" variant="ghost" className="rounded-xl">
                  <Icon name="UserPlus" size={20} />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Добавить друга</DialogTitle>
                </DialogHeader>
                <Tabs defaultValue="friends" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="friends">Друзья</TabsTrigger>
                    <TabsTrigger value="username">По логину</TabsTrigger>
                    <TabsTrigger value="link">По ссылке</TabsTrigger>
                  </TabsList>
                  <TabsContent value="friends" className="space-y-2">
                    {friendRequests.length > 0 && (
                      <div className="space-y-2 mb-4">
                        <Label>Заявки в друзья</Label>
                        {friendRequests.map(req => (
                          <div key={req.friendship_id} className="flex items-center justify-between p-2 border rounded">
                            <span>{req.nickname}</span>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => {
                                api.friends.accept(currentUser!.id, req.friendship_id);
                                loadFriends(currentUser!.id);
                              }}>
                                <Icon name="Check" size={16} />
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => {
                                api.friends.reject(currentUser!.id, req.friendship_id);
                                loadFriends(currentUser!.id);
                              }}>
                                <Icon name="X" size={16} />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <Label>Ваши друзья</Label>
                    <ScrollArea className="h-64">
                      {friends.map(friend => (
                        <button
                          key={friend.id}
                          onClick={() => handleStartChatWithFriend(friend.id)}
                          className="w-full p-2 flex items-center gap-2 hover:bg-accent rounded"
                        >
                          <Avatar className="h-8 w-8 rounded-lg">
                            <AvatarImage src={friend.avatar_url} />
                            <AvatarFallback className="rounded-lg bg-primary/20">
                              {friend.nickname.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span>{friend.nickname}</span>
                        </button>
                      ))}
                    </ScrollArea>
                  </TabsContent>
                  <TabsContent value="username" className="space-y-4">
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const username = (e.target as any).username.value;
                      handleAddFriend('username', username);
                    }}>
                      <div className="space-y-2">
                        <Label>Логин друга</Label>
                        <Input name="username" placeholder="username" />
                      </div>
                      <Button type="submit" className="w-full mt-4">Отправить приглашение</Button>
                    </form>
                  </TabsContent>
                  <TabsContent value="link" className="space-y-4">
                    <div className="space-y-2">
                      <Label>Ваша ссылка-приглашение</Label>
                      <div className="flex gap-2">
                        <Input
                          readOnly
                          value={`moonly.app/i/${currentUser?.invite_code}`}
                          className="flex-1"
                        />
                        <Button size="icon" variant="secondary" onClick={() => {
                          navigator.clipboard.writeText(currentUser?.invite_code || '');
                          toast.success('Код скопирован');
                        }}>
                          <Icon name="Copy" size={20} />
                        </Button>
                      </div>
                    </div>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const code = (e.target as any).code.value;
                      handleAddFriend('invite', code);
                    }}>
                      <div className="space-y-2">
                        <Label>Код приглашения</Label>
                        <Input name="code" placeholder="Введите код" />
                      </div>
                      <Button type="submit" className="w-full mt-4">Добавить</Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
          </div>

          <div className="relative">
            <Icon name="Search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Поиск чатов..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-xl"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2">
            {filteredChats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => handleChatSelect(chat)}
                className={`w-full p-3 rounded-xl flex items-center gap-3 hover:bg-accent/50 transition-all mb-1 ${
                  selectedChat?.id === chat.id ? 'bg-accent' : ''
                }`}
              >
                <div className="relative">
                  <Avatar className="h-12 w-12 rounded-xl">
                    <AvatarImage src={chat.display_avatar} />
                    <AvatarFallback className="rounded-xl bg-primary/20 text-primary">
                      {chat.is_group ? (
                        <Icon name="Users" size={20} />
                      ) : (
                        chat.display_name?.slice(0, 2).toUpperCase()
                      )}
                    </AvatarFallback>
                  </Avatar>
                  {!chat.is_group && chat.friend_status && (
                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ${getStatusColor(chat.friend_status)} ring-2 ring-background`} />
                  )}
                </div>
                <div className="flex-1 text-left overflow-hidden">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-foreground truncate">
                        {chat.display_name}
                      </span>
                      {chat.is_muted && <Icon name="VolumeX" size={14} className="text-muted-foreground" />}
                    </div>
                    <span className="text-xs text-muted-foreground ml-2">
                      {chat.last_message_time ? new Date(chat.last_message_time).toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'}) : ''}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground truncate flex-1">
                      {chat.last_message || 'Нет сообщений'}
                    </p>
                    {chat.unread > 0 && (
                      <Badge className="ml-2 rounded-full h-5 min-w-5 px-1.5 bg-primary text-primary-foreground">
                        {chat.unread}
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      {selectedChat ? (
        <div className="flex-1 flex flex-col">
          <div className="h-16 border-b border-border px-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 rounded-xl">
                <AvatarImage src={selectedChat.display_avatar} />
                <AvatarFallback className="rounded-xl bg-primary/20 text-primary">
                  {selectedChat.is_group ? (
                    <Icon name="Users" size={20} />
                  ) : (
                    selectedChat.display_name?.slice(0, 2).toUpperCase()
                  )}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-foreground">{selectedChat.display_name}</h3>
                <p className="text-xs text-muted-foreground">
                  {selectedChat.is_group ? 'Группа' : selectedChat.friend_status ? getStatusText(selectedChat.friend_status) : ''}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Input
                  placeholder="Поиск..."
                  value={messageSearchQuery}
                  onChange={(e) => setMessageSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleMessageSearch()}
                  className="w-48 h-9"
                />
              </div>
              <Button size="icon" variant="ghost" className="rounded-xl" onClick={() => startCall(false)}>
                <Icon name="Phone" size={20} />
              </Button>
              <Button size="icon" variant="ghost" className="rounded-xl" onClick={() => startCall(true)}>
                <Icon name="Video" size={20} />
              </Button>
              <Button size="icon" variant="ghost" className="rounded-xl" onClick={handleMuteChat}>
                <Icon name={selectedChat.is_muted ? 'Volume2' : 'VolumeX'} size={20} />
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1 p-6">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.sender_id === currentUser?.id ? 'flex-row-reverse' : ''}`}
                >
                  {message.sender_id !== currentUser?.id && (
                    <Avatar className="h-8 w-8 rounded-lg flex-shrink-0">
                      <AvatarImage src={message.avatar_url} />
                      <AvatarFallback className="rounded-lg bg-primary/20 text-primary text-xs">
                        {message.nickname.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className={`flex flex-col gap-1 max-w-md ${message.sender_id === currentUser?.id ? 'items-end' : ''}`}>
                    {message.sender_id !== currentUser?.id && (
                      <span className="text-xs text-muted-foreground px-3">
                        {message.nickname}
                      </span>
                    )}
                    <div
                      className={`px-4 py-2 rounded-2xl ${
                        message.sender_id === currentUser?.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground'
                      }`}
                    >
                      {message.message_type === 'image' && message.file_url && (
                        <img src={message.file_url} alt={message.file_name} className="max-w-xs rounded" />
                      )}
                      {message.message_type === 'voice' && message.file_url && (
                        <audio src={message.file_url} controls className="max-w-xs" />
                      )}
                      {message.message_type === 'video' && message.file_url && (
                        <video src={message.file_url} controls className="max-w-xs rounded" />
                      )}
                      {message.message_type === 'file' && message.file_url && (
                        <a href={message.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                          <Icon name="File" size={16} />
                          <span className="text-sm">{message.file_name}</span>
                        </a>
                      )}
                      {message.content && <p className="text-sm">{message.content}</p>}
                    </div>
                    <span className="text-xs text-muted-foreground px-3">
                      {new Date(message.created_at).toLocaleTimeString('ru-RU', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="border-t border-border p-4">
            <div className="flex gap-2">
              <Button
                size="icon"
                variant="ghost"
                className="rounded-xl flex-shrink-0"
                onClick={() => fileInputRef.current?.click()}
              >
                <Icon name="Paperclip" size={20} />
              </Button>
              <Input
                placeholder="Написать сообщение..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1 rounded-xl"
              />
              <Button
                size="icon"
                variant="ghost"
                className="rounded-xl flex-shrink-0"
                onClick={handleVoiceRecord}
              >
                <Icon name="Mic" size={20} />
              </Button>
              <Button
                size="icon"
                onClick={handleSendMessage}
                className="rounded-xl flex-shrink-0"
                disabled={!messageInput.trim()}
              >
                <Icon name="Send" size={20} />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="relative w-32 h-32 mx-auto">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl" />
              <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center">
                <Icon name="Moon" size={64} className="text-primary-foreground" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-foreground">Moonly</h2>
            <p className="text-muted-foreground max-w-sm">
              Выберите чат или начните новый разговор 🌙
            </p>
          </div>
        </div>
      )}

      {/* Call Overlay */}
      {isInCall && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
          <div className="max-w-4xl w-full p-8 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full rounded-xl bg-muted"
                />
                <div className="absolute bottom-4 left-4 text-white text-sm">Вы</div>
              </div>
              <div className="relative">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full rounded-xl bg-muted"
                />
                <div className="absolute bottom-4 left-4 text-white text-sm">Собеседник</div>
              </div>
            </div>
            <div className="flex justify-center gap-4">
              <Button
                size="icon"
                variant={isAudioEnabled ? 'secondary' : 'destructive'}
                onClick={toggleAudio}
                className="h-12 w-12 rounded-full"
              >
                <Icon name={isAudioEnabled ? 'Mic' : 'MicOff'} size={20} />
              </Button>
              <Button
                size="icon"
                variant={isVideoEnabled ? 'secondary' : 'destructive'}
                onClick={toggleVideo}
                className="h-12 w-12 rounded-full"
              >
                <Icon name={isVideoEnabled ? 'Video' : 'VideoOff'} size={20} />
              </Button>
              <Button
                size="icon"
                variant={isScreenSharing ? 'default' : 'secondary'}
                onClick={toggleScreenShare}
                className="h-12 w-12 rounded-full"
              >
                <Icon name="Monitor" size={20} />
              </Button>
              <Button
                size="icon"
                variant="destructive"
                onClick={endCall}
                className="h-12 w-12 rounded-full"
              >
                <Icon name="PhoneOff" size={20} />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
