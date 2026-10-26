import base64
import io
import json
import os
import sys
import unittest
from unittest.mock import AsyncMock, MagicMock, patch
from pathlib import Path
import httpx
from PIL import Image
from starlette.requests import Request
from fastapi import HTTPException

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import community_images as photos


def fixture_image():
    output = io.BytesIO()
    exif = Image.Exif()
    exif[270] = 'private test metadata'
    Image.new('RGB', (10, 10), 'blue').save(output, format='JPEG', exif=exif)
    return 'data:image/jpeg;base64,' + base64.b64encode(output.getvalue()).decode()


def request(payload, headers=None):
    body = json.dumps(payload).encode()
    async def receive():
        return {'type': 'http.request', 'body': body, 'more_body': False}
    return Request({'type': 'http', 'method': 'POST', 'path': '/', 'headers': headers or []}, receive)


class ImageValidationTests(unittest.TestCase):
    def test_metadata_removed(self):
        raw, width, height = photos.clean_image(fixture_image())
        self.assertEqual((width, height), (10, 10))
        with Image.open(io.BytesIO(raw)) as image:
            self.assertFalse(image.getexif())

    def test_svg_and_fake_image_rejected(self):
        for data in ['data:image/svg+xml;base64,PHN2Zz4=', 'data:image/jpeg;base64,bm90LWFuLWltYWdl']:
            with self.assertRaises(HTTPException): photos.clean_image(data)

    def test_oversized_photo_rejected(self):
        data = 'data:image/jpeg;base64,' + base64.b64encode(b'x' * (photos.MAX_IMAGE_BYTES + 1)).decode()
        with self.assertRaises(HTTPException) as error: photos.clean_image(data)
        self.assertEqual(error.exception.status_code, 413)

    def test_rate_limit(self):
        photos._attempts.clear()
        for _ in range(5): photos.check_rate('unit-test')
        with self.assertRaises(HTTPException) as error: photos.check_rate('unit-test')
        self.assertEqual(error.exception.status_code, 429)

    def test_cloud_failure_cleans_uploaded_blob(self):
        database, bucket, post, profile, blob = [MagicMock() for _ in range(5)]
        post.id = 'test-post'
        post.set.side_effect = RuntimeError('Firestore write failed')
        profile.exists = False
        def collection(name):
            result = MagicMock()
            result.document.return_value = post if name == 'community_posts' else MagicMock(get=MagicMock(return_value=profile))
            return result
        database.collection.side_effect = collection
        bucket.blob.return_value = blob
        blob.bucket.name = 'unit-test-bucket'
        payload = photos.PhotoPost(image=fixture_image(), content='Test', permission=True)
        with patch.object(photos, 'admin_app', return_value=object()), patch('firebase_admin.firestore.client', return_value=database), patch('firebase_admin.storage.bucket', return_value=bucket):
            with self.assertRaises(HTTPException): photos.publish_photo({'uid': 'test-user'}, payload, b'test', 10, 10)
        blob.delete.assert_called_once()


class ModerationTests(unittest.IsolatedAsyncioTestCase):
    async def test_flagged_or_missing_verdict_blocks_publication(self):
        for body, expected in [({'results': [{'flagged': True}]}, 422), ({'results': []}, 503), ({'results': [{}]}, 503)]:
            response = httpx.Response(200, json=body, request=httpx.Request('POST', 'https://example.invalid'))
            with patch.dict(os.environ, {'OPENAI_API_KEY': 'unit-test-key'}), patch.object(photos.httpx, 'AsyncClient') as factory:
                client = factory.return_value.__aenter__.return_value
                client.post = AsyncMock(return_value=response)
                with self.assertRaises(HTTPException) as error: await photos.moderate_photo(b'test', 'Caption')
                self.assertEqual(error.exception.status_code, expected)

    async def test_provider_error_blocks_publication(self):
        with patch.dict(os.environ, {'OPENAI_API_KEY': 'unit-test-key'}), patch.object(photos.httpx, 'AsyncClient') as factory:
            factory.return_value.__aenter__.return_value.post = AsyncMock(side_effect=httpx.TimeoutException('timeout'))
            with self.assertRaises(HTTPException) as error: await photos.moderate_photo(b'test', '')
            self.assertEqual(error.exception.status_code, 503)

    async def test_anonymous_request_never_publishes(self):
        with patch.object(photos, 'publish_photo') as publish:
            with self.assertRaises(HTTPException) as error: await photos.create_photo_post(request({}))
            self.assertEqual(error.exception.status_code, 401)
            publish.assert_not_called()

    async def test_permission_required_and_flagged_photo_never_published(self):
        photos._attempts.clear()
        with patch.object(photos, 'authenticated_user', return_value={'uid': 'unit-user'}), patch.object(photos, 'readiness', return_value=True), patch.object(photos, 'publish_photo') as publish:
            with self.assertRaises(HTTPException): await photos.create_photo_post(request({'image': fixture_image(), 'permission': False}))
            with patch.object(photos, 'moderate_photo', new=AsyncMock(side_effect=HTTPException(422, 'Flagged'))):
                with self.assertRaises(HTTPException): await photos.create_photo_post(request({'image': fixture_image(), 'permission': True}))
            publish.assert_not_called()

    async def test_approved_photo_published_only_after_check(self):
        photos._attempts.clear()
        events = []
        async def moderate(*args): events.append('moderated')
        def publish(*args):
            events.append('published')
            return {'id': 'unit-post'}
        with patch.object(photos, 'authenticated_user', return_value={'uid': 'unit-user'}), patch.object(photos, 'readiness', return_value=True), patch.object(photos, 'moderate_photo', new=moderate), patch.object(photos, 'publish_photo', new=publish):
            result = await photos.create_photo_post(request({'image': fixture_image(), 'content': 'Travel photo', 'permission': True}))
        self.assertEqual(result['id'], 'unit-post')
        self.assertEqual(events, ['moderated', 'published'])


if __name__ == '__main__': unittest.main()
