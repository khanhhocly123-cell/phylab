"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowDownRight, ArrowUpRight, BookOpen, Check, ChevronRight, Menu, Play, RotateCcw, X } from "lucide-react";
import styles from "./landing.module.css";

export function LandingMenu() {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); button.current?.focus(); } };
    const outside = (event: PointerEvent) => { if (event.target instanceof Node && !wrapper.current?.contains(event.target)) setOpen(false); };
    document.addEventListener("keydown", close);
    document.addEventListener("pointerdown", outside);
    return () => { document.removeEventListener("keydown", close); document.removeEventListener("pointerdown", outside); };
  }, [open]);
  return <div className={styles.mobileMenu} ref={wrapper}><button ref={button} type="button" className={styles.menuButton} aria-expanded={open} aria-controls="landing-mobile-nav" aria-label={open ? "Đóng menu" : "Mở menu"} onClick={() => setOpen(!open)}>{open ? <X size={22} /> : <Menu size={22} />}</button>{open && <nav id="landing-mobile-nav" className={styles.mobileNav} aria-label="Điều hướng trên điện thoại"><a href="#cach-hoc" onClick={()=>setOpen(false)}>Cách học <ArrowUpRight size={16} /></a><a href="#bai-thuc-hanh" onClick={()=>setOpen(false)}>Bài thực hành <ArrowUpRight size={16} /></a><a href="#giao-vien" onClick={()=>setOpen(false)}>Dành cho giáo viên <ArrowUpRight size={16} /></a></nav>}</div>;
}

const journeySteps = [
  { title: "Làm quen trước khi đo", tag: "PRELAB", description: "Khám phá dụng cụ và cách sử dụng. Chuẩn bị một chút để mỗi thao tác đều có ý nghĩa." },
  { title: "Tự tay làm thí nghiệm", tag: "PHÒNG LAB", description: "Lắp, chỉnh, thả thử rồi quan sát. Bạn có thể đổi góc nghiêng và thả bi ngay ở mô hình bên cạnh." },
  { title: "Để số liệu kể câu chuyện", tag: "SỔ BÁO CÁO", description: "Ghi kết quả, vẽ đồ thị và hoàn thành báo cáo. Kết nối số đo của mình với kiến thức trong sách." },
];

export function LearningJourney() {
  const [selected, setSelected] = useState(1);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  return <div className={styles.learningLayout}>
    <div role="tablist" aria-label="Ba chặng thực hành" aria-orientation="vertical" className={styles.learningTabs}>
      {journeySteps.map((step, index) => <button key={step.tag} ref={(element)=>{tabs.current[index]=element;}} type="button" role="tab" id={`learn-step-${index}`} aria-controls={`learn-panel-${index}`} aria-selected={selected===index} tabIndex={selected===index?0:-1} className={`${styles.learningTab} ${selected===index?styles.learningTabActive:""}`} onClick={()=>setSelected(index)} onKeyDown={(event)=>{let next=index;if(event.key==="ArrowDown"||event.key==="ArrowRight")next=(index+1)%3;else if(event.key==="ArrowUp"||event.key==="ArrowLeft")next=(index+2)%3;else if(event.key==="Home")next=0;else if(event.key==="End")next=2;else return;event.preventDefault();setSelected(next);tabs.current[next]?.focus();}}><span className={styles.learningNumber}>0{index+1}</span><span className={styles.learningTabText}><small>{step.tag}</small><strong>{step.title}</strong><span>{step.description}</span></span><ChevronRight size={18}/></button>)}
      <p className={styles.learningNote}><BookOpen size={16} /> Một quy trình trọn vẹn, từ chuẩn bị đến báo cáo.</p>
    </div>
    <div className={styles.learningPanels}>
      <div role="tabpanel" id="learn-panel-0" aria-labelledby="learn-step-0" hidden={selected!==0} tabIndex={0} className={`${styles.journeyPanel} ${styles.preparationPanel}`}>
        <div className={styles.previewHeading}><span>LÀM QUEN DỤNG CỤ</span><span>01 / PRELAB</span></div>
        <div className={styles.timerPreview}><span className={styles.timerAnnotation}>Chiếc đồng hồ của buổi thực hành</span><Image src="/lab/bai6/mc964_front.svg" width={345} height={180} alt="Mặt trước đồng hồ MC964: màn hình, núm chọn chế độ và nút Reset" /><span className={styles.timerBadge}><Check size={16} /> Quan sát trước, thao tác sau.</span></div>
        <div className={styles.preparationCopy}><h3>Hiểu dụng cụ. Tự tin bắt đầu.</h3><p>Trong app, Prelab hướng dẫn bạn làm quen với cổng quang, đồng hồ và các dụng cụ của từng bài.</p></div>
      </div>
      <div role="tabpanel" id="learn-panel-1" aria-labelledby="learn-step-1" hidden={selected!==1} tabIndex={0} className={styles.journeyPanel}><RampDemo /></div>
      <div role="tabpanel" id="learn-panel-2" aria-labelledby="learn-step-2" hidden={selected!==2} tabIndex={0} className={`${styles.journeyPanel} ${styles.reportPanel}`}>
        <div className={styles.previewHeading}><span>SỔ BÁO CÁO CỦA BẠN</span><span>03 / KẾT QUẢ</span></div>
        <div className={styles.reportPreview}><h3>Đo gia tốc rơi tự do</h3><p>Từ bảng số liệu đến đồ thị s theo t².</p><div className={styles.reportPreviewGrid}><table><caption>Số liệu minh họa</caption><thead><tr><th>Lần</th><th>s (m)</th><th>t (s)</th></tr></thead><tbody><tr><td>01</td><td>0,20</td><td>0,202</td></tr><tr><td>02</td><td>0,40</td><td>0,286</td></tr><tr><td>03</td><td>0,60</td><td>0,350</td></tr></tbody></table><svg viewBox="0 0 220 190" role="img" aria-label="Đồ thị minh họa quãng đường tỉ lệ với bình phương thời gian"><path d="M30 20V158H206" stroke="#a5ad99" fill="none"/>{[48,85,122].map(y=><path key={y} d={`M30 ${y}H202`} stroke="#e4e6d8" strokeDasharray="3 4"/>)}<path d="M30 156L195 37" stroke="#c76538" strokeWidth="2.5"/>{[[80,120],[130,84],[180,48]].map(([x,y])=><circle key={x} cx={x} cy={y} r="5" fill="#c76538" stroke="#fff" strokeWidth="2"/>)}<text x="8" y="19" fontSize="11" fill="#74796c">s</text><text x="193" y="178" fontSize="11" fill="#74796c">t²</text></svg></div><div className={styles.reportFormula}><span>GHI CHÚ THỰC HÀNH</span><strong>g = 2s / t²</strong></div></div>
      </div>
    </div>
  </div>;
}

export function RampDemo() {
  const [angle, setAngle] = useState(15);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"ready" | "running" | "done">("ready");
  const frame = useRef<number | null>(null);
  const startTime = useRef<number | null>(null);
  const reducedMotion = useRef(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotion.current = media.matches;
    const update = () => { reducedMotion.current = media.matches; };
    media.addEventListener("change", update);
    return () => { if (frame.current !== null) cancelAnimationFrame(frame.current); media.removeEventListener("change", update); };
  }, []);
  const radians = angle * Math.PI / 180;
  const travelTime = Math.sqrt(2 * 0.45 / ((5 / 7) * 9.8 * Math.sin(radians)));
  const startX = 120;
  const endX = 464;
  const endY = 293;
  const startY = endY - (endX - startX) * Math.tan(radians);
  const ballX = startX + (endX - startX) * progress * progress;
  const ballY = startY + (endY - startY) * progress * progress - 13;
  const gateX = endX - 16;
  const gateY = endY - 4;

  function run() {
    if (phase === "running") return;
    if (reducedMotion.current) { setProgress(1); setPhase("done"); return; }
    setProgress(0);
    setPhase("running");
    startTime.current = null;
    const animate = (now: number) => {
      if (startTime.current === null) startTime.current = now;
      const next = Math.min((now - startTime.current) / (travelTime * 1000), 1);
      setProgress(next);
      if (next < 1) frame.current = requestAnimationFrame(animate);
      else { setPhase("done"); frame.current = null; }
    };
    frame.current = requestAnimationFrame(animate);
  }

  return <div className={styles.demo}>
    <div className={styles.demoTop}><span><span className={styles.demoLiveDot} /> GÓC THÍ NGHIỆM NHỎ</span><span>01 / CƠ HỌC</span></div>
    <div className={styles.demoStage}>
      <svg className={styles.rampSvg} viewBox="0 0 580 390" role="img" aria-label={`Minh họa viên bi lăn xuống máng nghiêng ${angle} độ, quãng đường 0,45 mét`}>
        <defs>
          <linearGradient id="landing-metal" x1="0" y1="0" x2="0.8" y2="1"><stop offset="0" stopColor="#fffcf0" /><stop offset="0.3" stopColor="#acbcb5" /><stop offset="0.7" stopColor="#51685f" /><stop offset="1" stopColor="#233c34" /></linearGradient>
          <linearGradient id="landing-rail" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#8ba499" /><stop offset="1" stopColor="#43685b" /></linearGradient>
          <pattern id="landing-grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="#8e9d85" strokeWidth="0.55" opacity="0.21" /></pattern>
          <radialGradient id="landing-ball"><stop offset="0" stopColor="#ffffff" /><stop offset="0.28" stopColor="#dadcd7" /><stop offset="0.68" stopColor="#8c9b94" /><stop offset="1" stopColor="#3a5147" /></radialGradient>
        </defs>
        <rect width="580" height="390" fill="url(#landing-grid)" />
        <ellipse cx="302" cy="339" rx="232" ry="16" fill="#45533b" opacity="0.07" />
        <path d="M77 326 H511" stroke="#aeb7a7" strokeWidth="1" />
        <path d={`M130 ${startY+8} V321 M122 321 H160 M460 306 V321 M439 321 H486`} fill="none" stroke="#9baea3" strokeWidth="8" strokeLinecap="round" />
        <path d={`M130 ${startY+8} V316 M460 306 V318`} fill="none" stroke="#d3dad2" strokeWidth="3" />
        <path d={`M${startX-22} ${startY-5} L${endX+23} ${endY+3} L${endX+23} ${endY+18} L${startX-22} ${startY+10} Z`} fill="url(#landing-rail)" stroke="#416653" strokeWidth="1" />
        <path d={`M${startX-22} ${startY-5} L${endX+23} ${endY+3}`} stroke="#d7dfcc" strokeWidth="4" />
        <path d={`M${startX-22} ${startY+5} L${endX+23} ${endY+13}`} stroke="#315442" strokeWidth="1" opacity="0.45" />
        {Array.from({length:20}, (_,i)=>{const x=startX+(endX-startX)*i/20;const y=startY+(endY-startY)*i/20;return <path key={i} d={`M${x} ${y+7} v${i%5===0?7:4}`} stroke="#dbe6d5" strokeWidth="1" />;})}
        <path d={`M${startX} ${startY+42} L${endX-20} ${endY+42}`} stroke="#bc8b61" strokeWidth="1" strokeDasharray="4 5" />
        <text x="257" y={(startY+endY)/2+62} fontSize="13" fill="#a67651" fontFamily="monospace" transform={`rotate(${angle},257,${(startY+endY)/2+62})`}>s = 0,45 m</text>
        <path d={`M${gateX+12} ${gateY+6} C${gateX+62} ${gateY+49},525 204,500 183`} fill="none" stroke="#ba7149" strokeWidth="2.5" />
        <g transform={`translate(${gateX-10} ${gateY-42}) rotate(${angle} 17 42)`}><path d="M0 49 V0 H39 V49 H30 V10 H9 V49Z" fill="#db8a54" stroke="#ac6039" strokeWidth="1.5" /><path d="M1 1 H39 V9 H1" fill="#e9aa7a" /><circle cx="19" cy="5" r="2" fill={phase==="done"?"#bce2ae":"#fae2a7"} /><path d="M9 23 H30" stroke="#e89369" strokeDasharray="2 2" /><text x="19" y="-9" textAnchor="middle" fontSize="11" fill="#856b53">CỔNG QUANG</text></g>
        <circle cx={ballX+3} cy={ballY+10} r="12" fill="#284837" opacity="0.1" />
        <circle cx={ballX} cy={ballY} r="13" fill="url(#landing-ball)" stroke="#6d8073" strokeWidth="0.7" />
        <circle cx={ballX-4} cy={ballY-5} r="3.2" fill="#fff" opacity="0.65" />
        <g transform="translate(344 70) rotate(5)"><rect x="3" y="6" width="178" height="104" rx="8" fill="#b6b7a5" opacity="0.15" /><rect width="178" height="104" rx="8" fill="#f6f2e6" stroke="#b2b7a5" strokeWidth="1.5" /><rect x="8" y="9" width="162" height="85" rx="4" fill="none" stroke="#dbd7c7" /><text x="20" y="29" fill="#827d69" fontSize="9" letterSpacing="2">ĐỒNG HỒ HIỆN SỐ</text><rect x="17" y="37" width="112" height="38" rx="3" fill="#314a3d" /><text x="72" y="65" fill="#e7ebc9" fontFamily="monospace" fontSize="24" textAnchor="middle">{(travelTime * progress).toFixed(3)}</text><text x="139" y="61" fontSize="10" fill="#756e5c">s</text><circle cx="148" cy="79" r="6" fill="#c7693f" /><text x="20" y="87" fontSize="8" fill="#b16a45">PhyLab / MC964</text></g>
        <path d={`M95 ${startY-28} Q80 ${startY-56} 43 ${startY-46}`} stroke="#8b9b83" fill="none" strokeWidth="1.2" /><text x="25" y={startY-56} fill="#6f7e65" fontSize="12" fontStyle="italic">bắt đầu ở đây</text>
        <text x="48" y="364" fill="#879179" fontSize="10" letterSpacing="2">QUAN SÁT → ĐO ĐẠC → KHÁM PHÁ</text>
      </svg>
      <div className={styles.demoHint}><ArrowDownRight size={17} /><span>Đổi góc, xem điều gì xảy ra.</span></div>
    </div>
    <div className={styles.demoControls}><div className={styles.angleControl}><label htmlFor="landing-angle">Góc nghiêng <strong>{angle}°</strong></label><input id="landing-angle" type="range" min="10" max="30" step="5" value={angle} disabled={phase==="running"} onChange={(event)=>{setAngle(Number(event.target.value));setProgress(0);setPhase("ready");}} /></div><button type="button" onClick={run} disabled={phase==="running"} className={styles.releaseButton}>{phase==="done"?<RotateCcw size={15}/>:<Play size={15} fill="currentColor"/>}{phase==="running"?"Đang lăn…":phase==="done"?"Thử lại nhé":"Thả bi thử"}</button></div>
    <p className={styles.demoDisclaimer} aria-live="polite">{phase==="done"?`Ở góc ${angle}°, viên bi đi 0,45 m trong ${travelTime.toFixed(3)} s.`:"Mô hình minh họa bi lăn · Hãy thử ngay tại đây"}</p>
  </div>;
}
