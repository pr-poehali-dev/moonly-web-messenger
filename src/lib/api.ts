const API_URLS = {
  auth: 'https://functions.poehali.dev/ec489b90-db71-49f9-aef9-41480cef9e6e',
  friends: 'https://functions.poehali.dev/bd8dce64-bf60-4b9f-b521-04802b0387b3',
  chats: 'https://functions.poehali.dev/6e29b42e-1199-44be-8238-a00a37c3f6bd',
  files: 'https://functions.poehali.dev/acff1539-24f6-47c3-a95e-c4dff347b866',
};

export const api = {
  auth: {
    register: async (username: string, nickname: string, password: string) => {
      const res = await fetch(API_URLS.auth, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register', username, nickname, password }),
      });
      return res.json();
    },
    login: async (username: string, password: string) => {
      const res = await fetch(API_URLS.auth, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', username, password }),
      });
      return res.json();
    },
    logout: async (user_id: number) => {
      const res = await fetch(API_URLS.auth, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout', user_id }),
      });
      return res.json();
    },
    updateStatus: async (user_id: number, status: string) => {
      const res = await fetch(API_URLS.auth, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_status', user_id, status }),
      });
      return res.json();
    },
    updateProfile: async (user_id: number, nickname: string, avatar_url?: string) => {
      const res = await fetch(API_URLS.auth, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_profile', user_id, nickname, avatar_url }),
      });
      return res.json();
    },
  },
  friends: {
    list: async (user_id: number) => {
      const res = await fetch(`${API_URLS.friends}?user_id=${user_id}&action=list`);
      return res.json();
    },
    requests: async (user_id: number) => {
      const res = await fetch(`${API_URLS.friends}?user_id=${user_id}&action=requests`);
      return res.json();
    },
    addByUsername: async (user_id: number, friend_username: string) => {
      const res = await fetch(API_URLS.friends, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_by_username', user_id, friend_username }),
      });
      return res.json();
    },
    addByInvite: async (user_id: number, invite_code: string) => {
      const res = await fetch(API_URLS.friends, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_by_invite', user_id, invite_code }),
      });
      return res.json();
    },
    accept: async (user_id: number, friendship_id: number) => {
      const res = await fetch(API_URLS.friends, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept', user_id, friendship_id }),
      });
      return res.json();
    },
    reject: async (user_id: number, friendship_id: number) => {
      const res = await fetch(API_URLS.friends, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', user_id, friendship_id }),
      });
      return res.json();
    },
  },
  chats: {
    list: async (user_id: number) => {
      const res = await fetch(`${API_URLS.chats}?user_id=${user_id}&action=list`);
      return res.json();
    },
    messages: async (user_id: number, chat_id: number, search?: string) => {
      const url = search
        ? `${API_URLS.chats}?user_id=${user_id}&action=messages&chat_id=${chat_id}&search=${encodeURIComponent(search)}`
        : `${API_URLS.chats}?user_id=${user_id}&action=messages&chat_id=${chat_id}`;
      const res = await fetch(url);
      return res.json();
    },
    createChat: async (user_id: number, friend_id: number) => {
      const res = await fetch(API_URLS.chats, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_chat', user_id, friend_id }),
      });
      return res.json();
    },
    createGroup: async (user_id: number, name: string, member_ids: number[]) => {
      const res = await fetch(API_URLS.chats, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_group', user_id, name, member_ids }),
      });
      return res.json();
    },
    sendMessage: async (
      user_id: number,
      chat_id: number,
      content: string,
      message_type: string = 'text',
      file_url?: string,
      file_name?: string,
      file_size?: number
    ) => {
      const res = await fetch(API_URLS.chats, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_message',
          user_id,
          chat_id,
          content,
          message_type,
          file_url,
          file_name,
          file_size,
        }),
      });
      return res.json();
    },
    muteChat: async (user_id: number, chat_id: number, is_muted: boolean) => {
      const res = await fetch(API_URLS.chats, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mute_chat', user_id, chat_id, is_muted }),
      });
      return res.json();
    },
  },
  files: {
    upload: async (file: File) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const base64 = (reader.result as string).split(',')[1];
            const res = await fetch(API_URLS.files, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                file_data: base64,
                file_name: file.name,
                file_type: file.type,
              }),
            });
            const data = await res.json();
            resolve(data);
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    },
  },
};
