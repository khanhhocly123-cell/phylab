/**
 * /api/class/[action] — TOÀN BỘ endpoint tính năng lớp học trong MỘT route.
 *
 * Vì sao gộp 1 route: Next dev chạy mỗi route edge trong sandbox RIÊNG, memory
 * adapter (db-memory) dựa trên globalThis sẽ không chia sẻ được giữa nhiều route.
 * Gộp về một module → một store duy nhất khi dev, đồng thời tập trung guard/sanitize.
 *
 * GET  actions: list · my · detail · student
 * POST actions: create · join · assignment · assignment-delete · activity
 * (Các action M3–M5 sẽ thêm: submit-lab, submit-quiz, personal-quiz, heatmap, gradebook)
 *
 * Phân quyền:
 *  - Action giáo viên → requireTeacher (Bearer token HMAC).
 *  - Action học sinh  → định danh bằng studentId (UUID localStorage) trong body/query.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireTeacher } from "@/lib/auth";
import { getDb, MAX_CLASSES } from "@/lib/db";
import { sanitizeText } from "@/lib/security";
import { gradeLesson, correctResultOf, RESULT_TOLERANCE, type LabKind, type Trial } from "@/lib/grading";
import {
  gradeMoeQuiz, stripAnswers,
  type MoeQuiz, type MoeAnswers, type MoeQuestionResult,
} from "@/lib/moeQuiz";
import { generatePersonalQuiz } from "@/lib/antiCheatQuiz";
import type {
  Assignment,
  AssignmentKind,
  MyAssignmentStatus,
  MyClassData,
  LabAssignmentPayload,
  PersonalQuizPayload,
} from "@/lib/classTypes";
import type { RichTrial } from "@/lib/types";

// LƯU Ý: route này chạy NODE runtime (không khai runtime="edge") có chủ đích:
//  - Dev/demo (npm run dev / demo qua localtunnel): dùng adapter file JSON (.data/) —
//    edge sandbox của next dev tạo mới mỗi request nên không giữ được state.
//  - Trên Cloudflare: getDb() tự phát hiện binding D1 và dùng D1 (không đụng fs).

const TEACHER_GET_ACTIONS = new Set(["list", "detail", "student", "heatmap", "gradebook"]);
const TEACHER_POST_ACTIONS = new Set([
  "create", "class-delete", "kick", "assignment", "assignment-delete",
]);

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

/* ═══════════════════════════ GET ═══════════════════════════ */

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  const { action } = await params;
  try {
    if (TEACHER_GET_ACTIONS.has(action)) {
      const denied = await requireTeacher(req);
      if (denied) return denied;
    }
    const db = await getDb();
    const q = req.nextUrl.searchParams;

    switch (action) {
      /* ── GV: danh sách lớp ── */
      case "list": {
        return NextResponse.json({ ok: true, classes: await db.listClasses() });
      }

      /* ── GV: chi tiết 1 lớp (roster + assignments + hoạt động 7 ngày) ── */
      case "detail": {
        const classId = sanitizeText(q.get("classId"), 64);
        if (!classId) return jsonError("Thiếu classId.", 400);
        const cls = await db.getClassById(classId);
        if (!cls) return jsonError("Không tìm thấy lớp.", 404);

        const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const [members, assignments, activity] = await Promise.all([
          db.listMembers(classId),
          db.listAssignments(classId),
          db.listClassActivity(classId, since),
        ]);

        // Thống kê nộp bài theo assignment.
        const stats = await Promise.all(
          assignments.map(async (a) => {
            const list =
              a.kind === "lab"
                ? await db.listLabSubmissions(a.id)
                : await db.listQuizResults(a.id);
            const scores = list.map((x) => x.score);
            return {
              assignmentId: a.id,
              submittedCount: list.length,
              avgScore: scores.length
                ? +(scores.reduce((s, v) => s + v, 0) / scores.length).toFixed(1)
                : null,
            };
          })
        );

        // Hoạt động: last-active + số sự kiện theo ngày (sparkline 7 ngày) cho từng HS.
        const perStudent: Record<string, { lastActive: number; days: number[] }> = {};
        for (const m of members) perStudent[m.studentId] = { lastActive: 0, days: [0, 0, 0, 0, 0, 0, 0] };
        const dayMs = 24 * 60 * 60 * 1000;
        for (const e of activity) {
          const slot = perStudent[e.studentId];
          if (!slot) continue;
          if (e.at > slot.lastActive) slot.lastActive = e.at;
          const dayIdx = Math.min(6, Math.max(0, Math.floor((Date.now() - e.at) / dayMs)));
          slot.days[6 - dayIdx] += 1; // days[6] = hôm nay
        }

        return NextResponse.json({
          ok: true,
          class: cls,
          members,
          assignments,
          stats,
          activity: perStudent,
        });
      }

      /* ── GV: drill-down 1 học sinh ── */
      case "student": {
        const classId = sanitizeText(q.get("classId"), 64);
        const studentId = sanitizeText(q.get("studentId"), 64);
        if (!classId || !studentId) return jsonError("Thiếu classId/studentId.", 400);

        const assignments = await db.listAssignments(classId);
        const submissions = [];
        const quizResults = [];
        for (const a of assignments) {
          if (a.kind === "lab") {
            const sub = await db.getLabSubmission(a.id, studentId);
            if (sub) submissions.push({ assignment: a, submission: sub });
          } else {
            const r = await db.getQuizResult(a.id, studentId);
            if (r) quizResults.push({ assignment: a, result: r });
          }
        }
        const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const activity = (await db.listClassActivity(classId, since)).filter(
          (e) => e.studentId === studentId
        );
        return NextResponse.json({ ok: true, submissions, quizResults, activity });
      }

      /* ── HS: tab "Lớp của tôi" ── */
      case "my": {
        const studentId = sanitizeText(q.get("studentId"), 64);
        if (!studentId) return jsonError("Thiếu studentId.", 400);

        const memberships = await db.listMembershipsOfStudent(studentId);
        if (memberships.length === 0) {
          return NextResponse.json({ ok: true, myClass: null });
        }
        // Lớp tham gia gần nhất (UX: mỗi HS ở 1 lớp tại một thời điểm).
        const { class: cls, joinedAt } = memberships[0];
        const [assignments, members] = await Promise.all([
          db.listAssignments(cls.id),
          db.listMembers(cls.id),
        ]);

        const statuses: MyAssignmentStatus[] = await Promise.all(
          assignments.map(async (assignment): Promise<MyAssignmentStatus> => {
            if (assignment.kind === "lab") {
              const sub = await db.getLabSubmission(assignment.id, studentId);
              return { assignment, score: sub?.score ?? null, submittedAt: sub?.submittedAt ?? null };
            }
            const result = await db.getQuizResult(assignment.id, studentId);
            return { assignment, score: result?.score ?? null, submittedAt: result?.submittedAt ?? null };
          })
        );

        // Không gửi đáp án quiz xuống client: lược payload các bài quiz.
        const safeStatuses = statuses.map((s) =>
          s.assignment.kind === "lab"
            ? s
            : { ...s, assignment: { ...s.assignment, payload: null } }
        );

        const myClass: MyClassData = {
          class: cls,
          joinedAt,
          memberCount: members.length,
          assignments: safeStatuses,
        };
        return NextResponse.json({ ok: true, myClass });
      }

      /* ── GV: HEATMAP LỖI SAI của lớp — "lớp yếu chỗ nào?" ── */
      case "heatmap": {
        const classId = sanitizeText(q.get("classId"), 64);
        if (!classId) return jsonError("Thiếu classId.", 400);
        const assignments = await db.listAssignments(classId);

        // 1) Chi tiết TỪNG QUIZ: mỗi câu tỉ lệ sai; câu Đúng/Sai kèm % sai từng ý a/b/c/d.
        const PART_NAME: Record<number, string> = { 1: "Trắc nghiệm", 2: "Đúng/Sai", 3: "Trả lời ngắn" };
        const quizzes: Array<{
          assignmentId: string; title: string; submittedCount: number; avgScore: number | null;
          questions: Array<{
            part: number; partName: string; index: number; question: string;
            wrongCount: number; total: number; wrongPct: number;
            statements?: Array<{ text: string; wrongCount: number; wrongPct: number }>;
          }>;
        }> = [];
        for (const a of assignments.filter((x) => x.kind === "quiz")) {
          const quiz = a.payload as MoeQuiz;
          const results = await db.listQuizResults(a.id);
          const total = results.length;
          const questions: (typeof quizzes)[number]["questions"] = [];

          const allParts: Array<{ part: number; list: Array<{ q: string }> }> = [
            { part: 1, list: quiz.part1 ?? [] },
            { part: 2, list: quiz.part2 ?? [] },
            { part: 3, list: quiz.part3 ?? [] },
          ];
          for (const { part, list } of allParts) {
            list.forEach((qq, index) => {
              let wrongCount = 0;
              const stmtWrong: number[] = part === 2
                ? (quiz.part2[index]?.statements ?? []).map(() => 0)
                : [];
              for (const r of results) {
                const detail = (r.detail ?? []) as MoeQuestionResult[];
                const pq = detail.find((d) => d.part === part && d.index === index);
                if (pq && !pq.correct) wrongCount += 1;
                if (part === 2 && pq?.perStatement) {
                  pq.perStatement.forEach((ok, si) => { if (!ok) stmtWrong[si] += 1; });
                }
              }
              questions.push({
                part, partName: PART_NAME[part], index: index + 1, question: qq.q,
                wrongCount, total, wrongPct: total ? Math.round((wrongCount / total) * 100) : 0,
                statements: part === 2
                  ? (quiz.part2[index]?.statements ?? []).map((st, si) => ({
                      text: st.text, wrongCount: stmtWrong[si],
                      wrongPct: total ? Math.round((stmtWrong[si] / total) * 100) : 0,
                    }))
                  : undefined,
              });
            });
          }
          const scores = results.map((r) => r.score);
          quizzes.push({
            assignmentId: a.id, title: a.title, submittedCount: total,
            avgScore: scores.length ? +(scores.reduce((s, v) => s + v, 0) / scores.length).toFixed(1) : null,
            questions: questions.sort((x, y) => y.wrongPct - x.wrongPct),
          });
        }

        // Top câu sai nhiều nhất trên toàn lớp (gộp mọi quiz — cho phần tóm tắt).
        const quizIssues = quizzes
          .flatMap((qz) =>
            qz.questions
              .filter((q) => q.total > 0 && q.wrongCount > 0)
              .map((q) => ({ assignmentTitle: qz.title, part: q.part, index: q.index, question: q.question, wrongCount: q.wrongCount, total: q.total }))
          )
          .sort((a, b) => b.wrongCount / b.total - a.wrongCount / a.total);

        // 2) Lỗi thao tác + tính toán trong bài Lab.
        let totalTrials = 0, unbalancedTrials = 0, calcRows = 0, wrongCalcRows = 0;
        const labScores: number[] = [];
        for (const a of assignments.filter((x) => x.kind === "lab")) {
          const subs = await db.listLabSubmissions(a.id);
          for (const sub of subs) {
            labScores.push(sub.score);
            for (const tr of sub.payload?.trials ?? []) {
              totalTrials += 1;
              if (tr.balanced === false) unbalancedTrials += 1;
              if (tr.studentResult != null) {
                calcRows += 1;
                const correct = correctResultOf(tr.lab, tr.s, tr.t);
                if (correct > 0 && Math.abs(tr.studentResult - correct) > correct * RESULT_TOLERANCE) {
                  wrongCalcRows += 1;
                }
              }
            }
          }
        }

        return NextResponse.json({
          ok: true,
          heatmap: {
            quizIssues: quizIssues.slice(0, 10),
            quizzes,
            lab: {
              totalTrials,
              unbalancedTrials,
              unbalancedPct: totalTrials ? Math.round((unbalancedTrials / totalTrials) * 100) : 0,
              calcRows,
              wrongCalcRows,
              wrongCalcPct: calcRows ? Math.round((wrongCalcRows / calcRows) * 100) : 0,
              avgLabScore: labScores.length
                ? +(labScores.reduce((s, v) => s + v, 0) / labScores.length).toFixed(1)
                : null,
              submissionCount: labScores.length,
            },
          },
        });
      }

      /* ── GV: BẢNG ĐIỂM CSV (UTF-8 BOM cho Excel tiếng Việt) ── */
      case "gradebook": {
        const classId = sanitizeText(q.get("classId"), 64);
        if (!classId) return jsonError("Thiếu classId.", 400);
        const cls = await db.getClassById(classId);
        if (!cls) return jsonError("Không tìm thấy lớp.", 404);

        const [members, assignments] = await Promise.all([
          db.listMembers(classId),
          db.listAssignments(classId),
        ]);
        const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const activity = await db.listClassActivity(classId, since);

        // Điểm từng assignment cho từng HS.
        const scoreMap: Record<string, Record<string, number>> = {}; // studentId → assignmentId → score
        for (const a of assignments) {
          const list = a.kind === "lab" ? await db.listLabSubmissions(a.id) : await db.listQuizResults(a.id);
          for (const item of list) {
            (scoreMap[item.studentId] ||= {})[a.id] = item.score;
          }
        }

        const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
        const orderedAsg = [...assignments].reverse(); // cũ → mới, đọc tự nhiên
        const header = [
          "STT", "Họ tên học sinh",
          ...orderedAsg.map((a) => a.title),
          "Điểm TB", "Hoạt động 7 ngày (số sự kiện)", "Lần cuối vào app",
        ];
        const rows = members.map((m, i) => {
          const scores = orderedAsg.map((a) => scoreMap[m.studentId]?.[a.id]);
          const done = scores.filter((v): v is number => v != null);
          const avg = done.length ? (done.reduce((s, v) => s + v, 0) / done.length).toFixed(1) : "";
          const events = activity.filter((e) => e.studentId === m.studentId);
          const last = events.length ? Math.max(...events.map((e) => e.at)) : 0;
          const lastStr = last ? new Date(last).toLocaleString("vi-VN") : "Chưa hoạt động";
          return [
            String(i + 1), m.studentName,
            ...scores.map((v) => (v != null ? String(v) : "")),
            avg, String(events.length), lastStr,
          ];
        });
        const csv = [header, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");

        return new NextResponse("﻿" + csv, {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="bangdiem-${cls.code}.csv"`,
          },
        });
      }

      /* ── HS: tải đề quiz thường (ĐÃ LƯỢC đáp án) ── */
      case "quiz": {
        const assignmentId = sanitizeText(q.get("assignmentId"), 64);
        if (!assignmentId) return jsonError("Thiếu assignmentId.", 400);
        const assignment = await db.getAssignment(assignmentId);
        if (!assignment || assignment.kind !== "quiz") {
          return jsonError("Không tìm thấy bài quiz.", 404);
        }
        if (assignment.openAt && Date.now() < assignment.openAt) {
          return NextResponse.json(
            { error: "Bài quiz chưa tới giờ mở.", openAt: assignment.openAt, notOpen: true },
            { status: 403 }
          );
        }
        return NextResponse.json({
          ok: true,
          quiz: stripAnswers(assignment.payload as MoeQuiz),
          durationSec: assignment.durationSec ?? null,
          openAt: assignment.openAt ?? null,
        });
      }

      /* ── HS: đề quiz CHỐNG GIAN LẬN — sinh từ bài Lab của chính em (đã lược đáp án) ── */
      case "personal-quiz": {
        const assignmentId = sanitizeText(q.get("assignmentId"), 64);
        const studentId = sanitizeText(q.get("studentId"), 64);
        if (!assignmentId || !studentId) return jsonError("Thiếu assignmentId/studentId.", 400);
        const assignment = await db.getAssignment(assignmentId);
        if (!assignment || assignment.kind !== "personal_quiz") {
          return jsonError("Không tìm thấy bài quiz.", 404);
        }
        const payload = assignment.payload as PersonalQuizPayload;
        const sub = await db.getLabSubmission(payload.sourceAssignmentId, studentId);
        if (!sub || !(sub.payload?.trials?.length)) {
          return NextResponse.json(
            {
              error: "Em cần hoàn thành và nộp bài Lab nguồn trước — đề quiz này được sinh từ chính số liệu em đo.",
              needLab: true,
            },
            { status: 409 }
          );
        }
        if (assignment.openAt && Date.now() < assignment.openAt) {
          return NextResponse.json(
            { error: "Bài quiz chưa tới giờ mở.", openAt: assignment.openAt, notOpen: true },
            { status: 403 }
          );
        }
        // Cùng seed → server tái sinh đúng đề này khi chấm (đáp án không rời server).
        const quiz = generatePersonalQuiz(sub.payload.trials, `${assignmentId}::${studentId}`);
        return NextResponse.json({
          ok: true,
          quiz: stripAnswers(quiz),
          durationSec: assignment.durationSec ?? null,
          openAt: assignment.openAt ?? null,
        });
      }

      default:
        return jsonError(`Action GET không hợp lệ: ${action}`, 404);
    }
  } catch (err) {
    console.error(`class/${action} GET error:`, err);
    return jsonError("Lỗi hệ thống khi xử lý yêu cầu lớp học.", 500);
  }
}

/* ═══════════════════════════ POST ═══════════════════════════ */

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  const { action } = await params;
  try {
    if (TEACHER_POST_ACTIONS.has(action)) {
      const denied = await requireTeacher(req);
      if (denied) return denied;
    }
    const db = await getDb();
    const body = await req.json().catch(() => ({} as Record<string, unknown>));

    switch (action) {
      /* ── GV: tạo lớp ── */
      case "create": {
        const name = sanitizeText(body?.name, 80);
        if (!name) return jsonError("Thiếu tên lớp.", 400);
        // Giới hạn số lớp — chống spam/lạm dụng bộ nhớ.
        const count = await db.countClasses();
        if (count >= MAX_CLASSES) {
          return jsonError(
            `Đã đạt giới hạn ${MAX_CLASSES} lớp. Hãy xóa bớt lớp cũ trước khi tạo lớp mới.`,
            409
          );
        }
        const cls = await db.createClass(name);
        return NextResponse.json({ ok: true, class: cls });
      }

      /* ── GV: xóa lớp (cả bài tập, bài nộp, hoạt động) ── */
      case "class-delete": {
        const classId = sanitizeText(body?.classId, 64);
        if (!classId) return jsonError("Thiếu classId.", 400);
        await db.deleteClass(classId);
        return NextResponse.json({ ok: true });
      }

      /* ── GV: đuổi 1 học sinh khỏi lớp ── */
      case "kick": {
        const classId = sanitizeText(body?.classId, 64);
        const studentId = sanitizeText(body?.studentId, 64);
        if (!classId || !studentId) return jsonError("Thiếu classId/studentId.", 400);
        await db.removeMember(classId, studentId);
        return NextResponse.json({ ok: true });
      }

      /* ── GV: tạo bài tập ── */
      case "assignment": {
        const classId = sanitizeText(body?.classId, 64);
        const kind = sanitizeText(body?.kind, 20) as AssignmentKind;
        const title = sanitizeText(body?.title, 120);
        const lessonId = sanitizeText(body?.lessonId, 64) || undefined;
        if (!classId || !title || !["lab", "quiz", "personal_quiz"].includes(kind)) {
          return jsonError("Thiếu classId/title hoặc kind không hợp lệ.", 400);
        }
        const cls = await db.getClassById(classId);
        if (!cls) return jsonError("Không tìm thấy lớp.", 404);
        // Payload JSON tin từ GV (đã qua Bearer guard); kẹp kích thước chống abuse.
        const payload = body?.payload ?? null;
        if (JSON.stringify(payload).length > 200_000) {
          return jsonError("Payload bài tập quá lớn.", 413);
        }
        const dueAtRaw = Number(body?.dueAt);
        const openAtRaw = Number(body?.openAt);
        const durationRaw = Number(body?.durationSec);
        const linkedLabId = sanitizeText(body?.linkedLabId, 64) || null;
        const assignment: Assignment = await db.createAssignment({
          classId,
          kind,
          title,
          lessonId,
          payload,
          dueAt: Number.isFinite(dueAtRaw) && dueAtRaw > 0 ? dueAtRaw : null,
          openAt: Number.isFinite(openAtRaw) && openAtRaw > 0 ? openAtRaw : null,
          durationSec: Number.isFinite(durationRaw) && durationRaw > 0 ? Math.round(durationRaw) : null,
          linkedLabId,
        });
        return NextResponse.json({ ok: true, assignment });
      }

      /* ── GV: xoá bài tập ── */
      case "assignment-delete": {
        const id = sanitizeText(body?.assignmentId, 64);
        if (!id) return jsonError("Thiếu assignmentId.", 400);
        await db.deleteAssignment(id);
        return NextResponse.json({ ok: true });
      }

      /* ── HS: vào lớp bằng mã ── */
      case "join": {
        const code = sanitizeText(body?.code, 10).toUpperCase();
        const studentId = sanitizeText(body?.studentId, 64);
        const studentName = sanitizeText(body?.studentName, 60);
        if (!code || !studentId || !studentName) {
          return jsonError("Thiếu mã lớp hoặc thông tin học sinh.", 400);
        }
        const cls = await db.getClassByCode(code);
        if (!cls) {
          return jsonError(
            `Không tìm thấy lớp với mã "${code}". Kiểm tra lại mã giáo viên đã cho nhé.`,
            404
          );
        }
        await db.joinClass(cls.id, studentId, studentName);
        const members = await db.listMembers(cls.id);
        return NextResponse.json({ ok: true, class: cls, memberCount: members.length });
      }

      /* ── HS: ghi sự kiện hoạt động (fire-and-forget phía client) ── */
      case "activity": {
        const studentId = sanitizeText(body?.studentId, 64);
        const studentName = sanitizeText(body?.studentName, 60);
        const type = sanitizeText(body?.type, 20);
        if (!studentId || !["login", "lab_start", "lab_submit", "quiz_submit"].includes(type)) {
          return jsonError("Sự kiện không hợp lệ.", 400);
        }
        // Gắn sự kiện vào lớp hiện tại của HS (nếu có).
        const memberships = await db.listMembershipsOfStudent(studentId);
        await db.logActivity({
          studentId,
          studentName,
          classId: memberships[0]?.class.id ?? null,
          type: type as "login" | "lab_start" | "lab_submit" | "quiz_submit",
          meta: sanitizeText(body?.meta, 200) || null,
        });
        return NextResponse.json({ ok: true });
      }

      /* ── HS: nộp bài Lab (điểm re-verify trên server bằng gradeLesson) ── */
      case "submit-lab": {
        const assignmentId = sanitizeText(body?.assignmentId, 64);
        const studentId = sanitizeText(body?.studentId, 64);
        const studentName = sanitizeText(body?.studentName, 60);
        if (!assignmentId || !studentId || !studentName) {
          return jsonError("Thiếu thông tin nộp bài.", 400);
        }
        const assignment = await db.getAssignment(assignmentId);
        if (!assignment || assignment.kind !== "lab") {
          return jsonError("Không tìm thấy bài Lab.", 404);
        }

        // Kẹp kích thước + làm sạch trials.
        const rawTrials = Array.isArray(body?.trials) ? (body.trials as unknown[]) : [];
        if (rawTrials.length === 0) return jsonError("Chưa có số liệu đo.", 400);
        if (rawTrials.length > 200) return jsonError("Quá nhiều lần đo.", 413);
        const trials: RichTrial[] = rawTrials
          .map((t) => {
            const tr = t as Partial<RichTrial>;
            return {
              lab: (tr.lab === "average" || tr.lab === "instant" || tr.lab === "freefall"
                ? tr.lab
                : "freefall") as RichTrial["lab"],
              s: Number(tr.s) || 0,
              t: Number(tr.t) || 0,
              theta: tr.theta != null ? Number(tr.theta) : undefined,
              balanced: tr.balanced !== false,
              studentResult:
                tr.studentResult != null && Number.isFinite(Number(tr.studentResult))
                  ? Number(tr.studentResult)
                  : null,
            };
          })
          .filter((t) => t.t > 0 && t.s > 0);
        if (trials.length === 0) return jsonError("Số liệu đo không hợp lệ.", 400);

        // RE-VERIFY điểm trên server (không tin điểm client gửi lên).
        const samples: Partial<Record<LabKind, Trial[]>> = {};
        for (const tr of trials) {
          (samples[tr.lab] ||= []).push(tr);
        }
        const graphScore = Number(body?.graphScore);
        const hasGraph = Number.isFinite(graphScore);
        const assignmentPayload = assignment.payload as LabAssignmentPayload | null;
        const grade = gradeLesson(assignment.lessonId || "", samples, {
          hasGraph,
          graphScore: hasGraph ? Math.max(0, Math.min(10, graphScore)) : undefined,
          expectedTargets: assignmentPayload?.problemSets,
        });

        await db.upsertLabSubmission({
          assignmentId,
          studentId,
          studentName,
          payload: {
            trials,
            grade,
            aiFeedback: sanitizeText(body?.aiFeedback, 4000) || undefined,
          },
          score: grade.totalScore,
        });
        await db.logActivity({
          studentId, studentName,
          classId: assignment.classId,
          type: "lab_submit",
          meta: assignment.title,
        });
        return NextResponse.json({ ok: true, score: grade.totalScore });
      }

      /* ── HS: nộp quiz — SERVER chấm từ đáp án trong DB / đề tái sinh ── */
      case "submit-quiz": {
        const assignmentId = sanitizeText(body?.assignmentId, 64);
        const studentId = sanitizeText(body?.studentId, 64);
        const studentName = sanitizeText(body?.studentName, 60);
        if (!assignmentId || !studentId || !studentName) {
          return jsonError("Thiếu thông tin nộp bài.", 400);
        }
        const assignment = await db.getAssignment(assignmentId);
        if (!assignment || (assignment.kind !== "quiz" && assignment.kind !== "personal_quiz")) {
          return jsonError("Không tìm thấy bài quiz.", 404);
        }
        // Chưa tới giờ mở → chưa cho nộp.
        if (assignment.openAt && Date.now() < assignment.openAt) {
          return jsonError("Bài quiz chưa tới giờ mở.", 403);
        }
        if (JSON.stringify(body?.answers ?? null).length > 100_000) {
          return jsonError("Bài làm quá lớn.", 413);
        }
        const answers = (body?.answers ?? { part1: [], part2: [], part3: [] }) as MoeAnswers;

        // Lấy đề GỐC (kèm đáp án): quiz thường từ DB; personal_quiz tái sinh cùng seed.
        let quiz: MoeQuiz;
        if (assignment.kind === "quiz") {
          quiz = assignment.payload as MoeQuiz;
        } else {
          const payload = assignment.payload as PersonalQuizPayload;
          const sub = await db.getLabSubmission(payload.sourceAssignmentId, studentId);
          if (!sub || !(sub.payload?.trials?.length)) {
            return jsonError("Chưa có bài Lab nguồn để chấm quiz này.", 409);
          }
          quiz = generatePersonalQuiz(sub.payload.trials, `${assignmentId}::${studentId}`);
        }

        const result = gradeMoeQuiz(quiz, answers);
        await db.upsertQuizResult({
          assignmentId,
          studentId,
          studentName,
          answers,
          detail: result.perQuestion,
          score: result.score,
        });
        await db.logActivity({
          studentId, studentName,
          classId: assignment.classId,
          type: "quiz_submit",
          meta: assignment.title,
        });
        return NextResponse.json({ ok: true, result });
      }

      default:
        return jsonError(`Action POST không hợp lệ: ${action}`, 404);
    }
  } catch (err) {
    console.error(`class/${action} POST error:`, err);
    return jsonError("Lỗi hệ thống khi xử lý yêu cầu lớp học.", 500);
  }
}
