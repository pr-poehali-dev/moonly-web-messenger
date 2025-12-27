import json
import os
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event: dict, context) -> dict:
    """API для управления чатами и сообщениями"""
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        if method == 'POST':
            body = json.loads(event.get('body', '{}'))
            action = body.get('action')
            user_id = body.get('user_id')
            
            if action == 'create_chat':
                friend_id = body.get('friend_id')
                
                cur.execute("""
                    SELECT c.id FROM chats c
                    INNER JOIN chat_members cm1 ON c.id = cm1.chat_id
                    INNER JOIN chat_members cm2 ON c.id = cm2.chat_id
                    WHERE c.is_group = FALSE
                    AND cm1.user_id = %s AND cm2.user_id = %s
                """, (user_id, friend_id))
                existing = cur.fetchone()
                
                if existing:
                    return response(200, {'chat_id': existing['id']})
                
                cur.execute("INSERT INTO chats (is_group) VALUES (FALSE) RETURNING id")
                chat = cur.fetchone()
                chat_id = chat['id']
                
                cur.execute("INSERT INTO chat_members (chat_id, user_id) VALUES (%s, %s)", (chat_id, user_id))
                cur.execute("INSERT INTO chat_members (chat_id, user_id) VALUES (%s, %s)", (chat_id, friend_id))
                conn.commit()
                
                return response(200, {'chat_id': chat_id})
            
            elif action == 'create_group':
                name = body.get('name')
                member_ids = body.get('member_ids', [])
                
                cur.execute("INSERT INTO chats (name, is_group) VALUES (%s, TRUE) RETURNING id", (name,))
                chat = cur.fetchone()
                chat_id = chat['id']
                
                cur.execute("INSERT INTO chat_members (chat_id, user_id) VALUES (%s, %s)", (chat_id, user_id))
                for member_id in member_ids:
                    cur.execute("INSERT INTO chat_members (chat_id, user_id) VALUES (%s, %s)", (chat_id, member_id))
                conn.commit()
                
                return response(200, {'chat_id': chat_id})
            
            elif action == 'send_message':
                chat_id = body.get('chat_id')
                message_type = body.get('message_type', 'text')
                content = body.get('content')
                file_url = body.get('file_url')
                file_name = body.get('file_name')
                file_size = body.get('file_size')
                
                cur.execute(
                    """INSERT INTO messages (chat_id, sender_id, message_type, content, file_url, file_name, file_size)
                    VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id, created_at""",
                    (chat_id, user_id, message_type, content, file_url, file_name, file_size)
                )
                message = dict(cur.fetchone())
                conn.commit()
                
                return response(200, {'message': message})
            
            elif action == 'mute_chat':
                chat_id = body.get('chat_id')
                is_muted = body.get('is_muted', True)
                
                cur.execute(
                    "UPDATE chat_members SET is_muted = %s WHERE chat_id = %s AND user_id = %s",
                    (is_muted, chat_id, user_id)
                )
                conn.commit()
                return response(200, {'message': 'Chat muted' if is_muted else 'Chat unmuted'})
        
        elif method == 'GET':
            query_params = event.get('queryStringParameters', {}) or {}
            user_id = query_params.get('user_id')
            action = query_params.get('action', 'list')
            
            if action == 'list':
                cur.execute("""
                    SELECT DISTINCT c.id, c.name, c.is_group, c.avatar_url,
                        (SELECT COUNT(*) FROM messages WHERE chat_id = c.id AND sender_id != %s 
                         AND created_at > COALESCE((SELECT last_seen FROM users WHERE id = %s), '1970-01-01')) as unread,
                        (SELECT content FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
                        (SELECT created_at FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_time,
                        cm.is_muted,
                        CASE 
                            WHEN c.is_group THEN c.name
                            ELSE (SELECT u.nickname FROM users u INNER JOIN chat_members cm2 ON u.id = cm2.user_id 
                                  WHERE cm2.chat_id = c.id AND u.id != %s LIMIT 1)
                        END as display_name,
                        CASE 
                            WHEN c.is_group THEN NULL
                            ELSE (SELECT u.avatar_url FROM users u INNER JOIN chat_members cm2 ON u.id = cm2.user_id 
                                  WHERE cm2.chat_id = c.id AND u.id != %s LIMIT 1)
                        END as display_avatar,
                        CASE 
                            WHEN c.is_group THEN NULL
                            ELSE (SELECT u.status FROM users u INNER JOIN chat_members cm2 ON u.id = cm2.user_id 
                                  WHERE cm2.chat_id = c.id AND u.id != %s LIMIT 1)
                        END as friend_status
                    FROM chats c
                    INNER JOIN chat_members cm ON c.id = cm.chat_id
                    WHERE cm.user_id = %s
                    ORDER BY last_message_time DESC NULLS LAST
                """, (user_id, user_id, user_id, user_id, user_id, user_id))
                chats = [dict(row) for row in cur.fetchall()]
                return response(200, {'chats': chats})
            
            elif action == 'messages':
                chat_id = query_params.get('chat_id')
                search = query_params.get('search', '')
                
                if search:
                    cur.execute("""
                        SELECT m.*, u.nickname, u.avatar_url
                        FROM messages m
                        INNER JOIN users u ON m.sender_id = u.id
                        WHERE m.chat_id = %s AND m.content ILIKE %s
                        ORDER BY m.created_at DESC
                        LIMIT 50
                    """, (chat_id, f'%{search}%'))
                else:
                    cur.execute("""
                        SELECT m.*, u.nickname, u.avatar_url
                        FROM messages m
                        INNER JOIN users u ON m.sender_id = u.id
                        WHERE m.chat_id = %s
                        ORDER BY m.created_at ASC
                    """, (chat_id,))
                
                messages = [dict(row) for row in cur.fetchall()]
                return response(200, {'messages': messages})
        
        return response(405, {'error': 'Method not allowed'})
    
    finally:
        cur.close()
        conn.close()

def response(status_code: int, data: dict) -> dict:
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps(data, default=str),
        'isBase64Encoded': False
    }
