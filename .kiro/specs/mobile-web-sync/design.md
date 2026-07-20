# VALO Parking — Mobile / Web Synchronization Design

## 1. Purpose

This document describes the technical design for synchronizing the VALO Parking Mobile application with the latest Web behavior from `origin/TrainAI_Vy`.

The implementation focuses on four areas:

1. Booking policy acceptance inside the Mobile booking flow.
2. Booking QR availability after successful booking.
3. Membership QR verification and display.
4. Policy synchronization between Mobile, Web, and Backend.

Bulk Booking UI, Membership transfer, Membership renewal details, Admin/Staff screens, and Kiosk implementation changes are outside the current scope.

---

## 2. Design Goals

The design must:

- Keep Backend APIs and business rules as the source of truth.
- Reuse existing Mobile architecture and services.
- Avoid duplicating policy, booking, subscription, or QR services.
- Keep policy content backend-managed instead of hard-coded.
- Keep QR payload generation and verification on the Backend.
- Provide an inline Mobile policy acceptance flow instead of navigating away.
- Preserve existing booking, authentication, wallet, subscription, and navigation behavior.
- Minimize code changes outside the affected Mobile features.

---

## 3. Existing System Architecture

### 3.1 Mobile

**Technology**

- React Native
- Expo SDK 54
- TypeScript
- React Navigation 7
- Axios-based `APIClient`
- JWT authentication
- `expo-secure-store`
- React Context and local component state
- `react-native-qrcode-svg`

**Relevant modules**

```text
mobile/
└── src/
    ├── components/
    │   └── booking/
    ├── navigation/
    │   └── BookingStackNavigator.tsx
    ├── screens/
    │   ├── booking/
    │   │   ├── CreateBookingScreen.tsx
    │   │   ├── BookingDetailScreen.tsx
    │   │   └── BookingBrowseScreen.tsx
    │   └── wallet/
    │       ├── MembershipScreen.tsx
    │       └── SubscriptionCheckoutScreen.tsx
    ├── services/
    │   ├── BookingService.ts
    │   └── api/
    │       ├── client.ts
    │       └── subscriptions.ts
    └── utils/
        └── policyErrors.ts
```

---

### 3.2 Web

The Web implementation is used as a behavioral reference.

Relevant files:

```text
frontend/src/
├── components/
│   └── policies/
│       ├── BookingPolicyModal.jsx
│       └── PolicyAcceptancePrompt.jsx
├── pages/
│   └── Customer/
│       ├── CreateBookingPage.jsx
│       ├── BookingPage.jsx
│       ├── Membership.jsx
│       ├── MembershipTransfers.jsx
│       └── RenewModal.jsx
└── services/
    └── bookingService.js
```

The important Web behavior to reproduce on Mobile is:

```text
Booking request
→ Backend returns HTTP 428
→ Show inline policy modal
→ User reads and accepts policy
→ Record policy acceptance
→ Retry booking automatically
```

---

### 3.3 Backend

Relevant services and middleware:

```text
backend/src/
├── middlewares/
│   └── policyAcceptanceMiddleware.js
├── services/
│   ├── bookingQrService.js
│   ├── membershipQrService.js
│   └── paidBookingPolicyService.js
└── routes/
    ├── bookingRoutes.js
    └── subscriptionRoutes.js
```

The Backend remains the source of truth for:

- Policy requirements
- Policy versions
- Policy acceptance
- Booking status
- Membership status
- Booking QR payload
- Membership QR payload
- QR validation

---

## 4. High-Level Design

```text
                     ┌──────────────────────┐
                     │   VALO Mobile App    │
                     └──────────┬───────────┘
                                │
                                │ API Request
                                ▼
                     ┌──────────────────────┐
                     │  Node.js / Express   │
                     │       Backend        │
                     └──────────┬───────────┘
                                │
            ┌───────────────────┼────────────────────┐
            │                   │                    │
            ▼                   ▼                    ▼
     Policy Service       Booking Service     Membership Service
            │                   │                    │
            ▼                   ▼                    ▼
     Policy Acceptance     Booking QR HMAC     Membership QR HMAC
```

Mobile does not generate trusted QR credentials.

Mobile only renders the signed payload returned by the Backend.

---

# 5. Component Design

## 5.1 `BookingPolicyModal`

### File

```text
mobile/src/components/booking/BookingPolicyModal.tsx
```

### Responsibility

The component is responsible for:

- Fetching the required booking policy.
- Displaying the policy title, summary, and full content.
- Tracking whether the user has scrolled to the bottom.
- Enabling policy acceptance only when reading requirements are met.
- Recording policy acceptance through the existing policy service.
- Returning control to the calling screen after successful acceptance.

### Proposed Props

```typescript
interface BookingPolicyModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}
```

### Internal State

```typescript
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
const [policyData, setPolicyData] = useState<PolicyDetail | null>(null);
const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
const [submitting, setSubmitting] = useState(false);
```

### Modal Lifecycle

```text
visible = true
    │
    ▼
Fetch booking-policy
    │
    ├── Success
    │     │
    │     ▼
    │ Display summary + content
    │     │
    │     ▼
    │ User scrolls to bottom
    │     │
    │     ▼
    │ Enable "I Agree & Continue"
    │
    └── Failure
          │
          ▼
      Display retry/error state
```

### Acceptance Flow

```text
User taps "I Agree & Continue"
          │
          ▼
policiesService.acceptPolicy(policyId)
          │
          ├── Failure
          │     └── Keep modal open and show error
          │
          └── Success
                │
                ▼
            onConfirm()
                │
                ▼
             Close modal
```

### Scroll Detection

React Native `ScrollView` will use:

- `onScroll`
- `onLayout`
- `onContentSizeChange`

Bottom detection:

```typescript
scrollY + layoutHeight >= contentHeight - 20
```

For short content:

```text
contentHeight <= layoutHeight + threshold
→ hasScrolledToBottom = true
```

---

## 5.2 `CreateBookingScreen`

### File

```text
mobile/src/screens/booking/CreateBookingScreen.tsx
```

### Current Problem

The Mobile screen detects policy acceptance errors but navigates the user to the Policies tab.

This interrupts the booking flow.

### New State

```typescript
const [showPolicyModal, setShowPolicyModal] = useState(false);
```

Optional QR enhancement state:

```typescript
const [successQrPayload, setSuccessQrPayload] = useState<string | null>(null);
const [successQrLoading, setSuccessQrLoading] = useState(false);
```

### Updated Booking Flow

```text
User presses Confirm Booking
          │
          ▼
handleSubmit()
          │
          ▼
POST /api/bookings/bulk
          │
    ┌─────┴─────┐
    │           │
 HTTP 200     HTTP 428
    │           │
    ▼           ▼
Booking      Detect
Success      POLICY_ACCEPTANCE_REQUIRED
    │           │
    ▼           ▼
Success      Open
Modal        BookingPolicyModal
                │
                ▼
         User accepts policy
                │
                ▼
         Retry handleSubmit()
```

### Retry Strategy

The screen must avoid duplicate booking submissions.

Recommended approach:

```typescript
const handlePolicyAccepted = async () => {
  setShowPolicyModal(false);
  await handleSubmit();
};
```

The existing `submitting` guard must remain active.

### Policy Error Handling

Replace:

```text
428
→ BookingActionModal
→ Navigate to Profile/Policies
```

With:

```text
428
→ setShowPolicyModal(true)
```

Other booking errors remain unchanged.

---

## 5.3 `SubscriptionCheckoutScreen`

### File

```text
mobile/src/screens/wallet/SubscriptionCheckoutScreen.tsx
```

### Current Problem

Policy-required responses currently lead users away from the purchase flow.

### Proposed Design

Reuse the same policy modal interaction pattern.

```text
Subscription purchase
       │
       ▼
POST payment API
       │
       ├── Success
       │
       └── HTTP 428
              │
              ▼
       Show Policy Modal
              │
              ▼
       Accept required policy
              │
              ▼
       Retry handlePurchase()
```

If subscription purchase requires a different policy slug, the modal should be generalized.

Recommended future interface:

```typescript
interface PolicyAcceptanceModalProps {
  visible: boolean;
  policySlug: string;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}
```

For the first implementation, a booking-specific modal may remain if only `booking-policy` is required.

---

# 6. Policy Error Utility Design

## File

```text
mobile/src/utils/policyErrors.ts
```

### Existing Function

```typescript
isPolicyAcceptanceRequired(error)
```

### New Function

```typescript
export interface MissingPolicy {
  policyId: string;
  policyVersionId?: string;
  slug: string;
  title: string;
  versionNumber: number | string;
  summary?: string;
}

export const extractMissingPolicies = (
  error: unknown
): MissingPolicy[] => {
  const root = asRecord(error);
  const data = asRecord(root?.data);
  const nested = asRecord(data?.data);

  return (
    (data?.missingPolicies as MissingPolicy[]) ||
    (nested?.missingPolicies as MissingPolicy[]) ||
    []
  );
};
```

### Supported Error Shapes

```text
error.data.missingPolicies
```

and:

```text
error.data.data.missingPolicies
```

The utility must return an empty array when no valid policy data is available.

---

# 7. Booking QR Design

## 7.1 Trusted QR Source

The Mobile application must never construct the signed Booking QR itself.

The source is:

```http
GET /api/bookings/:id/qr
```

Response:

```typescript
interface BookingQrData {
  available: boolean;
  bookingStatus: string;
  payload: string | null;
  reason: string | null;
}
```

Payload example:

```text
VALO_BOOKING:1:<bookingId>:<signature>
```

---

## 7.2 Existing Booking Detail Flow

```text
BookingDetailScreen opens
        │
        ▼
Check booking status
        │
        ├── PAID / ACTIVE / PAUSED
        │         │
        │         ▼
        │ GET /api/bookings/:id/qr
        │         │
        │         ▼
        │ Render QRCodeDisplay
        │
        └── Other status
                  │
                  ▼
             Hide QR
```

No major redesign is required.

---

## 7.3 Booking Success QR

Two supported UX options exist.

### Option A — Inline QR in Success Modal

Recommended for Web parity.

```text
Booking Success
      │
      ▼
Fetch booking QR
      │
      ▼
Show:
- Success message
- QR
- Booking summary
- View Booking Details button
```

### Option B — Keep Current Navigation

```text
Booking Success
      │
      ▼
Success Modal
      │
      ▼
View Booking
      │
      ▼
BookingDetailScreen
      │
      ▼
QR loaded
```

Option B is functionally valid and requires no mandatory change.

Option A is preferred when demo parity with Web is important.

---

# 8. Membership QR Design

## Existing API

```http
GET /api/subscriptions/membership/qr
```

Response:

```typescript
interface MembershipQrResponse {
  available: boolean;
  credentialType: 'ACCOUNT' | 'LEGACY_SUBSCRIPTION';
  membershipStatus: string;
  expireAt: string | null;
  payload: string | null;
  reason: string | null;
}
```

Possible payload formats:

```text
VALO_MEMBERSHIP_ACCOUNT:1:<userId>:<signature>
```

or:

```text
VALO_MEMBERSHIP:1:<subscriptionId>:<signature>
```

---

## Mobile Flow

```text
MembershipScreen
      │
      ▼
Load membership status
      │
      ▼
Active membership?
      │
  ┌───┴───┐
  │       │
 No      Yes
  │       │
Hide     GET /api/subscriptions/membership/qr
QR             │
               ▼
        available === true?
               │
          ┌────┴────┐
          │         │
         No        Yes
          │         │
      Show error   Render QR
```

The current implementation in `MembershipScreen.tsx` already follows this architecture and should only be verified.

---

# 9. Policy Data Design

All policy content remains backend-managed.

Mobile must never hard-code policy text.

### Read Policy

```http
GET /api/policies/:slug
```

For Booking:

```text
booking-policy
```

Expected response:

```typescript
interface PolicyDetailResponse {
  policy: {
    _id: string;
    title: string;
    slug: string;
    category: string;
  };
  currentVersion: {
    versionNumber: number;
    summary: string;
    content: string;
    changeNote?: string;
    title?: string;
  };
}
```

### Accept Policy

```http
POST /api/policies/:policyId/accept
```

Body:

```json
{
  "source": "mobile"
}
```

---

# 10. Navigation Design

## Booking Flow

```text
Booking Tab
    │
    ▼
CreateBookingScreen
    │
    ├── Policy required
    │      └── Inline BookingPolicyModal
    │
    └── Booking success
           │
           ▼
      BookingDetailScreen
```

### Legacy Screen

`BookingBrowseScreen` should be removed from active navigation if it still exposes an outdated booking flow.

Reason:

- Old API behavior
- No hold handling
- No inline policy acceptance
- Risk of inconsistent booking logic

The file may remain temporarily for compatibility but should not be reachable through normal user navigation.

---

# 11. Data Flow Design

## 11.1 Booking + Policy Acceptance

```text
Customer
  │
  ▼
CreateBookingScreen
  │
  ▼
POST /api/bookings/bulk
  │
  ├── HTTP 200
  │      │
  │      ▼
  │ Booking created
  │      │
  │      ▼
  │ Success modal
  │      │
  │      ▼
  │ BookingDetailScreen
  │      │
  │      ▼
  │ GET /api/bookings/:id/qr
  │      │
  │      ▼
  │ Display signed QR
  │
  └── HTTP 428
         │
         ▼
BookingPolicyModal
         │
         ▼
GET /api/policies/booking-policy
         │
         ▼
Display policy
         │
         ▼
User accepts
         │
         ▼
POST /api/policies/:id/accept
         │
         ▼
Retry booking
```

---

## 11.2 Membership QR

```text
Customer
  │
  ▼
MembershipScreen
  │
  ▼
GET membership status
  │
  ▼
Membership active
  │
  ▼
GET /api/subscriptions/membership/qr
  │
  ▼
Backend validates entitlement
  │
  ▼
Return signed QR payload
  │
  ▼
QRCodeDisplay
```

---

# 12. Error Handling Design

## Booking Policy

| Error | Mobile behavior |
|---|---|
| HTTP 428 | Open policy modal |
| Policy fetch failure | Show modal error and retry option |
| Policy accept failure | Keep modal open, show error |
| User cancels | Close modal, do not create booking |
| Retry still returns 428 | Show warning/error, avoid infinite retry loop |

---

## Booking QR

| Error | Mobile behavior |
|---|---|
| QR unavailable | Show unavailable message |
| Booking expired | Hide QR |
| Booking cancelled | Hide QR |
| Booking completed | Hide QR |
| Network failure | Show QR loading/error state |

---

## Membership QR

| Error | Mobile behavior |
|---|---|
| No membership | Hide QR section |
| Membership expired | Show unavailable state |
| Membership inactive | Hide or disable QR |
| API failure | Show QR error state |
| Payload null | Treat as unavailable |

---

# 13. Retry Safety

Policy acceptance introduces an automatic retry.

The design must prevent accidental duplicate requests.

### Rules

1. Existing `submitting` state remains the primary duplicate-submit guard.
2. Policy modal acceptance should trigger exactly one retry.
3. Retry must use the current form state.
4. The booking hold state must remain valid where possible.
5. If the hold expires during policy acceptance, the existing booking error handling should request a new hold or notify the user.
6. No infinite retry loop should occur if Backend continues returning HTTP 428.

Recommended flag:

```typescript
const [policyRetryAttempted, setPolicyRetryAttempted] = useState(false);
```

Optional logic:

```text
Initial request → 428
→ show modal
→ accept
→ retry once

Retry → 428 again
→ show error
→ do not retry automatically again
```

---

# 14. UI Design Principles

The Mobile UI should follow the existing VALO Parking design system.

## Policy Modal

Recommended layout:

```text
┌─────────────────────────────────┐
│ Booking Policy                  │
│                                 │
│ Summary / TL;DR                 │
│ ┌─────────────────────────────┐ │
│ │ Policy summary              │ │
│ └─────────────────────────────┘ │
│                                 │
│ Scrollable full policy          │
│ ┌─────────────────────────────┐ │
│ │                             │ │
│ │ Full policy content         │ │
│ │                             │ │
│ └─────────────────────────────┘ │
│                                 │
│ Scroll to the bottom to accept  │
│                                 │
│ [ Cancel ] [ I Agree & Continue]│
└─────────────────────────────────┘
```

### Rules

- Modal should not navigate the user away.
- Cancel must always remain accessible.
- Accept must be disabled until requirements are met.
- Long content must be scrollable.
- Loading and error states must be visible.
- API calls must have disabled/loading button states.

---

# 15. API Reuse

No new Backend APIs are required.

Existing APIs:

| Purpose | Endpoint |
|---|---|
| Create booking | `POST /api/bookings/bulk` |
| Booking QR | `GET /api/bookings/:id/qr` |
| Membership QR | `GET /api/subscriptions/membership/qr` |
| Policy details | `GET /api/policies/:slug` |
| Accept policy | `POST /api/policies/:id/accept` |
| Subscription payment | Existing subscription payment endpoints |

---

# 16. Files to Modify

## Required

### `mobile/src/utils/policyErrors.ts`

Add:

- `MissingPolicy`
- `extractMissingPolicies`

---

### `mobile/src/components/booking/BookingPolicyModal.tsx`

Create:

- Policy loading
- Policy error
- Policy content display
- Scroll detection
- Acceptance
- Cancel behavior

---

### `mobile/src/screens/booking/CreateBookingScreen.tsx`

Modify:

- Add policy modal state
- Replace navigate-away policy handling
- Retry booking after policy acceptance

---

### `mobile/src/screens/wallet/SubscriptionCheckoutScreen.tsx`

Modify:

- Replace navigate-away policy handling
- Reuse inline acceptance flow
- Retry purchase after acceptance

---

### `mobile/src/navigation/BookingStackNavigator.tsx`

Review:

- Remove or disable legacy `BookingBrowseScreen` route if still reachable

---

## Verify Only

### `mobile/src/screens/booking/BookingDetailScreen.tsx`

Verify:

- Booking QR API call
- Supported booking statuses
- QR unavailable states

### `mobile/src/screens/wallet/MembershipScreen.tsx`

Verify:

- Membership QR API
- QR error states
- Expired/inactive behavior

### `mobile/src/services/BookingService.ts`

Verify:

- `getBookingQr()`

### `mobile/src/services/api/subscriptions.ts`

Verify:

- `getMembershipQr()`

---

# 17. Testing Design

## Unit Tests

### `policyErrors.ts`

Test:

- Flat `missingPolicies`
- Nested `missingPolicies`
- Empty policy array
- Missing data
- Null input

---

### `BookingPolicyModal`

Test:

- Loading state
- Policy fetch success
- Policy fetch failure
- Accept disabled before scroll
- Accept enabled after scroll
- Short-content auto-enable
- Acceptance success
- Acceptance failure
- Cancel behavior

---

## Integration Tests

### Booking

```text
Create booking
→ Backend returns 428
→ Modal appears
→ User accepts
→ Booking retried
→ Booking succeeds
→ Detail screen opens
→ QR visible
```

### Policy Cancel

```text
Create booking
→ Backend returns 428
→ Modal appears
→ Cancel
→ Booking not created
→ Form preserved
```

### Membership QR

```text
Active membership
→ Open Membership screen
→ QR API succeeds
→ Signed QR shown
```

### Invalid Membership State

```text
Expired membership
→ QR unavailable
→ Unavailable message displayed
```

---

# 18. Implementation Order

## Phase 1 — Utilities

1. Add `extractMissingPolicies`
2. Add unit tests

## Phase 2 — Policy Modal

1. Create `BookingPolicyModal`
2. Implement policy fetch
3. Implement scroll detection
4. Implement policy acceptance
5. Add tests

## Phase 3 — Booking Integration

1. Integrate modal into `CreateBookingScreen`
2. Replace navigate-away logic
3. Add booking retry
4. Validate duplicate-submit protection

## Phase 4 — Subscription Integration

1. Integrate policy modal into `SubscriptionCheckoutScreen`
2. Retry purchase after acceptance

## Phase 5 — QR Verification

1. Verify Booking QR
2. Verify Membership QR
3. Optionally add Booking QR to success modal

## Phase 6 — Navigation Cleanup

1. Remove/deprecate legacy `BookingBrowseScreen`

## Phase 7 — Full Regression Testing

1. Booking
2. Policy
3. QR
4. Membership
5. Android
6. iOS

---

# 19. Out of Scope

The following work is explicitly excluded:

- Bulk Booking UI
- Membership transfer
- Membership renewal UI details
- Admin screens
- Staff screens
- Kiosk implementation changes
- Backend QR redesign
- Web changes
- Authentication changes
- Wallet redesign

---

# 20. Final Expected Behavior

After implementation, the expected Mobile behavior is:

```text
Customer creates booking
        │
        ▼
Backend checks policy acceptance
        │
   ┌────┴────┐
   │         │
Accepted   Missing
   │         │
   │         ▼
   │   Policy Modal
   │         │
   │         ▼
   │     User accepts
   │         │
   │         ▼
   │    Booking retried
   │         │
   └────┬────┘
        ▼
Booking created
        │
        ▼
Booking details
        │
        ▼
Signed Booking QR displayed
```

Membership flow:

```text
Customer has active membership
        │
        ▼
MembershipScreen
        │
        ▼
Backend Membership QR API
        │
        ▼
Signed Membership QR displayed
```

This design keeps policy enforcement, membership status, booking status, and QR security on the Backend while giving Mobile the same user experience and business behavior as the latest Web implementation.
