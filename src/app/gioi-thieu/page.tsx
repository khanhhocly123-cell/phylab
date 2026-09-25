import type { Metadata, Viewport } from "next";
import Image from "next/image";
import { ArrowDown, ArrowRight, ArrowUpRight, BookOpen, Check, ChevronRight, FlaskConical, GraduationCap, MousePointer2, ScanLine, Send, Sparkles, MoveUpRight, Plus } from "lucide-react";
import Logo from "@/components/Logo";
import { EXPERIMENT_SPECS } from "@/experiments/specs";
import { LandingMenu, LearningJourney } from "./interactions";
import styles from "./landing.module.css";

export const metadata: Metadata = {
  title: "PhyLab — Tự tay đo. Tự mình hiểu.",
  description: "Khám phá 5 bài thực hành Vật lí 10–11 trên trình duyệt. Làm quen dụng cụ, tự tay đo số liệu, vẽ đồ thị và hoàn thành báo cáo cùng PhyLab.",
  openGraph: {
    title: "PhyLab — Tự tay đo. Tự mình hiểu.",
    description: "Một phòng thí nghiệm, vô vàn điều để khám phá. Thực hành Vật lí ngay trên trình duyệt.",
    locale: "vi_VN",
    type: "website",
  },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 5, themeColor: "#f8f5ed" };

const labs = [
  { id: "do-toc-do-vat-chuyen-dong", image: "/images/marble_ramp.webp", number: "01", grade: "VẬT LÍ 10", lesson: "BÀI 6", category: "Cơ học", description: "Thả bi trên máng nghiêng, đo thời gian và khám phá tốc độ chuyển động.", formula: "v = d / Δt", color: "peach" },
  { id: "do-gia-toc-roi-tu-do", image: "/images/free_fall.webp", number: "02", grade: "VẬT LÍ 10", lesson: "BÀI 11", category: "Cơ học", description: "Từ một lần thả rơi, tự tìm ra gia tốc trọng trường qua những con số.", formula: "g = 2s / t²", color: "sage" },
  { id: "dinh-luat-2-newton", image: "/images/newton2_airtrack.webp", number: "03", grade: "VẬT LÍ 10", lesson: "BÀI 15", category: "Cơ học", description: "Treo quả nặng, thả xe trên đệm khí và tự thấy gia tốc tỉ lệ thuận với lực, tỉ lệ nghịch với khối lượng.", formula: "a = F / m", color: "peach" },
  { id: "do-dien-tro-dinh-luat-ohm", image: "/images/do-dien-tro-ohm.png", number: "04", grade: "VẬT LÍ 11", lesson: "BÀI 23", category: "Điện học", description: "Nối mạch, đọc đồng hồ và tìm mối liên hệ giữa hiệu điện thế và dòng điện.", formula: "R = U / I", color: "blue" },
  { id: "do-suat-dien-dong-pin-dien-hoa", image: "/images/do-suat-dien-dong.png", number: "05", grade: "VẬT LÍ 11", lesson: "BÀI 26", category: "Điện học", description: "Đo các cặp số liệu U–I để khám phá suất điện động của một viên pin.", formula: "U = ℰ − Ir", color: "yellow" },
];

function SectionLabel({ number, children }: { number: string; children: React.ReactNode }) {
  return <div className={styles.sectionLabel}><span>{number}</span>{children}</div>;
}

export default function LandingPage() {
  return (
    <div id="top" className={styles.page}>
      <a href="#noi-dung" className={styles.skipLink}>Đến nội dung chính</a>
      <header className={styles.header}>
        <div className={styles.navInner}>
          <a href="#top" className={styles.brand} aria-label="PhyLab — trang giới thiệu"><Logo size={37} /><span>PhyLab<span className={styles.brandDot}>.</span></span></a>
          <nav className={styles.desktopNav} aria-label="Điều hướng chính">
            <a href="#cach-hoc">Cách học</a><a href="#bai-thuc-hanh">Bài thực hành</a><a href="#giao-vien">Dành cho giáo viên</a>
          </nav>
          <div className={styles.navActions}><a href="/dang-ky" className={styles.navCta}>Đăng ký <ArrowUpRight size={17} /></a><LandingMenu /></div>
        </div>
      </header>

      <main id="noi-dung">
        <section className={`${styles.hero} ${styles.container}`} aria-labelledby="hero-title">
          <div className={styles.heroCopy}>
            <div className={styles.eyebrow}><span className={styles.statusDot} /> PHÒNG THÍ NGHIỆM VẬT LÍ TƯƠNG TÁC</div>
            <h1 id="hero-title">Tự tay đo.<br />Tự mình <span className={styles.heroAccent}>hiểu.<svg viewBox="0 0 220 18" aria-hidden="true"><path d="M4 12 Q95 0 214 9 M20 17 Q115 6 198 15" /></svg></span></h1>
            <p className={styles.heroDescription}>Những công thức sẽ thú vị hơn<br className={styles.desktopBreak} /> khi chính bạn làm ra số liệu.</p>
            <p className={styles.heroBody}>Lắp dụng cụ, thả bi, nối mạch và vẽ đồ thị. PhyLab đưa cả buổi thực hành Vật lí đến ngay trên màn hình của bạn.</p>
            <div className={styles.heroButtons}><a href="#cach-hoc" className={styles.primaryButton}>Thử mô phỏng <ArrowUpRight size={20} /></a><a href="#bai-thuc-hanh" className={styles.textButton}>Xem bài thực hành <ArrowDown size={17} /></a></div>
            <div className={styles.heroFootnote}><span><Check size={14} /> Học trên trình duyệt</span><i /> <span>Dành cho học sinh lớp 10–11</span></div>
          </div>
          <div className={styles.heroVisual}>
            <div className={styles.heroOrbit} aria-hidden="true" />
            <div className={styles.heroPicture}>
              <div className={styles.pictureBar}><span className={styles.pictureDots}><i /><i /><i /></span><span>phylab / phòng thí nghiệm</span><span className={styles.pictureStatus}><i /> Sẵn sàng khám phá</span></div>
              <div className={styles.heroImageWrap}><Image src="/images/marble_ramp.webp" alt="Minh họa máng nghiêng, viên bi và cổng quang trong bài thực hành đo tốc độ" fill priority sizes="(max-width: 700px) 95vw, 55vw" /><span className={styles.heroImageTag}><FlaskConical size={15} /> Bài 6 · Vật lí 10</span><div className={styles.heroImageBottom}><span>01 / CƠ HỌC</span><strong>Một viên bi.<br />Cả một thế giới chuyển động.</strong><span>Hình minh họa bài thực hành</span></div></div>
            </div>
            <div className={styles.discoveryNote}><span className={styles.discoveryIcon}><MoveUpRight size={23} /></span><div><small>TỪ QUAN SÁT ĐẾN KHÁM PHÁ</small><strong>À, thì ra là vậy!</strong><span>Hiểu bài theo cách của bạn.</span></div><Sparkles size={21} /></div>
            <a href="#cach-hoc" className={styles.heroTryLink}><span className={styles.tryDot} /> Có mô hình tương tác để bạn thử ngay <ArrowDown size={14} /></a>
          </div>
        </section>

        <div className={styles.factsBand}><div className={`${styles.container} ${styles.factsInner}`}><p><span className={styles.factNumber}>{String(labs.length).padStart(2, "0")}</span><span>bài thực hành<br /><strong>sẵn sàng khám phá</strong></span></p><div className={styles.factDivider} /><p><BookOpen strokeWidth={1.5} /><span>Bám theo bài học<br /><strong>Vật lí 10 & 11</strong></span></p><div className={styles.factDivider} /><p><MousePointer2 strokeWidth={1.5} /><span>Từ thao tác đầu tiên<br /><strong>đến báo cáo của bạn</strong></span></p><span className={styles.factDoodle} aria-hidden="true">F = ma <Sparkles size={23} /></span></div></div>

        <section id="cach-hoc" className={`${styles.journeySection} ${styles.container}`} aria-labelledby="journey-title">
          <div className={styles.sectionHeader}><div><SectionLabel number="01">HỌC BẰNG CÁCH LÀM</SectionLabel><h2 id="journey-title">Một buổi thực hành.<br /><span className={styles.serif}>Ba chặng khám phá.</span></h2></div><p>Đi từng bước, từ “cái này dùng thế nào?”<br />đến “mình đã hiểu vì sao”.</p></div>
          <LearningJourney />
        </section>

        <section id="bai-thuc-hanh" className={styles.labsSection} aria-labelledby="labs-title"><div className={styles.container}>
          <div className={styles.sectionHeader}><div><SectionLabel number="02">TỦ THÍ NGHIỆM</SectionLabel><h2 id="labs-title">Hôm nay, bạn<br />muốn <span className={styles.serif}>khám phá gì?</span></h2></div><a href="#cach-hoc" className={styles.outlineButton}>Thử mô phỏng <ArrowUpRight size={18} /></a></div>
          <div className={styles.labGrid}>{labs.map((lab) => <article className={styles.labCard} key={lab.id}><div className={styles.labImageLink}><div className={styles.labImage}><Image src={lab.image} alt="" fill sizes="(max-width: 480px) 92vw, (max-width: 1100px) 44vw, 270px" /><span className={styles.labCategory}>{lab.category}</span><span className={styles.labNumber}>{lab.number}</span></div></div><div className={styles.labContent}><div className={styles.labMeta}>{lab.grade}<span />{lab.lesson}</div><h3>{EXPERIMENT_SPECS[lab.id].title}</h3><p>{lab.description}</p><div className={styles.labBottom}><details className={styles.labDetails}><summary aria-label={`Tìm hiểu thêm: ${EXPERIMENT_SPECS[lab.id].title}`}><span className={styles.formula}>{lab.formula}</span><span>Tìm hiểu thêm <Plus size={16} /></span></summary><ul>{EXPERIMENT_SPECS[lab.id].steps.map(step=><li key={step.id}>{step.title}</li>)}</ul></details></div></div></article>)}</div>
          <p className={styles.labsFootnote}><BookOpen size={15} /> Nội dung theo sách Kết nối tri thức với cuộc sống.</p>
        </div></section>

        <section id="giao-vien" className={`${styles.teacherSection} ${styles.container}`} aria-labelledby="teacher-title"><div className={styles.teacherCopy}><SectionLabel number="03">GÓC DÀNH CHO GIÁO VIÊN</SectionLabel><h2 id="teacher-title">Hiểu từng bài làm.<br /><span className={styles.serif}>Đồng hành cả lớp.</span></h2><p>Một nơi để giao bài thực hành, tạo quiz và theo dõi bài nộp. Thầy cô có thêm góc nhìn về quá trình học của từng học sinh.</p><ul className={styles.teacherBenefits}><li><Check size={17} /> Tạo lớp và mời học sinh bằng mã tham gia</li><li><Check size={17} /> Giao bài thực hành và câu hỏi ôn tập</li><li><Check size={17} /> Theo dõi bài nộp, xem bảng điểm của lớp</li></ul><p className={styles.teacherFootnote}><Sparkles size={17} /> Đồng hành ở từng bước học.</p></div><div className={styles.teacherVisual}><div className={styles.teacherPaper}><div className={styles.paperTop}><div className={styles.classIcon}><GraduationCap size={25} /></div><div><small>KHÔNG GIAN GIẢNG DẠY</small><strong>Lớp học của tôi</strong></div><span className={styles.paperDots}>•••</span></div><div className={styles.classAssignment}><span className={styles.assignmentIcon}><FlaskConical size={20} /></span><div><strong>Đo gia tốc rơi tự do</strong><span>Vật lí 10 · Bài thực hành 11</span></div><ChevronRight size={18} /></div><div className={styles.submissionHeading}><span>QUÁ TRÌNH THỰC HÀNH</span><span>BÀI NỘP</span></div>{[{ initials: "A", label: "Học sinh A", status: "Đã nộp báo cáo", done: true }, { initials: "B", label: "Học sinh B", status: "Đang thực hành", done: false }, { initials: "C", label: "Học sinh C", status: "Đã nộp báo cáo", done: true }].map((student)=><div className={styles.studentRow} key={student.initials}><span className={styles.studentAvatar}>{student.initials}</span><strong>{student.label}</strong><span className={student.done ? styles.submitted : styles.inProgress}>{student.done && <Check size={12} />}{student.status}</span></div>)}<div className={styles.paperFooter}><span>Dữ liệu minh họa giao diện</span><span>Theo dõi quá trình học <ArrowRight size={13} /></span></div></div><div className={styles.teacherAnnotation}><Send size={17} /><span>Giao bài gọn hơn.<br />Theo sát học sinh hơn.</span></div></div></section>

        <section className={`${styles.scanSection} ${styles.container}`} aria-labelledby="scan-title"><div className={styles.scanIllustration} aria-hidden="true"><div className={styles.scanPage}><span>VẬT LÍ 10</span><strong>11</strong><p>Thực hành<br />Đo gia tốc rơi tự do</p><div className={styles.scanPageLines} /><span className={styles.scanFormula}>g = 2s / t²</span></div><div className={styles.scanFrame}><span /><span /><span /><span /><ScanLine size={30} /></div></div><div className={styles.scanCopy}><div className={styles.smallEyebrow}><ScanLine size={16} /> TỪ TRANG SÁCH ĐẾN PHÒNG LAB</div><h2 id="scan-title">Thấy trong sách.<br /><span className={styles.serif}>Thử trên PhyLab.</span></h2><p>Chụp trang bài thực hành để PhyLab gợi ý bài tương ứng. Một cách bắt đầu khác cho sự tò mò của bạn.</p><a href="#bai-thuc-hanh" className={styles.textButton}>Xem các bài thực hành <ArrowUpRight size={17} /></a></div></section>

        <section className={styles.finalSection} aria-labelledby="final-title"><div className={styles.finalOrbit} aria-hidden="true"><span>φ</span></div><div className={styles.container}><span className={styles.finalEyebrow}>BÀI HỌC TIẾP THEO BẮT ĐẦU TỪ BẠN</span><h2 id="final-title">Sự tò mò của bạn.<br /><span className={styles.serif}>Phòng lab của chúng mình.</span></h2><a href="#cach-hoc" className={styles.finalButton}>Thử mô phỏng ngay <ArrowUpRight size={20} /></a><p>Thử một lần. Hiểu thêm một chút.</p></div></section>
      </main>

      <footer className={styles.footer}><div className={`${styles.container} ${styles.footerInner}`}><div><a href="#top" className={styles.brand}><Logo size={30} /><span>PhyLab<span className={styles.brandDot}>.</span></span></a><p>Mang thực hành đến gần hơn với mỗi bài học.</p></div><nav aria-label="Điều hướng cuối trang"><a href="#cach-hoc">Cách học</a><a href="#bai-thuc-hanh">Bài thực hành</a><a href="#top">Về đầu trang <ArrowUpRight size={14} /></a></nav><span className={styles.copyright}>© 2026 PhyLab<br />Được làm từ sự tò mò.</span></div></footer>
    </div>
  );
}
