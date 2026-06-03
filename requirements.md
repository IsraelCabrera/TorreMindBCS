**TORRE MIND**

Building Management Platform

**Module 1: Visitor & Lobby Management System**

*Product Discovery & Requirements Document*

Version 0.4 \| March 2026 \| For Internal Use Only

# 0. Purpose of This Document

This document serves as the starting point for the development of a
proprietary building management platform for Torre Mind, a commercial
office building in Tijuana, Baja California, operated by Mind Bienes
Raíces, S. de R.L. de C.V.

Its primary audience is the lead developer. It is intentionally written
to bridge the gap between business intent and technical execution ---
providing enough context, vocabulary, and structured requirements to
enable effective discovery, architecture decisions, and sprint planning
without presupposing a specific implementation approach.

It is not a complete technical specification. It is a discovery anchor
and a shared language document.

  ------------------------------------------------------------------------------------------------------------
  **How to Use This Document**
  Read Sections 1--3 to understand the strategic context before looking at requirements.
  Section 4 defines who the system must serve --- treat personas as the source of truth for scope decisions.
  Section 5 describes the desired experience flows. These are business narratives, not UI specs.
  Section 6 lists functional requirements. Use these to generate your own technical tasks and ask questions.
  Section 7 covers integrations and technology considerations discussed at the concept level.
  Section 8 identifies open questions --- your top priority for discovery meetings.
  ------------------------------------------------------------------------------------------------------------

# 1. Strategic Context

## 1.1 Why Build vs. Buy

Several off-the-shelf visitor management and building operations
platforms exist, including Envoy (envoy.com), Signing App
(signingapp.com), and Kisi (getkisi.com). A brief competitive landscape
is provided in Section 7 for reference. However, the decision to build a
proprietary solution rests on the following factors:

- Access to cost-effective, AI-savvy developer talent reduces build cost
  substantially.

<!-- -->

- AI-assisted development tools (e.g., Claude Code) dramatically
  compress development timelines.

<!-- -->

- A tailor-made solution avoids paying for features that are irrelevant
  to our operational context.

<!-- -->

- Custom software becomes a strategic asset: it can evolve with our
  needs, integrate seamlessly with future modules, and potentially serve
  as the foundation for a multi-property platform.

<!-- -->

- Out-of-the-box tools often carry per-seat or per-visit pricing models
  that compound over time.

## 1.2 Platform Vision (Long-Term)

This first module is the initial building block of a broader Torre Mind
Building Management Platform (BMP). Over time, the platform is expected
to grow to include:

- Shared amenity reservations (meeting rooms, gym, event space)

<!-- -->

- Parking access control and valet automation

<!-- -->

- Tenant portal (billing, maintenance requests, communications)

<!-- -->

- Vendor and service provider management

<!-- -->

- Access control integration (door readers, elevators)

<!-- -->

- Building operations dashboard (occupancy, incident log, staff tasks)

The architecture of Module 1 should be designed with this modularity in
mind, even though the immediate deliverable is scoped much more
narrowly.

## 1.3 Scope of This Document --- Module 1

Module 1 is the Visitor & Lobby Management System (VLMS). Its purpose is
to give lobby staff a digital tool for registering, tracking, and
managing all incoming pedestrian traffic to the building, replacing or
reducing reliance on manual paper logs.

The MVP will be a practical, fast-to-deploy tool that solves a real
daily operational problem. Advanced features (ID scanning, facial
recognition) are defined here but deferred to later iterations.

# 2. Building & Operational Context

## 2.1 Property Overview

  **Attribute**         **Detail**
  --------------------- --------------------------------------------------------------------------------
  **Property Name**     Torre Mind
  **Location**          Tijuana, Baja California, México
  **Type**              Class A commercial office building
  **Operator**          Mind Bienes Raíces, S. de R.L. de C.V.
  **Primary Entry**     Single main lobby with receptionist/security staff
  **Tenant Profile**    Mix of corporate tenants and SMBs; some have their own employees on-site daily
  **Operating Hours**   Typically weekdays; some tenant weekend access

## 2.2 Current State of Lobby Operations

Lobby traffic is currently managed manually or with minimal tooling. Key
pain points include:

- No digital record of visitors --- difficult to audit who was in the
  building and when.

<!-- -->

- Lobby staff must make judgment calls on unannounced visitors without
  notification workflows.

<!-- -->

- Tenants are not automatically notified when their guests or deliveries
  arrive.

<!-- -->

- No standardized process differentiates between a tenant employee
  badge-holder, a scheduled vendor, and a walk-in visitor.

<!-- -->

- Delivery and vendor tracking is ad hoc --- packages are accepted
  without formal logging.

# 3. Success Criteria & Guiding Principles

## 3.1 What Does Success Look Like?

A successful Module 1 delivery means:

- Lobby staff can register any visitor in under 60 seconds.

<!-- -->

- A full digital log of building traffic is available and searchable.

<!-- -->

- Tenants receive automatic notifications when visitors or deliveries
  arrive.

<!-- -->

- Returning visitors are recognized and pre-fill their information.

<!-- -->

- The system is fast and reliable enough that lobby staff prefer it over
  a paper log.

## 3.2 Guiding Design Principles

  -----------------------------------------------------------------------------------------------------------------------------------------------------
  **Design Principles for the VLMS**
  Speed above elegance --- lobby staff should never be slowed down. The interface must be faster than a paper log for common cases.
  Mobile-first for visitors --- any self-service experience must work on a visitor\'s own smartphone.
  Graceful degradation --- the system must remain useful if internet connectivity is lost (offline mode for check-in logging).
  Privacy by design --- collect only what is necessary; ID scan data and facial recognition are opt-in and governed by clear data retention policies.
  Tenant-first notifications --- tenants should feel served, not bypassed. Their guests are their guests.
  -----------------------------------------------------------------------------------------------------------------------------------------------------

# 4. User Personas & Visitor Profiles

The system must handle all of the following profiles. Understanding the
difference between them drives authorization logic, notification
routing, and data requirements.

## 4.1 System Users (Staff-Side)

  **Role**                     **Description**                                                         **Primary Interaction**
  ---------------------------- ----------------------------------------------------------------------- ----------------------------------------------------------
  Lobby Staff / Receptionist   Front-facing building employee who greets and processes all arrivals.   Main admin interface; manual check-in; override controls
  Building Manager / Admin     Manages tenant configurations, staff access, reports.                   Admin dashboard; user management; reporting
  Security Staff               May operate secondary check points or monitor access.                   Read-only log access; badge verification

## 4.2 Visitor Profiles (Incoming Traffic)

Each profile has different data requirements, authorization logic, and
notification needs:

  **Profile**                 **Characteristics**                                           **Key Requirements**
  --------------------------- ------------------------------------------------------------- ------------------------------------------------------------------------------------
  Building Staff              Employees of the building operator. Regular, daily entry.     Fast-lane badge/QR check-in. No tenant notification needed.
  Tenant Employee             Employee of a tenant company. Frequent, recurring entry.      Pre-registered by tenant. QR or badge entry. Auto-logged without friction.
  Tenant Visitor / Guest      A meeting guest invited by a tenant. Often pre-scheduled.     Tenant pre-registers via invitation. Self-service check-in with host notification.
  Delivery Personnel          Courier or logistics driver (FedEx, DHL, etc.). Short stay.   Package recipient, package description, time log. No deep registration needed.
  Vendor / Service Provider   Contractor, maintenance, IT, cleaning, etc. Recurring.        Company name, service type, area of access, work order reference.
  Prospective Tenant          Real estate agent or prospect visiting for a tour.            Flagged as prospect; notify building manager; record source (referral/agent).
  Government / Regulatory     Inspectors, auditors, official visitors.                      Credential capture; notify building manager immediately.
  General Walk-In             Unannounced visitor with no specific host.                    Name, ID, purpose of visit. Hold at lobby until host confirms.

# 5. Core Experience Flows

The following are narrative descriptions of the primary flows the system
must support. These are not UI wireframes --- they describe what happens
from a user\'s perspective. The developer should use these to identify
required data models, states, and integrations.

## 5.1 Flow A --- Pre-Registered Visitor (Invited Guest)

The gold-standard experience for a tenant visitor arriving to a
scheduled meeting. WhatsApp is the primary channel for both the tenant
invitation and visitor confirmation.

- Tenant messages the building\'s WhatsApp Business number: e.g.
  \'Mañana llega Ana Torres de Grupo Coppel a las 10am para verme.\'

<!-- -->

- The system (via bot or staff) registers the visit and sends Ana a
  WhatsApp message with a personalized QR code, the building address,
  and instructions.

<!-- -->

- Ana arrives. She either (a) shows her QR code to lobby staff, or (b)
  scans a printed QR poster at the entrance which opens a WhatsApp
  check-in confirmation.

<!-- -->

- System auto-notifies the host tenant via WhatsApp: \'Tu visita Ana
  Torres está en el lobby.\' with two tap buttons: ✅ Que suba / ❌ No
  disponible.

<!-- -->

- Host taps a button. The staff interface updates instantly --- no phone
  call, no back-and-forth.

<!-- -->

- Staff issues visitor pass and logs entry. Check-out logged on
  departure.

## 5.2 Flow B --- Walk-In / Unannounced Visitor

Handles the common case of a visitor arriving without prior arrangement.

- Visitor approaches the lobby and identifies themselves to lobby staff.

<!-- -->

- Staff selects visitor type, searches for the visitor by name or phone
  (auto-fills if returning), and enters required fields for new
  visitors.

<!-- -->

- Staff searches for and selects the tenant/host to notify.

<!-- -->

- System sends the host a WhatsApp message with visitor name, company,
  and purpose, plus two tap buttons: ✅ Que suba / ❌ No disponible.

<!-- -->

- Host responds via button tap. Staff see the response on their
  interface and act accordingly --- issue pass or hold visitor.

<!-- -->

- If host is unreachable after a configurable timeout (e.g. 5 minutes),
  staff interface escalates to a secondary contact.

## 5.3 Flow C --- Delivery / Package Arrival

A lightweight, fast flow for high-frequency delivery traffic.

- Lobby staff selects \'Delivery\' mode and enters courier company,
  recipient, and brief description (or scans the shipping label
  barcode).

<!-- -->

- System sends recipient a WhatsApp message: \'📦 Tienes un paquete de
  DHL en el lobby de Torre Mind.\'

<!-- -->

- Delivery is logged with timestamp. Staff marks as \'Collected\' when
  recipient picks up.

## 5.4 Flow D --- Recurring Vendor or Contractor

Vendors who visit regularly should be fast to check in without repeated
full registration.

- Vendor is pre-registered in the system with their company, service
  type, and recurring schedule.

<!-- -->

- On arrival, vendor is looked up by name or company --- system
  auto-fills their record.

<!-- -->

- Staff confirms service type and area of access (floor, unit, common
  area) and logs the visit with a work order reference if applicable.

<!-- -->

- Vendor check-out is logged when they leave.

## 5.5 Flow E --- WhatsApp Self-Service Check-In (No Kiosk Hardware Required)

A visitor-initiated check-in flow conducted entirely through WhatsApp on
the visitor\'s own phone. This flow makes a dedicated lobby tablet
optional rather than required for self-service --- a significant
reduction in hardware dependency and maintenance overhead.

- A printed QR code placard is placed at the lobby entrance. The visitor
  scans it with their phone camera --- no app download required.

<!-- -->

- The scan opens a WhatsApp conversation with the building\'s Business
  number.

<!-- -->

- If the visitor has a pre-registered invite QR, scanning it directly
  sends a check-in confirmation via WhatsApp with no further input
  needed.

<!-- -->

- If the visitor is a walk-in, the WhatsApp bot prompts for name,
  company, and who they are visiting --- two or three short replies.

<!-- -->

- System logs the check-in, notifies the host via WhatsApp with
  interactive buttons, and replies to the visitor: \'✅ Registrado. Tu
  anfitrión ha sido notificado.\'

<!-- -->

- Lobby staff see the check-in appear on their dashboard in real time
  and retain full override capability.

  ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Key Architectural Implication**
  WhatsApp should be treated as a bidirectional interaction channel, not just an outbound notification pipe.
  The WhatsApp Business API supports Interactive Message Templates (buttons, lists) and WhatsApp Flows (structured forms inside chat). These are the building blocks for host acknowledgment, visitor self-check-in, and tenant pre-registration --- all without requiring a tenant app or a lobby tablet.
  The practical difference in implementation effort between sending a plain text message and sending a message with two tap buttons is small. The difference in what it unlocks is the entire host acknowledgment loop at MVP.
  Recommended provider: Twilio (WhatsApp + SMS fallback in one API), or a Mexican-market alternative such as Zenvia or Gupshup for better local support and pricing.
  ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

# 6. Functional Requirements

Requirements are organized by feature area and tagged with a priority:
MVP (must-have for first release), v1.1 (important but deferrable), and
Future (advanced features for later phases).

## 6.1 Check-In & Registration

  **Priority**   **Requirement**                                                                                            **Notes**
  -------------- ---------------------------------------------------------------------------------------------------------- ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  MVP            Staff-initiated check-in for all visitor types via admin interface.                                        Core daily use case.
  MVP            Visitor type selection at start of check-in (dropdown or icon grid).                                       Drives form fields and notification logic.
  MVP            Returning visitor recognition --- search by name, phone, or company.                                       Reduces data entry on repeat visits.
  MVP            Manual data entry form for new visitors: name, phone, company, host, purpose.                              Fields vary by visitor type.
  MVP            Tenant/host notification on visitor check-in via WhatsApp with interactive reply buttons.                  WhatsApp is the de facto standard in Tijuana. Interactive buttons (Que suba / No disponible) close the acknowledgment loop without requiring tenants to install anything or log in anywhere.
  MVP            Host acknowledgment reflected instantly on staff interface --- confirm, redirect, or deny.                 Drives from WhatsApp button tap. No polling needed; webhook from WhatsApp API updates the record.
  MVP            Visitor pass / badge printing or display on kiosk screen.                                                  Even a printed name sticker adds professionalism.
  MVP            Visitor blocklist / denylist: flag a person as denied entry; alert lobby staff on name match.              Low-effort, high-impact security feature. Lookup triggered automatically during check-in name search.
  MVP            Check-out logging (manual by staff).                                                                       Enables occupancy tracking.
  v1.1           Bilingual interface: Spanish and English throughout all screens.                                           Implemented as a language toggle; all UI strings externalized from day one to make this low-cost.
  v1.1           QR code generation for pre-registered visitors --- delivered via WhatsApp message to visitor.              WhatsApp replaces email as the delivery channel for the invite QR in the Tijuana context.
  v1.1           WhatsApp self-service check-in: printed QR placard opens a WhatsApp bot flow on visitor\'s phone.          Eliminates the need for a dedicated kiosk tablet for self-service. See Flow E in Section 5.
  v1.1           Tenant pre-registration via WhatsApp: tenant messages the building number to register an expected guest.   Bot collects visitor name, company, date/time, and generates invite QR. No portal login needed.
  v1.1           Camera photo capture at check-in, stored with visit record.                                                Logged with visit record; displayed on staff screen.
  v1.1           Automatic check-out after configurable inactivity timeout.                                                 Fallback if visitor forgets to check out.
  Future         ID document scanning with OCR for automatic data extraction.                                               Camera or dedicated scanner; see Section 7.
  Future         Facial recognition for returning visitor identification.                                                   High complexity; legal and privacy implications.

## 6.2 Delivery Management

  **Priority**   **Requirement**                                                      **Notes**
  -------------- -------------------------------------------------------------------- -----------------------------------------------
  MVP            Dedicated delivery check-in flow: courier, recipient, description.   Separate from visitor flow for speed.
  MVP            Tenant notification on package arrival.                              SMS/email with courier and brief description.
  MVP            Package collection logging (staff marks as collected).               Creates closure on the delivery record.
  v1.1           Barcode / shipping label scan for auto-fill.                         Courier API or manual barcode scan.
  v1.1           Photo of package at check-in.                                        Evidence of condition on receipt.

## 6.3 Tenant Management

  **Priority**   **Requirement**                                                                                        **Notes**
  -------------- ------------------------------------------------------------------------------------------------------ --------------------------------------------------
  MVP            Tenant directory: list of tenants with office number, primary contact, and notification preferences.   Managed by building admin.
  MVP            Tenant contact lookup during check-in (search by name or unit).                                        Required for notification routing.
  MVP            Notification channel configuration per tenant: SMS, email, WhatsApp, or app push.                      WhatsApp is high-value in Mexico.
  v1.1           Tenant self-service portal: invite guests, pre-register visitors.                                      Reduces staff workload for expected guests.
  v1.1           Per-tenant employee roster for fast recognition of tenant staff.                                       Supports auto-check-in for registered employees.

## 6.4 Reporting & Log

  **Priority**   **Requirement**                                                             **Notes**
  -------------- --------------------------------------------------------------------------- ------------------------------------------------------
  MVP            Real-time visit log: all active visitors currently in the building.         Staff dashboard view.
  MVP            Historical log: searchable by date, visitor name, tenant, visitor type.     Essential for security audit.
  MVP            Daily summary report (auto-generated or on-demand): total visits by type.   For building manager review.
  v1.1           Export to CSV/PDF.                                                          For record-keeping and reporting to property owners.
  v1.1           Occupancy over time chart.                                                  Useful for understanding building usage patterns.

## 6.5 Staff & Admin Interface

  **Priority**   **Requirement**                                                                 **Notes**
  -------------- ------------------------------------------------------------------------------- ----------------------------------------------------
  MVP            Role-based access: Lobby Staff, Building Manager, Admin.                        Permissions differ by role.
  MVP            Staff can override or manually edit any check-in record.                        Errors happen; staff must be able to correct them.
  MVP            Real-time visitor list on staff dashboard (who is currently in the building).   Core operational view.
  v1.1           Activity log / audit trail for staff actions.                                   Who changed what and when.
  v1.1           Staff shift notes / handover log.                                               Useful for multi-shift operations.

# 7. Integrations & Technology Considerations

## 7.1 WhatsApp as the Primary Interaction Layer

In Tijuana, WhatsApp adoption is effectively universal across all
demographics and business contexts. This is not a marginal preference
--- it is the de facto communication standard. This has a meaningful
architectural implication: WhatsApp should not be wired up as a simple
outbound notification equivalent to SMS. It should be designed as a
bidirectional interaction layer from day one.

The WhatsApp Business API exposes capabilities well beyond sending text
messages:

- **Interactive Message Templates:** Messages that include tap buttons
  (up to 3) or a selection list. Used for host acknowledgment --- tenant
  receives a message and taps \'Que suba\' or \'No disponible\'. The
  response triggers a webhook that updates the staff interface in real
  time. This is the mechanism that enables the entire host confirmation
  loop to ship at MVP without a tenant-facing web portal.

<!-- -->

- **WhatsApp Flows:** Meta\'s newer capability for rendering structured
  forms (text fields, dropdowns, date pickers) inside a WhatsApp
  conversation. Used for visitor self-check-in --- a walk-in visitor
  scans a QR code, a structured form opens inside WhatsApp, they fill in
  name/company/host, and check-in is complete. No app download, no web
  form, no kiosk tablet required.

<!-- -->

- **Inbound Message Handling:** The system listens for inbound WhatsApp
  messages to the building\'s Business number. Used for tenant
  pre-registration --- a tenant types a natural language message or
  responds to a structured prompt to register an expected visitor. The
  backend parses the response and creates the visit record.

The practical consequence is that three flows previously requiring
separate interfaces --- host acknowledgment (tenant portal), visitor
self-check-in (kiosk tablet), and tenant pre-registration (tenant
portal) --- can all be delivered through WhatsApp with a single API
integration. This materially reduces frontend development scope and
eliminates hardware dependencies.

  **Channel / Capability**               **Used For**                                                            **Priority**
  -------------------------------------- ----------------------------------------------------------------------- --------------
  WhatsApp Interactive Buttons           Host acknowledgment (Que suba / No disponible)                          MVP
  WhatsApp Outbound Message              Package / delivery arrival notification to tenant                       MVP
  WhatsApp Outbound Message              Visitor invite QR delivery to pre-registered guest                      v1.1
  WhatsApp Flows or structured prompts   Visitor self-check-in via phone (replaces kiosk tablet)                 v1.1
  WhatsApp Inbound + bot                 Tenant pre-registration of expected guests                              v1.1
  SMS (fallback only)                    Tenants or visitors without WhatsApp --- unlikely but must be handled   MVP
  Email                                  Formal records, visit summaries, compliance notices                     MVP

Recommended provider: Twilio for WhatsApp Business API + SMS fallback in
a single integration. Mexican-market alternatives Zenvia and Gupshup
offer better local pricing and support and are worth evaluating before
committing. All three support interactive message templates and
webhook-based inbound handling.

## 7.2 QR Code Flows

QR codes are used in at least two contexts and should be clearly
distinguished in the architecture:

- **Visitor Invite QR:** Generated per-visit, single-use. Contains a
  visit token linked to the pre-registered record. Scanned at kiosk or
  by staff to fast-track check-in.

<!-- -->

- **Tenant Employee Credential QR:** Persistent, assigned to a
  registered building employee or tenant staff member. Used for
  recurring frictionless entry. May eventually replace or complement a
  physical badge.

## 7.3 ID Scanning & OCR (v1.1 Feature)

ID scanning would allow a visitor to hold their INE (Mexican national
ID), passport, or driver\'s license in front of a camera and have the
system auto-populate their name, ID number, and date of birth. Key
considerations:

- Hardware: standard tablet camera (lower accuracy) vs. dedicated ID
  scanner (higher accuracy, e.g., Acuant, Scanbot, or BlinkID SDK by
  Microblink).

<!-- -->

- Microblink\'s BlinkID SDK supports Mexican IDs and is available as a
  mobile/web SDK --- likely the recommended approach.

<!-- -->

- Data retention policy must be defined: is the raw ID image stored, or
  only extracted text fields?

<!-- -->

- Legal basis for data collection under Mexico\'s Ley Federal de
  Protección de Datos Personales must be confirmed.

## 7.4 Facial Recognition (Future Feature)

Facial recognition would allow the system to identify a returning
visitor automatically as they approach the kiosk or lobby camera. This
is technically feasible using cloud APIs (AWS Rekognition, Azure Face
API, or Google Vision) but carries significant considerations:

- Mexico\'s LFPDPPP and emerging AI regulation may impose consent and
  transparency requirements.

<!-- -->

- Biometric data must be treated as sensitive personal data with
  appropriate safeguards.

<!-- -->

- The feature should be designed as strictly opt-in for visitors.

<!-- -->

- Recommended: defer to a dedicated privacy/legal review before
  beginning architecture on this feature.

## 7.5 Offline / Resilience Mode

The lobby is a critical operational point. If internet connectivity is
lost, staff must not be unable to check in visitors. The MVP should
include:

- Local caching of the tenant directory and recent visitor records.

<!-- -->

- Queue-based sync: check-ins recorded offline are synced to the server
  when connectivity is restored.

<!-- -->

- Clear UI state indicator: staff must always know if the system is
  online, offline, or degraded.

## 7.6 Hardware Considerations

The MVP requires minimal hardware investment:

- Staff workstation: any existing desktop or laptop running a modern
  browser. No special hardware required.

<!-- -->

- USB or Bluetooth QR scanner (e.g. Honeywell Voyager 1250g, \~\$50):
  plugged into the staff workstation. Staff clicks \'Scan QR\' on the
  check-in screen, visitor shows their WhatsApp invite QR on their
  phone, scanner reads it instantly and pulls up the pre-registered
  record.

<!-- -->

- Lobby QR placard: a printed QR code card placed at reception. Visitors
  scan it with their own phone to open the WhatsApp self-check-in flow.
  No power, no maintenance.

<!-- -->

- Badge/label printer: optional for MVP. Recommended: Brother QL-820NWB
  or Zebra ZD220 for label printing via browser.

# 8. Open Questions for Discovery

The following questions should be answered during discovery sessions
with the business owner and building operations team before architecture
is finalized. They are grouped by theme.

## 8.1 Operations & Process

- How many lobby staff members will use the system simultaneously?
  (Affects session/auth design.)

<!-- -->

- Is there currently a physical visitor log book? If so, can we review a
  sample week of entries to understand real visit volume and types?

<!-- -->

- What is the busiest time of day at the lobby? Is there a predictable
  peak window?

<!-- -->

- Who is responsible for maintaining the tenant directory? Building
  management, or a delegate per tenant?

<!-- -->

- Is there a security guard in addition to a receptionist? Do they have
  separate roles and views?

## 8.2 WhatsApp & Tenant Notification Behavior

- Which phone number will serve as the building\'s WhatsApp Business
  number? This must be a dedicated number --- it cannot be an existing
  personal number already registered on WhatsApp.

<!-- -->

- Should notification go to a single tenant contact or multiple people
  (e.g., primary + backup)? This affects the data model for
  TenantContact from the start.

<!-- -->

- What should happen if the host does not acknowledge a visitor
  notification within X minutes --- escalate to a secondary contact,
  allow staff to decide, or auto-deny?

<!-- -->

- Are tenants expected to interact with the building via the building\'s
  WhatsApp number, or do they prefer the building manager to handle all
  pre-registration on their behalf?

<!-- -->

- Will the WhatsApp bot need to support both Spanish and English from
  day one, or is Spanish sufficient at launch?

## 8.3 Data & Privacy

- How long should visitor records be retained? 90 days? 1 year?
  Indefinitely?

<!-- -->

- Is there a legal or insurance requirement to maintain visitor logs
  (e.g., for security incident investigation)?

<!-- -->

- When ID scanning is introduced, will raw image files be stored, or
  only extracted text fields?

<!-- -->

- Will a privacy notice be displayed at the kiosk? Is there a
  legal/compliance team to review it?

## 8.4 Technical Constraints

- What is the current internet connectivity setup at the lobby? Is there
  a dedicated connection with an SLA?

<!-- -->

- Is there an existing network infrastructure for a kiosk tablet? WiFi
  or wired?

<!-- -->

- Are there any existing systems (property management software,
  accounting, access control) that this platform must eventually
  integrate with?

<!-- -->

- Is there a preference for cloud hosting provider (AWS, GCP, Azure, or
  a local Mexican data center)?

<!-- -->

- Are there any corporate IT security policies that govern data handling
  for tenant or visitor data?

## 8.5 Business Rules & Edge Cases

- Can a visitor be denied entry by a tenant remotely? What is the
  process if a tenant says \'do not let this person in\'?

<!-- -->

- How should the system handle a visitor who does not have a smartphone
  (no QR scan, no self-service)?

<!-- -->

- What happens if a visitor checks in but their host is unreachable?

<!-- -->

- Should the system support multiple entry/exit points in the future, or
  is there always a single controlled lobby entrance?

# 9. Recommended Development Starting Point

Given the desire for a fast, practical first release, the following
phased approach is recommended:

## Phase 0 --- Architecture & Setup

- Define data model: Visitor, VisitRecord, Tenant, TenantContact,
  NotificationLog, WhatsAppSession.

<!-- -->

- Set up project repository, CI/CD pipeline, and staging environment.

<!-- -->

- Decide on tech stack (recommended: Next.js or similar full-stack
  framework; PostgreSQL; cloud hosting).

<!-- -->

- Design and implement basic auth: role-based login for Lobby Staff and
  Admin.

<!-- -->

- Register the building\'s WhatsApp Business number and set up the API
  provider account (Twilio / Zenvia / Gupshup). This has a Meta approval
  lead time of several days --- start immediately.

## Phase 1 --- MVP Core

- Staff-initiated check-in for all visitor types (manual form).

<!-- -->

- Tenant directory with WhatsApp number per contact + SMS/email
  fallback.

<!-- -->

- Outbound WhatsApp notification with interactive buttons (Que suba / No
  disponible) on visitor check-in.

<!-- -->

- Webhook listener: button tap updates visit record and staff dashboard
  in real time.

<!-- -->

- Real-time active visitor dashboard.

<!-- -->

- Historical log with basic search and filter.

<!-- -->

- Delivery check-in with WhatsApp notification to recipient.

<!-- -->

- Visitor blocklist with name-match alert during check-in.

## Phase 2 --- WhatsApp Self-Service & QR

- Visitor invite QR delivered via WhatsApp message (replaces email-only
  delivery).

<!-- -->

- WhatsApp Flows or bot for visitor self-check-in via phone --- printed
  QR placard at lobby entrance.

<!-- -->

- Tenant pre-registration via WhatsApp inbound message bot.

<!-- -->

- Bilingual ES/EN interface toggle and bilingual WhatsApp message
  templates.

<!-- -->

- Basic reporting / daily summary.

## Phase 3 --- Advanced Features (Post-MVP)

- ID scanning with OCR (BlinkID SDK integration).

<!-- -->

- Employee QR badge credentials.

<!-- -->

- Offline mode with sync queue.

<!-- -->

- Badge/label printing integration.

<!-- -->

- Facial recognition (pending legal review).

  --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Suggested First Steps for the Lead Developer**
  1\. Review this document and generate a list of clarification questions for the business owner.
  2\. Sketch a preliminary data model covering core entities: Visitor, VisitRecord, Tenant, TenantContact, NotificationLog, WhatsAppSession.
  3\. Propose a technology stack with brief rationale --- particularly for the WhatsApp Business API integration and real-time webhook handling.
  4\. Register the building\'s WhatsApp Business number with the chosen provider immediately. Meta approval takes several business days and is on the critical path for MVP.
  5\. Build a WhatsApp proof-of-concept as the first technical milestone: staff logs a walk-in, tenant receives a WhatsApp message with two buttons, button tap updates the staff dashboard. This validates the entire core loop before any other UI is built.
  6\. Schedule a 60-minute discovery session to walk through open questions in Section 8.
  7\. Produce a first-pass system architecture diagram before writing any application code.
  --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

# 10. Glossary

  **Term**                           **Definition**
  ---------------------------------- ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **BMP**                            Building Management Platform --- the overarching proprietary software platform being built for Torre Mind.
  **VLMS**                           Visitor & Lobby Management System --- the name for Module 1 of the BMP.
  **Check-In**                       The act of formally registering a visitor\'s arrival in the system and logging the visit.
  **Check-Out**                      The act of logging a visitor\'s departure from the building.
  **Kiosk Mode**                     A tablet interface designed for visitor self-service, locked to the VLMS check-in application.
  **Tenant**                         A company or individual that rents office space in Torre Mind.
  **Host**                           The tenant contact person who is expected to receive a visitor.
  **Visit Token**                    A unique, time-limited identifier embedded in a QR code used for pre-registered visitor check-in.
  **OCR**                            Optical Character Recognition --- technology that reads text from images (e.g., ID documents).
  **INE**                            Instituto Nacional Electoral --- the Mexican national identity document, commonly presented as ID.
  **LFPDPPP**                        Ley Federal de Protección de Datos Personales en Posesión de los Particulares --- Mexico\'s primary data privacy law.
  **WhatsApp Business API**          A programmatic interface for sending and receiving WhatsApp messages from business applications. Supports interactive message templates (buttons, lists) and inbound webhook handling.
  **Interactive Message Template**   A WhatsApp message format that includes tap buttons or selection lists. Used for the host acknowledgment flow (Que suba / No disponible). Must be pre-approved by Meta before use.
  **WhatsApp Flows**                 A Meta capability for rendering structured input forms (text fields, dropdowns, pickers) inside a WhatsApp conversation. Used for visitor self-check-in without a web form or kiosk device.
  **Webhook**                        An HTTP callback endpoint in the VLMS server that receives real-time events from the WhatsApp API, such as a tenant tapping a reply button.
  **BlinkID**                        A leading mobile SDK for scanning and extracting data from identity documents, developed by Microblink.
  **Kisi**                           A smart access control platform; referenced here as a future integration target for physical door access.

*End of Document --- Torre Mind VLMS Product Discovery v0.4*
