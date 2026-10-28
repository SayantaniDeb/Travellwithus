"""Durable daily AI credits. All mutations run server-side in Firestore transactions."""
import os
import uuid
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from functools import lru_cache
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from planning_auth import require_planning_account

ADMIN_EMAIL = 'sayantani.1001@gmail.com'
DAILY_LIMIT = 5
router = APIRouter(prefix='/api')

def is_credit_admin(claims):
    return claims.get('email_verified') is True and claims.get('email', '').lower() == ADMIN_EMAIL

def require_credit_admin(claims=Depends(require_planning_account)):
    if not is_credit_admin(claims): raise HTTPException(403, 'Administrator access required.')
    return claims

@lru_cache(maxsize=1)
def admin_app():
    import firebase_admin
    from firebase_admin import credentials
    try:
        path = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
        credential = credentials.Certificate(path) if path else credentials.ApplicationDefault()
        # Resolve eagerly: otherwise missing ADC surfaces later as a misleading permissions error.
        credential.get_credential()
        return firebase_admin.initialize_app(credential,
            {'projectId': os.getenv('FIREBASE_PROJECT_ID', 'travelwithus-73db1')}, name='credits-admin')
    except Exception:
        raise HTTPException(503, 'Firebase Admin credentials are missing or invalid on the backend. Configure GOOGLE_APPLICATION_CREDENTIALS with a service-account JSON file, then restart the backend. User listing and credit grants require this server setup.')

def database():
    from firebase_admin import firestore
    try: return firestore.client(app=admin_app())
    except HTTPException: raise
    except Exception: raise HTTPException(503, 'Credit storage is unavailable. Please contact the administrator.')

def daily_window():
    now=datetime.now(ZoneInfo('Asia/Kolkata'))
    tomorrow=(now+timedelta(days=1)).replace(hour=0,minute=0,second=0,microsecond=0)
    return now.date().isoformat(), tomorrow.isoformat()

def balance(data, unlimited=False):
    limit=DAILY_LIMIT+int(data.get('bonus',0)); used=int(data.get('used',0))
    return {'limit':limit,'remaining':max(0,limit-used),'used':used,'unlimited':unlimited,'resetsAt':daily_window()[1]}

def day_ref(db,uid,day=None):
    return db.collection('ai_credit_accounts').document(uid).collection('days').document(day or daily_window()[0])

@router.get('/credits')
def get_credits(claims=Depends(require_planning_account)):
    if is_credit_admin(claims): return balance({},True)
    try: return balance(day_ref(database(),claims['sub']).get().to_dict() or {})
    except HTTPException: raise
    except Exception: raise HTTPException(503,'Could not load your credits. Please try again.')

def reserve_credit(claims):
    if is_credit_admin(claims): return None
    from firebase_admin import firestore
    db=database(); day=daily_window()[0]; ref=day_ref(db,claims['sub'],day)
    ticket=ref.collection('requests').document(uuid.uuid4().hex)
    @firestore.transactional
    def reserve(tx):
        data=ref.get(transaction=tx).to_dict() or {}
        if balance(data)['remaining']<=0: raise HTTPException(429,'Your daily AI credits are used up. Credits reset at midnight IST.')
        tx.set(ref,{'used':int(data.get('used',0))+1,'bonus':int(data.get('bonus',0))},merge=True)
        tx.set(ticket,{'state':'reserved','createdAt':firestore.SERVER_TIMESTAMP})
    try: reserve(db.transaction())
    except HTTPException: raise
    except Exception: raise HTTPException(503,'Could not reserve a credit. No AI request was started.')
    return (db,ref,ticket)

def finish_credit(reservation, success):
    if reservation is None: return
    from firebase_admin import firestore
    db,ref,ticket=reservation
    @firestore.transactional
    def finish(tx):
        request=ticket.get(transaction=tx).to_dict() or {}
        data=ref.get(transaction=tx).to_dict() or {}
        if request.get('state')!='reserved': return
        if not success: tx.set(ref,{'used':max(0,int(data.get('used',0))-1)},merge=True)
        tx.update(ticket,{'state':'charged' if success else 'refunded'})
    finish(db.transaction())

@router.get('/admin/users')
def list_users(page_token: str | None=None, claims=Depends(require_credit_admin)):
    from firebase_admin import auth
    try:
        page=auth.list_users(page_token=page_token,max_results=50,app=admin_app())
        db=database(); users=[]
        for user in page.users:
            if not user.email: continue
            data=day_ref(db,user.uid).get().to_dict() or {}
            users.append({'uid':user.uid,'email':user.email,'name':user.display_name or '', 'disabled':user.disabled,
                'credits':balance(data,user.email.lower()==ADMIN_EMAIL and user.email_verified)})
        return {'users':users,'nextPageToken':page.next_page_token}
    except HTTPException: raise
    except Exception: raise HTTPException(503,'Could not load users. Check Firebase Admin permissions on the server.')

class Grant(BaseModel):
    amount: int=Field(default=5,ge=1,le=100)

@router.post('/admin/users/{uid}/credits')
def grant_credits(uid: str, grant: Grant, claims=Depends(require_credit_admin)):
    from firebase_admin import firestore, auth
    try: auth.get_user(uid,app=admin_app())
    except Exception: raise HTTPException(404,'User not found or user lookup unavailable.')
    db=database();ref=day_ref(db,uid);audit=db.collection('ai_credit_grants').document()
    @firestore.transactional
    def add(tx):
        data=ref.get(transaction=tx).to_dict() or {}
        tx.set(ref,{'bonus':int(data.get('bonus',0))+grant.amount},merge=True)
        tx.set(audit,{'uid':uid,'amount':grant.amount,'day':daily_window()[0],'adminUid':claims['sub'],'createdAt':firestore.SERVER_TIMESTAMP})
    try: add(db.transaction())
    except Exception: raise HTTPException(503,'Could not grant credits. Please retry.')
    return balance(ref.get().to_dict() or {})
