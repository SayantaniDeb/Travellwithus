import asyncio
import importlib.util
import os
from pathlib import Path
import sys
import time
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from api_safety import PublicApiGuard
from destinations import suggest_destinations, place_index
spec = importlib.util.spec_from_file_location('isolated_cache', ROOT / 'ai_router/cache.py')
cache_module = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = cache_module
spec.loader.exec_module(cache_module)

class CacheTests(unittest.TestCase):
    def test_prompt_and_feature_changes_do_not_share_cached_answers(self):
        cache = cache_module.SemanticCache()
        a = [{'role':'user','content':'Plan a 4-day trip to "Goa, India" with INR 10000'}]
        b = [{'role':'user','content':'Plan a 4-day trip to "Goa, India" with INR 10000. Avoid beaches.'}]
        params = {'destination':'Goa', 'days':4, 'budget':10000}
        cache.set(a,'first','itinerary',params)
        self.assertEqual(cache.get(a,'itinerary',params),'first')
        self.assertIsNone(cache.get(b,'itinerary',params))
        self.assertIsNone(cache.get(a,'budget',params))
        self.assertNotIn('_request',params)

    def test_indexed_suggestions_match_scan_and_normalize_accents(self):
        records, _ = place_index()
        for query in ['kol','goa','agra','zzzzzzz','côte']:
            normalized = __import__('destinations').normalize(query)
            matches = [record for record in records if record[0].startswith(normalized)]
            rank = lambda record: (record[0] != normalized, -record[1], record[0], record[2]['id'])
            countries = sorted((r for r in matches if r[2]['kind']=='country'),key=rank)[:3]
            cities = sorted((r for r in matches if r[2]['kind']=='place'),key=rank)[:10-len(countries)]
            expected = [r[2] for r in sorted(countries+cities,key=lambda r:(r[0]!=normalized,r[2]['kind']!='country',-r[1],r[0]))]
            self.assertEqual(suggest_destinations(query),expected)
        self.assertEqual(suggest_destinations(' KÓL '),suggest_destinations('kol'))

class GuardTests(unittest.IsolatedAsyncioTestCase):
    async def invoke(self, guard, body=b'{}'):
        sent=[]
        events=[{'type':'http.request','body':body,'more_body':False}]
        async def receive(): return events.pop(0) if events else {'type':'http.disconnect'}
        async def send(event): sent.append(event)
        await guard({'type':'http','method':'POST','path':'/api/completions','client':('127.0.0.1',1)},receive,send)
        return sent[0]['status']
    async def test_limits_and_request_body_replay(self):
        received=[]
        async def app(scope,receive,send):
            received.append((await receive())['body'])
            await send({'type':'http.response.start','status':200,'headers':[]})
            await send({'type':'http.response.body','body':b'ok'})
        guard=PublicApiGuard(app,per_minute=1,max_body=20)
        self.assertEqual(await self.invoke(guard),200)
        self.assertEqual(received,[b'{}'])
        self.assertEqual(await self.invoke(guard),429)
        self.assertEqual(guard.active,0)
        guard=PublicApiGuard(app,max_body=2)
        self.assertEqual(await self.invoke(guard,b'too big'),413)
        self.assertEqual(guard.active,0)

class EndpointTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from fastapi.testclient import TestClient
        from main import app
        cls.client = TestClient(app)
    def test_admin_routes_fail_closed(self):
        with patch.dict(os.environ, {'ADMIN_API_KEY':''}):
            for path in ['/api/router/status','/api/router/metrics','/api/rate-limits']:
                self.assertEqual(self.client.get(path).status_code,403)
            self.assertEqual(self.client.post('/api/cache/invalidate').status_code,403)
    def test_ai_and_coordinate_limits(self):
        self.assertEqual(self.client.post('/api/completions',json={'model':'x','messages':[{'role':'user','content':'x'}],'max_tokens':999999}).status_code,422)
        self.assertEqual(self.client.get('/api/geocode?lat=91&lng=0').status_code,422)
        self.assertEqual(self.client.get('/api/weather?lat=0&lon=181').status_code,422)

if __name__ == '__main__': unittest.main()
