# VALO Parking — Mobile / Web Synchronization Implementation Tasks

## 1. Scope

This implementation plan is based on `design.md` and covers the Mobile synchronization work required for:

- Booking policy acceptance
- Booking retry after policy acceptance
- Booking QR verification/display
- Membership QR verification/display
- Subscription policy acceptance
- Policy error parsing
- Legacy booking navigation cleanup
- Regression testing

Out of scope:

- Bulk Booking UI
- Membership transfer
- Membership renewal UI details
- Admin/Staff screens
- Kiosk changes
- Backend QR redesign
- Web changes
- Authentication changes
- Wallet redesign

---

# 2. Phase 1 — Policy Error Utilities

## Task 1.1 — Add `MissingPolicy` type

**File**

```text
mobile/src/utils/policyErrors.ts
```

**Implementation**

Add:

```typescript
export interface MissingPolicy {
  policyId: string;
  policyVersionId?: string;
  slug: string;
  title: string;
  versionNumber: number | string;
  summary?: string;
}
```

**Acceptance Criteria**

- [ ] Type is exported.
- [ ] Existing `isPolicyAcceptanceRequired()` still works.
- [ ] No existing imports break.

---

## Task 1.2 — Add `extractMissingPolicies`

**File**

```text
mobile/src/utils/policyErrors.ts
```

**Implementation**

Add a helper that supports both:

```text
error.data.missingPolicies
```

and:

```text
error.data.data.missingPolicies
```

Expected behavior:

```typescript
extractMissingPolicies(error): MissingPolicy[]
```

Return:

```typescript
[]
```

when no valid policy list exists.

**Acceptance Criteria**

- [ ] Flat error shape works.
- [ ] Nested error shape works.
- [ ] Null/undefined input returns `[]`.
- [ ] Missing `data` returns `[]`.
- [ ] Invalid `missingPolicies` does not crash.

---

## Task 1.3 — Add unit tests for policy error utilities

**Suggested test file**

```text
mobile/src/utils/__tests__/policyErrors.test.ts
```

**Test Cases**

- [ ] Detect HTTP 428 policy acceptance error.
- [ ] Extract flat `missingPolicies`.
- [ ] Extract nested `missingPolicies`.
- [ ] Empty list returns `[]`.
- [ ] Invalid error object returns `[]`.
- [ ] Null input returns `[]`.

---

# 3. Phase 2 — Booking Policy Modal

## Task 2.1 — Create `BookingPolicyModal`

**New file**

```text
mobile/src/components/booking/BookingPolicyModal.tsx
```

**Responsibilities**

- Fetch `booking-policy`.
- Show loading state.
- Show policy summary.
- Show full policy content.
- Detect scroll-to-bottom.
- Enable accept only when allowed.
- Submit policy acceptance.
- Expose cancel and confirm callbacks.

**Required Props**

```typescript
interface BookingPolicyModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}
```

**Required Internal State**

```typescript
loading
error
policyData
hasScrolledToBottom
submitting
```

**Acceptance Criteria**

- [ ] Modal only renders when `visible === true`.
- [ ] Policy is fetched when modal opens.
- [ ] Policy title is displayed.
- [ ] Policy summary is displayed.
- [ ] Full policy content is scrollable.
- [ ] Accept button is disabled before scroll-to-bottom.
- [ ] Accept button becomes enabled after scroll-to-bottom.
- [ ] Short content auto-enables acceptance.
- [ ] Cancel closes modal.
- [ ] Accept API failure keeps modal open.
- [ ] Accept success calls `onConfirm()`.
- [ ] Loading states disable duplicate actions.

---

## Task 2.2 — Use existing policy service

**Files to inspect**

```text
mobile/src/services/*
mobile/src/services/api/*
```

**Implementation**

Reuse the existing service methods for:

```text
GET /api/policies/:slug
POST /api/policies/:id/accept
```

Expected usage:

```typescript
policiesService.getPolicyBySlug('booking-policy')
policiesService.acceptPolicy(policyId)
```

Request body for acceptance:

```json
{
  "source": "mobile"
}
```

**Acceptance Criteria**

- [ ] No duplicate policy service is created.
- [ ] No hard-coded policy text is added.
- [ ] Acceptance request includes `source: 'mobile'`.

---

## Task 2.3 — Implement scroll detection

**Implementation**

Use React Native `ScrollView`.

Track:

```text
scrollY
layoutHeight
contentHeight
```

Bottom condition:

```typescript
scrollY + layoutHeight >= contentHeight - 20
```

Short content condition:

```typescript
contentHeight <= layoutHeight + threshold
```

**Acceptance Criteria**

- [ ] Long policy requires scrolling.
- [ ] Short policy can be accepted immediately.
- [ ] Accept button state updates correctly.
- [ ] Scroll state resets when modal is reopened.

---

## Task 2.4 — Add modal tests

**Test Cases**

- [ ] Loading state.
- [ ] Successful policy fetch.
- [ ] Policy fetch failure.
- [ ] Accept disabled before scroll.
- [ ] Accept enabled after scroll.
- [ ] Short content auto-enable.
- [ ] Successful acceptance.
- [ ] Acceptance failure.
- [ ] Cancel behavior.
- [ ] Duplicate accept prevented while submitting.

---

# 4. Phase 3 — Booking Flow Integration

## Task 3.1 — Add policy modal state to `CreateBookingScreen`

**File**

```text
mobile/src/screens/booking/CreateBookingScreen.tsx
```

**Implementation**

Add:

```typescript
const [showPolicyModal, setShowPolicyModal] = useState(false);
```

Optional:

```typescript
const [policyRetryAttempted, setPolicyRetryAttempted] = useState(false);
```

**Acceptance Criteria**

- [ ] State is initialized correctly.
- [ ] State resets when booking flow resets.
- [ ] Modal state does not affect normal booking flow.

---

## Task 3.2 — Replace policy navigate-away behavior

**Current behavior**

```text
HTTP 428
→ warning modal
→ navigate to Profile/Policies
```

**New behavior**

```text
HTTP 428
→ setShowPolicyModal(true)
```

**Acceptance Criteria**

- [ ] User is no longer navigated away from booking form.
- [ ] Booking form values remain intact.
- [ ] Policy modal opens inline.
- [ ] Non-policy errors still use existing error handling.

---

## Task 3.3 — Retry booking after policy acceptance

**Implementation**

Add callback:

```typescript
const handlePolicyAccepted = async () => {
  setShowPolicyModal(false);
  await handleSubmit();
};
```

Protect against repeated loops.

Recommended behavior:

```text
Initial booking request
→ HTTP 428
→ Show modal
→ Accept
→ Retry once
```

If retry still returns HTTP 428:

```text
Show error
Do not auto-loop indefinitely
```

**Acceptance Criteria**

- [ ] Booking retries exactly once after successful policy acceptance.
- [ ] Duplicate booking requests are prevented.
- [ ] Existing `submitting` state remains respected.
- [ ] Infinite retry loop cannot occur.
- [ ] Form state is preserved.

---

## Task 3.4 — Render `BookingPolicyModal`

**File**

```text
mobile/src/screens/booking/CreateBookingScreen.tsx
```

**Implementation**

Render the modal near the root of the screen:

```tsx
<BookingPolicyModal
  visible={showPolicyModal}
  onClose={() => setShowPolicyModal(false)}
  onConfirm={handlePolicyAccepted}
/>
```

**Acceptance Criteria**

- [ ] Modal opens on policy-required response.
- [ ] Cancel leaves user on booking screen.
- [ ] Confirm retries booking.
- [ ] Modal closes after successful acceptance.

---

## Task 3.5 — Verify hold behavior during policy acceptance

**Implementation Check**

Inspect how booking hold is created/released.

Validate:

- Hold is not accidentally duplicated.
- Hold is released on booking failure when required.
- Hold expiry during policy reading is handled safely.

**Acceptance Criteria**

- [ ] No orphan hold remains after failed booking.
- [ ] Expired hold does not produce duplicate booking.
- [ ] User gets clear feedback if hold becomes invalid.

---

# 5. Phase 4 — Subscription Policy Integration

## Task 4.1 — Update `SubscriptionCheckoutScreen`

**File**

```text
mobile/src/screens/wallet/SubscriptionCheckoutScreen.tsx
```

**Current behavior**

```text
HTTP 428
→ set policyRequired
→ navigate to Policies screen
```

**New behavior**

```text
HTTP 428
→ show inline policy modal
→ accept policy
→ retry purchase
```

**Acceptance Criteria**

- [ ] User remains in checkout flow.
- [ ] Policy can be accepted inline.
- [ ] Purchase retries after acceptance.
- [ ] Duplicate payment/purchase requests are prevented.
- [ ] Cancel keeps checkout state intact.

---

## Task 4.2 — Generalize policy modal if required

If subscription requires a policy slug different from `booking-policy`, refactor:

```typescript
interface PolicyAcceptanceModalProps {
  visible: boolean;
  policySlug: string;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}
```

**Acceptance Criteria**

- [ ] Correct policy slug is used.
- [ ] Existing booking behavior still works.
- [ ] No duplicate modal implementation is created.

---

# 6. Phase 5 — Booking QR Verification

## Task 5.1 — Verify `getBookingQr()`

**File**

```text
mobile/src/services/BookingService.ts
```

**Expected API**

```http
GET /api/bookings/:id/qr
```

**Expected response**

```typescript
{
  available: boolean;
  bookingStatus: string;
  payload: string | null;
  reason: string | null;
}
```

**Acceptance Criteria**

- [ ] Service calls correct endpoint.
- [ ] Response typing is correct.
- [ ] Errors propagate consistently with `APIClient`.

---

## Task 5.2 — Verify Booking QR in `BookingDetailScreen`

**File**

```text
mobile/src/screens/booking/BookingDetailScreen.tsx
```

**Expected supported statuses**

```text
PAID
ACTIVE
PAUSED
```

or equivalent normalized Mobile status values.

**Acceptance Criteria**

- [ ] QR loads for valid booking status.
- [ ] Full signed payload is passed to `QRCodeDisplay`.
- [ ] QR hidden/unavailable for cancelled booking.
- [ ] QR hidden/unavailable for expired booking.
- [ ] QR hidden/unavailable for completed booking.
- [ ] API loading state is shown.
- [ ] API error state is shown.

---

## Task 5.3 — Optional: Add Booking QR to success modal

**File**

```text
mobile/src/screens/booking/CreateBookingScreen.tsx
```

**Implementation**

After booking success:

```text
createdBookingId
→ GET /api/bookings/:id/qr
→ show QR inside success modal
```

Suggested state:

```typescript
const [successQrPayload, setSuccessQrPayload] = useState<string | null>(null);
const [successQrLoading, setSuccessQrLoading] = useState(false);
const [successQrError, setSuccessQrError] = useState<string | null>(null);
```

**Acceptance Criteria**

- [ ] QR fetch occurs only after successful booking.
- [ ] Loading indicator shown while fetching.
- [ ] QR shown if available.
- [ ] Failure does not invalidate successful booking.
- [ ] User can still open Booking Detail.

**Priority**

```text
Optional / Demo parity improvement
```

---

# 7. Phase 6 — Membership QR Verification

## Task 6.1 — Verify Membership QR service

**File**

```text
mobile/src/services/api/subscriptions.ts
```

**Expected API**

```http
GET /api/subscriptions/membership/qr
```

**Acceptance Criteria**

- [ ] Correct endpoint is used.
- [ ] Full payload is preserved.
- [ ] `available: false` is handled correctly.
- [ ] Error format matches Mobile API client conventions.

---

## Task 6.2 — Verify Membership QR UI

**File**

```text
mobile/src/screens/wallet/MembershipScreen.tsx
```

**Acceptance Criteria**

- [ ] Active membership triggers QR request.
- [ ] Signed payload is passed directly to `QRCodeDisplay`.
- [ ] Expired membership does not show valid QR.
- [ ] Inactive membership does not show valid QR.
- [ ] Missing membership hides QR section or shows empty state.
- [ ] Network error displays QR-specific error message.
- [ ] `payload === null` is handled as unavailable.

---

# 8. Phase 7 — Navigation Cleanup

## Task 7.1 — Inspect `BookingBrowseScreen`

**File**

```text
mobile/src/screens/booking/BookingBrowseScreen.tsx
```

Check whether it:

- Uses outdated booking API.
- Bypasses hold flow.
- Bypasses policy acceptance.
- Is still reachable.

**Acceptance Criteria**

- [ ] Current behavior documented.
- [ ] No user-facing route uses outdated booking logic.

---

## Task 7.2 — Remove/deprecate legacy route

**File**

```text
mobile/src/navigation/BookingStackNavigator.tsx
```

**Implementation Options**

Option A:

```text
Remove BookingBrowse route
```

Option B:

```text
Redirect BookingBrowse route to CreateBookingScreen
```

**Acceptance Criteria**

- [ ] Normal booking navigation always uses synchronized flow.
- [ ] No broken navigation references remain.
- [ ] TypeScript navigation types compile.

---

# 9. Phase 8 — Integration Testing

## Task 8.1 — Booking policy full flow

**Scenario**

```text
Create booking
→ Backend returns HTTP 428
→ Policy modal opens
→ User scrolls
→ Accept
→ Booking retries
→ Booking succeeds
→ Booking Detail opens
→ QR visible
```

**Acceptance Criteria**

- [ ] Entire flow succeeds.
- [ ] User never leaves booking flow to accept policy.
- [ ] No duplicate booking is created.

---

## Task 8.2 — Policy cancel flow

**Scenario**

```text
Create booking
→ HTTP 428
→ Policy modal
→ Cancel
```

**Acceptance Criteria**

- [ ] Modal closes.
- [ ] Booking is not created.
- [ ] Form data remains intact.
- [ ] User can submit again later.

---

## Task 8.3 — Policy API failure

**Scenario**

```text
Open policy modal
→ Policy API unavailable
```

**Acceptance Criteria**

- [ ] Error state appears.
- [ ] Cancel remains available.
- [ ] Retry is available if implemented.
- [ ] Booking is not created.

---

## Task 8.4 — Policy acceptance failure

**Scenario**

```text
Policy loaded
→ User accepts
→ Accept API fails
```

**Acceptance Criteria**

- [ ] Modal remains open.
- [ ] Error shown.
- [ ] User can retry.
- [ ] Booking is not retried until acceptance succeeds.

---

## Task 8.5 — Booking QR states

Test:

- [ ] PAID booking.
- [ ] ACTIVE booking.
- [ ] PAUSED booking.
- [ ] COMPLETED booking.
- [ ] CANCELLED booking.
- [ ] EXPIRED booking.
- [ ] QR API network failure.

---

## Task 8.6 — Membership QR states

Test:

- [ ] Active membership.
- [ ] Expired membership.
- [ ] Inactive membership.
- [ ] No membership.
- [ ] QR API network failure.
- [ ] Null QR payload.

---

## Task 8.7 — Subscription policy flow

**Scenario**

```text
Purchase subscription
→ HTTP 428
→ Policy modal
→ Accept
→ Retry purchase
→ Success
```

**Acceptance Criteria**

- [ ] Purchase retries once.
- [ ] Duplicate payment is prevented.
- [ ] Cancel preserves checkout state.

---

# 10. Phase 9 — Quality Checks

## Task 9.1 — TypeScript validation

Run:

```bash
npx tsc --noEmit
```

or the project-specific TypeScript command.

**Acceptance Criteria**

- [ ] No TypeScript errors introduced.

---

## Task 9.2 — Lint

Run the existing project lint command.

Example:

```bash
npm run lint
```

**Acceptance Criteria**

- [ ] No new lint errors.
- [ ] Existing unrelated warnings are documented separately.

---

## Task 9.3 — Expo startup validation

Run:

```bash
npx expo start
```

**Acceptance Criteria**

- [ ] Metro bundler starts.
- [ ] No import resolution errors.
- [ ] Booking screen renders.
- [ ] Membership screen renders.
- [ ] Policy modal renders.

---

## Task 9.4 — Android manual regression

Test:

- [ ] Booking without policy acceptance.
- [ ] Booking after policy acceptance.
- [ ] Booking QR.
- [ ] Membership QR.
- [ ] Subscription policy flow.
- [ ] Cancel policy modal.
- [ ] Network error states.

---

## Task 9.5 — iOS manual regression

Test same flows as Android in the supported Expo environment.

- [ ] Booking policy.
- [ ] Booking retry.
- [ ] Booking QR.
- [ ] Membership QR.
- [ ] Subscription policy.
- [ ] Modal scroll behavior.

---

# 11. Suggested Implementation Order

## Priority P0

- [ ] Task 1.1 — Add `MissingPolicy`
- [ ] Task 1.2 — Add `extractMissingPolicies`
- [ ] Task 2.1 — Create `BookingPolicyModal`
- [ ] Task 2.2 — Reuse policy service
- [ ] Task 2.3 — Scroll detection
- [ ] Task 3.1 — Add policy modal state
- [ ] Task 3.2 — Replace navigate-away
- [ ] Task 3.3 — Retry booking
- [ ] Task 3.4 — Render modal

## Priority P1

- [ ] Task 4.1 — Subscription inline policy flow
- [ ] Task 5.1 — Verify booking QR service
- [ ] Task 5.2 — Verify Booking Detail QR
- [ ] Task 6.1 — Verify Membership QR service
- [ ] Task 6.2 — Verify Membership QR UI
- [ ] Task 7.1 — Inspect legacy BookingBrowse
- [ ] Task 7.2 — Clean navigation

## Priority P2

- [ ] Task 5.3 — Add QR to Booking success modal
- [ ] Generalize policy modal if multiple policy slugs require it

## Final Validation

- [ ] Full integration tests
- [ ] TypeScript
- [ ] Lint
- [ ] Expo startup
- [ ] Android regression
- [ ] iOS regression

---

# 12. Definition of Done

The implementation is considered complete when all of the following are true:

- [ ] Mobile no longer navigates away to accept Booking Policy.
- [ ] HTTP 428 opens an inline policy modal.
- [ ] Policy content is loaded from Backend.
- [ ] User must satisfy scroll/read condition before accepting.
- [ ] Policy acceptance is persisted through Backend API.
- [ ] Booking automatically retries after acceptance.
- [ ] Duplicate booking submission is prevented.
- [ ] Subscription checkout follows the same inline policy acceptance pattern.
- [ ] Booking QR is correctly loaded from Backend.
- [ ] Membership QR is correctly loaded from Backend.
- [ ] Signed QR payloads are never generated by Mobile.
- [ ] Invalid booking/membership states do not show usable QR codes.
- [ ] Legacy booking navigation no longer exposes outdated booking logic.
- [ ] TypeScript check passes.
- [ ] Lint passes or only pre-existing unrelated warnings remain.
- [ ] Android manual tests pass.
- [ ] iOS manual tests pass.
- [ ] No Backend changes are required unless an actual API defect is discovered during implementation.
