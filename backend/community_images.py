"""Authenticated, moderated photo publishing. No client-supplied moderation verdicts."""
import base64
import binascii
import io
import json
import os
import uuid
import time
from threading import Lock
import warnings
from functools import lru_cache
from urllib.parse import quote

import httpx
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field, ValidationError
from PIL import Image, ImageOps, UnidentifiedImageError
from typing import Literal

router = APIRouter(prefix='/api/community')
MAX_IMAGE_BYTES = 5 * 1024 * 1024
MAX_BODY_BYTES = 7 * 1024 * 1024
_attempts = {}
_attempt_lock = Lock()
Image.MAX_IMAGE_PIXELS = 16_000_000


class PhotoPost(BaseModel):
    image: str = Field(max_length=MAX_BODY_BYTES)
    content: str = Field(default='', max_length=500)
    permission: Literal[True]
    poll: list[str] = Field(default_factory=list, max_length=6)


def readiness():
    return bool(os.getenv('OPENAI_API_KEY') and os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
                and os.getenv('FIREBASE_STORAGE_BUCKET') and os.getenv('COMMUNITY_IMAGE_RULES_CONFIRMED') == 'true')


@router.get('/image-status')
def image_status():
    return {'ready': readiness(), 'maxBytes': MAX_IMAGE_BYTES,
            'message': 'Photos are checked before publishing.' if readiness() else 'Photo posting is awaiting server moderation setup. You can still share text and polls.'}


@lru_cache(maxsize=1)
def admin_app():
    if not (os.getenv('GOOGLE_APPLICATION_CREDENTIALS') and os.getenv('FIREBASE_STORAGE_BUCKET') and os.getenv('COMMUNITY_IMAGE_RULES_CONFIRMED') == 'true'):
        raise HTTPException(503, 'Photo posting is not configured yet. Text posts are still available.')
    import firebase_admin
    from firebase_admin import credentials
    try:
        return firebase_admin.initialize_app(credentials.Certificate(os.environ['GOOGLE_APPLICATION_CREDENTIALS']),
                                             {'storageBucket': os.environ['FIREBASE_STORAGE_BUCKET']}, name='community-images')
    except Exception:
        raise HTTPException(503, 'Photo publishing is unavailable. Please try again later.')


def authenticated_user(request):
    header = request.headers.get('authorization', '')
    if not header.startswith('Bearer '):
        raise HTTPException(401, 'Sign in to post a photo.')
    from firebase_admin import auth
    app = admin_app()
    try:
        return auth.verify_id_token(header[7:], app=app, check_revoked=True)
    except Exception:
        raise HTTPException(401, 'Your session has expired. Please sign in again.')


def check_rate(uid):
    now = time.monotonic()
    with _attempt_lock:
        for key in [key for key, (start, _) in _attempts.items() if now - start >= 60]:
            del _attempts[key]
        start, count = _attempts.get(uid, (now, 0))
        if count >= 5 or (uid not in _attempts and len(_attempts) >= 4096):
            raise HTTPException(429, 'Please wait a minute before trying another photo.')
        _attempts[uid] = (start, count + 1)


def clean_image(data_url):
    if not data_url.startswith(('data:image/jpeg;base64,', 'data:image/png;base64,', 'data:image/webp;base64,')):
        raise HTTPException(415, 'Choose a JPEG, PNG or WebP photo.')
    try:
        raw = base64.b64decode(data_url.split(',', 1)[1], validate=True)
    except (ValueError, binascii.Error):
        raise HTTPException(400, 'The photo could not be read.')
    if not raw or len(raw) > MAX_IMAGE_BYTES:
        raise HTTPException(413, 'Choose a photo no larger than 5 MB.')
    try:
        with warnings.catch_warnings():
            warnings.simplefilter('error', Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(raw)) as source:
                if source.format not in ('JPEG', 'PNG', 'WEBP') or getattr(source, 'n_frames', 1) != 1:
                    raise HTTPException(415, 'Only still JPEG, PNG and WebP photos are supported.')
                source.load()
                image = ImageOps.exif_transpose(source).convert('RGB')
                image.thumbnail((2000, 2000))
                # Rebuild pixels to discard EXIF, location, comments and embedded profiles.
                cleaned = Image.new('RGB', image.size)
                cleaned.paste(image)
                output = io.BytesIO()
                cleaned.save(output, format='JPEG', quality=88)
                return output.getvalue(), cleaned.width, cleaned.height
    except HTTPException:
        raise
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombWarning, Image.DecompressionBombError):
        raise HTTPException(400, 'This photo is invalid or too large to process.')


async def moderate_photo(image, text):
    key = os.getenv('OPENAI_API_KEY')
    if not key:
        raise HTTPException(503, 'Photo checks are unavailable. Your photo has not been published.')
    inputs = [{'type': 'image_url', 'image_url': {'url': 'data:image/jpeg;base64,' + base64.b64encode(image).decode()}}]
    if text.strip():
        inputs.append({'type': 'text', 'text': text})
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post('https://api.openai.com/v1/moderations', headers={'Authorization': f'Bearer {key}'},
                                         json={'model': 'omni-moderation-latest', 'input': inputs})
            response.raise_for_status()
            results = response.json().get('results', [])
            if not results or any(not isinstance(result.get('flagged'), bool) for result in results):
                raise ValueError('Missing moderation verdict')
    except (httpx.HTTPError, ValueError, TypeError, AttributeError):
        raise HTTPException(503, 'Photo checks could not complete. Your photo has not been published. Try again later.')
    if any(result['flagged'] for result in results):
        raise HTTPException(422, 'This photo or its caption was flagged by our safety check and was not published. Try another photo.')


async def bounded_json(request):
    body = bytearray()
    async for chunk in request.stream():
        body.extend(chunk)
        if len(body) > MAX_BODY_BYTES:
            raise HTTPException(413, 'Choose a photo no larger than 5 MB.')
    try:
        return PhotoPost.model_validate_json(bytes(body))
    except ValidationError:
        raise HTTPException(400, 'Check your caption, photo and photo-sharing permission.')


def publish_photo(claims, payload, image, width, height):
    from firebase_admin import firestore, storage
    app = admin_app()
    database = firestore.client(app=app)
    post = database.collection('community_posts').document()
    path = f'community_moderated/{claims["uid"]}/{post.id}.jpg'
    blob = storage.bucket(app=app).blob(path)
    token = str(uuid.uuid4())
    blob.metadata = {'firebaseStorageDownloadTokens': token}
    try:
        blob.upload_from_string(image, content_type='image/jpeg')
        profile = database.collection('user_profiles').document(claims['uid']).get()
        profile_data = profile.to_dict() if profile.exists else {}
        post.set({'content': payload.content.strip(), 'authorId': claims['uid'],
                  'authorName': profile_data.get('displayName') or claims.get('name') or 'Traveler',
                  'authorPhoto': profile_data.get('photoURL') or claims.get('picture'),
                  'createdAt': firestore.SERVER_TIMESTAMP, 'likes': [], 'replies': [],
                  'poll': [{'option': option.strip(), 'votes': []} for option in payload.poll] if len(payload.poll) >= 2 else None,
                  'media': {'url': f'https://firebasestorage.googleapis.com/v0/b/{quote(blob.bucket.name, safe="")}/o/{quote(path, safe="")}?alt=media&token={token}',
                            'storagePath': path, 'width': width, 'height': height, 'moderationStatus': 'approved'},
                  'photoPermissionConfirmed': True})
    except Exception:
        try:
            blob.delete()
        except Exception:
            pass
        raise HTTPException(503, 'Could not publish the photo. Please try again.')
    return {'id': post.id}


@router.post('/image-post')
async def create_photo_post(request: Request):
    from starlette.concurrency import run_in_threadpool
    claims = await run_in_threadpool(authenticated_user, request)
    if not readiness():
        raise HTTPException(503, 'Photo checks are unavailable. Your photo has not been published.')
    check_rate(claims['uid'])
    payload = await bounded_json(request)
    if any(not option.strip() or len(option) > 50 for option in payload.poll) or len(payload.poll) == 1:
        raise HTTPException(400, 'A poll needs 2–6 nonempty options of at most 50 characters.')
    image, width, height = await run_in_threadpool(clean_image, payload.image)
    await moderate_photo(image, payload.content + '\n' + '\n'.join(payload.poll))
    # Blocking cloud SDK operations run outside the event loop, only after approval.
    from starlette.concurrency import run_in_threadpool
    return await run_in_threadpool(publish_photo, claims, payload, image, width, height)


@router.delete('/image-post/{post_id}')
def delete_photo_post(post_id: str, request: Request):
    claims = authenticated_user(request)
    from firebase_admin import firestore, storage
    app = admin_app()
    reference = firestore.client(app=app).collection('community_posts').document(post_id)
    snapshot = reference.get()
    if not snapshot.exists:
        raise HTTPException(404, 'Post not found.')
    data = snapshot.to_dict()
    if data.get('authorId') != claims['uid']:
        raise HTTPException(403, 'Only the author can delete this photo.')
    path = data.get('media', {}).get('storagePath', '')
    if path == f'community_moderated/{claims["uid"]}/{post_id}.jpg':
        from google.api_core.exceptions import NotFound
        try:
            storage.bucket(app=app).blob(path).delete()
        except NotFound:
            pass
    reference.delete()
    return {'deleted': True}


@router.post('/image-post/{post_id}/report')
def report_photo(post_id: str, request: Request):
    claims = authenticated_user(request)
    from firebase_admin import firestore
    database = firestore.client(app=admin_app())
    if not database.collection('community_posts').document(post_id).get().exists:
        raise HTTPException(404, 'Post not found.')
    database.collection('community_image_reports').document(f'{post_id}_{claims["uid"]}').set({
        'postId': post_id, 'reporterId': claims['uid'], 'status': 'pending', 'createdAt': firestore.SERVER_TIMESTAMP})
    return {'reported': True}
