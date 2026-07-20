# VALO Parking — Mobile / Web Sync SPEC (TrainAI_Vy)

---

## Discovery Summary

**Latest relevant branch**: `origin/TrainAI_Vy`
Latest commit: `1e713d2 — refactor(env): Change port env`
Key commits:
- `8dbfed9` — `feature(mobile): update Membership QR scan`
- `0ad3163` — `feature(mobile): Booking QR scan`
- `e4327e2` — `chore(BE & FE): Modal policy of booking screen in web and kiosk`
- `55a6986` — `feature(BE/FE): update membership transfer and renew membership`

---

**Booking files — Web (TrainAI_Vy)**:
- `frontend/src/pages/Customer/CreateBookingPage.jsx` — full booking flow, integrates `BookingPolicyModal`
- `frontend/src/pages/Customer/BookingPage.jsx` — booking list/management
- `frontend/src/components/policies/BookingPolicyModal.jsx` — **NEW** modal component
- `frontend/src/services/bookingService.js`

**Booking files — Mobile (TrainAI_Vy)**:
- `mobile/src/screens/booking/CreateBookingScreen.tsx` — booking creation (has policy error detect, no modal yet)
- `mobile/src/screens/booking/BookingDetailScreen.tsx` — **UPDATED**: has QR section (`getBookingQr`)
- `mobile/src/services/BookingService.ts` — has `getBookingQr()` method

**Membership files — Web (TrainAI_Vy)**:
- `frontend/src/pages/Customer/Membership.jsx` — subscription packages
- `frontend/src/pages/Customer/RenewModal.jsx` — renewal modal
- `frontend/src/pages/Customer/MembershipTransfers.jsx` — entitlement transfers

**Membership files — Mobile (TrainAI_Vy)**:
- `mobile/src/screens/wallet/MembershipScreen.tsx` — **UPDATED**: has QR section (`getMembershipQr`)
- `mobile/src/screens/wallet/SubscriptionCheckoutScreen.tsx`
- `mobile/src/services/api/subscriptions.ts` — has `getMembershipQr()` API call

**Policy-related files**:
- Backend: `backend/src/middlewares/policyAcceptanceMiddleware.js` (HTTP 428)
- Backend: `backend/src/services/paidBookingPolicyService.js` (**NEW**)
- Frontend: `frontend/src/components/policies/BookingPolicyModal.jsx` (**NEW**)
- Frontend: `frontend/src/components/policies/PolicyAcceptancePrompt.jsx`
- Mobile: `mobile/src/utils/policyErrors.ts` — only has `isPolicyAcceptanceRequired`, missing `extractMissingPolicies`

**QR-related files**:
- Backend: `backend/src/services/bookingQrService.js` (**NEW** — HMAC signed `VALO_BOOKING:v:id:sig`)
- Backend: `backend/src/services/membershipQrService.js` (**NEW** — `VALO_MEMBERSHIP` + `VALO_MEMBERSHIP_ACCOUNT`)
- Backend route: `GET /api/bookings/:id/qr`
- Backend route: `GET /api/subscriptions/membership/qr` (account-level)
- Backend route: `GET /api/subscriptions/:subscriptionId/qr`
- Mobile: `BookingDetailScreen.tsx` — uses `getBookingQr()` ✅ implemented
- Mobile: `MembershipScreen.tsx` — uses `getMembershipQr()` ✅ implemented

**Main Web vs Mobile gaps**:
1. **Booking Policy Modal**: Web has `BookingPolicyModal` component (fetches `booking-policy` slug, scroll-to-bottom, accept). Mobile **detects** the 428 error but only navigates to Policies tab — no inline modal with accept + retry.
2. **Booking QR**: Mobile `BookingDetailScreen` already calls `GET /api/bookings/:id/qr` ✅ — but `CreateBookingScreen` success modal doesn't show QR yet; navigates to `BookingDetailScreen`.
3. **Membership QR**: Mobile `MembershipScreen` already calls `GET /api/subscriptions/membership/qr` ✅ — implemented in TrainAI_Vy.
4. **`extractMissingPolicies`**: Missing from `mobile/src/utils/policyErrors.ts`.
5. **Policy Modal before booking submit**: Mobile shows `BookingActionModal` feedback → navigate away. Web shows `BookingPolicyModal` inline → accept → auto-retry booking.

---

# 1. Overview

This spec defines the changes required to synchronize the VALO Parking Mobile app (React Native + Expo) with the latest Web implementation from branch `origin/TrainAI_Vy`. The focus areas are:

- **Booking Policy Modal**: Show an inline modal to read and accept the `booking-policy` before creating a booking, matching the Web `BookingPolicyModal` component behavior.
- **Booking Success QR**: After booking creation, the QR is already available in `BookingDetailScreen` via `GET /api/bookings/:id/qr`. The success modal on `CreateBookingScreen` should show the QR inline before navigating.
- **Membership QR**: Already partially implemented in `MembershipScreen` via `GET /api/subscriptions/membership/qr`. This spec verifies completeness and defines any remaining gaps.
- **Policy Synchronization**: Ensure no hard-coded policy content exists and that all policy-related flows use backend APIs.

**Out of scope**: Bulk Booking UI, Membership transfer/renewal UI details, Admin/Staff screens.

---

# 2. Current Architecture Analysis

## Mobile Architecture (TrainAI_Vy)

- **Framework**: React Native + Expo SDK 54, TypeScript
- **Navigation**: React Navigation 7.x (`NativeStackNavigator`, `BottomTabNavigator`)
- **HTTP**: `APIClient` (Axios wrapper) in `mobile/src/services/api/client.ts` — auto token refresh on 401
- **Auth**: JWT + refresh via `expo-secure-store`
- **State**: React Context (AuthContext, BookingContext, SocketContext) + local `useState`
- **QR Rendering**: `react-native-qrcode-svg` via `QRCodeDisplay` component

## Web Architecture (TrainAI_Vy)

- **Framework**: React (Vite), JavaScript
- **Routing**: React Router v6
- **Policy Modal**: `BookingPolicyModal` — fetches `booking-policy` slug from backend, requires scroll-to-bottom before enabling "I Agree"
- **QR**: `qrcode.react` `QRCodeSVG`

## Backend Architecture (TrainAI_Vy)

- **Framework**: Node.js + Express.js
- **New services**: `bookingQrService.js`, `membershipQrService.js`, `paidBookingPolicyService.js`
- **Policy enforcement**: `requirePolicyAcceptance({ action })` middleware → HTTP 428
- **QR format (Booking)**: `VALO_BOOKING:<version>:<bookingId>:<HMAC-SHA256-base64url>`
- **QR format (Membership)**: `VALO_MEMBERSHIP:<version>:<subscriptionId>:<HMAC-SHA256-base64url>` OR `VALO_MEMBERSHIP_ACCOUNT:<version>:<userId>:<sig>`
- **QR availability**: Booking — statuses `PAID`, `ACTIVE`, `PAUSED`; Membership — `active` + `paymentStatus === 'paid'` + not expired

## Booking Architecture

**Key backend routes** (TrainAI_Vy `bookingRoutes.js`):
```
POST /api/bookings           — requirePolicyAcceptance({ action: 'booking:create' })
POST /api/bookings/bulk      — requirePolicyAcceptance({ action: 'booking:create' })
GET  /api/bookings/:id/qr   — returns { available, bookingStatus, payload, reason }
POST /api/bookings/hold
DELETE /api/bookings/holds/:holdId
POST /api/bookings/bulk/quote
GET  /api/bookings/my
```

**Mobile booking flow** (current `CreateBookingScreen.tsx`):
1. Select time, vehicle, slot, services
2. Quote → wallet check → hold → `createBulkBooking`
3. On HTTP 428 `POLICY_ACCEPTANCE_REQUIRED`: show `BookingActionModal` with navigate-away to Policies tab ← **GAP**
4. On success: `setShowSuccessModal(true)` → navigate to `BookingDetailScreen`

**Web booking flow** (`CreateBookingPage.jsx` + `BookingPolicyModal`):
1. Same pre-flight
2. On HTTP 428: `setShowGlobalPolicyModal(true)` → `BookingPolicyModal` appears
3. User scrolls policy, accepts → `onConfirm()` → booking retried automatically
4. On success: inline success modal with QR (via `booking.qrCode || booking.bookingId`)

## Membership Architecture

**Key backend routes** (TrainAI_Vy `subscriptionRoutes.js`):
```
GET  /api/subscriptions/membership/qr          — getAccountMembershipQr (account-level, NEW)
GET  /api/subscriptions/:subscriptionId/qr     — getMembershipQr (legacy subscription-level)
POST /api/subscriptions/payment                — requirePolicyAcceptance
POST /api/subscriptions/pay-with-wallet        — requirePolicyAcceptance
```

**Mobile** (`MembershipScreen.tsx` in TrainAI_Vy):
- Calls `subscriptionsService.getMembershipQr()` → `GET /api/subscriptions/membership/qr`
- Shows QR in "Membership QR" section using `QRCodeDisplay`
- `qrPayload` state stores the signed payload string

## QR Architecture

### Booking QR

| Attribute | Value |
|---|---|
| Backend service | `backend/src/services/bookingQrService.js` |
| Format | `VALO_BOOKING:1:<bookingId>:<HMAC-SHA256-base64url>` |
| API | `GET /api/bookings/:id/qr` |
| Response | `{ available, bookingStatus, payload, reason }` |
| Available when | `booking.status` ∈ `{ PAID, ACTIVE, PAUSED }` |
| Static/Dynamic | Static per booking (payload doesn't change unless `qrVersion` bumped) |
| Expiry | No time-based expiry — tied to booking status |
| Validated by | Kiosk/staff via `parseAndVerifyBookingQr(payload)` |

### Membership QR

| Attribute | Value |
|---|---|
| Backend service | `backend/src/services/membershipQrService.js` |
| Format (account) | `VALO_MEMBERSHIP_ACCOUNT:1:<userId>:<HMAC-SHA256-base64url>` |
| Format (legacy) | `VALO_MEMBERSHIP:1:<subscriptionId>:<HMAC-SHA256-base64url>` |
| API | `GET /api/subscriptions/membership/qr` |
| Response | `{ available, credentialType, membershipStatus, expireAt, payload, reason }` |
| Available when | Active entitlement or active subscription (not expired) |
| Static/Dynamic | Static (tied to userId/subscriptionId + qrVersion) |
| Expiry | No time-based expiry — tied to membership status |

## Policy Architecture

- **Policies are backend-managed** (admin configures title, slug, content, version)
- `requiresAcceptance: true` policies block actions until accepted
- Booking creation requires accepting `booking-policy` slug (via HTTP 428)
- Mobile `policiesService` fetches from backend — no hard-coded content found
- `BookingPolicyModal` (Web) fetches `booking-policy` by slug, shows summary + full content
- Mobile policy screens (`PoliciesListScreen`, `PolicyDetailScreen`) already use backend API ✅

---

# 3. Current Web vs Mobile Gap Analysis

| Feature | Web (TrainAI_Vy) Behavior | Mobile (TrainAI_Vy) Behavior | Gap | Required Change |
|---|---|---|---|---|
| **Booking Policy Modal** | `BookingPolicyModal` appears inline when booking returns HTTP 428. Fetches `booking-policy` slug. Requires scroll-to-bottom. On accept: calls `acceptPolicy(policyId)`, then calls `onConfirm()` which retries booking. | `isPolicyAcceptanceRequired` detected → `BookingActionModal` feedback + button navigating to Profile/Policies tab. No inline accept. No auto-retry. | Mobile does not show inline policy modal, cannot accept and retry in one flow. | Create `BookingPolicyModal` component for Mobile. On HTTP 428, show modal. On accept, retry `handleSubmit`. |
| **Booking Success QR** | Inline success modal shows `QRCodeSVG` with `booking.qrCode \|\| booking.bookingId`. No separate screen. | `setShowSuccessModal(true)` → simple success modal → navigates to `BookingDetailScreen` which calls `getBookingQr()`. `BookingDetailScreen` already shows QR correctly for `confirmed`/`active`/`paused`. | Mobile has QR in `BookingDetailScreen` ✅ but success modal on `CreateBookingScreen` doesn't show QR before navigating. Minor UX gap. | Add QR to `CreateBookingScreen` success modal OR keep current flow (navigate to detail). Detail screen QR is correct. |
| **Membership QR** | Web `Membership.jsx` does not display QR. Kiosk uses license plate scan. | `MembershipScreen` calls `GET /api/subscriptions/membership/qr`, renders `QRCodeDisplay` with signed payload. ✅ Already implemented in TrainAI_Vy. | **No gap** — Mobile is ahead of Web on this feature. | Verify correctness. No new work needed. |
| **`extractMissingPolicies`** | `policyErrors.js` exports both `isPolicyAcceptanceRequired` and `extractMissingPolicies`. | `policyErrors.ts` only exports `isPolicyAcceptanceRequired`. | Cannot extract missing policy list for modal display. | Add `extractMissingPolicies` to `mobile/src/utils/policyErrors.ts`. |
| **Booking Policy (Subscription)** | `PolicyAcceptancePrompt` shown inline when subscription API returns HTTP 428. | `SubscriptionCheckoutScreen` sets `policyRequired` flag + navigate-away button. No inline accept + retry. | Same pattern as booking policy gap. | Reuse `BookingPolicyModal` in `SubscriptionCheckoutScreen`. |
| **Booking Policy Source** | Fetches `booking-policy` slug from `GET /api/policies/booking-policy`. Admin-configurable. | No inline policy fetch during booking. | Policy content not shown to user before booking. | Mobile `BookingPolicyModal` must call `GET /api/policies/booking-policy` (or equivalent). |
| **Policy hard-coding** | No hard-coded content — all from backend. | No hard-coded content found — all from backend ✅. | No gap. | No change needed. |
| **BookingBrowseScreen (legacy)** | N/A | Exists alongside `CreateBookingScreen` — uses old API, no hold, no policy. | Legacy screen accessible in some nav paths. | Remove from navigation or redirect to `CreateBookingScreen`. |

---

# 4. Task 1 — Mobile / Web Logic Synchronization

## 4.1 Add `extractMissingPolicies` to `mobile/src/utils/policyErrors.ts`

**Current state**: Only `isPolicyAcceptanceRequired` is exported.

**Required addition**:
```typescript
export interface MissingPolicy {
  policyId: string;
  policyVersionId?: string;
  slug: string;
  title: string;
  versionNumber: number | string;
  summary?: string;
}

export const extractMissingPolicies = (error: unknown): MissingPolicy[] => {
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

Note: Mobile `apiClient` transforms errors so the response body is at `error.data`. The above handles both shapes.

## 4.2 Replace Policy Navigate-Away with Inline Modal in `CreateBookingScreen`

**Current behavior** (TrainAI_Vy `CreateBookingScreen.tsx`):
```typescript
if (isPolicyAcceptanceRequired(submitError)) {
  setFeedback({
    variant: 'warning',
    title: 'Policy acceptance required',
    message: 'Please read and accept the latest policy before booking.',
    primaryLabel: 'View policy',
    onPrimary: () => navigation.getParent()?.navigate('ProfileTab', { screen: 'Policies' }),
  });
  return;
}
```

**Required behavior**:
1. On HTTP 428 → show `BookingPolicyModal` (new component)
2. User reads `booking-policy` content, scrolls to bottom, taps "I Agree & Continue"
3. Modal calls `acceptPolicy(policyId)` then `onConfirm()`
4. `onConfirm` calls `handleSubmit()` again (retry)
5. On success → navigate to `BookingDetailScreen`

**State changes needed**:
```typescript
const [showPolicyModal, setShowPolicyModal] = useState(false);
```

## 4.3 Replace Policy Navigate-Away in `SubscriptionCheckoutScreen`

**Current behavior**: Sets `policyRequired = true` → shows button to navigate to Policies screen.

**Required behavior**: Same `BookingPolicyModal` (or similar) appears inline → user accepts → `handlePurchase()` retried.

## 4.4 Booking QR in Success Modal (Optional Enhancement)

`CreateBookingScreen` already sets `createdBookingId` and navigates to `BookingDetailScreen` which fetches and shows QR.

The current flow is:
```
Booking success → setShowSuccessModal(true) → user taps "View Booking" → BookingDetailScreen → QR loaded
```

This is acceptable. The QR is one tap away. **No mandatory change** — but the spec notes that Web shows QR inline in success modal. If team wants parity, the success modal on `CreateBookingScreen` should call `bookingService.getBookingQr(createdBookingId)` and render `QRCodeDisplay` inline.

## 4.5 Remove/Deprecate `BookingBrowseScreen`

`BookingBrowseScreen.tsx` uses old direct `createBooking()` without hold flow and without policy check. Remove from `BookingStackNavigator` navigation to prevent users hitting outdated flow.

---

# 5. Task 2 — Membership QR

## User Story

> As a VIP customer with an active membership, I want to see my membership QR code on the Membership screen, so that Kiosk staff can scan it to grant me fast-pass entry if license plate recognition fails.

## Business Rules

1. QR is available only when membership is active and not expired.
2. QR payload is HMAC-signed: `VALO_MEMBERSHIP_ACCOUNT:1:<userId>:<sig>` (account-level, preferred) OR `VALO_MEMBERSHIP:1:<subscriptionId>:<sig>` (legacy).
3. The backend returns `available: false` with a `reason` if QR is not available.
4. QR is static (tied to userId + membership `qrVersion`). No time expiry.
5. Kiosk verifies via `parseAndVerifyAnyMembershipQr(payload)`.

## Current Status

**Mobile `MembershipScreen.tsx` in TrainAI_Vy ALREADY implements this**:
- Calls `subscriptionsService.getMembershipQr()` → `GET /api/subscriptions/membership/qr`
- Sets `qrPayload` state
- Renders `<QRCodeDisplay value={qrPayload} />` in "Membership QR" section
- Handles `qrError` state

## Data Flow

```
MembershipScreen mounts (or membership status changes to active)
  → subscriptionsService.getMembershipQr()
  → GET /api/subscriptions/membership/qr
  → Backend: checks MembershipSlotEntitlement (active, not expired)
      → if found: payload = VALO_MEMBERSHIP_ACCOUNT:1:<userId>:<sig>
      → else: checks legacy Subscription
          → if active+paid+not expired: payload = VALO_MEMBERSHIP:1:<subscriptionId>:<sig>
          → else: available = false, payload = null
  → Mobile: setQrPayload(response.data.payload)
  → QRCodeDisplay renders signed payload string
```

## API

**Endpoint**: `GET /api/subscriptions/membership/qr`
**Auth**: Required (customer JWT)
**Response**:
```json
{
  "success": true,
  "data": {
    "available": true,
    "credentialType": "ACCOUNT",
    "membershipStatus": "active",
    "expireAt": "2025-12-31T00:00:00.000Z",
    "payload": "VALO_MEMBERSHIP_ACCOUNT:1:6abc123...:sig...",
    "reason": null
  }
}
```

## Mobile UI States

| State | Condition | Display |
|---|---|---|
| Loading | `qrLoading === true` | `ActivityIndicator` |
| QR Available | `qrPayload !== null` | `QRCodeDisplay` with payload value + hint text |
| QR Unavailable | `available === false` | Error text with reason |
| Network Error | API call throws | `qrError` text displayed |
| No Membership | `membership.status !== 'active'` | QR section hidden or "Inactive" state |

## Error Cases

| Case | Expected Behavior |
|---|---|
| Membership expired | `available: false` → show "Membership QR is unavailable" |
| No active subscription | `available: false` → show error text |
| Network failure | `qrError` set → error text shown |
| `payload` null despite `available: true` | Show "Membership QR is unavailable" (fallback) |

## Acceptance Criteria

1. Given active membership, when `MembershipScreen` loads, then `getMembershipQr()` is called
2. Given successful API response with `payload`, when rendered, then QR code is displayed with the signed payload value
3. Given `available: false`, when rendered, then QR section shows error/unavailable message
4. Given network error, when API fails, then `qrError` is displayed
5. Given QR value is `VALO_MEMBERSHIP_ACCOUNT:...`, when rendered, then `QRCodeDisplay` encodes full string including prefix and signature

**Verification**: `MembershipScreen.tsx` in TrainAI_Vy already passes criteria 1–5. This task is **verify and confirm**, not implement.

---

# 6. Task 3 — Booking Success QR

## User Story

> As a customer who has just created a parking booking, I want to see my booking QR code immediately after confirmation, so that I can present it at the Kiosk entrance without navigating to a separate screen.

## Current Status in TrainAI_Vy

**Mobile `BookingDetailScreen.tsx` ALREADY implements Booking QR**:
- On mount: if `booking.status` ∈ `['confirmed', 'active', 'paused']` → calls `bookingService.getBookingQr(booking._id)`
- Response: `{ available, bookingStatus, payload, reason }`
- Renders `<QRCodeDisplay value={qrPayload} />` in "Booking QR" section

**Mobile `CreateBookingScreen.tsx` success flow**:
- On success: `setShowSuccessModal(true)` with `createdBookingId`
- Success modal prompts user → navigate to `BookingDetailScreen` with `bookingId`
- `BookingDetailScreen` then loads QR

**Gap**: QR is one navigation tap away. Web shows QR inline in success modal without extra navigation.

## Booking QR Flow

```
POST /api/bookings/bulk → success → booking._id returned
  → setCreatedBookingId(bookingId)
  → setShowSuccessModal(true)
    → [Web]: QRCodeSVG shown inline in modal using booking.qrCode || booking.bookingId
    → [Mobile]: Modal shown → user taps "View Booking" → BookingDetailScreen
        → GET /api/bookings/:id/qr
        → payload = "VALO_BOOKING:1:<bookingId>:<sig>"
        → QRCodeDisplay renders QR
```

## QR Source

**API**: `GET /api/bookings/:id/qr`
**Response**:
```json
{
  "success": true,
  "data": {
    "available": true,
    "bookingStatus": "PAID",
    "payload": "VALO_BOOKING:1:6abc123...:sig...",
    "reason": null
  }
}
```

**Available when**: `booking.status` ∈ `{ PAID, ACTIVE, PAUSED }`

**Not available when**: `COMPLETED`, `CANCELLED`, `EXPIRED` → `available: false`, `payload: null`

## QR Validation

The Kiosk/Staff calls `parseAndVerifyBookingQr(payload)` which:
1. Splits by `:` → expects `[VALO_BOOKING, version, bookingId, signature]`
2. Validates signature with HMAC-SHA256
3. Verifies `bookingId` is a valid MongoDB ObjectId

The QR is **static** — no time expiry. Validity tied to booking status.

## Required Change: Inline QR in Success Modal

The `CreateBookingScreen` success modal should call `getBookingQr` and display QR inline before navigating to detail:

**Option A (recommended)**: Add QR to success modal on `CreateBookingScreen`:
```
On booking success:
  → setCreatedBookingId(bookingId)
  → Call GET /api/bookings/:bookingId/qr
  → Store qrPayload in state
  → Show success modal with:
      - "Booking Confirmed ✓" title
      - QRCodeDisplay (if qrPayload available)
      - Booking summary (slot, floor, time, amount)
      - "View Full Details" button → navigate to BookingDetailScreen
```

**Option B (no change)**: Keep current flow — user taps button to go to `BookingDetailScreen`, QR loaded there. This is acceptable since `BookingDetailScreen` already shows QR correctly.

**Team should decide**. This spec documents both options.

## UI States for Success Modal (Option A)

| State | Display |
|---|---|
| QR loading | Small spinner in QR area |
| QR available | `QRCodeDisplay` with payload, hint: "Show at Kiosk entrance" |
| QR not available | No QR shown, only booking summary |
| Booking failed | Error message, no success modal |

## `BookingDetailScreen` QR States (already implemented)

| Booking Status | QR Shown? |
|---|---|
| `confirmed` / `PAID` | ✅ Yes — "Show at Kiosk entrance" |
| `active` / `ACTIVE` | ✅ Yes — "Show for check-out" |
| `paused` / `PAUSED` | ✅ Yes |
| `completed` | ❌ No — `available: false` |
| `cancelled` | ❌ No |
| `expired` | ❌ No |

## Acceptance Criteria

1. Given booking created successfully, when `BookingDetailScreen` opens, then `getBookingQr()` is called
2. Given `available: true`, when QR section renders, then `QRCodeDisplay` shows the signed `VALO_BOOKING:...` payload
3. Given booking status `completed`/`cancelled`/`expired`, when `BookingDetailScreen` renders, then no QR is shown and `qrError` text is visible
4. Given `getBookingQr()` network failure, when error occurs, then `qrError` message is displayed in QR section
5. Given success modal on `CreateBookingScreen` (Option A), when QR fetch completes, then QR is visible in the modal

**Note**: Criteria 1–4 are already passing in `BookingDetailScreen.tsx` on TrainAI_Vy. Criterion 5 is the only remaining work if Option A is chosen.

---

# 7. Task 4 — Booking Policy Modal

## User Story

> As a customer creating a parking booking, when I have not yet accepted the required `booking-policy`, I want to see the policy content inside a modal, scroll through it, and explicitly accept it before my booking is created — just as the Web app requires.

## Flow

```
CreateBookingScreen
  ↓ User taps "Confirm Booking"
  ↓ handleSubmit() → POST /api/bookings/bulk
  ↓ HTTP 428 { code: POLICY_ACCEPTANCE_REQUIRED, data.missingPolicies: [...] }
  ↓ isPolicyAcceptanceRequired(error) === true
  ↓ setShowPolicyModal(true)

BookingPolicyModal opens:
  ↓ useEffect: GET /api/policies/booking-policy
  ↓ Show: TL;DR summary + full policy content
  ↓ User scrolls to bottom → "I Agree & Continue" button enabled
  ↓ User taps "I Agree & Continue"
  ↓ acceptPolicy(policyId) called (POST /api/policies/:id/accept { source: 'mobile' })
  ↓ onConfirm() → setShowPolicyModal(false)
  ↓ handleSubmit() called again (retry)
  ↓ POST /api/bookings/bulk → HTTP 200 (policy now accepted)
  ↓ Navigate to BookingDetailScreen

User taps "Cancel":
  ↓ Modal closes
  ↓ Booking NOT created
  ↓ User remains on booking form
```

## Policy Source

- Slug: `booking-policy`
- API: `GET /api/policies/booking-policy`
- Response shape (via `getPolicyBySlug`):
```json
{
  "data": {
    "policy": { "_id": "...", "title": "Booking Policy", "slug": "booking-policy", "category": "parking_rules" },
    "currentVersion": { "versionNumber": 1, "summary": "...", "content": "...", "changeNote": "..." }
  }
}
```
- Admin-configurable — content can be updated by admin at any time
- `requiresAcceptance: true` on this policy

## Component: `BookingPolicyModal`

**File**: `mobile/src/components/booking/BookingPolicyModal.tsx`

**Props**:
```typescript
interface BookingPolicyModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
}
```

**Internal states**:
```typescript
loading: boolean          // fetching policy from API
error: string | null      // API error
policyData: PolicyDetail | null
hasScrolledToBottom: boolean  // enables Accept button
submitting: boolean       // while acceptPolicy() is in flight
```

## Modal Behavior

| State | UI |
|---|---|
| Loading | Spinner centered in modal body |
| Error | Red error card with retry option |
| Content loaded | TL;DR summary card + full content in scrollable area |
| Not scrolled to bottom | "I Agree" button grayed out + "Scroll to bottom to accept" label |
| Scrolled to bottom | "I Agree & Continue" button enabled (gold) |
| Submitting | Loading spinner on button, button disabled |
| Cancel | Red/neutral "Cancel" button always enabled |

**Scroll detection**: Use `ScrollView` `onScroll` + `onContentSizeChange` to detect if user reached bottom. Threshold: `scrollY + layoutHeight >= contentHeight - 20`.

If policy content is short enough to not require scrolling, `hasScrolledToBottom` should be set to `true` on load (check `scrollHeight <= clientHeight + 10` equivalent in RN).

## Accept / Decline Behavior

| Action | Result |
|---|---|
| Accept (scroll + tap "I Agree") | `acceptPolicy(policyId)` called → `onConfirm()` → retry booking |
| Cancel / dismiss | `onClose()` → modal closes, booking NOT created |
| `acceptPolicy` fails | Show error in modal, allow retry |
| Policy API unavailable | Show error in modal body, Cancel still available |

## API Interaction

1. `GET /api/policies/booking-policy` — fetch policy content (on modal open)
2. `POST /api/policies/:policyId/accept` with `{ source: 'mobile' }` — record acceptance
3. Mobile: use `policiesService.getPolicyBySlug('booking-policy')` and `policiesService.acceptPolicy(policyId)`

## Acceptance Criteria

1. Given booking returns HTTP 428, when `POLICY_ACCEPTANCE_REQUIRED` code detected, then `BookingPolicyModal` opens
2. Given modal opens, when `GET /api/policies/booking-policy` succeeds, then policy title, summary, and content are displayed
3. Given modal opens, when policy API fails, then error message shown, user can cancel
4. Given policy content displayed, when user has NOT scrolled to bottom, then "I Agree" button is disabled
5. Given user scrolls to bottom, when threshold reached, then "I Agree" button becomes enabled
6. Given user taps "I Agree", when `acceptPolicy()` succeeds, then `onConfirm()` called, modal closes, booking retried
7. Given booking retried after acceptance, when it succeeds, then user navigates to `BookingDetailScreen`
8. Given user taps "Cancel", when tapped, then modal closes, booking NOT created, form remains intact
9. Given `acceptPolicy()` fails, when error returned, then error shown in modal, user can retry or cancel
10. Given subsequent booking in same session, when policy already accepted, then no modal (backend allows through)

---

# 8. Task 5 — Policy Synchronization

## Current Mobile Policy State (TrainAI_Vy)

| Area | Status | Details |
|---|---|---|
| `PoliciesListScreen` | ✅ Uses backend API | `policiesService.listPublishedPolicies()` |
| `PolicyDetailScreen` | ✅ Uses backend API | `policiesService.getPolicyBySlug(slug)` |
| `policiesService.acceptPolicy` | ✅ Sends `source: 'mobile'` | Correct |
| `policyErrors.ts` — `isPolicyAcceptanceRequired` | ✅ Works | Correctly detects HTTP 428 |
| `policyErrors.ts` — `extractMissingPolicies` | ❌ Missing | Needed for modal display |
| Booking policy modal | ❌ Not implemented | Navigate-away only |
| Subscription policy modal | ❌ Partial | Navigate-away only |
| Hard-coded policy content | ✅ None found | All from backend |

## Policy Screens on Mobile

| Screen | Policy Required? | Current | Fix |
|---|---|---|---|
| `CreateBookingScreen` | Yes — `booking-policy` on booking | Navigate away on 428 | Implement `BookingPolicyModal` |
| `SubscriptionCheckoutScreen` | Yes — subscription policies on purchase | `policyRequired` flag + navigate away | Reuse `BookingPolicyModal` or generic modal |
| `PoliciesListScreen` | Display only | Backend API ✅ | No change |
| `PolicyDetailScreen` | Display + accept | Backend API + `acceptPolicy` ✅ | No change |
| `MembershipScreen` | Indirect (renewal flow) | Policy check in renewal | Verify renewal flow uses modal |

## Required Synchronization

1. **Add `extractMissingPolicies`** to `mobile/src/utils/policyErrors.ts`
2. **Create `BookingPolicyModal`** component (`mobile/src/components/booking/BookingPolicyModal.tsx`)
3. **Update `CreateBookingScreen`** — replace navigate-away with `BookingPolicyModal` + retry
4. **Update `SubscriptionCheckoutScreen`** — replace navigate-away with `BookingPolicyModal` + retry

No policy content is hard-coded. No policy text needs updating. Only the UX flow for accepting policies needs to be brought in line with Web.

---

# 9. Backend / API Impact

## Existing APIs to Reuse (No Backend Changes Needed)

| API | Used by |
|---|---|
| `POST /api/bookings/bulk` | `CreateBookingScreen` (already) |
| `GET /api/bookings/:id/qr` | `BookingDetailScreen` (already) ✅ |
| `GET /api/subscriptions/membership/qr` | `MembershipScreen` (already) ✅ |
| `GET /api/policies/:slug` | `BookingPolicyModal` (new usage) |
| `POST /api/policies/:id/accept` | `BookingPolicyModal` (new usage) |
| `GET /api/policies/acceptance-status` | `policiesService` (already) |
| `POST /api/subscriptions/pay-with-wallet` | `SubscriptionCheckoutScreen` (already) |
| `POST /api/subscriptions/payment` | `SubscriptionCheckoutScreen` (already) |

## No Backend Changes Required

All required APIs are already implemented in the `TrainAI_Vy` branch. The Mobile work is purely frontend.

## API Response Fields Mobile Needs

### `GET /api/bookings/:id/qr`
```typescript
interface BookingQrData {
  available: boolean;
  bookingStatus: string;
  payload: string | null;    // "VALO_BOOKING:1:<id>:<sig>" or null
  reason: string | null;     // "BOOKING_QR_INACTIVE" or null
}
```

### `GET /api/subscriptions/membership/qr`
```typescript
{
  available: boolean;
  credentialType: 'ACCOUNT' | 'LEGACY_SUBSCRIPTION';
  membershipStatus: string;
  expireAt: string;
  payload: string | null;    // "VALO_MEMBERSHIP_ACCOUNT:1:<userId>:<sig>" or null
  reason: string | null;
}
```

### `GET /api/policies/booking-policy`
```typescript
{
  policy: { _id: string; title: string; slug: string; category: string };
  currentVersion: {
    versionNumber: number;
    summary: string;
    content: string;
    changeNote: string;
    title: string;
  }
}
```

### HTTP 428 body
```typescript
{
  code: 'POLICY_ACCEPTANCE_REQUIRED';
  data: {
    missingPolicies: Array<{
      policyId: string;
      slug: string;
      title: string;
      versionNumber: number;
      policyVersionId: string;
    }>;
  };
}
```

---

# 10. Mobile Files Likely Affected

| File | Current Responsibility | Required Change |
|---|---|---|
| `mobile/src/utils/policyErrors.ts` | `isPolicyAcceptanceRequired` detection only | Add `extractMissingPolicies` + `MissingPolicy` type |
| `mobile/src/components/booking/BookingPolicyModal.tsx` | **Does not exist** | Create new component — fetch `booking-policy`, scroll detection, accept flow |
| `mobile/src/screens/booking/CreateBookingScreen.tsx` | Full booking creation; on 428 → navigate away | Replace 428 handler with `BookingPolicyModal` + retry logic |
| `mobile/src/screens/wallet/SubscriptionCheckoutScreen.tsx` | Subscription purchase; on 428 → `policyRequired` flag | Replace with `BookingPolicyModal` + retry `handlePurchase` |
| `mobile/src/screens/booking/BookingDetailScreen.tsx` | Shows booking details + QR section | Already correct in TrainAI_Vy ✅ — verify only |
| `mobile/src/screens/wallet/MembershipScreen.tsx` | Shows membership + QR section | Already correct in TrainAI_Vy ✅ — verify only |
| `mobile/src/services/api/subscriptions.ts` | Subscription API | Already has `getMembershipQr()` ✅ — verify only |
| `mobile/src/services/BookingService.ts` | Booking API | Already has `getBookingQr()` ✅ — verify only |
| `mobile/src/navigation/BookingStackNavigator.tsx` | Booking stack | Remove `BookingBrowse` screen if present |

---

# 11. Web Reference Files

| File | Used as Reference for |
|---|---|
| `frontend/src/components/policies/BookingPolicyModal.jsx` | Mobile `BookingPolicyModal` behavior: fetch by slug, scroll-to-bottom, accept + `onConfirm` |
| `frontend/src/pages/Customer/CreateBookingPage.jsx` | Booking flow with `showGlobalPolicyModal` pattern, `onConfirm` retrying booking |
| `frontend/src/components/policies/PolicyAcceptancePrompt.jsx` | Generic policy acceptance (used for subscription policies) |
| `frontend/src/pages/Customer/Membership.jsx` | Subscription package display (Web does not have QR — Mobile is ahead) |
| `backend/src/services/bookingQrService.js` | QR format, availability rules, HMAC signing |
| `backend/src/services/membershipQrService.js` | Membership QR format, account-level vs legacy |
| `backend/src/routes/bookingRoutes.js` | Confirms `GET /:id/qr` endpoint |
| `backend/src/routes/subscriptionRoutes.js` | Confirms `GET /membership/qr` endpoint |

---

# 12. Data Flow Diagrams

## A. Booking + Policy Modal + QR

```
Customer (Mobile) — CreateBookingScreen
│
├─ Fills form: date, vehicle, slot
└─ Taps "Confirm Booking"
     │
     ├─ POST /api/bookings/bulk
     │    │
     │    ├─ HTTP 200 ──────────────────────────────────────────────────┐
     │    │   booking._id returned                                       │
     │    │                                                              ▼
     │    │                                              setShowSuccessModal(true)
     │    │                                                → "View Booking" button
     │    │                                                → navigate BookingDetailScreen
     │    │                                                    → GET /api/bookings/:id/qr
     │    │                                                    → QRCodeDisplay("VALO_BOOKING:...")
     │    │
     │    └─ HTTP 428 POLICY_ACCEPTANCE_REQUIRED
     │         │
     │         └─ setShowPolicyModal(true)
     │
     └─ BookingPolicyModal visible
          │
          ├─ GET /api/policies/booking-policy
          │    → show TL;DR summary + full content
          │
          ├─ User scrolls to bottom → "I Agree" enabled
          │
          ├─ User taps "I Agree & Continue"
          │    ├─ POST /api/policies/:id/accept { source: 'mobile' }
          │    └─ onConfirm() → setShowPolicyModal(false)
          │         └─ handleSubmit() retried
          │              └─ POST /api/bookings/bulk → HTTP 200
          │                   └─ navigate BookingDetailScreen → QR shown
          │
          └─ User taps "Cancel"
               └─ modal closes, form unchanged, no booking created
```

## B. Membership QR

```
Customer (Mobile) — MembershipScreen
│
├─ Loads membership: GET /api/users/membership
│    → sets membership state
│
└─ [if membership.status === 'active']
     │
     └─ Loads QR: GET /api/subscriptions/membership/qr
          │
          ├─ available: true
          │    └─ payload = "VALO_MEMBERSHIP_ACCOUNT:1:<userId>:<sig>"
          │         └─ QRCodeDisplay renders signed payload
          │
          └─ available: false
               └─ qrError text shown ("Membership QR is unavailable")

Kiosk / Staff:
  → Scans QR
  → Backend: parseAndVerifyAnyMembershipQr(payload)
  → Validates HMAC signature
  → Returns user info + entitlements
  → Grants entry
```

---

# 13. Edge Cases

| Case | Expected Mobile Behavior |
|---|---|
| Booking creation failed (slot taken) | Hold released in catch; `BookingActionModal` error; user can retry |
| HTTP 428 returned on booking retry (after accepting) | Should not happen; if it does, show error message |
| QR data `payload` is null for active booking | `qrError` = "This QR code is no longer available" |
| Booking expired (`status: 'expired'`) | `BookingDetailScreen` hides QR section |
| Booking cancelled | `BookingDetailScreen` hides QR section |
| Membership expired | `getMembershipQr` returns `available: false` → qrError shown |
| Membership not purchased | `MembershipScreen` shows empty state, no QR section |
| Policy API unavailable (`booking-policy` not found) | Modal shows error card; Cancel still works |
| User declines policy (taps Cancel in modal) | Modal closes, booking NOT created, form intact |
| Network error during booking | Hold released; error feedback modal |
| Duplicate submit (double-tap) | `submitting` state disables button during first request |
| `acceptPolicy` fails inside modal | Error shown in modal; user can retry or cancel |
| Invalid QR (tampered signature) | Kiosk rejects — mobile app has no role after QR is displayed |
| `extractMissingPolicies` returns empty | Modal shows "No policies required" and calls `onConfirm()` immediately |
| `BookingPolicyModal` opened but policy content too short to scroll | `hasScrolledToBottom` set to `true` on load; Accept button immediately enabled |

---

# 14. Acceptance Criteria

## Task 1 — `extractMissingPolicies`

- **Given** HTTP 428 error with `data.missingPolicies`, **when** `extractMissingPolicies(error)` called, **then** returns array of `MissingPolicy` objects
- **Given** nested `data.data.missingPolicies`, **when** called, **then** also works

## Task 2 — Membership QR

- **Given** active membership, **when** `MembershipScreen` loads, **then** `getMembershipQr()` is called and QR shown ✅ (verify existing implementation)
- **Given** `payload = "VALO_MEMBERSHIP_ACCOUNT:1:<userId>:<sig>"`, **when** rendered, **then** `QRCodeDisplay` encodes full string
- **Given** `available: false`, **when** API responds, **then** qrError message shown
- **Given** network failure, **when** API throws, **then** qrError text displayed

## Task 3 — Booking Success QR

- **Given** booking status `confirmed`/`active`/`paused`, **when** `BookingDetailScreen` loads, **then** `getBookingQr()` called and QR rendered ✅ (verify existing)
- **Given** `payload = "VALO_BOOKING:1:<id>:<sig>"`, **when** QR rendered, **then** full signed string is the QR value
- **Given** status `completed`/`cancelled`/`expired`, **when** rendered, **then** no QR shown, error text visible
- **Given** success modal on `CreateBookingScreen` (if Option A chosen), **when** QR fetch completes, **then** QR visible in modal

## Task 4 — Booking Policy Modal

- **Given** `POST /api/bookings/bulk` returns HTTP 428, **when** detected, **then** `BookingPolicyModal` opens (not navigate-away)
- **Given** modal open, **when** `GET /api/policies/booking-policy` succeeds, **then** policy title, summary, content displayed
- **Given** modal open, **when** policy API fails, **then** error shown, Cancel available
- **Given** content not scrolled to bottom, **when** rendered, **then** "I Agree" button is disabled
- **Given** user scrolls to bottom, **when** threshold reached, **then** "I Agree" button enabled
- **Given** user taps "I Agree", **when** `acceptPolicy()` and retry succeed, **then** navigate to `BookingDetailScreen`
- **Given** user taps "Cancel", **when** tapped, **then** modal closes, no booking created
- **Given** subscription returns HTTP 428, **when** detected, **then** same policy modal flow with retry

## Task 5 — Policy Sync

- **Given** Policies list screen, **when** opened, **then** all content from `GET /api/policies`, no hard-coded text ✅
- **Given** Policy detail screen, **when** opened, **then** content from backend ✅
- **Given** `acceptPolicy` called from mobile, **when** sent, **then** `source: 'mobile'` in request body ✅

---

# 15. Testing Plan

## Unit Tests

**`mobile/src/utils/policyErrors.ts`**:
- `extractMissingPolicies` — various error shapes (nested, flat, empty, null, no data key)
- `isPolicyAcceptanceRequired` — existing tests should still pass

**`mobile/src/components/booking/BookingPolicyModal.tsx`**:
- Renders loading state while fetching
- Renders error state when API fails
- Renders policy content when loaded
- "I Agree" button disabled before scroll-to-bottom
- "I Agree" button enabled after scroll-to-bottom event
- Calls `acceptPolicy` then `onConfirm` when "I Agree" tapped
- Calls `onClose` when "Cancel" tapped
- Does not call `onConfirm` on cancel

## Mobile Integration Tests

- Full booking flow: form → submit → 428 → policy modal → scroll → accept → retry → success → QR in `BookingDetailScreen`
- Cancel policy modal → booking not created, form intact
- Subscription purchase: 428 → policy modal → accept → retry → success
- Membership QR: active membership → QR shown with signed payload
- Booking QR in detail screen: PAID status → QR shown; COMPLETED → QR hidden

## Backend API Tests (manual)

- `POST /api/bookings/bulk` without policy acceptance → verify HTTP 428 with correct `missingPolicies` structure
- `POST /api/policies/:id/accept` with `source: 'mobile'` → verify `PolicyAcceptance` document created
- `GET /api/bookings/:id/qr` with PAID booking → verify `payload` starts with `VALO_BOOKING:`
- `GET /api/bookings/:id/qr` with COMPLETED booking → verify `available: false`
- `GET /api/subscriptions/membership/qr` with active membership → verify `payload` starts with `VALO_MEMBERSHIP_ACCOUNT:`
- `GET /api/subscriptions/membership/qr` with no membership → verify `available: false`

## Manual Test Scenarios

**Android (Expo Go or dev build)**:
1. Create booking without policy accepted → verify `BookingPolicyModal` appears
2. Accept policy in modal → booking created, navigate to `BookingDetailScreen` → QR visible
3. Dismiss policy modal (Cancel) → booking NOT created, form intact
4. Open `MembershipScreen` with active subscription → QR shown
5. View `BookingDetailScreen` for PAID booking → QR shown
6. View `BookingDetailScreen` for COMPLETED booking → QR section hidden

**iOS (same scenarios)**

---

# 16. Out of Scope

- **Bulk Booking / Booking Bulk UI** — explicitly deferred by team
- **Membership transfer** (`MembershipTransfers.jsx`, `createEntitlementTransfer`) — out of scope
- **Membership renewal UI** (`RenewModal.jsx`, `renewWithWallet`) — out of scope for this spec
- **Admin / Staff screens** — no changes
- **Kiosk changes** — no changes
- **Backend changes** — no backend modifications required
- **Web changes** — no Web modifications required

---

# 17. Implementation Order

1. **Add `extractMissingPolicies`** to `mobile/src/utils/policyErrors.ts` (~30 min)
   - No dependencies, pure utility function
   - Add unit tests

2. **Verify existing QR implementations** (~1 hour)
   - Pull/checkout `TrainAI_Vy` locally
   - Verify `BookingDetailScreen` QR section works end-to-end
   - Verify `MembershipScreen` QR section works end-to-end
   - Document any issues found

3. **Create `BookingPolicyModal` component** (~3–4 hours)
   - `mobile/src/components/booking/BookingPolicyModal.tsx`
   - Fetch `booking-policy` slug via `policiesService.getPolicyBySlug`
   - Scroll detection + accept flow
   - Unit tests

4. **Update `CreateBookingScreen`** (~1–2 hours)
   - Add `showPolicyModal` state
   - Replace 428 handler with `BookingPolicyModal`
   - On `onConfirm`: retry `handleSubmit()`
   - Integration test: full booking → policy → accept → success → QR

5. **Update `SubscriptionCheckoutScreen`** (~1 hour)
   - Same `BookingPolicyModal` pattern for subscription purchase 428
   - On `onConfirm`: retry `handlePurchase()`

6. **(Optional) Add QR to `CreateBookingScreen` success modal** (~1–2 hours)
   - If team chooses Option A
   - Call `getBookingQr(createdBookingId)` in success modal
   - Render `QRCodeDisplay` inline

7. **Remove legacy `BookingBrowseScreen` from navigation** (~30 min)
   - Update `BookingStackNavigator`

8. **Full integration testing** (~2 hours)
   - All manual test scenarios on Android
   - Fix any issues
