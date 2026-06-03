TEMPLATES = {
    "host_acknowledgment": {
        "name": "host_acknowledgment",
        "language": "es",
        "category": "TRANSACTIONAL",
        "components": [
            {
                "type": "BODY",
                "text": "Tu visita {{1}} de {{2}} está en el lobby de Torre Mind.",
            },
            {
                "type": "BUTTONS",
                "buttons": [
                    {"type": "QUICK_REPLY", "text": "✅ Que suba"},
                    {"type": "QUICK_REPLY", "text": "❌ No disponible"},
                ],
            },
        ],
    },
    "package_arrival": {
        "name": "package_arrival",
        "language": "es",
        "category": "TRANSACTIONAL",
        "components": [
            {
                "type": "BODY",
                "text": "📦 Tienes un paquete de {{1}} en el lobby de Torre Mind.",
            }
        ],
    },
    "host_escalated": {
        "name": "host_escalated",
        "language": "es",
        "category": "TRANSACTIONAL",
        "components": [
            {
                "type": "BODY",
                "text": "{{1}} sigue esperando en el lobby. El contacto principal no respondió. Por favor confirma.",
            }
        ],
    },
}
