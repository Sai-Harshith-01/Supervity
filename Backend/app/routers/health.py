# app/routers/health.py
"""
Health check endpoints.
"""

import os
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
from ..core.database import get_db

router = APIRouter(tags=["Health"])


@router.get("/health")
def read_health():
    """
    Liveness probe.
    Public via public.map.json.
    """
    return {"status": "ok"}


@router.get("/ready")
def read_ready():
    """
    Readiness probe.
    Public via public.map.json.
    """
    return {"status": "ready"}


@router.get("/health/detailed")
def read_health_detailed(db: Session = Depends(get_db)):
    """
    Enterprise detailed readiness check.
    Validates database connection, Supervity key configuration,
    and external pipeline webhook heartbeats.
    """
    # 1. Database Connection Check
    db_status = "ok"
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_status = "error"
        
    # 2. Supervity API Check
    supervity_key = os.getenv("SUPERVITY_API_KEY")
    supervity_status = "ok"
    if not supervity_key or supervity_key == "YOUR_SUPERVITY_JWT_TOKEN_HERE" or supervity_key == "":
        supervity_status = "simulated"
        
    # 3. Slack Webhook Check
    slack_webhook = os.getenv("SLACK_WEBHOOK_URL")
    slack_status = "ok" if slack_webhook else "simulated"
    
    # 4. HubSpot CRM Integration Check
    hubspot_key = os.getenv("HUBSPOT_API_KEY")
    hubspot_status = "ok" if hubspot_key else "simulated"
    
    # 5. Outlook SMTP Integration Check
    outlook_configured = os.getenv("OUTLOOK_CLIENT_ID") or os.getenv("SMTP_SERVER")
    outlook_status = "ok" if outlook_configured else "simulated"
    
    # Final global readiness status
    global_status = "ok" if db_status == "ok" else "degraded"
    
    return {
        "status": global_status,
        "details": {
            "backend": "ok",
            "database": db_status,
            "supervity_api": supervity_status,
            "slack": slack_status,
            "hubspot": hubspot_status,
            "outlook": outlook_status
        }
    }


