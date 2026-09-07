# Three-role development test accounts

## Goal
Provision working development accounts for the school’s Principal, Teacher, and Parent roles, without exposing any privileged backend credential in the browser.

## Implementation
1. Add a server-only provisioning path that uses the backend’s privileged Auth capability only on the server to create or reconcile these three confirmed email/password accounts:
   - `principal@school.com` → Principal (`admin` role)
   - `teacher@school.com` → Teacher (`teacher` role)
   - `parent@school.com` → Parent (`parent` role)
2. Create or reconcile a linked profile for every account, and assign each role in the existing dedicated role-record system. Roles will remain separate from profiles for secure access control; each profile will be linked to its account and corresponding role record.
3. Generate a strong development-only initial password, keep it out of browser code and stored data, and share the login credential only in the completion message so the accounts can be tested.
4. Ensure the teacher has an assigned class and the parent has a linked child, adding minimal test records only when the current database does not already provide them. This makes the teacher and parent dashboards meaningful during testing.
5. Keep login redirection tied to the authenticated user’s database role, rather than a URL value. Preserve the current role mismatch redirect so a parent cannot switch to teacher/principal views and a teacher cannot switch to principal views.
6. Verify each account through the live sign-in flow and record the observed dashboard role. Test direct attempts to request higher-role dashboard views as both parent and teacher, and confirm the principal dashboard exposes its management navigation.

## Technical details
- Authentication accounts are created through a server-only privileged operation; no service credential is bundled or returned to the frontend.
- `profiles` stores the person record; `user_roles` remains the authoritative role source, as required for safe role-based permissions.
- Existing row-level access rules continue to govern school records after sign-in.

## Deliverable
- Three usable development logins with linked profiles and role assignments.
- Verified role-specific dashboard access and blocked privilege escalation paths.