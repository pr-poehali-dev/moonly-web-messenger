import json
import os
import hashlib
import secrets
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event: dict, context) -> dict:
    """API для регистрации и авторизации пользователей"""
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
            
            if action == 'register':
                username = body.get('username', '').strip()
                nickname = body.get('nickname', '').strip()
                password = body.get('password', '').strip()
                
                if not username or not password or not nickname:
                    return response(400, {'error': 'Username, nickname and password required'})
                
                password_hash = hashlib.sha256(password.encode()).hexdigest()
                invite_code = secrets.token_urlsafe(8)
                
                try:
                    cur.execute(
                        "INSERT INTO users (username, nickname, password_hash, invite_code, status) VALUES (%s, %s, %s, %s, 'online') RETURNING id, username, nickname, invite_code, avatar_url, status",
                        (username, nickname, password_hash, invite_code)
                    )
                    user = dict(cur.fetchone())
                    conn.commit()
                    return response(200, {'user': user})
                except psycopg2.IntegrityError:
                    conn.rollback()
                    return response(400, {'error': 'Username already exists'})
            
            elif action == 'login':
                username = body.get('username', '').strip()
                password = body.get('password', '').strip()
                
                if not username or not password:
                    return response(400, {'error': 'Username and password required'})
                
                password_hash = hashlib.sha256(password.encode()).hexdigest()
                
                cur.execute(
                    "SELECT id, username, nickname, invite_code, avatar_url, status FROM users WHERE username = %s AND password_hash = %s",
                    (username, password_hash)
                )
                user = cur.fetchone()
                
                if not user:
                    return response(401, {'error': 'Invalid credentials'})
                
                user_dict = dict(user)
                cur.execute("UPDATE users SET status = 'online', last_seen = CURRENT_TIMESTAMP WHERE id = %s", (user_dict['id'],))
                conn.commit()
                
                return response(200, {'user': user_dict})
            
            elif action == 'logout':
                user_id = body.get('user_id')
                if user_id:
                    cur.execute("UPDATE users SET status = 'offline', last_seen = CURRENT_TIMESTAMP WHERE id = %s", (user_id,))
                    conn.commit()
                return response(200, {'message': 'Logged out'})
            
            elif action == 'update_status':
                user_id = body.get('user_id')
                status = body.get('status')
                if user_id and status:
                    cur.execute("UPDATE users SET status = %s WHERE id = %s", (status, user_id))
                    conn.commit()
                return response(200, {'message': 'Status updated'})
            
            elif action == 'update_profile':
                user_id = body.get('user_id')
                nickname = body.get('nickname')
                avatar_url = body.get('avatar_url')
                
                if user_id and nickname:
                    cur.execute(
                        "UPDATE users SET nickname = %s, avatar_url = COALESCE(%s, avatar_url) WHERE id = %s RETURNING id, username, nickname, invite_code, avatar_url, status",
                        (nickname, avatar_url, user_id)
                    )
                    user = dict(cur.fetchone())
                    conn.commit()
                    return response(200, {'user': user})
                return response(400, {'error': 'User ID and nickname required'})
        
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
