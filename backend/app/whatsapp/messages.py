def build_host_acknowledgment(visit_id: str, visitor_name: str, visitor_company: str | None = None):
    return {
        "type": "template",
        "template": {
            "name": "host_acknowledgment",
            "language": {"code": "es"},
            "components": [
                {
                    "type": "body",
                    "parameters": [
                        {"type": "text", "text": visitor_name},
                        {"type": "text", "text": visitor_company or ""},
                    ],
                },
                {
                    "type": "button",
                    "sub_type": "quick_reply",
                    "index": "0",
                    "parameters": [{"type": "payload", "payload": f"approve|{visit_id}"}],
                },
                {
                    "type": "button",
                    "sub_type": "quick_reply",
                    "index": "1",
                    "parameters": [{"type": "payload", "payload": f"deny|{visit_id}"}],
                },
            ],
        },
    }


def build_package_notification(courier: str, recipient: str, guide_number: str | None = None):
    params = [
        {"type": "text", "text": courier},
        {"type": "text", "text": recipient},
    ]
    if guide_number:
        params.append({"type": "text", "text": guide_number})
    return {
        "type": "template",
        "template": {
            "name": "package_arrival",
            "language": {"code": "es"},
            "components": [
                {
                    "type": "body",
                    "parameters": params,
                }
            ],
        },
    }


def build_package_collected(courier: str, recipient: str, guide_number: str | None = None):
    params = [
        {"type": "text", "text": courier},
        {"type": "text", "text": recipient},
    ]
    if guide_number:
        params.append({"type": "text", "text": guide_number})
    return {
        "type": "template",
        "template": {
            "name": "package_collected",
            "language": {"code": "es"},
            "components": [
                {
                    "type": "body",
                    "parameters": params,
                }
            ],
        },
    }


def build_escalation_message(visitor_name: str):
    return {
        "type": "template",
        "template": {
            "name": "host_escalated",
            "language": {"code": "es"},
            "components": [
                {
                    "type": "body",
                    "parameters": [{"type": "text", "text": visitor_name}],
                }
            ],
        },
    }
