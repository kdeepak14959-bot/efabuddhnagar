<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Principal-created teacher accounts are provisioned through an authenticated server function so passwords and privileged access never enter the browser bundle.
- Principal-only school settings are stored as a single protected record; branding files live in private storage and are readable only by Principals.
- School identity is read from the protected settings record, and saving the Principal name also synchronizes the signed-in Principal profile.
- Attendance submissions use a protected server function that derives the marker from the signed-in account and validates teacher class assignment before saving.
- Attendance reports are loaded through a protected server function that enforces the caller's role; only the Principal interface exposes CSV export.
- Principal attendance summaries are aggregated through a protected server function and use persisted records only.
- Student roll numbers are optional at the data layer for existing records but required by the Principal-facing student form, unique within each assigned class, and used as the primary attendance roster order.
- Student information and fee management use additive profile columns plus fee structures, student fee records, and payment records; all write operations run through Principal-validated server functions to preserve student and attendance relationships.
- Student CSV imports are create-only, Principal-validated server operations; uploaded rows are previewed client-side but re-validated server-side to protect existing records.
- Rejected student CSV rows are exported only in the Principal import workspace, preserving the original columns alongside source-row and validation-error details for correction and re-import.
- Attendance uses a shared status set including Vacation, so registers, reports, exports, and Principal summaries remain consistent.
