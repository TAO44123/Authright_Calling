# AI Phone Receptionist — Demo Application Specification

Version: 0.1 | Date: September 29, 2026

## 1. Objective

Build a simple application that demonstrates this complete flow: a customer visits a business website, calls the displayed phone number, speaks with an AI receptionist, and books an appointment. The business owner signs in using their mobile phone number and an SMS verification code, then sees the appointment in their private website inbox.

The demo must work with a real inbound telephone call. A browser-only voice simulation does not satisfy acceptance.

## 2. Demo assumptions and scope

- One business, one owner, one location, and one appointment resource (one appointment at a time).
- English voice conversations; one service with a fixed 30-minute duration.
- Business timezone: America/New_York; display all appointment times with the timezone.
- Seeded example hours: Monday–Friday, 9:00 a.m.–5:00 p.m.; no bookings in the past, at least one hour of notice, and a 30-day booking window.
- The application's database is the authoritative appointment calendar. All demo commitments and blocked times must be represented there.
- The agent automatically confirms valid bookings after the caller agrees. Owner approval is not required.
- The public receptionist number and the owner's private login mobile number serve different purposes. The owner mobile number must not appear on the public website.
- A developer provisions the business, owner mobile number, receptionist number, service, hours, and agent connection. Public owner registration is outside scope.

## 3. Users and website screens

| Screen | Audience | Required content and actions |
|---|---|---|
| Business homepage | Public | Business name, description, service, duration, hours, location, receptionist phone number, mobile-friendly Call to Book button using a telephone link, and Owner Login link |
| Owner login | Owner | Mobile number with country code, Send Code, verification-code entry, Verify, resend cooldown, and clear errors |
| Inbox | Authenticated owner | Newest-first messages, unread count, unread indicator, message type, customer name, appointment time, and detail link; refresh automatically at least every 10 seconds |
| Message detail | Authenticated owner | Appointment or callback details, short call summary, timestamp, booking reference, and Mark Read/Unread action |
| Appointments | Authenticated owner | Upcoming confirmed appointments, customer contact, service, start/end time, and booking reference; read-only in v0.1 |

The inbox is an internal notification feed, not an SMS inbox or two-way customer chat. Reading a message does not change booking status. Deleting messages and modifying appointments through the website are outside v0.1.

## 4. Customer call flow

1. Customer calls the number on the homepage. The telephone service routes the call to the voice agent.
2. Agent introduces itself: “Hello, you've reached [Business]. I'm the AI appointment assistant. I can help you book an appointment.”
3. Agent identifies the booking intent and collects the requested day and time. Interpret relative dates using the business timezone and current business-local date.
4. Agent calls the availability tool. It must never invent availability.
5. If unavailable, offer up to three returned alternatives. If available, collect customer name and callback number. Caller ID may be proposed but must be confirmed verbally; it is not proof of identity.
6. Agent reads back the service, complete date, time, timezone, duration, customer name, and callback number. Ask for explicit agreement before submitting the booking.
7. Agent calls the booking tool. The backend rechecks the slot and saves the appointment and owner inbox message in one database transaction.
8. Only after a successful tool result, agent says the appointment is confirmed and gives the date, time, and booking reference.
9. Owner logs in and sees the new unread message and the appointment in the upcoming list.

If the caller changes a detail during confirmation, repeat the relevant readback and obtain agreement before booking.

## 5. Owner phone login

The preconfigured owner enters their mobile number and requests an SMS one-time code. After successful verification, the backend establishes an authenticated session and opens the inbox. Entering a phone number alone never grants access.

- Normalize telephone numbers to international E.164 format.
- Use a provider-backed OTP challenge; do not store plaintext verification codes.
- Proposed limits: code expires after five minutes; maximum five verification attempts per challenge; 60-second resend cooldown; maximum five sends per number per hour, plus IP throttling.
- A valid code for a number that is not the configured owner must not create an owner account or grant access.
- Return a generic request-code response to avoid exposing which number belongs to the owner.
- Use a secure, HttpOnly session cookie, an eight-hour session expiry, logout, and CSRF protection for cookie-authenticated mutations.
- Every owner API checks both authentication and business ownership. Client-side route protection alone is insufficient.

## 6. Booking rules and failure handling

| Situation | Required behavior |
|---|---|
| Slot is outside hours, blocked, too soon, or outside booking window | Reject server-side; return valid alternatives where possible |
| Two calls request the same slot | Database-level uniqueness for the resource and fixed slot permits only one booking; the losing request receives a conflict |
| Agent retries after a timeout | Reuse the same idempotency key for that booking attempt; return the existing result without a second appointment or inbox message |
| Booking outcome is unknown | Look up the result by idempotency key before retrying; do not tell the caller it failed or succeeded without evidence |
| Caller hangs up before agreeing | No booking; if sufficient contact details exist, save an incomplete-call message marked Needs Follow-up |
| Caller hangs up after database commit | Keep the confirmed booking; do not cancel it because the call ended |
| Voice is unclear | Ask a short clarification; after two unsuccessful attempts, offer a callback request |
| No suitable time or caller wants a person | Collect name, callback number, and request; save a Needs Follow-up inbox message, without promising a callback time |
| Caller requests cancellation or rescheduling | Capture a follow-up request; do not change an existing booking in v0.1 |
| Unsupported business question | Answer only from configured business facts; otherwise offer a follow-up request |
| Persistence or tool service fails | Do not claim an appointment or message was saved. Explain that completion could not be verified and ask the caller to try again |

Generate discrete half-hour slots in business-local time and persist timezone-aware timestamps in UTC. Service end must fall within business hours. Reject invalid or ambiguous local times. For the fixed-duration demo, enforce a unique resource/start-time slot and require all writes to use generated slots. Variable-duration services would require interval-overlap protection in a later version.

## 7. Owner inbox contents

Each confirmed booking generates exactly one unread message linked to the appointment. Store structured facts from the booking result; the agent's summary must not overwrite them.

Example message:

> **New appointment — Alex Chen**  
> Status: Confirmed  
> Service: Consultation — 30 minutes  
> Date: October 1, 2026, 2:00–2:30 p.m., America/New_York  
> Customer phone: [confirmed callback number]  
> Booking reference: APT-0042  
> Source: AI phone receptionist  
> Summary: Customer requested an afternoon consultation and agreed to the offered time.

Callback and incomplete-call messages must be clearly labeled Needs Follow-up and must not resemble confirmed bookings. The inbox is the required owner notification channel; owner SMS and email notifications are excluded from the demo.

## 8. Proposed technical design

Use a web frontend, Java Spring Boot backend, PostgreSQL database, a managed inbound telephony/voice-agent integration, and an SMS verification provider. Provider selection remains an implementation choice; this specification defines required behavior rather than a particular vendor API.

The voice integration manages telephone audio, speech understanding, response generation, and speech output. It calls authenticated backend tools for business facts, availability, bookings, and callback messages. Scheduling logic and appointment persistence belong to the backend.

Run the application and database with Docker Compose for development. Real phone calls require provisioned provider accounts, a real inbound number, SMS verification credentials, and a publicly reachable HTTPS callback/tool endpoint. Local development can expose that endpoint through an approved tunnel; production hosting is not part of this specification deliverable.

No vector database or RAG pipeline is needed for v0.1. Business facts and availability are structured data. A later version can add document-based answers if the business needs a larger knowledge base.

### Backend interface contracts

| Interface | Key inputs | Required result |
|---|---|---|
| POST /auth/otp/request | Owner phone | Generic accepted response and challenge identifier |
| POST /auth/otp/verify | Challenge identifier, code | Authenticated owner session or verification error |
| POST /auth/logout | Owner session | Session invalidated |
| GET /owner/messages | Owner session, cursor, unread filter | Business-scoped paginated inbox |
| GET /owner/messages/{id} | Owner session, message ID | Authorized message detail |
| PATCH /owner/messages/{id} | Owner session, read flag | Updated read state |
| GET /owner/appointments | Owner session, date range | Business-scoped confirmed appointments |
| get_business_info tool | Verified agent/call context | Public facts, service, timezone, booking rules |
| find_available_slots tool | Service ID, requested date/time or range | Valid slot identifiers, start/end, timezone |
| book_appointment tool | Call ID, slot ID, name, confirmed phone, caller agreement, idempotency key | CONFIRMED plus reference; SLOT_UNAVAILABLE plus alternatives; or explicit error |
| get_booking_result tool | Call context, idempotency key | Existing booking result, NOT_FOUND, or error |
| create_callback_message tool | Call ID, name, phone, request, idempotency key | Saved message ID or explicit error |
| Call lifecycle webhook | Provider call/event IDs, lifecycle state | Deduplicated call status update |

Business identity must come from verified provider configuration or the owner session, never a freely chosen caller parameter. Validate schemas and provider signatures or equivalent credentials. Restrict tools to the associated business and call. Return machine-readable errors so the agent can handle conflicts separately from outages.

### Minimal data model

| Entity | Required fields |
|---|---|
| Business | ID, name, public facts, timezone, receptionist phone, hours, booking limits |
| Owner | ID, business ID, verified login phone |
| Service | ID, business ID, name, duration |
| BlockedSlot | Business/resource ID, slot start |
| Appointment | ID/reference, business/resource ID, service ID, customer name/phone, UTC start/end, status, call ID, idempotency key, created timestamp |
| InboxMessage | ID, business ID, type, appointment ID if applicable, structured payload, summary, read timestamp, created timestamp, deduplication key |
| Call | Internal ID, provider call ID, business ID, start/end, lifecycle status, linked appointment/message IDs |

Keep API credentials server-side. Do not record audio or persist full transcripts in this demo; save only booking information and a short operational summary. Configure provider retention consistently with this choice. Avoid collecting payment details or sensitive personal information. Operational logs should use IDs and redact phone numbers.

## 9. Implementation sequence

1. Seed business configuration, owner phone, service, generated availability, and blocked slots.
2. Build the public homepage and owner screens.
3. Implement OTP login and protected owner endpoints.
4. Implement availability, transactional booking/inbox creation, and idempotent recovery.
5. Configure the real inbound telephone number and voice agent, then connect backend tools.
6. Add call lifecycle handling, callback messages, and inbox polling.
7. Run acceptance checks with real calls and SMS login; supply Docker Compose, environment-variable template without secrets, migrations, seed script, and setup instructions with the implemented app.

## 10. Acceptance criteria

1. A tester calls the actual number displayed on the website and reaches the AI agent.
2. The agent obtains the required details, checks actual availability, reads details back, and obtains agreement before booking.
3. A successful booking exists in the database and creates one unread owner message; it appears in the inbox within 10 seconds of commit under normal demo conditions.
4. The configured owner receives a real SMS code and can sign in; incorrect, expired, reused, or excessive code attempts fail.
5. Anonymous users and unregistered phone numbers cannot read owner messages or appointments, including by requesting APIs directly.
6. Concurrent attempts for the same slot create only one booking. The other caller receives alternatives.
7. A repeated booking tool call with the same idempotency key creates no duplicate appointment or message.
8. A booking timeout after commit is recoverable through result lookup; the agent does not make an unsupported confirmation claim.
9. An unavailable time, interrupted call, and callback request each follow the specified behavior.
10. Refreshing or signing out and back in preserves bookings and message read state.

## 11. Explicit exclusions

Multi-business onboarding, multiple staff calendars, external calendar synchronization, payments, customer accounts, outbound marketing calls, customer SMS confirmations, reminders, live call transfer, multilingual support, document uploads/RAG, and automated cancellation or rescheduling are deferred. These exclusions keep the first demo focused on a real call becoming a confirmed appointment in the owner's private inbox.
