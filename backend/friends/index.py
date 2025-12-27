import json
import os
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event: dict, context) -> dict:
    """API для управления друзьями и приглашениями"""
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
            
            if action == 'add_by_username':
                friend_username = body.get('friend_username', '').strip()
                
                cur.execute("SELECT id FROM users WHERE username = %s", (friend_username,))
                friend = cur.fetchone()
                
                if not friend:
                    return response(404, {'error': 'User not found'})
                
                friend_id = friend['id']
                
                if friend_id == user_id:
                    return response(400, {'error': 'Cannot add yourself'})
                
                try:
                    cur.execute(
                        "INSERT INTO friendships (user_id, friend_id, status) VALUES (%s, %s, 'pending')",
                        (user_id, friend_id)
                    )
                    conn.commit()
                    return response(200, {'message': 'Friend request sent'})
                except psycopg2.IntegrityError:
                    conn.rollback()
                    return response(400, {'error': 'Friend request already exists'})
            
            elif action == 'add_by_invite':
                invite_code = body.get('invite_code', '').strip()
                
                cur.execute("SELECT id FROM users WHERE invite_code = %s", (invite_code,))
                friend = cur.fetchone()
                
                if not friend:
                    return response(404, {'error': 'Invalid invite code'})
                
                friend_id = friend['id']
                
                if friend_id == user_id:
                    return response(400, {'error': 'Cannot add yourself'})
                
                try:
                    cur.execute(
                        "INSERT INTO friendships (user_id, friend_id, status) VALUES (%s, %s, 'accepted')",
                        (user_id, friend_id)
                    )
                    cur.execute(
                        "INSERT INTO friendships (user_id, friend_id, status) VALUES (%s, %s, 'accepted')",
                        (friend_id, user_id)
                    )
                    conn.commit()
                    return response(200, {'message': 'Friend added'})
                except psycopg2.IntegrityError:
                    conn.rollback()
                    return response(400, {'error': 'Already friends'})
            
            elif action == 'accept':
                friendship_id = body.get('friendship_id')
                
                cur.execute(
                    "UPDATE friendships SET status = 'accepted' WHERE id = %s RETURNING user_id, friend_id",
                    (friendship_id,)
                )
                friendship = cur.fetchone()
                
                if friendship:
                    try:
                        cur.execute(
                            "INSERT INTO friendships (user_id, friend_id, status) VALUES (%s, %s, 'accepted')",
                            (friendship['friend_id'], friendship['user_id'])
                        )
                    except psycopg2.IntegrityError:
                        pass
                    conn.commit()
                return response(200, {'message': 'Friend request accepted'})
            
            elif action == 'reject':
                friendship_id = body.get('friendship_id')
                cur.execute("UPDATE friendships SET status = 'rejected' WHERE id = %s", (friendship_id,))
                conn.commit()
                return response(200, {'message': 'Friend request rejected'})
        
        elif method == 'GET':
            query_params = event.get('queryStringParameters', {}) or {}
            user_id = query_params.get('user_id')
            action = query_params.get('action', 'list')
            
            if action == 'list':
                cur.execute("""
                    SELECT u.id, u.username, u.nickname, u.avatar_url, u.status, u.last_seen
                    FROM users u
                    INNER JOIN friendships f ON u.id = f.friend_id
                    WHERE f.user_id = %s AND f.status = 'accepted'
                    ORDER BY u.last_seen DESC
                """, (user_id,))
                friends = [dict(row) for row in cur.fetchall()]
                return response(200, {'friends': friends})
            
            elif action == 'requests':
                cur.execute("""
                    SELECT f.id as friendship_id, u.id, u.username, u.nickname, u.avatar_url, f.created_at
                    FROM users u
                    INNER JOIN friendships f ON u.id = f.user_id
                    WHERE f.friend_id = %s AND f.status = 'pending'
                    ORDER BY f.created_at DESC
                """, (user_id,))
                requests = [dict(row) for row in cur.fetchall()]
                return response(200, {'requests': requests})
        
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
