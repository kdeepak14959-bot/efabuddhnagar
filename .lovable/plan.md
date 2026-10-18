# Smart Attendance

## What will be added

1. Replace the current attendance summary page for Principals and Teachers with a practical attendance register.
2. Let users choose a class and date, then see every student in that class with Present, Late, and Absent controls.
3. Save one attendance record per student per date, updating an existing record when attendance is corrected.
4. Keep the attendance summary available on the dashboard overview and keep Parents in view-only mode.

## Access rules

- Principals can select any class and record attendance for all students.
- Teachers can only see their assigned classes and can only record attendance for students in those classes.
- The saved record will identify the signed-in staff member who marked it; this value will not be accepted from the screen.

## Technical details

- Reuse the existing `attendance_records` table and its one-record-per-student-per-day rule; no duplicate or mock attendance data.
- Add a protected server action that validates each attendance submission against the authenticated user’s role and class assignment before writing records.
- Extend the dashboard attendance area with class/date selection, status controls, save feedback, and the existing live attendance data refresh.
