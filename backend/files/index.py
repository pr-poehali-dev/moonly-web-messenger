import json
import os
import base64
import boto3
from datetime import datetime

def handler(event: dict, context) -> dict:
    """API для загрузки файлов и изображений"""
    method = event.get('httpMethod', 'POST')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    if method != 'POST':
        return response(405, {'error': 'Method not allowed'})
    
    try:
        body = json.loads(event.get('body', '{}'))
        file_data = body.get('file_data')
        file_name = body.get('file_name')
        file_type = body.get('file_type', 'application/octet-stream')
        
        if not file_data or not file_name:
            return response(400, {'error': 'file_data and file_name required'})
        
        file_bytes = base64.b64decode(file_data)
        
        s3 = boto3.client('s3',
            endpoint_url='https://bucket.poehali.dev',
            aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
            aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
        )
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        key = f'moonly/{timestamp}_{file_name}'
        
        s3.put_object(
            Bucket='files',
            Key=key,
            Body=file_bytes,
            ContentType=file_type
        )
        
        file_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"
        
        return response(200, {
            'file_url': file_url,
            'file_name': file_name,
            'file_size': len(file_bytes)
        })
    
    except Exception as e:
        return response(500, {'error': str(e)})

def response(status_code: int, data: dict) -> dict:
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps(data),
        'isBase64Encoded': False
    }
