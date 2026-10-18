import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  Check,
  ClipboardCheck,
  GraduationCap,
  ImageUp,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Palette,
  Pencil,
  Plus,
  School,
  Settings,
  Trash2,
  Users,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import schoolMark from "@/assets/riverstone-heights-academy-mark.png";
import {
  createTeacherAccount,
  deleteClassRecord,
  deleteStudentRecord,
  deleteTeacherAccount,
  updateTeacherAccount,
} from "@/lib/school-admin.functions";
import { getPublicSchoolBranding, saveSchoolSettings } from "@/lib/school-settings.functions";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  defaultSchoolBranding,
  getSchoolLogoUrl,
  type SchoolBranding,
} from "@/lib/school-branding";

type Role = "admin" | "teacher" | "parent";
type SchoolClass = { id: string; name: string; grade: string; teacher_id?: string | null };
type Student = {
  id: string;
  full_name: string;
  admission_number: string;
  date_of_birth: string | null;
  class_id?: string | null;
  classes?: SchoolClass | null;
};
type TimetableEntry = {
  id: string;
  class_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  subject: string;
  room: string | null;
  classes: SchoolClass | null;
};
type Notice = { id: string; title: string; body: string; published_at: string };
type AttendanceRecord = {
  id: string;
  status: "present" | "absent" | "late";
  attendance_date: string;
};
type Teacher = { id: string; full_name: string };
type SchoolSettings = {
  id: string;
  school_name: string;
  logo_url: string | null;
  address: string;
  phone: string;
  email: string;
  principal_name: string;
  affiliation_board: string;
  academic_session: string;
  working_days: string[];
  opening_time: string;
  closing_time: string;
  theme_color: string;
};
const roleNames: Record<Role, string> = {
  admin: "Principal",
  teacher: "Teacher",
  parent: "Parent",
};
const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export const Route = createFileRoute("/dashboard")({
  validateSearch: (search: Record<string, unknown>) => ({
    role: (search["role"] === "admin" || search["role"] === "teacher" || search["role"] === "parent"
      ? search["role"]
      : "parent") as Role,
  }),
  head: () => ({
    meta: [
      { title: "School Portal | Dashboard" },
      { name: "description", content: "Your school portal dashboard." },
      { property: "og:title", content: "School Portal | Dashboard" },
      {
        property: "og:description",
        content: "Your school portal dashboard.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { role: requestedRole } = Route.useSearch();
  const navigate = useNavigate();
  const [profile, setProfile] = useState("School member");
  const [role, setRole] = useState<Role | null>(null);
  const [section, setSection] = useState("Overview");
  const [menu, setMenu] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [teacherCount, setTeacherCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState("");
  const [branding, setBranding] = useState<SchoolBranding>(defaultSchoolBranding);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const nav = useMemo<[LucideIcon, string][]>(
    () =>
      role === "admin"
        ? [
            [LayoutDashboard, "Overview"],
            [Users, "Students"],
            [GraduationCap, "Teachers"],
            [School, "Classes"],
            [ClipboardCheck, "Attendance"],
            [Megaphone, "Notices"],
            [CalendarDays, "Timetable"],
            [Settings, "School settings"],
          ]
        : role === "teacher"
          ? [
              [LayoutDashboard, "Overview"],
              [School, "My classes"],
              [Users, "Students"],
              [ClipboardCheck, "Attendance"],
              [CalendarDays, "Timetable"],
              [Megaphone, "Notices"],
            ]
          : [
              [LayoutDashboard, "Overview"],
              [GraduationCap, "My child"],
              [ClipboardCheck, "Attendance"],
              [CalendarDays, "Timetable"],
              [Megaphone, "Notices"],
            ],
    [role],
  );
  const refresh = async (actualRole: Role, userId: string) => {
    const classQuery =
      actualRole === "admin"
        ? supabase.from("classes").select("id,name,grade,teacher_id").order("grade")
        : actualRole === "teacher"
          ? supabase
              .from("classes")
              .select("id,name,grade,teacher_id")
              .eq("teacher_id", userId)
              .order("grade")
          : supabase.from("classes").select("id,name,grade,teacher_id").order("grade");
    const studentQuery =
      actualRole === "parent"
        ? supabase
            .from("parent_students")
            .select(
              "students(id,full_name,admission_number,date_of_birth,class_id,classes(id,name,grade))",
            )
            .eq("parent_id", userId)
        : actualRole === "teacher"
          ? supabase
              .from("students")
              .select(
                "id,full_name,admission_number,date_of_birth,class_id,classes!inner(id,name,grade,teacher_id)",
              )
              .eq("classes.teacher_id", userId)
              .order("full_name")
          : supabase
              .from("students")
              .select("id,full_name,admission_number,date_of_birth,class_id,classes(id,name,grade)")
              .order("full_name");
    const timetableQuery =
      actualRole === "teacher"
        ? supabase
            .from("timetable_entries")
            .select(
              "id,class_id,weekday,start_time,end_time,subject,room,classes!inner(id,name,grade,teacher_id)",
            )
            .eq("classes.teacher_id", userId)
            .order("weekday")
            .order("start_time")
        : supabase
            .from("timetable_entries")
            .select("id,class_id,weekday,start_time,end_time,subject,room,classes(id,name,grade)")
            .order("weekday")
            .order("start_time");
    const [
      classResult,
      noticeResult,
      studentResult,
      attendanceResult,
      entryResult,
      teacherResult,
      teacherProfiles,
    ] = await Promise.all([
      classQuery,
      supabase
        .from("notices")
        .select("id,title,body,published_at")
        .order("published_at", { ascending: false })
        .limit(5),
      studentQuery,
      supabase
        .from("attendance_records")
        .select("id,status,attendance_date")
        .order("attendance_date", { ascending: false })
        .limit(30),
      timetableQuery,
      actualRole === "admin"
        ? supabase
            .from("user_roles")
            .select("id", { count: "exact", head: true })
            .eq("role", "teacher")
        : Promise.resolve({ count: 0 }),
      actualRole === "admin"
        ? supabase.from("user_roles").select("user_id,profiles(id,full_name)").eq("role", "teacher")
        : Promise.resolve({ data: [] }),
    ]);
    const classRows = classResult.data ?? [];
    setClasses(classRows);
    setNotices(noticeResult.data ?? []);
    setTeacherCount(teacherResult.count ?? 0);
    setAttendance(attendanceResult.data ?? []);
    const parentRows = (studentResult.data ?? []) as unknown as {
      students: Student | Student[] | null;
    }[];
    const linkedStudents = parentRows.flatMap((row) =>
      Array.isArray(row.students) ? row.students : row.students ? [row.students] : [],
    );
    setStudents(
      actualRole === "parent" ? linkedStudents : ((studentResult.data ?? []) as Student[]),
    );
    const teacherRows = (teacherProfiles.data ?? []) as unknown as {
      profiles: Teacher | Teacher[] | null;
    }[];
    setTeachers(
      teacherRows.flatMap((row) =>
        Array.isArray(row.profiles) ? row.profiles : row.profiles ? [row.profiles] : [],
      ),
    );
    setEntries((entryResult.data ?? []) as TimetableEntry[]);
  };
  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        await navigate({ to: "/" });
        return;
      }
      const [{ data: p }, { data: r }] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle(),
      ]);
      const actualRole =
        r?.role === "admin" || r?.role === "teacher" || r?.role === "parent" ? r.role : "parent";
      if (requestedRole !== actualRole) {
        await navigate({ to: "/dashboard", search: { role: actualRole }, replace: true });
        return;
      }
      try {
        const schoolBranding = await getPublicSchoolBranding();
        setBranding(schoolBranding);
        setLogoUrl(await getSchoolLogoUrl(schoolBranding.logo_url));
        setProfile(
          actualRole === "admin" && schoolBranding.principal_name
            ? schoolBranding.principal_name
            : (p?.full_name ?? "School member"),
        );
      } catch {
        setLogoUrl(null);
        setProfile(p?.full_name ?? "School member");
      }
      setCurrentUserId(user.id);
      setRole(actualRole);
      await refresh(actualRole, user.id);
    }
    load();
  }, [navigate, requestedRole]);
  async function signOut() {
    await supabase.auth.signOut();
    await navigate({ to: "/", replace: true });
  }
  if (!role)
    return (
      <main className="page-backdrop grid min-h-screen place-items-center text-ink">
        <p className="text-sm text-steel">Loading your school portal…</p>
      </main>
    );
  const today = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
  return (
    <main className="page-backdrop min-h-screen text-ink">
      <div className="flex min-h-screen">
        <aside
          className={`${menu ? "fixed inset-y-0 left-0 z-30" : "hidden"} w-60 flex-col border-r border-white/60 bg-secondary/70 backdrop-blur-xl md:flex`}
        >
          <Brand branding={branding} logoUrl={logoUrl} />
          <Nav items={nav} section={section} setSection={setSection} />
          <Profile name={profile} role={role} signOut={signOut} />
        </aside>
        {menu && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMenu(false)}
            aria-label="Close navigation"
            className="fixed inset-0 z-20 h-full w-full rounded-none bg-ink/20 md:hidden"
          />
        )}
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-white/60 bg-secondary/50 px-4 backdrop-blur-xl md:px-8">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label="Open navigation"
                onClick={() => setMenu(true)}
              >
                <BookOpen className="size-5" />
              </Button>
              <div>
                <h1 className="font-serif text-[22px]">
                  {section === "Overview" ? `Good morning, ${profile}` : section}
                </h1>
                <p className="text-xs text-steel">{today} · Autumn Term</p>
              </div>
            </div>
            {role === "admin" && (
              <Button size="sm" onClick={() => setSection("Students")}>
                Add student
              </Button>
            )}
          </header>
          <div className="mx-auto max-w-7xl p-4 md:p-8">
            {section === "Overview" ? (
              <Overview
                role={role}
                students={students}
                entries={entries}
                notices={notices}
                attendance={attendance}
                classes={classes}
                teacherCount={teacherCount}
              />
            ) : (
              <SectionView
                section={section}
                role={role}
                students={students}
                classes={classes}
                teachers={teachers}
                entries={entries}
                notices={notices}
                attendance={attendance}
                currentUserId={currentUserId}
                refresh={() => refresh(role, currentUserId)}
              />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
function Brand({ branding, logoUrl }: { branding: SchoolBranding; logoUrl: string | null }) {
  return (
    <div className="flex items-center gap-3 px-5 py-6">
      <img
        src={logoUrl ?? schoolMark}
        alt={`${branding.school_name} crest`}
        width={48}
        height={48}
        className="size-10 rounded-lg bg-card object-contain p-0.5"
      />
      <p className="text-sm font-semibold leading-tight">{branding.school_name}</p>
      {branding.principal_name && (
        <p className="text-[11px] text-steel">Principal: {branding.principal_name}</p>
      )}
    </div>
  );
}
function Nav({
  items,
  section,
  setSection,
}: {
  items: [LucideIcon, string][];
  section: string;
  setSection: (name: string) => void;
}) {
  return (
    <nav className="flex-1 space-y-1 px-3">
      <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-steel">
        School
      </p>
      {items.map(([Icon, name]) => (
        <Button
          key={name}
          variant="ghost"
          onClick={() => setSection(name)}
          className={`w-full justify-start gap-3 ${section === name ? "bg-primary text-primary-foreground hover:bg-primary" : "text-steel hover:bg-primary/5"}`}
        >
          <Icon className="size-4" />
          {name}
        </Button>
      ))}
    </nav>
  );
}
function Profile({ name, role, signOut }: { name: string; role: Role; signOut: () => void }) {
  return (
    <div className="p-3">
      <div className="flex items-center gap-2 rounded-lg bg-card px-3 py-3 ring-1 ring-ink/5">
        <div className="grid size-8 place-items-center rounded-full bg-clay text-xs font-semibold text-primary-foreground">
          {name.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold">{name}</p>
          <p className="text-[11px] text-steel">{roleNames[role]}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={signOut}
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut className="size-4 text-steel" />
        </Button>
      </div>
    </div>
  );
}
function Overview({
  role,
  students,
  entries,
  notices,
  attendance,
  classes,
  teacherCount,
}: {
  role: Role;
  students: Student[];
  entries: TimetableEntry[];
  notices: Notice[];
  attendance: AttendanceRecord[];
  classes: SchoolClass[];
  teacherCount: number;
}) {
  const presentRate = attendance.length
    ? Math.round(
        (attendance.filter((record) => record.status === "present").length / attendance.length) *
          100,
      )
    : 0;
  const nextLesson = entries[0];
  const child = students[0];
  const cards =
    role === "admin"
      ? [
          ["Total students", String(students.length), "Active enrolments"],
          ["Teachers", String(teacherCount), "Teaching staff"],
          ["Attendance", `${presentRate}%`, "Recent records"],
          ["Active notices", String(notices.length), "School updates"],
        ]
      : role === "teacher"
        ? [
            ["Assigned classes", String(classes.length), "This term"],
            ["Students", String(students.length), "Across your classes"],
            ["Attendance", `${presentRate}%`, "Recent records"],
            ["Notices", String(notices.length), "School updates"],
          ]
        : [
            ["My child", child?.full_name ?? "No child linked", child?.classes?.name ?? ""],
            ["Attendance", `${presentRate}%`, "Recent records"],
            [
              "Next lesson",
              nextLesson?.start_time.slice(0, 5) ?? "—",
              nextLesson?.subject ?? "No lesson scheduled",
            ],
            ["Notices", String(notices.length), "School updates"],
          ];
  return (
    <div className="space-y-5">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, note]) => (
          <div key={label} className="surface p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-steel">
              {label}
            </p>
            <p className="mt-2 font-serif text-3xl">{value}</p>
            <p className="mt-1 text-xs text-leaf">{note}</p>
          </div>
        ))}
      </section>
      <section className="grid gap-4 lg:grid-cols-3">
        <Notices notices={notices} />
        <Attendance attendance={attendance} />
        <Timetable entries={entries} />
      </section>
      {role !== "parent" && <StudentList students={students} />}
    </div>
  );
}
function Notices({ notices }: { notices: Notice[] }) {
  return (
    <section className="surface p-5 lg:col-span-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Current notices</h2>
        <span className="text-xs text-leaf">School office</span>
      </div>
      <div className="mt-3 divide-y divide-ink/5">
        {notices.length ? (
          notices.map((notice, index) => (
            <div key={notice.id} className="flex gap-3 py-3">
              <span
                className={`mt-1.5 size-2 shrink-0 rounded-full ${index === 0 ? "bg-clay" : "bg-leaf"}`}
              />
              <div>
                <p className="text-sm font-medium">{notice.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-steel">{notice.body}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="py-4 text-sm text-steel">No school notices have been published.</p>
        )}
      </div>
    </section>
  );
}
function Attendance({ attendance }: { attendance: AttendanceRecord[] }) {
  const statusCounts = ["present", "late", "absent"].map((status) => [
    status,
    attendance.filter((record) => record.status === status).length,
  ]);
  return (
    <section className="surface p-5">
      <h2 className="text-sm font-semibold">Recent attendance</h2>
      <div className="mt-5 space-y-4">
        {statusCounts.map(([status, count]) => (
          <div key={status}>
            <div className="mb-1.5 flex justify-between text-xs">
              <span className="capitalize">{status}</span>
              <span className="text-steel">{count}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-ink/5">
              <div
                className={`h-full rounded-full ${status === "present" ? "bg-leaf" : status === "late" ? "bg-clay" : "bg-ink/40"}`}
                style={{
                  width: `${attendance.length ? (Number(count) / attendance.length) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
function Timetable({ entries }: { entries: TimetableEntry[] }) {
  const weekday = Math.max(1, Math.min(5, new Date().getDay()));
  const today = entries.filter((entry) => entry.weekday === weekday).slice(0, 3);
  return (
    <section className="surface p-5">
      <div className="flex justify-between">
        <h2 className="text-sm font-semibold">Timetable</h2>
        <span className="text-xs text-steel">{weekdays[weekday - 1]}</span>
      </div>
      <div className="mt-4 space-y-2">
        {today.length ? (
          today.map((entry) => (
            <div key={entry.id} className="flex gap-3 rounded-lg bg-secondary/70 p-3">
              <span className="w-12 text-xs text-steel">{entry.start_time.slice(0, 5)}</span>
              <div>
                <p className="text-sm font-medium">{entry.subject}</p>
                <p className="text-[11px] text-steel">
                  {entry.classes?.name}
                  {entry.room ? ` · ${entry.room}` : ""}
                </p>
              </div>
            </div>
          ))
        ) : (
          <p className="py-4 text-sm text-steel">No lessons are scheduled today.</p>
        )}
      </div>
    </section>
  );
}
function StudentList({ students }: { students: Student[] }) {
  return (
    <section className="surface overflow-hidden">
      <div className="flex items-center justify-between p-5">
        <h2 className="text-sm font-semibold">Students</h2>
        <span className="text-xs text-leaf">Current records</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="border-y border-ink/5 text-[11px] uppercase tracking-[0.08em] text-steel">
            <tr>
              <th className="p-4 font-medium">Name</th>
              <th className="p-4 font-medium">Admission no.</th>
              <th className="p-4 font-medium">Class</th>
            </tr>
          </thead>
          <tbody>
            {students.length ? (
              students.map((student) => (
                <tr key={student.id} className="border-b border-ink/5">
                  <td className="p-4 font-medium">{student.full_name}</td>
                  <td className="p-4 text-steel">{student.admission_number}</td>
                  <td className="p-4">
                    <span className="rounded-full bg-leaf/10 px-2 py-1 text-xs text-leaf">
                      {student.classes?.name ?? "Unassigned"}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="p-8 text-center text-sm text-steel">
                  No student records are available yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
function SectionView({
  section,
  role,
  students,
  classes,
  teachers,
  entries,
  notices,
  attendance,
  currentUserId,
  refresh,
}: {
  section: string;
  role: Role;
  students: Student[];
  classes: SchoolClass[];
  teachers: Teacher[];
  entries: TimetableEntry[];
  notices: Notice[];
  attendance: AttendanceRecord[];
  currentUserId: string;
  refresh: () => Promise<void>;
}) {
  if (section === "Students")
    return <StudentsPage role={role} students={students} classes={classes} refresh={refresh} />;
  if (section === "My child") return <StudentList students={students} />;
  if (section === "Notices") return <Notices notices={notices} />;
  if (section === "Attendance") return <Attendance attendance={attendance} />;
  if (section === "Timetable")
    return <TimetablePage role={role} classes={classes} entries={entries} refresh={refresh} />;
  if (section === "Teachers") return <TeachersPage teachers={teachers} refresh={refresh} />;
  if (section === "Classes" || section === "My classes")
    return <ClassesPage role={role} classes={classes} teachers={teachers} refresh={refresh} />;
  if (section === "School settings" && role === "admin")
    return <SchoolSettingsPage principalId={currentUserId} />;
  return (
    <section className="surface p-8">
      <h2 className="font-serif text-3xl">{section}</h2>
      <p className="mt-2 text-sm text-steel">
        {roleNames[role]} access is ready for this school area.
      </p>
    </section>
  );
}
function SchoolSettingsPage({ principalId }: { principalId: string }) {
  const saveSettings = useServerFn(saveSchoolSettings);
  const [saved, setSaved] = useState<SchoolSettings | null>(null);
  const [schoolName, setSchoolName] = useState("Riverstone Heights Academy");
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [principalName, setPrincipalName] = useState("");
  const [affiliationBoard, setAffiliationBoard] = useState("");
  const [academicSession, setAcademicSession] = useState("2026–2027");
  const [workingDays, setWorkingDays] = useState<string[]>([
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
  ]);
  const [openingTime, setOpeningTime] = useState("08:00");
  const [closingTime, setClosingTime] = useState("15:30");
  const [themeColor, setThemeColor] = useState("#264653");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const loadSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("school_settings")
      .select(
        "id,school_name,logo_url,address,phone,email,principal_name,affiliation_board,academic_session,working_days,opening_time,closing_time,theme_color",
      )
      .limit(1)
      .maybeSingle();
    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }
    if (data) {
      const settings = data as SchoolSettings;
      setSaved(settings);
      setSchoolName(settings.school_name);
      setLogoPath(settings.logo_url);
      setAddress(settings.address);
      setPhone(settings.phone);
      setEmail(settings.email);
      setPrincipalName(settings.principal_name);
      setAffiliationBoard(settings.affiliation_board);
      setAcademicSession(settings.academic_session);
      setWorkingDays(settings.working_days);
      setOpeningTime(settings.opening_time.slice(0, 5));
      setClosingTime(settings.closing_time.slice(0, 5));
      setThemeColor(settings.theme_color);
      if (settings.logo_url) {
        const { data: signed } = await supabase.storage
          .from("school-branding")
          .createSignedUrl(settings.logo_url, 60 * 60);
        setLogoPreview(signed?.signedUrl ?? null);
      }
    }
    setLoading(false);
  };
  useEffect(() => {
    void loadSettings();
  }, []);
  const uploadLogo = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 2 * 1024 * 1024) {
      setMessage("Choose an image smaller than 2 MB.");
      return;
    }
    const extension = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${principalId}/${Date.now()}.${extension}`;
    const { error } = await supabase.storage
      .from("school-branding")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) {
      setMessage(error.message);
      return;
    }
    setLogoPath(path);
    setLogoPreview(URL.createObjectURL(file));
    setMessage("Logo uploaded. Save changes to keep it.");
  };
  const toggleDay = (day: string) =>
    setWorkingDays((days) =>
      days.includes(day) ? days.filter((item) => item !== day) : [...days, day],
    );
  const clearLogo = () => {
    setLogoPath(null);
    setLogoPreview(null);
    setMessage("Logo removed. Save changes to apply it.");
  };
  const cancel = () => {
    if (!saved) {
      setSchoolName("Riverstone Heights Academy");
      setLogoPath(null);
      setLogoPreview(null);
      setAddress("");
      setPhone("");
      setEmail("");
      setPrincipalName("");
      setAffiliationBoard("");
      setAcademicSession("2026–2027");
      setWorkingDays(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]);
      setOpeningTime("08:00");
      setClosingTime("15:30");
      setThemeColor("#264653");
    } else {
      setSchoolName(saved.school_name);
      setLogoPath(saved.logo_url);
      if (saved.logo_url) {
        void supabase.storage
          .from("school-branding")
          .createSignedUrl(saved.logo_url, 60 * 60)
          .then(({ data }) => setLogoPreview(data?.signedUrl ?? null));
      } else {
        setLogoPreview(null);
      }
      setAddress(saved.address);
      setPhone(saved.phone);
      setEmail(saved.email);
      setPrincipalName(saved.principal_name);
      setAffiliationBoard(saved.affiliation_board);
      setAcademicSession(saved.academic_session);
      setWorkingDays(saved.working_days);
      setOpeningTime(saved.opening_time.slice(0, 5));
      setClosingTime(saved.closing_time.slice(0, 5));
      setThemeColor(saved.theme_color);
    }
    setMessage("Changes discarded.");
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (schoolName.trim().length < 2) {
      setMessage("Enter a school name with at least 2 characters.");
      return;
    }
    if (!principalName.trim()) {
      setMessage("Enter the Principal's name.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      await saveSettings({
        data: {
          schoolName,
          logoUrl: logoPath,
          address,
          phone,
          email,
          principalName,
          affiliationBoard,
          academicSession,
          workingDays,
          openingTime,
          closingTime,
          themeColor,
        },
      });
      setMessage("School settings saved.");
      await loadSettings();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save school settings.");
    } finally {
      setSaving(false);
    }
  };
  if (loading)
    return (
      <section className="surface p-8">
        <p className="text-sm text-steel">Loading school settings…</p>
      </section>
    );
  return (
    <form onSubmit={submit} className="space-y-5">
      <section className="surface overflow-hidden">
        <div className="flex items-start justify-between gap-4 border-b border-ink/5 p-5">
          <div>
            <div className="flex items-center gap-2">
              <Settings className="size-4 text-leaf" />
              <h2 className="text-sm font-semibold">School identity</h2>
            </div>
            <p className="mt-1 text-xs text-steel">Details shown across the school portal.</p>
          </div>
          <div
            className="flex size-10 items-center justify-center rounded-lg bg-primary/10"
            style={{ color: themeColor }}
          >
            <School className="size-5" />
          </div>
        </div>
        <div className="grid gap-5 p-5 lg:grid-cols-[180px_1fr]">
          <div>
            <div className="grid aspect-square place-items-center overflow-hidden rounded-lg border border-dashed bg-secondary/60">
              <img
                src={logoPreview ?? schoolMark}
                alt="School logo preview"
                className="h-full w-full object-contain p-4"
              />
            </div>
            <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-leaf">
              <ImageUp className="size-4" />
              Change logo
              <Input type="file" accept="image/*" className="sr-only" onChange={uploadLogo} />
            </label>
            {logoPath && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-2 w-full"
                onClick={clearLogo}
                disabled={saving}
              >
                <Trash2 className="size-4" />
                Clear logo
              </Button>
            )}
            <p className="mt-2 text-xs text-steel">PNG, JPG, or WEBP · up to 2 MB</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-medium sm:col-span-2">
              School name
              <Input
                value={schoolName}
                onChange={(event) => setSchoolName(event.target.value)}
                required
                className="mt-1.5"
              />
            </label>
            <label className="text-xs font-medium sm:col-span-2">
              Address
              <Textarea
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                className="mt-1.5"
                placeholder="School address"
              />
            </label>
            <label className="text-xs font-medium">
              Phone
              <Input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                type="tel"
                className="mt-1.5"
                placeholder="School phone number"
              />
            </label>
            <label className="text-xs font-medium">
              Email
              <Input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                className="mt-1.5"
                placeholder="school@example.edu"
              />
            </label>
          </div>
        </div>
      </section>
      <section className="grid gap-5 xl:grid-cols-2">
        <div className="surface p-5">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-leaf" />
            <h2 className="text-sm font-semibold">Leadership & affiliation</h2>
          </div>
          <div className="mt-4 grid gap-4">
            <label className="text-xs font-medium">
              Principal name
              <Input
                value={principalName}
                onChange={(event) => setPrincipalName(event.target.value)}
                required
                className="mt-1.5"
                placeholder="Principal's full name"
              />
            </label>
            <label className="text-xs font-medium">
              School affiliation / board
              <Input
                value={affiliationBoard}
                onChange={(event) => setAffiliationBoard(event.target.value)}
                className="mt-1.5"
                placeholder="e.g. CBSE, ICSE, State Board"
              />
            </label>
            <label className="text-xs font-medium">
              Academic session
              <Input
                value={academicSession}
                onChange={(event) => setAcademicSession(event.target.value)}
                required
                className="mt-1.5"
              />
            </label>
          </div>
        </div>
        <div className="surface p-5">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 text-leaf" />
            <h2 className="text-sm font-semibold">School week & hours</h2>
          </div>
          <div className="mt-4">
            <p className="text-xs font-medium">Working days</p>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(
                (day) => (
                  <label key={day} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={workingDays.includes(day)}
                      onCheckedChange={() => toggleDay(day)}
                    />
                    <span>{day}</span>
                  </label>
                ),
              )}
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-4">
            <label className="text-xs font-medium">
              Opening time
              <Input
                type="time"
                value={openingTime}
                onChange={(event) => setOpeningTime(event.target.value)}
                className="mt-1.5"
              />
            </label>
            <label className="text-xs font-medium">
              Closing time
              <Input
                type="time"
                value={closingTime}
                onChange={(event) => setClosingTime(event.target.value)}
                className="mt-1.5"
              />
            </label>
          </div>
        </div>
      </section>
      <section className="surface p-5">
        <div className="flex items-center gap-2">
          <Palette className="size-4 text-leaf" />
          <h2 className="text-sm font-semibold">School theme</h2>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-3 text-sm font-medium">
            Theme color
            <Input
              type="color"
              value={themeColor}
              onChange={(event) => setThemeColor(event.target.value)}
              className="size-10 cursor-pointer rounded-md p-1"
            />
            <span className="font-mono text-xs text-steel">{themeColor.toUpperCase()}</span>
          </label>
          <div className="flex items-center gap-2 text-xs text-steel">
            <span className="size-3 rounded-full" style={{ backgroundColor: themeColor }} />
            Used for the school’s visual accent.
          </div>
        </div>
      </section>
      <div className="flex flex-wrap items-center justify-end gap-3">
        <p role="status" className="mr-auto text-sm text-steel">
          {message}
        </p>
        <Button type="button" variant="outline" onClick={cancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          <Check className="size-4" />
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
function StudentsPage({
  role,
  students,
  classes,
  refresh,
}: {
  role: Role;
  students: Student[];
  classes: SchoolClass[];
  refresh: () => Promise<void>;
}) {
  const removeStudentRecord = useServerFn(deleteStudentRecord);
  const [fullName, setFullName] = useState("");
  const [admissionNumber, setAdmissionNumber] = useState("");
  const [classId, setClassId] = useState("");
  const [editing, setEditing] = useState<Student | null>(null);
  const [message, setMessage] = useState("");
  const addStudent = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!fullName.trim() || !admissionNumber.trim()) {
      setMessage("Enter the student's name and admission number.");
      return;
    }
    const { error } = await supabase.from("students").insert({
      full_name: fullName.trim(),
      admission_number: admissionNumber.trim(),
      class_id: classId || null,
    });
    if (error) {
      setMessage(error.message);
      return;
    }
    setFullName("");
    setAdmissionNumber("");
    setClassId("");
    setMessage("Student added.");
    await refresh();
  };
  const saveStudent = async () => {
    if (!editing || !fullName.trim() || !admissionNumber.trim()) return;
    const { error } = await supabase
      .from("students")
      .update({
        full_name: fullName.trim(),
        admission_number: admissionNumber.trim(),
        class_id: classId || null,
      })
      .eq("id", editing.id);
    if (error) {
      setMessage(error.message);
      return;
    }
    setEditing(null);
    setFullName("");
    setAdmissionNumber("");
    setClassId("");
    setMessage("Student updated.");
    await refresh();
  };
  const removeStudent = async (student: Student) => {
    if (!window.confirm(`Remove ${student.full_name}? This also removes their attendance history.`))
      return;
    try {
      await removeStudentRecord({ data: { id: student.id } });
      setMessage("Student removed.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not remove the student.");
    }
  };
  const openEdit = (student: Student) => {
    setEditing(student);
    setFullName(student.full_name);
    setAdmissionNumber(student.admission_number);
    setClassId(student.class_id ?? "");
    setMessage("");
  };
  return (
    <div className="space-y-5">
      {role === "admin" && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (editing) void saveStudent();
            else void addStudent(event);
          }}
          className="surface p-5"
        >
          <div className="flex items-center gap-2">
            <Plus className="size-4 text-leaf" />
            <h2 className="text-sm font-semibold">{editing ? "Edit student" : "Add a student"}</h2>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-xs font-medium">
              Full name
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm"
                placeholder="Student name"
              />
            </label>
            <label className="text-xs font-medium">
              Admission number
              <input
                value={admissionNumber}
                onChange={(event) => setAdmissionNumber(event.target.value)}
                className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm"
                placeholder="e.g. RHA-1024"
              />
            </label>
            <label className="text-xs font-medium">
              Class
              <select
                value={classId}
                onChange={(event) => setClassId(event.target.value)}
                className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="">Assign later</option>
                {classes.map((schoolClass) => (
                  <option key={schoolClass.id} value={schoolClass.id}>
                    {schoolClass.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Button type="submit" size="sm">
              {editing ? "Save student" : "Add student"}
            </Button>
            {editing && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setFullName("");
                  setAdmissionNumber("");
                  setClassId("");
                }}
              >
                Cancel
              </Button>
            )}
            {message && <p className="text-sm text-steel">{message}</p>}
          </div>
        </form>
      )}
      <section className="surface overflow-hidden">
        <div className="flex items-center justify-between p-5">
          <h2 className="text-sm font-semibold">Students</h2>
          <span className="text-xs text-leaf">Current records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="border-y border-ink/5 text-[11px] uppercase tracking-[0.08em] text-steel">
              <tr>
                <th className="p-4">Name</th>
                <th className="p-4">Admission no.</th>
                <th className="p-4">Class</th>
                {role === "admin" && <th className="p-4" aria-label="Actions" />}
              </tr>
            </thead>
            <tbody>
              {students.length ? (
                students.map((student) => (
                  <tr key={student.id} className="border-b border-ink/5">
                    <td className="p-4 font-medium">{student.full_name}</td>
                    <td className="p-4 text-steel">{student.admission_number}</td>
                    <td className="p-4 text-steel">{student.classes?.name ?? "Unassigned"}</td>
                    {role === "admin" && (
                      <td className="p-4 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          title={`Edit ${student.full_name}`}
                          aria-label={`Edit ${student.full_name}`}
                          onClick={() => openEdit(student)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title={`Remove ${student.full_name}`}
                          aria-label={`Remove ${student.full_name}`}
                          onClick={() => void removeStudent(student)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={role === "admin" ? 4 : 3}
                    className="p-8 text-center text-sm text-steel"
                  >
                    No student records are available yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
function TeachersPage({
  teachers,
  refresh,
}: {
  teachers: Teacher[];
  refresh: () => Promise<void>;
}) {
  const createTeacher = useServerFn(createTeacherAccount);
  const updateTeacher = useServerFn(updateTeacherAccount);
  const removeTeacher = useServerFn(deleteTeacherAccount);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const addTeacher = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    try {
      await createTeacher({ data: { fullName, email, temporaryPassword } });
      setFullName("");
      setEmail("");
      setTemporaryPassword("");
      setMessage("Teacher account created.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create the teacher account.");
    } finally {
      setSubmitting(false);
    }
  };
  const saveTeacher = async () => {
    if (!editing || !fullName.trim()) return;
    setSubmitting(true);
    try {
      await updateTeacher({ data: { id: editing.id, fullName } });
      setEditing(null);
      setFullName("");
      setMessage("Teacher updated.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update the teacher.");
    } finally {
      setSubmitting(false);
    }
  };
  const deleteTeacher = async (teacher: Teacher) => {
    if (
      !window.confirm(
        `Remove ${teacher.full_name}'s account? Their class assignments will be cleared.`,
      )
    )
      return;
    try {
      await removeTeacher({ data: { id: teacher.id } });
      setMessage("Teacher removed.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not remove the teacher.");
    }
  };
  return (
    <div className="space-y-5">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (editing) void saveTeacher();
          else void addTeacher(event);
        }}
        className="surface p-5"
      >
        <div className="flex items-center gap-2">
          <Plus className="size-4 text-leaf" />
          <h2 className="text-sm font-semibold">{editing ? "Edit teacher" : "Add a teacher"}</h2>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-xs font-medium">
            Full name
            <input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
              className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm"
              placeholder="Teacher name"
            />
          </label>
          {!editing && (
            <>
              <label className="text-xs font-medium">
                Email
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  required
                  className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm"
                  placeholder="name@school.edu"
                />
              </label>
              <label className="text-xs font-medium">
                Temporary password
                <input
                  value={temporaryPassword}
                  onChange={(event) => setTemporaryPassword(event.target.value)}
                  type="password"
                  required
                  minLength={8}
                  className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm"
                  placeholder="At least 8 characters"
                />
              </label>
            </>
          )}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Button type="submit" size="sm" disabled={submitting}>
            {submitting ? "Saving…" : editing ? "Save teacher" : "Create teacher"}
          </Button>
          {editing && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setEditing(null);
                setFullName("");
              }}
            >
              Cancel
            </Button>
          )}
          {message && <p className="text-sm text-steel">{message}</p>}
        </div>
      </form>
      <section className="surface overflow-hidden">
        <div className="p-5">
          <h2 className="text-sm font-semibold">Teaching team</h2>
        </div>
        <div className="divide-y divide-ink/5">
          {teachers.length ? (
            teachers.map((teacher) => (
              <div key={teacher.id} className="flex items-center justify-between gap-3 p-4">
                <p className="text-sm font-medium">{teacher.full_name}</p>
                <div className="flex shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    title={`Edit ${teacher.full_name}`}
                    aria-label={`Edit ${teacher.full_name}`}
                    onClick={() => {
                      setEditing(teacher);
                      setFullName(teacher.full_name);
                      setMessage("");
                    }}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title={`Remove ${teacher.full_name}`}
                    aria-label={`Remove ${teacher.full_name}`}
                    onClick={() => void deleteTeacher(teacher)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <p className="p-5 text-sm text-steel">No teacher records are available yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
function ClassesPage({
  role,
  classes,
  teachers,
  refresh,
}: {
  role: Role;
  classes: SchoolClass[];
  teachers: Teacher[];
  refresh: () => Promise<void>;
}) {
  const deleteClass = useServerFn(deleteClassRecord);
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [editing, setEditing] = useState<SchoolClass | null>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const addClass = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !grade.trim()) {
      setMessage("Enter a class name and grade.");
      return;
    }
    setSubmitting(true);
    setMessage("");
    try {
      const { error } = await supabase
        .from("classes")
        .insert({ name: name.trim(), grade: grade.trim(), teacher_id: teacherId || null });
      if (error) throw error;
      setName("");
      setGrade("");
      setTeacherId("");
      setMessage("Class added.");
      await refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not add the class. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };
  const saveClass = async () => {
    if (!editing || !name.trim() || !grade.trim()) return;
    setSubmitting(true);
    setMessage("");
    try {
      const { error } = await supabase
        .from("classes")
        .update({ name: name.trim(), grade: grade.trim(), teacher_id: teacherId || null })
        .eq("id", editing.id);
      if (error) throw error;
      setEditing(null);
      setName("");
      setGrade("");
      setTeacherId("");
      setMessage("Class updated.");
      await refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not update the class. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };
  const removeClass = async (schoolClass: SchoolClass) => {
    if (
      !window.confirm(
        `Remove ${schoolClass.name}? Timetable lessons will be removed and students will be left unassigned.`,
      )
    )
      return;
    try {
      await deleteClass({ data: { id: schoolClass.id } });
      setMessage("Class removed.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not remove the class.");
    }
  };
  return (
    <div className="space-y-5">
      {role === "admin" && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (editing) void saveClass();
            else void addClass(event);
          }}
          className="surface p-5"
        >
          <div className="flex items-center gap-2">
            <Plus className="size-4 text-leaf" />
            <h2 className="text-sm font-semibold">{editing ? "Edit class" : "Add a class"}</h2>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-xs font-medium">
              Class name
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm"
                placeholder="e.g. Maple"
              />
            </label>
            <label className="text-xs font-medium">
              Grade
              <input
                value={grade}
                onChange={(event) => setGrade(event.target.value)}
                className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm"
                placeholder="e.g. Year 7"
              />
            </label>
            <label className="text-xs font-medium">
              Class teacher
              <select
                value={teacherId}
                onChange={(event) => setTeacherId(event.target.value)}
                className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="">Assign later</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.full_name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? "Saving…" : editing ? "Save class" : "Add class"}
            </Button>
            {editing && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setName("");
                  setGrade("");
                  setTeacherId("");
                }}
              >
                Cancel
              </Button>
            )}
            {message && <p className="text-sm text-steel">{message}</p>}
          </div>
        </form>
      )}
      <section className="surface p-5">
        <h2 className="text-sm font-semibold">{role === "admin" ? "Classes" : "My classes"}</h2>
        <div className="mt-5 space-y-3">
          {classes.length ? (
            classes.map((schoolClass) => (
              <div
                key={schoolClass.id}
                className="flex items-center justify-between gap-3 rounded-lg bg-secondary/70 p-4"
              >
                <div>
                  <p className="font-medium">{schoolClass.name}</p>
                  <p className="mt-1 text-sm text-steel">{schoolClass.grade}</p>
                </div>
                {role === "admin" && (
                  <div className="flex shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      title={`Edit ${schoolClass.name}`}
                      aria-label={`Edit ${schoolClass.name}`}
                      onClick={() => {
                        setEditing(schoolClass);
                        setName(schoolClass.name);
                        setGrade(schoolClass.grade);
                        setTeacherId(schoolClass.teacher_id ?? "");
                        setMessage("");
                      }}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title={`Remove ${schoolClass.name}`}
                      aria-label={`Remove ${schoolClass.name}`}
                      onClick={() => void removeClass(schoolClass)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="text-sm text-steel">No classes have been created yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
function TimetablePage({
  role,
  classes,
  entries,
  refresh,
}: {
  role: Role;
  classes: SchoolClass[];
  entries: TimetableEntry[];
  refresh: () => Promise<void>;
}) {
  const [classId, setClassId] = useState("");
  const [weekday, setWeekday] = useState("1");
  const [startTime, setStartTime] = useState("08:30");
  const [endTime, setEndTime] = useState("09:15");
  const [subject, setSubject] = useState("");
  const [room, setRoom] = useState("");
  const [message, setMessage] = useState("");
  const addLesson = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!classId || !subject.trim()) {
      setMessage("Choose a class and enter a subject.");
      return;
    }
    const { error } = await supabase.from("timetable_entries").insert({
      class_id: classId,
      weekday: Number(weekday),
      start_time: startTime,
      end_time: endTime,
      subject: subject.trim(),
      room: room.trim() || null,
    });
    if (error) {
      setMessage(error.message);
      return;
    }
    setSubject("");
    setRoom("");
    setMessage("Lesson added.");
    await refresh();
  };
  const deleteLesson = async (id: string) => {
    const { error } = await supabase.from("timetable_entries").delete().eq("id", id);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage("Lesson removed.");
    await refresh();
  };
  return (
    <div className="space-y-5">
      {role === "admin" && (
        <form onSubmit={addLesson} className="surface p-5">
          <div className="flex items-center gap-2">
            <Plus className="size-4 text-leaf" />
            <h2 className="text-sm font-semibold">Assign a lesson</h2>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-xs font-medium">
              Class
              <select
                value={classId}
                onChange={(event) => setClassId(event.target.value)}
                className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="">Choose a class</option>
                {classes.map((schoolClass) => (
                  <option key={schoolClass.id} value={schoolClass.id}>
                    {schoolClass.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium">
              Day
              <select
                value={weekday}
                onChange={(event) => setWeekday(event.target.value)}
                className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                {weekdays.map((day, index) => (
                  <option key={day} value={index + 1}>
                    {day}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium">
              Subject
              <input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm"
                placeholder="e.g. Mathematics"
              />
            </label>
            <label className="text-xs font-medium">
              Start time
              <input
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                type="time"
                className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm"
              />
            </label>
            <label className="text-xs font-medium">
              End time
              <input
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
                type="time"
                className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm"
              />
            </label>
            <label className="text-xs font-medium">
              Room
              <input
                value={room}
                onChange={(event) => setRoom(event.target.value)}
                className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm"
                placeholder="e.g. Maple 2"
              />
            </label>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Button type="submit" size="sm">
              Add lesson
            </Button>
            {message && <p className="text-sm text-steel">{message}</p>}
          </div>
        </form>
      )}
      <section className="surface overflow-hidden">
        <div className="border-b border-ink/5 p-5">
          <h2 className="text-sm font-semibold">Weekly timetable</h2>
          <p className="mt-1 text-xs text-steel">
            {role === "admin" ? "All scheduled lessons" : "Lessons for your class"}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="border-b border-ink/5 text-[11px] uppercase tracking-[0.08em] text-steel">
              <tr>
                <th className="p-4">Day</th>
                <th className="p-4">Time</th>
                <th className="p-4">Class</th>
                <th className="p-4">Subject</th>
                <th className="p-4">Room</th>
                {role === "admin" && <th className="p-4" aria-label="Actions" />}
              </tr>
            </thead>
            <tbody>
              {entries.length ? (
                entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-ink/5">
                    <td className="p-4 font-medium">{weekdays[entry.weekday - 1] ?? "—"}</td>
                    <td className="p-4 text-steel">
                      {entry.start_time.slice(0, 5)}–{entry.end_time.slice(0, 5)}
                    </td>
                    <td className="p-4">{entry.classes?.name ?? "—"}</td>
                    <td className="p-4">{entry.subject}</td>
                    <td className="p-4 text-steel">{entry.room ?? "—"}</td>
                    {role === "admin" && (
                      <td className="p-4 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Remove ${entry.subject}`}
                          title="Remove lesson"
                          onClick={() => deleteLesson(entry.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={role === "admin" ? 6 : 5}
                    className="p-8 text-center text-sm text-steel"
                  >
                    No lessons have been assigned yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
