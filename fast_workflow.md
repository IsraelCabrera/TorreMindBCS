# Receptionist Workflow Design for the Torre Mind VLMS MVP

After reading the requirements, I think the biggest risk is that the team focuses on WhatsApp and QR codes and forgets that the receptionist is the primary user. The "under 60 seconds" goal is won or lost at the receptionist screen.

If I were designing the MVP, I would optimize for **3-click workflows** and **search-first interaction**.

## Key Observation

Most visitors are not first-time visitors.

After a few months, you'll have:

- Recurring vendors
- Delivery drivers
- Tenant employees
- Returning guests

So the system should assume:

> "This person is probably already in the database."

not

> "Let's fill a form."

---

# Dashboard Layout

Receptionist sees one screen:

```text
┌───────────────────────────────────────────────┐
│ Search Name / Phone / Company                 │
├───────────────────────────────────────────────┤
│ + New Visitor                                 │
│ 📦 Delivery                                   │
│ 🔧 Vendor                                     │
│ 👤 Tenant Employee                            │
│ 👥 Guest                                      │
├───────────────────────────────────────────────┤
│ ACTIVE VISITORS                               │
│ Ana Torres        Floor 5      10:14 AM       │
│ DHL Package       Pending                     │
│ AC Repair Team    Floor 3                     │
└───────────────────────────────────────────────┘
```

The cursor is always in the search bar.

---

# Workflow 1 — Returning Visitor (10–15 seconds)

Receptionist asks:

> "Nombre?"

Types:

```text
Ana
```

Results appear:

```text
Ana Torres
Grupo Coppel
Last visit: 12 days ago
```

Receptionist clicks.

Screen auto-fills:

```text
Visitor: Ana Torres
Company: Grupo Coppel
Host: Carlos Ruiz
```

Click:

```text
[Check In]
```

WhatsApp notification sent.

Done.

Time:

```text
10–15 seconds
```

---

# Workflow 2 — Walk-In Visitor (30–45 seconds)

Search first:

```text
Roberto Sánchez
```

No results.

Receptionist clicks:

```text
+ New Visitor
```

Minimal form:

```text
Name*
Phone
Company
Purpose
Host*
```

Not this:

```text
Name
Middle Name
Last Name
Phone
Email
Address
City
Country
...
```

Only what's required.

Host selection should be searchable:

```text
Host:
[Car...]
```

Results:

```text
Carlos Ruiz
Office 502
```

Click.

Press:

```text
[Check In]
```

System:

1. Creates visitor.
2. Sends WhatsApp.
3. Shows waiting status.

Done.

Time:

```text
30–45 seconds
```

---

# Workflow 3 — Delivery (5–10 seconds)

This should be its own flow.

Not a visitor form.

Receptionist presses:

```text
📦 Delivery
```

Sees:

```text
Courier:
[DHL ▼]

Recipient:
[Search...]

Description:
[Package]
```

Press:

```text
[Notify]
```

Done.

Time:

```text
5–10 seconds
```

---

# Workflow 4 — QR Invite (2–5 seconds)

Fastest possible flow.

Receptionist clicks:

```text
Scan QR
```

Scanner reads:

```text
VISIT_TOKEN_ABC123
```

System immediately loads:

```text
Ana Torres
Grupo Coppel
Carlos Ruiz
10:00 AM Meeting
```

Receptionist clicks:

```text
[Confirm Arrival]
```

Done.

Time:

```text
2–5 seconds
```

---

# What I Would NOT Build Initially

The document mentions:

- OCR
- Facial recognition
- Kiosk
- AI parsing tenant messages

None of those help achieve the 60-second goal.

The features that matter most are:

### Returning Visitor Recognition

This is probably the highest ROI feature in the whole system.

### Search Everywhere

Single search box:

```text
Ana
5551234
Coppel
DHL
```

all work.

### Keyboard-First Operation

Receptionists process dozens of visitors.

They should be able to:

```text
Type
↓
Enter
↓
Enter
↓
Enter
```

without touching the mouse.

### Smart Defaults

If Ana visited Carlos three times:

```text
Suggested Host:
Carlos Ruiz
```

already selected.

---

# The Most Valuable UX Improvement

I would add a status board visible at all times:

```text
🟡 Waiting Approval
Ana Torres → Carlos Ruiz

🟢 Approved
Juan Perez → Floor 5

🔴 Denied
Roberto Sánchez
```

The receptionist never needs to refresh or search.

When the WhatsApp button is pressed, the card changes color instantly through WebSockets.

That one feature alone will make the system feel much faster than a paper log and directly supports the success criterion in Section 3:

> "The system is fast and reliable enough that lobby staff prefer it over a paper log."

If you only have time to perfect one screen in the MVP, make it the receptionist dashboard. Everything else (QRs, Flows, tenant self-registration) can be added later without changing the core workflow.
