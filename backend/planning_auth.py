"""Verify Firebase ID tokens against Google's certificates without admin credentials."""
import os
from fastapi import Header, HTTPException
from google.auth.transport.requests import Request
from google.oauth2.id_token import verify_firebase_token

def require_planning_account(authorization: str | None = Header(default=None)):
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(401, 'Sign in for AI-generated plans and estimates. Guest planning is manual.')
    try:
        claims = verify_firebase_token(authorization[7:], Request(), audience=os.getenv('FIREBASE_PROJECT_ID', 'travelwithus-73db1'))
        project = os.getenv('FIREBASE_PROJECT_ID', 'travelwithus-73db1')
        if claims.get('iss') != f'https://securetoken.google.com/{project}' or not claims.get('sub'):
            raise ValueError('Invalid identity')
    except Exception:
        raise HTTPException(401, 'Your session could not be verified. Sign in again to use AI planning.')
    if claims.get('firebase', {}).get('sign_in_provider') == 'anonymous':
        raise HTTPException(403, 'Sign in with an account to use AI planning.')
    return claims
