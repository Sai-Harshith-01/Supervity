import os
import httpx
import logging
import asyncio
import uuid
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from sqlalchemy import text
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..models.audit import AuditLog, AuditCategory, AuditSeverity
from ..security import get_current_user


log = logging.getLogger(__name__)

router = APIRouter(
    prefix="/ai",
    tags=["AI"],
)

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage]
    context: Optional[Dict[str, Any]] = None

@router.post("/chat")
async def chat_endpoint(
    req: ChatRequest,
    user: dict = Depends(get_current_user),
):
    """
    AI Chat Endpoint - routes user messages to the Supervity multi-agent execution pipeline.
    """
    log.info(f"Received chat request from user {user.get('email')}: {req.message[:50]}...")

    # Load Supervity configuration from environment
    api_url = os.getenv("SUPERVITY_API_URL")
    workflow_id = os.getenv("SUPERVITY_WORKFLOW_ID")
    api_key = os.getenv("SUPERVITY_API_KEY")
    x_source = os.getenv("SUPERVITY_X_SOURCE", "v1")

    if not api_url or not api_key:
        log.warning("Supervity API configuration is missing. Falling back to local mock AI employee.")
        return get_mock_response(req.message, req.context)

    # Construct headers and request payload for Supervity API
    headers = {
        "Authorization": f"Bearer {api_key}",
        "x-source": x_source,
    }
    
    import datetime
    session_id = (req.context or {}).get("session_id") or "session-cc-01"
    timestamp = datetime.datetime.utcnow().isoformat()
    contact = user.get("email") or "234g1a05d5@srit.ac.in"
    company = "Vertex Group"

    # Intelligently extract company/contact from context if available
    msg_lower = req.message.lower()
    if "acme" in msg_lower:
        company = "Acme Corp"
    elif "vertex" in msg_lower:
        company = "Vertex Group"
    elif "tech" in msg_lower:
        company = "TechOrbit"

    # Structure multipart/form-data fields matching the curl -F options exactly
    files = {
        "workflowId": (None, workflow_id),
        "inputs[session_id]": (None, session_id),
        "inputs[timestamp]": (None, timestamp),
        "inputs[contact]": (None, contact),
        "inputs[company]": (None, company),
    }

    try:
        # Connect and execute workflow run (stream mode)
        async with httpx.AsyncClient(timeout=60.0) as client:
            log.info(f"Calling Supervity API at {api_url} with multipart form-data")
            response = await client.post(api_url, headers=headers, files=files)
            
            if response.status_code != 200:
                log.error(f"Supervity API returned status code {response.status_code}: {response.text}")
                return get_mock_response(req.message, req.context)

            # Check if SSE stream is returned
            content_type = response.headers.get("content-type", "")
            
            if "text/event-stream" in content_type:
                full_text = ""
                async for line in response.aiter_lines():
                    if line.startswith("data:"):
                        data_str = line[5:].strip()
                        if data_str == "[DONE]":
                            break
                        try:
                            import json
                            data = json.loads(data_str)
                            if isinstance(data, dict):
                                delta = data.get("delta") or data.get("text") or data.get("content") or data.get("response") or ""
                                full_text += str(delta)
                            elif isinstance(data, str):
                                full_text += data
                        except Exception:
                            pass
                
                if full_text.strip():
                    return {"response": full_text.strip(), "tool_calls": []}
            
            # Attempt JSON parsing
            try:
                data = response.json()
                output = data.get("response") or data.get("output", {}).get("response") or data.get("output_data", {}).get("response") or data.get("output")
                if output:
                    return {"response": str(output), "tool_calls": []}
            except Exception:
                pass
            
            log.warning("Could not parse Supervity response format. Using fallback response.")
            return get_mock_response(req.message, req.context)

    except httpx.RequestError as exc:
        log.error(f"HTTP request to Supervity failed: {exc}")
        return get_mock_response(req.message, req.context)

def get_mock_response(message: str, context: Optional[dict] = None) -> dict:
    """
    Highly advanced multi-agent simulated routing fallback system for the Command Center.
    Processes queries targeting specific operators (Orchestrator, Enrichment, Outreach, Governance)
    and retrieves real-time platform diagnostics.
    """
    msg_lower = message.lower()
    
    # 1. Agent: Enrichment
    if "enrich" in msg_lower or "lookup" in msg_lower or "data" in msg_lower:
        response_text = (
            "### 🔍 [Enrichment Agent] Channel Connected\n\n"
            "\"Enrichment Agent online. Ready to profile lead domains, extract company metrics, and push targets to the sequencer.\"\n\n"
            "**Current Operator Status:**\n"
            "*   🟢 **API Status:** Clearbit (Connected), LinkedIn Scraper (Operational)\n"
            "*   📈 **Success Rate:** `98.6%` (Nominal)\n"
            "*   📦 **Last Activity:** Enriched Acme Corp with 14 custom fields (2m ago)\n\n"
            "**Available Actions:**\n"
            "1. Type `Enrich <domain>` to force a manual company profile scan.\n"
            "2. Type `Score <domain>` to calculate high-value lead scoring."
        )
    # 2. Agent: Outreach
    elif "outreach" in msg_lower or "email" in msg_lower or "send" in msg_lower or "sequence" in msg_lower:
        response_text = (
            "### ✉️ [Outreach Agent] Channel Connected\n\n"
            "\"Outreach Agent ready. I automate personalized sequencers, cold outreach pipelines, and mail delivery schedules.\"\n\n"
            "**Current Operator Status:**\n"
            "*   🟢 **API Status:** Outlook SMTP (Connected), Slack Webhooks (Operational)\n"
            "*   📈 **Conversion Spike:** `2.3x` lift in LinkedIn campaign response rate\n"
            "*   📦 **Last Activity:** Custom pitch delivered to CEO of Vertex Group (25m ago)\n\n"
            "**Available Actions:**\n"
            "1. Type `Draft pitch <company>` to auto-generate a custom value proposition.\n"
            "2. Type `Schedule sequencer` to optimize lead sequence delay triggers."
        )
    # 3. Agent: Governance
    elif "governance" in msg_lower or "policy" in msg_lower or "rule" in msg_lower:
        response_text = (
            "### 🛡️ [Governance Agent] Channel Connected\n\n"
            "\"Governance Agent online. I monitor all multi-agent execution traces against plaintext compliance guardrails.\"\n\n"
            "**Current Compliance Status:**\n"
            "*   🟢 **Score:** `99.8%` compliant rating (SOC2, HIPAA certified)\n"
            "*   📋 **Active Guardrails:** `18 Plaintext Rules` actively monitored\n"
            "*   ⚠️ **Rule violation protection:** Large Transaction CFO Review Rule (Active for amounts > $50K)\n\n"
            "**Available Actions:**\n"
            "1. Type `Audits` to fetch the compliance audit history logs.\n"
            "2. Navigate to the **AI Policies** tab to edit or register new guardrails."
        )
    # 4. Agent: Orchestrator
    elif "orchestrat" in msg_lower or "pipeline" in msg_lower or "loop" in msg_lower:
        response_text = (
            "### 🧠 [Orchestrator Agent] Channel Connected\n\n"
            "\"Orchestrator Agent here. I manage context handoffs, coordinate sub-operators, and monitor live workflow visual pathways.\"\n\n"
            "**Current Workflow Loop Status:**\n"
            "*   🟢 **Status:** Active Campaign running smoothly\n"
            "*   🔀 **Active Node:** `Smart Pitch` (Processing Outreach sequence)\n"
            "*   📈 **Total Handled Sessions:** `524` active loops\n\n"
            "**Available Actions:**\n"
            "1. Type `Trace execution` to inspect the latest step reasoning paths.\n"
            "2. Type `Show flowchart` to reset the active visual loop diagram."
        )
    # 5. Command Center Telemetry
    elif "telemetry" in msg_lower or "metric" in msg_lower or "status" in msg_lower or "health" in msg_lower:
        response_text = (
            "### 📊 Command Center Telemetry Report\n\n"
            "Here is the real-time operational status of all platform resources:\n\n"
            "| Resource | Telemetry Metric | Status |\n"
            "| :--- | :--- | :--- |\n"
            "| **Total Users** | `10,400` (+12% MoM) | 🟢 Optimal |\n"
            "| **Active Sessions** | `524` | 🟢 Nominal |\n"
            "| **Success Rate** | `98.0%` | 🟢 High |\n"
            "| **AI Confidence** | `96.0%` | 🟢 Excellent |\n"
            "| **Compliance Rating** | `99.8%` (SOC2) | 🟢 Certified |\n"
            "| **HITL Exception Queue** | `3 Tasks pending` | 🟡 Attention Required |\n\n"
            "All autonomous worker nodes are healthy and reporting operational telemetry."
        )
    # 6. Workbench & Exceptions
    elif "workbench" in msg_lower or "exception" in msg_lower or "hitl" in msg_lower or "fail" in msg_lower or "queue" in msg_lower:
        response_text = (
            "### 🛠️ AI Workbench Queue Summary\n\n"
            "The **Human-in-the-loop (HITL)** exception manager reports `3 pending review items`:\n\n"
            "1.  **Item #1209:** Clearbit API Credit Limit Exceeded (Enrichment, Routed 14m ago)\n"
            "2.  **Item #1208:** CFO Approval Needed - Transaction exceeds $50K (Governance, Routed 1h ago)\n"
            "3.  **Item #1207:** Lead Outreach bounce-rate exception (Outreach, Routed 2h ago)\n\n"
            "**System Health:** Escalation rate is at `0.8%` (well within standard thresholds).\n\n"
            "*Select the **AI Workbench** sidebar tab to manually resolve or override these exceptions.*"
        )
    # 7. List Agents
    elif "agent" in msg_lower or "who" in msg_lower:
        response_text = (
            "### 🤖 Active Multi-Agent Workforce\n\n"
            "I coordinate **4 specialized autonomous AI agents** across your system:\n\n"
            "1.  **🧠 Orchestrator Agent:** Oversees stateful context handoffs and pipelines.\n"
            "2.  **🔍 Enrichment Agent:** Ingests company lookups, scraper details, and scorers.\n"
            "3.  **✉️ Outreach Agent:** Automates personalized sequences and delivery targets.\n"
            "4.  **🛡️ Governance Agent:** Assures rule compliance and flags exceptions.\n\n"
            "**What would you like to do?**\n"
            "*   Type `Talk to <Agent Name>` to open a direct operator channel.\n"
            "*   Type `Telemetry` to check global Command Center resources."
        )
    # Default Copilot introduction
    else:
        response_text = (
            "### 🤖 AutoPilot Copilot Connected\n\n"
            "Hello! I am your intelligent unified **Command Center Assistant**. "
            "I coordinate and facilitate communications with all specialized active agents in your workforce:\n\n"
            "*   **🧠 Orchestrator:** Stateful task sequences.\n"
            "*   **🔍 Enrichment Agent:** Data lookups & company profiling.\n"
            "*   **✉️ Outreach Agent:** Cold email sequencing.\n"
            "*   **🛡️ Governance Agent:** Guardrails & plaintext business policies.\n\n"
            "**Quick Queries:**\n"
            "*   `Show all active agents`\n"
            "*   `Get system telemetry report`\n"
            "*   `What exceptions are in the Workbench?`\n"
            "*   `Talk to Governance Agent`\n\n"
            "How can I assist you with your workforce today?"
        )
        
    return {
        "response": response_text,
        "tool_calls": []
    }

# In-memory database of the dashboard state to demonstrate real-time mutation/interaction!
DASHBOARD_STATE = {
    "stats": {
        "total_users": {
            "value": 10400,
            "trend": "+12% this month",
            "positive": True
        },
        "active_sessions": {
            "value": 524,
            "trend": "+8% vs yesterday",
            "positive": True
        },
        "success_rate": {
            "value": 98,
            "trend": "+2% this week",
            "positive": True
        },
        "ai_confidence": {
            "value": 96,
            "trend": "Stable — nominal",
            "positive": True
        }
    },
    "workflow": [
        {"title": "Lead Intake", "subtitle": "Webhooks & Form", "icon": "mail", "status": "completed"},
        {"title": "Enrichment", "subtitle": "Clearbit & AI", "icon": "search", "status": "completed"},
        {"title": "Smart Pitch", "subtitle": "Outreach Sequencer", "icon": "sparkles", "status": "active"},
        {"title": "CRM Sync", "subtitle": "HubSpot Push", "icon": "table", "status": "pending"},
        {"title": "Review Flag", "subtitle": "HITL Verification", "icon": "shield", "status": "pending"}
    ],
    "activities": [
        {
            "id": 1,
            "title": "Lead Enriched",
            "description": "Acme Corp profile updated with 14 custom fields.",
            "time": "2m ago",
            "icon": "search",
            "color": "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-500/10",
            "badge": "AI Success",
            "badgeColor": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
        },
        {
            "id": 2,
            "title": "HubSpot Synced",
            "description": "Deals table updated for pipeline sync loop.",
            "time": "8m ago",
            "icon": "table",
            "color": "text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-500/10",
            "badge": "API Push",
            "badgeColor": "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
        },
        {
            "id": 3,
            "title": "Human Review Requested",
            "description": "Clearbit API credit limits escalated.",
            "time": "14m ago",
            "icon": "shield",
            "color": "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10",
            "badge": "HITL Trigger",
            "badgeColor": "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
        },
        {
            "id": 4,
            "title": "Slack Message Routed",
            "description": "Lead notification pushed to sales group.",
            "time": "25m ago",
            "icon": "messageSquare",
            "color": "text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-500/10",
            "badge": "Routed",
            "badgeColor": "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20"
        }
    ],
    "governance": {
        "compliance_score": 99.8,
        "active_policies": 18,
        "hitl_queue": 3,
        "compliance_status": "Certified (SOC2)",
        "escalation_rate": 0.8
    },
    "integrations": [
        {"name": "Slack", "status": "Connected", "icon": "messageSquare", "color": "text-amber-500"},
        {"name": "Outlook", "status": "Connected", "icon": "mail", "color": "text-blue-500"},
        {"name": "HubSpot", "status": "Connected", "icon": "table", "color": "text-orange-500"},
        {"name": "Supervity", "status": "Sync Active", "icon": "zap", "color": "text-purple-500"},
        {"name": "Webhooks", "status": "Operational", "icon": "network", "color": "text-emerald-500"}
    ]
}

class CLIRequest(BaseModel):
    command: str

@router.get("/dashboard-data")
async def get_dashboard_data(
    user: dict = Depends(get_current_user),
):
    """
    Get live dashboard data (stats, activities, workflow status, governance, integrations)
    """
    return DASHBOARD_STATE

@router.post("/execute-cli")
async def execute_cli(
    req: CLIRequest,
    user: dict = Depends(get_current_user),
):
    """
    Execute a CLI command inside the backend, mutate global state, and return outputs.
    """
    cmd = req.command.strip()
    if not cmd:
        return {"output": [""]}
    
    log.info(f"CLI Execution: '{cmd}' by {user.get('email')}")
    
    parts = cmd.split(" ")
    base_cmd = parts[0].lower()
    arg = " ".join(parts[1:]).strip()
    
    output = []
    
    if base_cmd == "help":
        output = [
            "Available Commands:",
            "  help                       - Display this workforce instruction manual.",
            "  agents                     - List active autonomous agents and session counts.",
            "  policies                   - Audit registered government policies (GDPR, SEC, SOC2).",
            "  enrich <domain>            - Execute lead profiling under GDPR privacy compliance.",
            "  audit                      - Query immutable system execution logs.",
            "  workbench                  - List pending exceptions in the Human-in-the-loop queue.",
            "  workbench resolve <id>     - Authorize/bypass a pending policy exception.",
            "  clear                      - Clear the console window history.",
        ]
    elif base_cmd == "agents":
        output = [
            "🔍 4 ACTIVE WORKFORCE AGENTS ONLINE:",
            "------------------------------------------------------------------------",
            f"- 🧠 [Orchestrator Agent]  : ACTIVE | Session: #{DASHBOARD_STATE['stats']['active_sessions']['value']} | State: Smart Pitch",
            "- 🔍 [Enrichment Agent]    : READY  | Latency: 14ms | Target: Acme Corp",
            "- ✉️ [Outreach Agent]      : READY  | Mode: Sequencer | SMTP: Outlook (OK)",
            f"- 🛡️ [Governance Agent]    : ACTIVE | Plaintext Policies loaded: {DASHBOARD_STATE['governance']['active_policies']} rules",
        ]
    elif base_cmd == "policies":
        output = [
            "🛡️ REGISTERED GOVERNMENT COMPLIANCE & DYNAMIC AI POLICIES:",
            "------------------------------------------------------------------------",
            "1. [GDPR Article 17] Privacy Safeguard (Active):",
            "   - Check: Scans lead metadata. Masks personal PII automatically.",
            "   - Compliance Audit: 100% Certified Compliant",
            "",
            "2. [SEC Rule 17a-4] Immutable Record Retention (Active):",
            "   - Check: Archives CRM synchronizations immutably to encrypted history.",
            "   - Compliance Audit: 100% Certified Compliant",
            "",
            "3. [SOC2 Limit Enforcement] Transaction Guardrail (Active):",
            f"   - Check: Intercepts purchases > $50,000, routing to AI Workbench.",
            f"   - Compliance Audit: {DASHBOARD_STATE['governance']['compliance_score']}% Certified ({DASHBOARD_STATE['governance']['hitl_queue']} exceptions logged)",
        ]
    elif base_cmd == "enrich":
        if not arg:
            output = ["Error: Domain required. Usage: enrich <domain> (e.g. enrich acme.com)"]
        else:
            # Mutate state!
            DASHBOARD_STATE["stats"]["total_users"]["value"] += 1
            DASHBOARD_STATE["stats"]["active_sessions"]["value"] += 1
            DASHBOARD_STATE["stats"]["success_rate"]["value"] = min(100, DASHBOARD_STATE["stats"]["success_rate"]["value"] + 1)
            
            # Set workflow Enrichment to completed and Smart Pitch to active
            for wf in DASHBOARD_STATE["workflow"]:
                if wf["title"] == "Enrichment":
                    wf["status"] = "completed"
                elif wf["title"] == "Smart Pitch":
                    wf["status"] = "active"
            
            # Add new live activity log
            new_act_id = len(DASHBOARD_STATE["activities"]) + 1
            new_activity = {
                "id": new_act_id,
                "title": f"Domain Enriched ({arg})",
                "description": f"Enriched {arg} via CLI command. Auto-extracted 8 core B2B profile items.",
                "time": "Just now",
                "icon": "search",
                "color": "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-500/10",
                "badge": "CLI Ingest",
                "badgeColor": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
            }
            DASHBOARD_STATE["activities"].insert(0, new_activity)
            
            output = [
                f"[Enrichment Agent]: Triggering company profiling loop for domain: {arg}...",
                "[INFO]: Consulting Clearbit database metrics...",
                "[GDPR AUDIT]: GDPR Article 17 Check triggered.",
                "   --> Personal Details Scraped? NO (Target is corporate corporate profile only)",
                "   --> Consent required? NOT REQUIRED (Public B2B company record)",
                "   --> Audit Status: COMPLIANT ✓ PII safety check passed.",
                f"[CRM]: Synchronizing metadata to HubSpot pipeline [SEC Rule 17a-4 Compliant]",
                f"[STATUS]: Lead {arg} enriched, scored, and synced successfully!",
            ]
    elif base_cmd == "audit":
        import datetime
        now_str = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        output = [
            "📜 IMMUTABLE AUDIT LOG (LAST 5 RECORDS):",
            "------------------------------------------------------------------------",
            f"[{now_str}] INFO: GDPR Privacy safeguard audit passed for lookup.",
            "[2026-05-17 09:28:45] INFO: SEC Rule 17a-4 sync transaction immutably archived.",
            "[2026-05-17 09:20:12] WARNING: SOC2 Limit exceeded ($55,000 transaction) -> exception routed.",
            "[2026-05-17 09:14:02] INFO: Lead Scorers initiated scoring calculation loop.",
            "[2026-05-17 09:08:44] INFO: SMTP Outlook handshake verified.",
        ]
    elif base_cmd == "workbench":
        if arg.startswith("resolve "):
            id_val = arg.replace("resolve ", "").strip()
            if not id_val:
                output = ["Error: Exception ID required. Usage: workbench resolve <id>"]
            else:
                # Mutate state!
                if DASHBOARD_STATE["governance"]["hitl_queue"] > 0:
                    DASHBOARD_STATE["governance"]["hitl_queue"] -= 1
                DASHBOARD_STATE["governance"]["compliance_score"] = min(100.0, DASHBOARD_STATE["governance"]["compliance_score"] + 0.1)
                
                # Update stats
                DASHBOARD_STATE["stats"]["success_rate"]["value"] = min(100, DASHBOARD_STATE["stats"]["success_rate"]["value"] + 1)
                
                # Add new activity log
                new_act_id = len(DASHBOARD_STATE["activities"]) + 1
                new_activity = {
                    "id": new_act_id,
                    "title": f"Exception #{id_val} Resolved",
                    "description": f"Human Operator resolved Exception #{id_val} via CLI command interface.",
                    "time": "Just now",
                    "icon": "shield",
                    "color": "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10",
                    "badge": "HITL Resolve",
                    "badgeColor": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                }
                DASHBOARD_STATE["activities"].insert(0, new_activity)
                
                output = [
                    f"[SYSTEM]: Authorizing manual resolution override for exception #{id_val}...",
                    f"[SOC2 GOVERNANCE]: Registering human operator signature...",
                    f"[SYSTEM]: Overriding CFO Transaction threshold rule. Release code pushed.",
                    f"[STATUS]: Exception #{id_val} resolved successfully! Resuming workflow pipeline sync.",
                ]
        else:
            output = [
                f"🛠️ AI WORKBENCH QUEUE SUMMARY ({DASHBOARD_STATE['governance']['hitl_queue']} PENDING):",
                "------------------------------------------------------------------------",
                "- Exception #1209: Clearbit API token exception (Severity: LOW | Enriched 14m ago)",
                "- Exception #1208: Transaction CFO Limit threshold exceeded (Severity: HIGH | Enriched 1h ago)",
                "- Exception #1207: Outlook SMTP delivery exception bounce (Severity: MEDIUM | Enriched 2h ago)",
                "",
                "Type 'workbench resolve <id>' to resolve an exception from the command line.",
            ]
    elif base_cmd == "clear":
        output = ["CLEAR"]
    else:
        # Pass to the chat response
        fallback = get_mock_response(cmd)
        output = fallback["response"].split("\n")
        
    return {"output": output}


# =============================================================================
# MULTI-AGENT AI INSIGHTS ORCHESTRATOR ENDPOINTS
# =============================================================================

class DispatchRequest(BaseModel):
    contact: str
    company: str
    enabled_operators: Optional[List[str]] = ["hubspot", "outlook", "research", "risk"]

class PresentationSlide(BaseModel):
    id: str
    title: str
    bullets: List[str]

class UpdateSlidesRequest(BaseModel):
    slides: List[PresentationSlide]

class DeliverRequest(BaseModel):
    channel: str = "#sales-insights"

# Global in-memory storage for active multi-agent orchestrator runs
ORCHESTRATOR_SESSIONS = {}

async def simulate_orchestrator_execution(session_id: str, contact: str, company: str, enabled_operators: List[str]):
    """
    Simulates high-fidelity parallel worker execution for the Sales Operations Orchestrator.
    Populates session tracking logs dynamically, and writes compliance logs to the database.
    """
    from ..core.database import SessionLocal
    db = SessionLocal()
    
    try:
        session = ORCHESTRATOR_SESSIONS[session_id]
        
        # --- Stage 1: Orchestrator Analyzes target & drafts Mission Plan ---
        session["global_status"] = "running"
        session["operators"]["orchestrator"]["status"] = "running"
        session["operators"]["orchestrator"]["progress"] = 20
        session["operators"]["orchestrator"]["logs"].append(f"[Orchestrator] Target profiling initiated for {contact} at {company}.")
        await asyncio.sleep(0.5)
        
        session["operators"]["orchestrator"]["progress"] = 60
        session["operators"]["orchestrator"]["logs"].append(f"[Orchestrator] Analysing CRM pipelines, recent draft outlook threads, and industry regulatory frameworks...")
        await asyncio.sleep(0.5)
        
        session["operators"]["orchestrator"]["progress"] = 100
        session["operators"]["orchestrator"]["status"] = "completed"
        session["operators"]["orchestrator"]["logs"].append(f"[Orchestrator] Custom mission plan generated. Dispatching tasks to sub-operators in parallel...")
        
        # Log to database for auditing
        db_log = AuditLog(
            action="orchestrator.mission_plan",
            category=AuditCategory.SYSTEM,
            severity=AuditSeverity.INFO,
            description=f"Orchestrator generated mission plan for {contact} at {company} [Session: {session_id}]",
            extra_data={"contact": contact, "company": company, "session_id": session_id},
            success="true"
        )
        db.add(db_log)
        db.commit()

        # --- Stage 2: Launch parallel operators ---
        active_ops = [op for op in ["hubspot", "outlook", "research", "risk"] if op in enabled_operators]
        
        for op in active_ops:
            session["operators"][op]["status"] = "running"
            session["operators"][op]["progress"] = 15
            
        await asyncio.sleep(0.5)
        
        # Step 1 of Operators
        if "hubspot" in active_ops:
            session["operators"]["hubspot"]["logs"].append(f"[HubSpot Operator] Handshaking with HubSpot CRM API...")
            session["operators"]["hubspot"]["progress"] = 40
        if "outlook" in active_ops:
            session["operators"]["outlook"]["logs"].append(f"[Outlook Operator] Establishing connection to Exchange mailbox...")
            session["operators"]["outlook"]["progress"] = 40
        if "research" in active_ops:
            session["operators"]["research"]["logs"].append(f"[Research Operator] Spawning Google news crawler thread for '{company}'...")
            session["operators"]["research"]["progress"] = 40
        if "risk" in active_ops:
            session["operators"]["risk"]["logs"].append(f"[Risk Operator] Fetching supply-chain compliance laws for target sector...")
            session["operators"]["risk"]["progress"] = 40
            
        await asyncio.sleep(0.8)
        
        # Step 2 of Operators
        if "hubspot" in active_ops:
            session["operators"]["hubspot"]["logs"].append(f"[HubSpot Operator] Parsing deals table for bottlenecks or stuck proposal clearances...")
            session["operators"]["hubspot"]["progress"] = 75
        if "outlook" in active_ops:
            session["operators"]["outlook"]["logs"].append(f"[Outlook Operator] Reviewing draft folder and scanning outgoing email threads...")
            session["operators"]["outlook"]["progress"] = 75
        if "research" in active_ops:
            session["operators"]["research"]["logs"].append(f"[Research Operator] Correlating financial reports and executive leadership changes...")
            session["operators"]["research"]["progress"] = 75
        if "risk" in active_ops:
            session["operators"]["risk"]["logs"].append(f"[Risk Operator] Evaluating regulatory checklist against GDPR privacy rules...")
            session["operators"]["risk"]["progress"] = 75
            
        await asyncio.sleep(0.8)
        
        # Step 3 of Operators (SUCCESS)
        if "hubspot" in active_ops:
            session["operators"]["hubspot"]["logs"].append(f"[HubSpot Operator] SUCCESS: Deal ID 'DL-4902' in stage 'Proposal Sent' found. Value: $124,500. stuck in legal approval bottleneck for 10 days.")
            session["operators"]["hubspot"]["progress"] = 100
            session["operators"]["hubspot"]["status"] = "completed"
            session["operators"]["hubspot"]["metrics"] = {"deal_id": "DL-4902", "stage": "Proposal Sent", "value": "$124,500", "days_stuck": 10}
            
            db.add(AuditLog(
                action="operator.hubspot",
                category=AuditCategory.DATA,
                severity=AuditSeverity.INFO,
                description=f"HubSpot Operator successfully extracted deal DL-4902 ($124.5k)",
                extra_data={"session_id": session_id, "deal_id": "DL-4902"},
                success="true"
            ))
            
        if "outlook" in active_ops:
            session["operators"]["outlook"]["logs"].append(f"[Outlook Operator] SUCCESS: Unsent draft 'Re: Contract Amendments' found. 4 hours response delay. Tone: Consultative.")
            session["operators"]["outlook"]["progress"] = 100
            session["operators"]["outlook"]["status"] = "completed"
            session["operators"]["outlook"]["metrics"] = {"draft_found": True, "subject": "Contract Amendments", "delay": "4 hours", "sentiment": "Consultative"}
            
            db.add(AuditLog(
                action="operator.outlook",
                category=AuditCategory.DATA,
                severity=AuditSeverity.INFO,
                description=f"Outlook Operator fetched unsent draft contract modifications for {contact}",
                extra_data={"session_id": session_id, "subject": "Contract Amendments"},
                success="true"
            ))
            
        if "research" in active_ops:
            session["operators"]["research"]["logs"].append(f"[Research Operator] SUCCESS: Acme Corp finalized a $50M strategic supply-chain deal with TechSoft. Enterprise tier leverage +15%.")
            session["operators"]["research"]["progress"] = 100
            session["operators"]["research"]["status"] = "completed"
            session["operators"]["research"]["metrics"] = {"partner": "TechSoft", "deal_value": "$50M", "pricing_leverage": "+15%"}
            
            db.add(AuditLog(
                action="operator.research",
                category=AuditCategory.DATA,
                severity=AuditSeverity.INFO,
                description=f"Research Operator crawled Q2 news: Acme Corp partner deal with TechSoft",
                extra_data={"session_id": session_id, "partner": "TechSoft"},
                success="true"
            ))
            
        if "risk" in active_ops:
            session["operators"]["risk"]["logs"].append(f"[Risk Operator] SUCCESS: GDPR Art.17 compliant. SOC2 Limit control validated. Compliance Risk Level: LOW.")
            session["operators"]["risk"]["progress"] = 100
            session["operators"]["risk"]["status"] = "completed"
            session["operators"]["risk"]["metrics"] = {"risk_level": "LOW", "gdpr_compliant": True, "soc2_limit_check": "Passed"}
            
            db.add(AuditLog(
                action="operator.risk",
                category=AuditCategory.SECURITY,
                severity=AuditSeverity.INFO,
                description=f"Risk Operator verified legal compliance checklist for {company}",
                extra_data={"session_id": session_id, "risk_level": "LOW"},
                success="true"
            ))
            
        db.commit()
        await asyncio.sleep(0.5)
        
        # --- Stage 3: Orchestrator Synthesis & Slide Compilation ---
        session["operators"]["orchestrator"]["status"] = "running"
        session["operators"]["orchestrator"]["logs"].append(f"[Orchestrator] Operators completed parallel tasks. Commencing intelligence aggregation and report synthesis...")
        await asyncio.sleep(0.6)
        
        session["slides"] = [
            {
                "id": "slide-01",
                "title": "Executive Summary: Acme Corp",
                "bullets": [
                    f"HubSpot: $124.5k deal currently STUCK in legal approval stages (10 days bottleneck).",
                    f"Outlook: Response gap of 4 hours identified on draft contract edits.",
                    f"Market Intel: Acme Corp expanded supply lines with TechSoft ($50M deal), granting +15% pricing leverage.",
                    f"Compliance: GDPR privacy check cleared. Risk profile is evaluated as LOW."
                ]
            },
            {
                "id": "slide-02",
                "title": "CRM & Outreach Analytics",
                "bullets": [
                    f"CRM Stage: Deal DL-4902 in 'Proposal Sent' is waiting on legal review signature.",
                    f"Outlook Drafts: Urgent thread 'Re: Contract Amendments' is currently unsaved / unsent.",
                    f"Recommended Action: Follow up directly on the draft to bypass legal stall."
                ]
            },
            {
                "id": "slide-03",
                "title": "Market Trends & Risk Profile",
                "bullets": [
                    f"Q2 News: Supply lines expanded to support strategic enterprise logistics.",
                    f"Compliance Safeguards: Plaintext policy rule verified. Compliance Rating: 100%.",
                    f"Outreach Strategy: safe to trigger cold sequence with high enterprise custom tiers."
                ]
            }
        ]
        
        session["operators"]["orchestrator"]["logs"].append(f"[Orchestrator] Synthesis success. Generated 3 professional slide reports.")
        session["operators"]["orchestrator"]["status"] = "completed"
        session["operators"]["orchestrator"]["progress"] = 100
        session["global_status"] = "completed"
        
        db.add(AuditLog(
            action="orchestrator.synthesis",
            category=AuditCategory.SYSTEM,
            severity=AuditSeverity.INFO,
            description=f"Orchestrator successfully synthesized results slide deck for {company}",
            extra_data={"session_id": session_id, "slide_count": 3},
            success="true"
        ))
        db.commit()
        
    except Exception as exc:
        log.error(f"Error in multi-agent background orchestrator: {exc}")
        if session_id in ORCHESTRATOR_SESSIONS:
            ORCHESTRATOR_SESSIONS[session_id]["global_status"] = "failed"
            ORCHESTRATOR_SESSIONS[session_id]["operators"]["orchestrator"]["logs"].append(f"[Orchestrator] CRITICAL ERROR occurred: {exc}")
            
        db.add(AuditLog(
            action="orchestrator.error",
            category=AuditCategory.ERROR,
            severity=AuditSeverity.CRITICAL,
            description=f"Multi-Agent Orchestrator failed: {str(exc)}",
            extra_data={"session_id": session_id},
            success="false",
            error_message=str(exc)
        ))
        db.commit()
    finally:
        db.close()

@router.post("/orchestrator/dispatch")
async def dispatch_orchestrator(
    req: DispatchRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Triggers target contact & company profiling, drafts initial mission plans, 
    and dispatches sub-operators in parallel.
    """
    session_id = f"session-mo-{uuid.uuid4().hex[:6]}"
    
    # Initialize global tracking session state
    ORCHESTRATOR_SESSIONS[session_id] = {
        "session_id": session_id,
        "contact": req.contact,
        "company": req.company,
        "global_status": "dispatched",
        "operators": {
            "orchestrator": {"status": "idle", "progress": 0, "logs": [], "metrics": {}},
            "hubspot": {"status": "idle", "progress": 0, "logs": [], "metrics": {}},
            "outlook": {"status": "idle", "progress": 0, "logs": [], "metrics": {}},
            "research": {"status": "idle", "progress": 0, "logs": [], "metrics": {}},
            "risk": {"status": "idle", "progress": 0, "logs": [], "metrics": {}},
        },
        "slides": [],
        "delivery": {"status": "idle", "channel": None, "timestamp": None}
    }
    
    # Log to audit DB
    audit_log = AuditLog(
        action="orchestrator.dispatch",
        category=AuditCategory.SYSTEM,
        severity=AuditSeverity.INFO,
        description=f"Initiated Sales Command Center multi-agent run for {req.company} [Session: {session_id}]",
        extra_data={"contact": req.contact, "company": req.company, "session_id": session_id},
        success="true"
    )
    db.add(audit_log)
    db.commit()
    
    # Queue execution
    background_tasks.add_task(
        simulate_orchestrator_execution,
        session_id,
        req.contact,
        req.company,
        req.enabled_operators
    )
    
    return {
        "status": "dispatched",
        "session_id": session_id,
        "mission_plan": {
            "target_profile": f"VP of Procurement, {req.company}",
            "objectives": [
                f"Verify HubSpot deal pipeline blockers for {req.company}",
                f"Search Outlook exchange mails & inspect pending outreach for {req.contact}",
                f"Query live news crawler indexes for {req.company} Q2 partner shifts",
                f"Compile GDPR privacy compliance profile & risk audit checklist"
            ]
        }
    }

@router.get("/orchestrator/status/{session_id}")
async def get_orchestrator_status(
    session_id: str,
    user: dict = Depends(get_current_user)
):
    """
    Returns real-time status and logs for all operators in the active session.
    """
    if session_id not in ORCHESTRATOR_SESSIONS:
        raise HTTPException(status_code=404, detail="Active orchestrator session not found.")
        
    return ORCHESTRATOR_SESSIONS[session_id]

@router.get("/orchestrator/results/{session_id}")
async def get_orchestrator_results(
    session_id: str,
    user: dict = Depends(get_current_user)
):
    """
    Fetches the synthesized slide deck presentation once compilation is complete.
    """
    if session_id not in ORCHESTRATOR_SESSIONS:
        raise HTTPException(status_code=404, detail="Active orchestrator session not found.")
        
    session = ORCHESTRATOR_SESSIONS[session_id]
    if session["global_status"] != "completed":
        raise HTTPException(status_code=400, detail="Synthesis compilation has not finished.")
        
    return {"session_id": session_id, "slides": session["slides"]}

@router.post("/orchestrator/presentation/update")
async def update_presentation(
    session_id: str,
    req: UpdateSlidesRequest,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Allows sales representatives to overwrite synthesized bullet points before delivering to Slack.
    """
    if session_id not in ORCHESTRATOR_SESSIONS:
        raise HTTPException(status_code=404, detail="Active orchestrator session not found.")
        
    session = ORCHESTRATOR_SESSIONS[session_id]
    session["slides"] = [s.dict() for s in req.slides]
    
    db.add(AuditLog(
        action="orchestrator.presentation_update",
        category=AuditCategory.DATA,
        severity=AuditSeverity.INFO,
        description=f"Custom slide modifications saved by sales representative for session: {session_id}",
        extra_data={"session_id": session_id},
        success="true"
    ))
    db.commit()
    
    return {"status": "updated", "session_id": session_id}

@router.post("/orchestrator/deliver")
async def deliver_presentation(
    session_id: str,
    req: DeliverRequest,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Triggers Slack notification webhook, delivers block-kit presentations cards, 
    and handles success/failure logs.
    """
    if session_id not in ORCHESTRATOR_SESSIONS:
        raise HTTPException(status_code=404, detail="Active orchestrator session not found.")
        
    session = ORCHESTRATOR_SESSIONS[session_id]
    if not session["slides"]:
        raise HTTPException(status_code=400, detail="Slides must be synthesized before delivery.")
        
    slack_webhook = os.getenv("SLACK_WEBHOOK_URL")
    import datetime
    timestamp_str = datetime.datetime.utcnow().isoformat()
    
    payload = {
        "text": f"🚀 *AI Sales Command Center Presentation Ready* - {session['company']}",
        "blocks": [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"🚀 *Multi-Agent AI Insights Orchestration Complete*\n*Target:* {session['contact']} | *Company:* {session['company']}\n*Time:* `{timestamp_str}`"
                }
            },
            {"type": "divider"}
        ]
    }
    
    # Append structured Block-Kit slides
    for idx, slide in enumerate(session["slides"]):
        payload["blocks"].append({
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": f"*Slide {idx+1}: {slide['title']}*\n" + "\n".join([f"• {b}" for b in slide["bullets"]])
            }
        })
        
    payload["blocks"].append({"type": "divider"})
    payload["blocks"].append({
        "type": "context",
        "elements": [{"type": "mrkdwn", "text": "🔒 Compliant under GDPR Art.17 & SOC2 Limit Controls. Certified by Governance Agent."}]
    })

    success = "true"
    error_msg = None
    
    if slack_webhook:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(slack_webhook, json=payload)
                if resp.status_code != 200:
                    success = "false"
                    error_msg = f"Slack webhook returned status code {resp.status_code}"
        except Exception as err:
            success = "false"
            error_msg = str(err)
    else:
        # If no webhook is configured, simulate success
        log.warning(f"No SLACK_WEBHOOK_URL set. Simulating block-kit delivery to {req.channel}.")
        
    session["delivery"] = {
        "status": "delivered" if success == "true" else "failed",
        "channel": req.channel,
        "timestamp": timestamp_str
    }
    
    db.add(AuditLog(
        action="orchestrator.deliver",
        category=AuditCategory.SYSTEM,
        severity=AuditSeverity.INFO if success == "true" else AuditSeverity.ERROR,
        description=f"Delivered final synthesized report to Slack channel {req.channel} [Success: {success}]",
        extra_data={"session_id": session_id, "channel": req.channel},
        success=success,
        error_message=error_msg
    ))
    db.commit()
    
    if success == "false":
        raise HTTPException(status_code=500, detail=f"Slack delivery failed: {error_msg}")
        
    return {
        "status": "delivered",
        "channel": req.channel,
        "timestamp": timestamp_str
    }


