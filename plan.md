# Implementation Plan: Duplicate Email Prevention, Registration OTP & Forgot Password

## Overview
1. **Prevent Duplicate Registrations**:
   - Check local manager database (`getAllLocalManagers`) and cloud registry before creating an account.
   - If an account with the specified email already exists, strictly block re-registration and display: *"This email is already registered. Please switch to Sign In or reset password."*
2. **Registration OTP Verification Flow**:
   - Introduce a multi-step registration workflow: Form -> OTP Verification -> Account Confirmation.
   - Generate secure 6-digit verification OTP with expiration timer.
   - Interactive OTP screen with individual digit inputs, auto-fill, resend cooldown timer, and test copy badge.
   - Only finalize account creation after OTP confirmation.
3. **Forgot Password Workflow**:
   - Add "Forgot Password?" entry point on the Sign In tab.
   - Allow scorers to request password reset via 6-digit verification OTP and Firebase `sendPasswordResetEmail`.
   - Verify OTP and update new password locally and in Firestore cloud profile.
4. **Verification & Deployment**:
   - Run unit and UI tests in Vitest.
   - Run oxlint.
   - Production Vite build and deploy to Firebase Hosting.

---

## Chunks

- [x] **Chunk 1: Implement Duplicate Check, Registration OTP & Forgot Password in `AuthModal.jsx`**
  - Add `authStep`: `'form' | 'otp' | 'forgot_password' | 'forgot_otp'`.
  - Add pre-registration duplicate email validation against local/cloud storage.
  - Implement 6-digit OTP generation, verification screen, and resend mechanism.
  - Implement "Forgot Password?" view with OTP verification and new password entry.
  - Add unit tests for duplicate prevention, OTP verification, and forgot password in `src/tests/auth_modal_flows.test.jsx`.

- [x] **Chunk 2: Test Suite Verification & Code Quality**
  - Run full Vitest suite (164 tests) and new auth tests.
  - Run `oxlint` (0 errors).

- [x] **Chunk 3: Production Build & Web Deployment**
  - Run `npm run build` (`vite build`).
  - Deploy to Firebase Hosting (`https://smartcricket-c79b5.web.app` and `https://smartcricket-website.web.app`).
  - Build Android APK `SmartCricket-v1.3.apk` via Gradle.
