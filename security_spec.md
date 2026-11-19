# SetupOps Security Specification (Phase 0)

## 1. Data Invariants
1. **Identity Integrity**: Every document created by a user must record `createdBy` / `authorId` / `userId` equal to `request.auth.uid`, and `request.auth.token.email_verified == true`.
2. **Role Escalation Prevention**: Only the very first user (atomically paired with `/settings/bootstrap` via `existsAfter`/`getAfter`) or a user holding the Firebase custom claim `admin: true` (set out-of-band via the Admin SDK) may receive `role: "Admin"` upon registration; all subsequent users are restricted to `role: "Techniker"`.
3. **Admin-Only Role Changes & Deletions**: Only verified Admins may alter user roles in `/users/{uid}` and `/users_public/{uid}` or delete `/devices/{deviceId}` and `/tickets/{ticketId}`.
4. **PII Isolation**: User email addresses reside exclusively in `/users/{uid}`, readable only by the document owner or an Admin. Technician assignment uses `/users_public/{uid}` with no email field.
5. **Relational Integrity**: Tickets may only be created when the referenced `deviceId` exists in `/devices/{deviceId}`. Ticket comments may only be created when the parent ticket exists.
6. **Temporal Integrity & Immutability**: `createdAt` must equal `request.time` on creation and remain immutable on update; `updatedAt` must equal `request.time` on updates. Audit logs cannot be updated.
7. **Strict Schema & Size Bounds**: Every collection enforces `hasAll`/`hasOnly` keys on creation, `affectedKeys().hasOnly(...)` per action on update, regex path ID checks (`^[a-zA-Z0-9_\-]+$`), and explicit `.size()` bounds on every string and array.

## 2. The "Dirty Dozen" Payloads
1. **Self-Promotion on Sign-Up (Subsequent User)**: Create `/users/user2` with `{ role: "Admin" }` when `/settings/bootstrap` already exists -> `PERMISSION_DENIED`.
2. **Self-Role Update**: Non-admin user updates `/users/user2` changing `role` from `"Techniker"` to `"Admin"` -> `PERMISSION_DENIED`.
3. **PII Snooping**: Non-admin user calls `get` or `list` on `/users/otherUser` -> `PERMISSION_DENIED`.
4. **Shadow/Ghost Field Injection**: Create `/devices/dev1` including extra field `isVerified: true` -> `PERMISSION_DENIED`.
5. **Unverified Email Spoofing**: Request with a forged `role: "Admin"` field but no `admin` custom claim and `email_verified: false` attempts admin write -> `PERMISSION_DENIED`.
6. **Non-Admin Device Deletion**: Techniker attempts `delete` on `/devices/dev1` -> `PERMISSION_DENIED`.
7. **Non-Admin Ticket Deletion**: Techniker attempts `delete` on `/tickets/tck1` -> `PERMISSION_DENIED`.
8. **Orphaned Ticket Creation**: Create `/tickets/tck1` referencing non-existent `deviceId: "missing-dev"` -> `PERMISSION_DENIED`.
9. **Identity Spoofing on Audit Log**: Create `/auditLogs/log1` with `userId: "someone-else"` != `request.auth.uid` -> `PERMISSION_DENIED`.
10. **Immutable `createdAt` Tampering**: Update `/devices/dev1` modifying `createdAt` or `createdBy` -> `PERMISSION_DENIED`.
11. **Terminal State Bypass on Closed Ticket**: Non-admin attempts to modify `titel` or `status` on a `Geschlossen` ticket -> `PERMISSION_DENIED`.
12. **Resource Exhaustion / Oversized Payload**: Create `/devices/dev1` with `notizen` length > 4000 chars or `checklist` length > 30 items or invalid doc ID `../bad` -> `PERMISSION_DENIED`.
