# Security Specifications - Painel de Provas Dilson Ferreira

This document outlines the security requirements and invariants for the Firestore collections of our Photo Editing Proofing Dashboard. It specifies the "Dirty Dozen" malicious payloads designed to test our rules for Identity Spoofing, State Shortcutting, and Resource/ID Poisoning, verifying they are blocked.

## 1. Core Data Invariants

1. **Relation Verification**: No `Proof` or `Notification` child document can be read or written unless the user is an Admin (`contato@dilsonferreira.com.br`) or has an authenticated, verified email matching the parent `Project`'s `clientEmail` field.
2. **Bootstrapped Admin System**: The user `contato@dilsonferreira.com.br` has absolute superuser access. Non-admin users are strictly forbidden from modifying critical administrative metadata fields (such as `clientEmail`, `driveFolderId`, `deliveryEstimate`, `priceEstimate`, and private `adminNotes`).
3. **Temporal Invariance**: Create and update timestamps (`createdAt` and `updatedAt`) must strictly match the server time `request.time`. They cannot be spoofed by the client.
4. **Identifier Integrity**: Document IDs and path arguments must be strictly checked and verified against injection strings (alphanumeric validation `^[a-zA-Z0-9_\-]+$`, and maximum size boundary of 128 characters) to prevent Denial of Wallet resources exhausts.
5. **Terminal State Transitions**: Once a Project status reaches any terminal step (such as `delivered` or `approved`), the client is forbidden from reverting states or making further proof edits without Admin override.

---

## 2. The "Dirty Dozen" Penetration Plan

These 12 scenarios test the limits of our Firestore rule architecture. They must all result in `PERMISSION_DENIED`:

### Identity Spoofing
1. **Unauthenticated Project Creation**: An anonymous user trying to create a project.
2. **Client Email Hijacking**: An authenticated user attempting to create or read a project belonging to `user-b@example.com` by providing a mismatching email.
3. **Admin Claim Escalation**: A standard client attempting to set their email or profile state to register as an admin or bypass validations.
4. **Spoofed Email Verification**: A user with email `contato@dilsonferreira.com.br` but `email_verified == false` attempting to access admin rights.

### State Shortcutting & Field Poisoning
5. **Self-Approval Bypass**: A client directly setting project status to `delivered` from the client-side SDK without photographer's trigger.
6. **Immutable Field Altering**: A client updating an existing project and changing the `createdAt` or `clientEmail` values.
7. **Phantom Client Modifications**: A user trying to edit the `priceEstimate` or `adminNotes` fields on an existing project.
8. **Invalid Status Injection**: Attempting to write an unsupported status string (e.g., `status: "hack_complete"`) to a project.

### Resource & ID Poisoning (Denial of Wallet)
9. **Junk ID Parameter Injection**: Attempting to insert a project with a malicious 1MB document path index or ID (e.g., `/projects/JUNK_CHARACTERS...`).
10. **Array Overrun Attack**: Trying to bypass limits by writing bulk un-bounded proof items inside an array, rather than utilizing subcollections.
11. **Spoofed Server Timestamps**: Attempting to set `createdAt` directly in client-side ISO format rather than matching the atomic `request.time` server variable.
12. **Blind Query Scraping**: A logged-in user attempting to read the general listing of all projects without specifying their own `clientEmail` index (`resource.data.clientEmail == request.auth.token.email`).

---

## 3. Threat Assessment Report

| Threat Vector | Client Risk | Audited Prevention Mechanism |
|---|---|---|
| **Identity Spoofing** | High | Checked against `request.auth.token.email` and `request.auth.token.email_verified == true`. |
| **State Shortcutting**| Medium| `affectedKeys().hasOnly()` gates used inside updates, restricting client to specific fields (`selectedCount`, `status`, `updatedAt`). |
| **Resource Poisoning**| High | Strict string character audits (`isValidId` helper) and size limits under 128 characters on path fields. |
| **Temporal Injection**| Low | Enforced `incoming().updatedAt == request.time` and `incoming().createdAt == request.time`. |
