import { useState } from 'react';
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

type UserStatus = 'online' | 'offline' | 'dnd';

type Message = {
  id: string;
  text: string;
  sender: string;
  timestamp: Date;
  isMine: boolean;
};

type Chat = {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
  status: UserStatus;
  isGroup?: boolean;
};

const Index = () => {
  const [currentUser, setCurrentUser] = useState({
    nickname: '@moonwalker',
    avatar: '',
    status: 'online' as UserStatus,
  });

  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [chats] = useState<Chat[]>([
    {
      id: '1',
      name: 'Alice Moon',
      avatar: '',
      lastMessage: 'See you tonight! 🌙',
      timestamp: '2м',
      unread: 2,
      status: 'online',
    },
    {
      id: '2',
      name: 'Bob Star',
      avatar: '',
      lastMessage: 'Thanks for the update',
      timestamp: '15м',
      unread: 0,
      status: 'dnd',
    },
    {
      id: '3',
      name: 'Luna Squad',
      avatar: '',
      lastMessage: 'Who is up for game night?',
      timestamp: '1ч',
      unread: 5,
      status: 'online',
      isGroup: true,
    },
  ]);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hey! How are you doing?',
      sender: 'Alice Moon',
      timestamp: new Date(Date.now() - 3600000),
      isMine: false,
    },
    {
      id: '2',
      text: 'I am great! Working on some cool project 🚀',
      sender: 'You',
      timestamp: new Date(Date.now() - 3000000),
      isMine: true,
    },
    {
      id: '3',
      text: 'See you tonight! 🌙',
      sender: 'Alice Moon',
      timestamp: new Date(Date.now() - 120000),
      isMine: false,
    },
  ]);

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedChat) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: messageInput,
      sender: 'You',
      timestamp: new Date(),
      isMine: true,
    };

    setMessages([...messages, newMessage]);
    setMessageInput('');
  };

  const getStatusColor = (status: UserStatus) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'dnd':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: UserStatus) => {
    switch (status) {
      case 'online':
        return 'В сети';
      case 'dnd':
        return 'Не беспокоить';
      default:
        return 'Не в сети';
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 border-r border-border flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Dialog>
                <DialogTrigger asChild>
                  <button className="relative group">
                    <Avatar className="h-10 w-10 rounded-xl cursor-pointer ring-2 ring-primary/20 group-hover:ring-primary/50 transition-all">
                      <AvatarImage src={currentUser.avatar} />
                      <AvatarFallback className="rounded-xl bg-primary text-primary-foreground">
                        {currentUser.nickname.slice(1, 3).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ${getStatusColor(currentUser.status)} ring-2 ring-background`} />
                  </button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Профиль</DialogTitle>
                    <DialogDescription>
                      Настройте свой профиль и статус
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="flex justify-center">
                      <div className="relative">
                        <Avatar className="h-24 w-24 rounded-2xl">
                          <AvatarImage src={currentUser.avatar} />
                          <AvatarFallback className="rounded-2xl bg-primary text-primary-foreground text-3xl">
                            {currentUser.nickname.slice(1, 3).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <Button size="icon" variant="secondary" className="absolute -bottom-2 -right-2 rounded-full h-8 w-8">
                          <Icon name="Camera" size={16} />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Никнейм</Label>
                      <Input
                        value={currentUser.nickname}
                        onChange={(e) =>
                          setCurrentUser({ ...currentUser, nickname: e.target.value })
                        }
                        placeholder="@nickname"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Статус</Label>
                      <Select
                        value={currentUser.status}
                        onValueChange={(value: UserStatus) =>
                          setCurrentUser({ ...currentUser, status: value })
                        }
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
                  </div>
                </DialogContent>
              </Dialog>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-foreground">
                  {currentUser.nickname}
                </span>
                <span className="text-xs text-muted-foreground">
                  {getStatusText(currentUser.status)}
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
                  <DialogDescription>
                    Отправьте приглашение по нику или поделитесь ссылкой
                  </DialogDescription>
                </DialogHeader>
                <Tabs defaultValue="nickname" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="nickname">По нику</TabsTrigger>
                    <TabsTrigger value="link">По ссылке</TabsTrigger>
                  </TabsList>
                  <TabsContent value="nickname" className="space-y-4">
                    <div className="space-y-2">
                      <Label>Никнейм друга</Label>
                      <Input placeholder="@username" />
                    </div>
                    <Button className="w-full">Отправить приглашение</Button>
                  </TabsContent>
                  <TabsContent value="link" className="space-y-4">
                    <div className="space-y-2">
                      <Label>Ваша ссылка-приглашение</Label>
                      <div className="flex gap-2">
                        <Input
                          readOnly
                          value={`moonly.app/invite/${currentUser.nickname.slice(1)}`}
                          className="flex-1"
                        />
                        <Button size="icon" variant="secondary">
                          <Icon name="Copy" size={20} />
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Поделитесь этой ссылкой, чтобы добавить вас в друзья
                    </p>
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
          </div>

          {/* Search */}
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

        {/* Chats List */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {chats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => setSelectedChat(chat)}
                className={`w-full p-3 rounded-xl flex items-center gap-3 hover:bg-accent/50 transition-all mb-1 ${
                  selectedChat?.id === chat.id ? 'bg-accent' : ''
                }`}
              >
                <div className="relative">
                  <Avatar className="h-12 w-12 rounded-xl">
                    <AvatarImage src={chat.avatar} />
                    <AvatarFallback className="rounded-xl bg-primary/20 text-primary">
                      {chat.isGroup ? (
                        <Icon name="Users" size={20} />
                      ) : (
                        chat.name.slice(0, 2).toUpperCase()
                      )}
                    </AvatarFallback>
                  </Avatar>
                  {!chat.isGroup && (
                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ${getStatusColor(chat.status)} ring-2 ring-background`} />
                  )}
                </div>
                <div className="flex-1 text-left overflow-hidden">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm text-foreground truncate">
                      {chat.name}
                    </span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {chat.timestamp}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground truncate flex-1">
                      {chat.lastMessage}
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
          {/* Chat Header */}
          <div className="h-16 border-b border-border px-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 rounded-xl">
                <AvatarImage src={selectedChat.avatar} />
                <AvatarFallback className="rounded-xl bg-primary/20 text-primary">
                  {selectedChat.isGroup ? (
                    <Icon name="Users" size={20} />
                  ) : (
                    selectedChat.name.slice(0, 2).toUpperCase()
                  )}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-foreground">{selectedChat.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {selectedChat.isGroup ? '3 участника' : getStatusText(selectedChat.status)}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="icon" variant="ghost" className="rounded-xl">
                <Icon name="Phone" size={20} />
              </Button>
              <Button size="icon" variant="ghost" className="rounded-xl">
                <Icon name="Video" size={20} />
              </Button>
              <Button size="icon" variant="ghost" className="rounded-xl">
                <Icon name="MoreVertical" size={20} />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-6">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.isMine ? 'flex-row-reverse' : ''}`}
                >
                  {!message.isMine && (
                    <Avatar className="h-8 w-8 rounded-lg flex-shrink-0">
                      <AvatarImage src="" />
                      <AvatarFallback className="rounded-lg bg-primary/20 text-primary text-xs">
                        {message.sender.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className={`flex flex-col gap-1 max-w-md ${message.isMine ? 'items-end' : ''}`}>
                    {!message.isMine && (
                      <span className="text-xs text-muted-foreground px-3">
                        {message.sender}
                      </span>
                    )}
                    <div
                      className={`px-4 py-2 rounded-2xl ${
                        message.isMine
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground'
                      }`}
                    >
                      <p className="text-sm">{message.text}</p>
                    </div>
                    <span className="text-xs text-muted-foreground px-3">
                      {message.timestamp.toLocaleTimeString('ru-RU', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Message Input */}
          <div className="border-t border-border p-4">
            <div className="flex gap-2">
              <Button size="icon" variant="ghost" className="rounded-xl flex-shrink-0">
                <Icon name="Paperclip" size={20} />
              </Button>
              <Input
                placeholder="Написать сообщение..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1 rounded-xl"
              />
              <Button size="icon" variant="ghost" className="rounded-xl flex-shrink-0">
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
    </div>
  );
};

export default Index;
