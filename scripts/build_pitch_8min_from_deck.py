from __future__ import annotations

from pathlib import Path
from typing import Iterable

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK, WD_LINE_SPACING
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor


SOURCE = Path(r"C:\Users\leose\Downloads\PhyLab_KichBan_Pitch_8phut_2.docx")
OUTDIR = Path(r"E:\App\RealPhyLab\xnx\outputs")
OUTPUT = OUTDIR / "PhyLab_KichBan_Pitch_8phut_QA_Playbook_v2.docx"


ORANGE = "D56A17"
ORANGE_2 = "E8842B"
BLUE = "1F4D78"
BLUE_DARK = "173A5E"
BROWN = "3E2718"
MUTED = "7A6A58"
GRAY = "888888"
CREAM = "F7EFE5"
CREAM_2 = "FBF7F1"
PALE_BLUE = "D9E4F0"
PALE_ORANGE = "FCE8D5"
PALE_GREEN = "E6F0DF"
GREEN = "4F8B3F"
RED = "B54A3A"
WHITE = "FFFFFF"


def rgb(hex_color: str) -> RGBColor:
    return RGBColor.from_string(hex_color)


def set_cell_shading(cell, fill: str) -> None:
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = tc_pr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        tc_pr.append(shd)
    shd.set(qn("w:fill"), fill)


def set_cell_margins(cell, top=90, start=110, bottom=90, end=110) -> None:
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    tc_mar = tc_pr.first_child_found_in("w:tcMar")
    if tc_mar is None:
        tc_mar = OxmlElement("w:tcMar")
        tc_pr.append(tc_mar)
    for tag, value in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        node = tc_mar.find(qn(f"w:{tag}"))
        if node is None:
            node = OxmlElement(f"w:{tag}")
            tc_mar.append(node)
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")


def set_repeat_table_header(row) -> None:
    tr_pr = row._tr.get_or_add_trPr()
    tbl_header = OxmlElement("w:tblHeader")
    tbl_header.set(qn("w:val"), "true")
    tr_pr.append(tbl_header)


def prevent_row_split(row) -> None:
    tr_pr = row._tr.get_or_add_trPr()
    cant_split = OxmlElement("w:cantSplit")
    tr_pr.append(cant_split)


def set_table_borders(table, color="E5D4C1", size="6") -> None:
    tbl_pr = table._tbl.tblPr
    borders = tbl_pr.first_child_found_in("w:tblBorders")
    if borders is None:
        borders = OxmlElement("w:tblBorders")
        tbl_pr.append(borders)
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        tag = borders.find(qn(f"w:{edge}"))
        if tag is None:
            tag = OxmlElement(f"w:{edge}")
            borders.append(tag)
        tag.set(qn("w:val"), "single")
        tag.set(qn("w:sz"), size)
        tag.set(qn("w:space"), "0")
        tag.set(qn("w:color"), color)


def clear_body(doc: Document) -> None:
    body = doc._element.body
    for child in list(body):
        if child.tag != qn("w:sectPr"):
            body.remove(child)


def add_page_field(paragraph) -> None:
    run = paragraph.add_run()
    fld_char_begin = OxmlElement("w:fldChar")
    fld_char_begin.set(qn("w:fldCharType"), "begin")
    instr_text = OxmlElement("w:instrText")
    instr_text.set(qn("xml:space"), "preserve")
    instr_text.text = " PAGE "
    fld_char_end = OxmlElement("w:fldChar")
    fld_char_end.set(qn("w:fldCharType"), "end")
    run._r.append(fld_char_begin)
    run._r.append(instr_text)
    run._r.append(fld_char_end)


def configure_styles(doc: Document) -> None:
    normal = doc.styles["Normal"]
    normal.font.name = "Calibri"
    normal.font.size = Pt(10.5)
    normal.font.color.rgb = rgb(BROWN)
    normal.paragraph_format.space_after = Pt(4)
    normal.paragraph_format.line_spacing = 1.08

    defs = {
        "Pitch Title": (32, ORANGE, True, 0, 0),
        "Pitch Subtitle": (15, BLUE, True, 0, 4),
        "Pitch Section": (18, BLUE_DARK, True, 14, 6),
        "Pitch Slide": (14, ORANGE, True, 10, 4),
        "Pitch Body": (10.5, BROWN, False, 0, 5),
        "Pitch Cue": (9.5, MUTED, False, 0, 4),
        "Pitch Note": (9.5, BLUE, False, 0, 4),
        "Pitch Small": (9, MUTED, False, 0, 2),
    }
    for name, (size, color, bold, before, after) in defs.items():
        if name not in doc.styles:
            style = doc.styles.add_style(name, 1)
        else:
            style = doc.styles[name]
        style.font.name = "Calibri"
        style.font.size = Pt(size)
        style.font.color.rgb = rgb(color)
        style.font.bold = bold
        style.paragraph_format.space_before = Pt(before)
        style.paragraph_format.space_after = Pt(after)
        style.paragraph_format.line_spacing = 1.08


def add_run(paragraph, text: str, *, bold=False, italic=False, color=BROWN, size=None) -> None:
    run = paragraph.add_run(text)
    run.font.name = "Calibri"
    run.bold = bold
    run.italic = italic
    run.font.color.rgb = rgb(color)
    if size:
        run.font.size = Pt(size)


def add_mixed_paragraph(doc: Document, parts: Iterable[tuple[str, dict]], style="Pitch Body", align=None):
    p = doc.add_paragraph(style=style)
    if align is not None:
        p.alignment = align
    for text, kwargs in parts:
        add_run(p, text, **kwargs)
    return p


def add_banner(doc: Document, text: str, fill=ORANGE, color=WHITE) -> None:
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = True
    cell = table.cell(0, 0)
    set_cell_shading(cell, fill)
    set_cell_margins(cell, top=100, bottom=100, start=140, end=140)
    p = cell.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(0)
    add_run(p, text, bold=True, color=color, size=11)
    doc.add_paragraph().paragraph_format.space_after = Pt(1)


def add_callout(doc: Document, title: str, body: str, fill=CREAM, accent=ORANGE) -> None:
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(table, color=accent, size="8")
    cell = table.cell(0, 0)
    set_cell_shading(cell, fill)
    set_cell_margins(cell, top=120, bottom=120, start=140, end=140)
    p = cell.paragraphs[0]
    p.paragraph_format.space_after = Pt(2)
    add_run(p, title, bold=True, color=accent, size=10.5)
    p2 = cell.add_paragraph()
    p2.paragraph_format.space_after = Pt(0)
    add_run(p2, body, color=BROWN, size=10)
    doc.add_paragraph().paragraph_format.space_after = Pt(1)


def add_slide_header(doc: Document, no: int, title: str, speaker: str, seconds: int) -> None:
    table = doc.add_table(rows=1, cols=2)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    table.columns[0].width = Inches(4.75)
    table.columns[1].width = Inches(1.35)
    left, right = table.rows[0].cells
    set_cell_shading(left, BLUE_DARK)
    set_cell_shading(right, ORANGE)
    for c in (left, right):
        set_cell_margins(c, top=95, bottom=95, start=125, end=125)
        c.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
    p = left.paragraphs[0]
    p.paragraph_format.space_after = Pt(0)
    add_run(p, f"SLIDE {no} · {title}", bold=True, color=WHITE, size=12)
    p2 = right.paragraphs[0]
    p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p2.paragraph_format.space_after = Pt(0)
    add_run(p2, f"{speaker}\n~{seconds}s", bold=True, color=WHITE, size=9.5)
    doc.add_paragraph().paragraph_format.space_after = Pt(1)


def cue(doc: Document, text: str) -> None:
    p = doc.add_paragraph(style="Pitch Cue")
    p.paragraph_format.left_indent = Inches(0.12)
    p.paragraph_format.right_indent = Inches(0.12)
    add_run(p, f"[{text}]", italic=True, color=MUTED, size=9.5)


def speech(doc: Document, text: str, *, emphasis: str | None = None) -> None:
    p = doc.add_paragraph(style="Pitch Body")
    p.paragraph_format.left_indent = Inches(0.10)
    p.paragraph_format.right_indent = Inches(0.06)
    if emphasis:
        add_run(p, emphasis + " ", bold=True, color=ORANGE, size=10.5)
    add_run(p, text, color=BROWN, size=10.5)


def bullet(doc: Document, text: str, *, color=BROWN, level=0, bold_prefix: str | None = None) -> None:
    p = doc.add_paragraph(style="Pitch Body")
    p.style = doc.styles["List Bullet"]
    p.paragraph_format.left_indent = Inches(0.22 + 0.22 * level)
    p.paragraph_format.first_line_indent = Inches(-0.12)
    p.paragraph_format.space_after = Pt(2)
    if bold_prefix and text.startswith(bold_prefix):
        add_run(p, bold_prefix, bold=True, color=color, size=10)
        add_run(p, text[len(bold_prefix):], color=color, size=10)
    else:
        add_run(p, text, color=color, size=10)


def numbered_step(doc: Document, title: str, body: str) -> None:
    p = doc.add_paragraph(style="List Number")
    p.paragraph_format.left_indent = Inches(0.28)
    p.paragraph_format.first_line_indent = Inches(-0.14)
    p.paragraph_format.space_after = Pt(5)
    add_run(p, title + " — ", bold=True, color=ORANGE, size=10.5)
    add_run(p, body, color=BROWN, size=10.5)


def qa_block(doc: Document, question: str, route: str, answer: str, pressure: str | None = None) -> None:
    p = doc.add_paragraph(style="Pitch Slide")
    p.paragraph_format.keep_with_next = True
    add_run(p, "Q · " + question, bold=True, color=ORANGE, size=11.5)
    p = doc.add_paragraph(style="Pitch Note")
    p.paragraph_format.keep_with_next = True
    add_run(p, "Đường suy nghĩ: ", bold=True, color=BLUE, size=9.5)
    add_run(p, route, italic=True, color=BLUE, size=9.5)
    p = doc.add_paragraph(style="Pitch Body")
    p.paragraph_format.left_indent = Inches(0.10)
    p.paragraph_format.right_indent = Inches(0.06)
    add_run(p, answer, color=BROWN, size=10.25)
    if pressure:
        p = doc.add_paragraph(style="Pitch Small")
        p.paragraph_format.left_indent = Inches(0.18)
        add_run(p, "Nếu bị hỏi tiếp: ", bold=True, color=RED, size=9)
        add_run(p, pressure, color=MUTED, size=9)


def page_break(doc: Document) -> None:
    p = doc.add_paragraph()
    p.add_run().add_break(WD_BREAK.PAGE)


def add_timing_table(doc: Document) -> None:
    rows = [
        ("1", "Bìa / Hook", "Khánh", "28"),
        ("2", "Vấn đề", "Khánh", "35"),
        ("3", "Giải pháp AI", "Khánh", "38"),
        ("4", "Vì sao PhyLab", "Khánh", "25"),
        ("5", "★ Live demo", "Khánh", "145"),
        ("6", "Thị trường", "Nguyên", "24"),
        ("7", "Tài chính / chi phí AI", "Nguyên", "65"),
        ("8", "GTM", "Nguyên", "21"),
        ("9", "Nguồn lực", "Hồng", "23"),
        ("10", "Khách hàng mục tiêu", "Hồng", "22"),
        ("11", "Rủi ro & lớp phòng thủ", "Toàn", "29"),
        ("12", "Đội ngũ / CTA", "Khánh", "25"),
    ]
    table = doc.add_table(rows=1, cols=4)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    widths = [0.55, 3.60, 1.20, 0.75]
    headers = ["Slide", "Nội dung", "Người", "Giây"]
    for idx, (cell, width, label) in enumerate(zip(table.rows[0].cells, widths, headers)):
        cell.width = Inches(width)
        set_cell_shading(cell, BLUE_DARK)
        set_cell_margins(cell, top=70, bottom=70, start=80, end=80)
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER if idx != 1 else WD_ALIGN_PARAGRAPH.LEFT
        add_run(p, label, bold=True, color=WHITE, size=9)
    set_repeat_table_header(table.rows[0])
    for i, row_data in enumerate(rows):
        cells = table.add_row().cells
        prevent_row_split(table.rows[-1])
        for idx, (cell, value, width) in enumerate(zip(cells, row_data, widths)):
            cell.width = Inches(width)
            set_cell_shading(cell, CREAM_2 if i % 2 == 0 else WHITE)
            set_cell_margins(cell, top=55, bottom=55, start=80, end=80)
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER if idx != 1 else WD_ALIGN_PARAGRAPH.LEFT
            add_run(p, value, bold=(idx == 0 or value == "145"), color=ORANGE if value == "145" else BROWN, size=9)
    total = table.add_row().cells
    for c in total:
        set_cell_shading(c, PALE_ORANGE)
    total[0].merge(total[2])
    p = total[0].paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    add_run(p, "TỔNG", bold=True, color=ORANGE, size=9.5)
    p = total[3].paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    add_run(p, "480s = 8:00", bold=True, color=ORANGE, size=9.5)
    set_table_borders(table)


def build() -> Path:
    OUTDIR.mkdir(parents=True, exist_ok=True)
    # Rebuild with the visual language distilled from the supplied script:
    # A4, Calibri, warm brown body text, orange/blue emphasis, compact tables.
    doc = Document()
    configure_styles(doc)

    sec = doc.sections[0]
    sec.top_margin = Inches(0.63)
    sec.bottom_margin = Inches(0.63)
    sec.left_margin = Inches(0.72)
    sec.right_margin = Inches(0.72)

    header = sec.header.paragraphs[0]
    header.alignment = WD_ALIGN_PARAGRAPH.LEFT
    header.paragraph_format.space_after = Pt(0)
    add_run(header, "PhyLab · AI-mant · Kịch bản pitch 8 phút", bold=True, color=ORANGE, size=8.5)
    footer = sec.footer.paragraphs[0]
    footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
    footer.paragraph_format.space_after = Pt(0)
    add_run(footer, "Trang ", color=GRAY, size=8.5)
    add_page_field(footer)

    props = doc.core_properties
    props.title = "PhyLab — Kịch bản pitch 8 phút & Q&A Playbook"
    props.subject = "Kịch bản thuyết trình và framework suy nghĩ/trả lời đồng bộ với PHYLAB (1).pdf"
    props.author = "Đội AI-mant"
    props.keywords = "PhyLab, pitch, AI, tài chính, 8 phút"

    # Cover
    p = doc.add_paragraph(style="Pitch Title")
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    add_run(p, "PhyLab", bold=True, color=ORANGE, size=32)
    p = doc.add_paragraph(style="Pitch Subtitle")
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    add_run(p, "CHẠM VÀO THỰC TẾ — CHẠM ĐẾN TƯƠNG LAI", bold=True, color=BLUE, size=15)
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(18)
    add_run(p, "KỊCH BẢN PITCH & Q&A PLAYBOOK", bold=True, color=BROWN, size=20)
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    add_run(p, "BẢN 8 PHÚT · ĐỒNG BỘ PDF 12 SLIDE", bold=True, color=ORANGE, size=13)
    add_callout(
        doc,
        "CÂU NEO CỦA TOÀN BÀI",
        "“AI ngồi bên cạnh học sinh — không ngồi vào ghế của học sinh.”\n"
        "AI đọc, hiểu ngữ cảnh, gợi ý và cá nhân hóa; physics engine mô phỏng, tạo nhiễu và chấm điểm.",
        fill=CREAM,
        accent=ORANGE,
    )
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(18)
    add_run(p, "AI-mant · Bảng B", bold=True, color=BLUE, size=12)
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    add_run(p, "Khánh: mở màn, demo, chốt · Nguyên: thị trường, tài chính, GTM · Hồng: nguồn lực, khách hàng · Toàn: rủi ro kỹ thuật", color=MUTED, size=9.5)
    page_break(doc)

    # Alignment and timing
    doc.add_paragraph("BẢN ĐỒ TRÌNH DIỄN — ĐÚNG THỨ TỰ DECK", style="Pitch Section")
    add_banner(doc, "COVER → PROBLEM → SOLUTION → WHY US → LIVE DEMO → MARKET → FINANCE → GTM → RESOURCES → AUDIENCE → RISK → TEAM")
    add_callout(
        doc,
        "THAY ĐỔI SO VỚI KỊCH BẢN CŨ",
        "Deck hiện tại có 12 slide, không phải 15. Không gọi tên các slide Kiến trúc kỹ thuật, Độ tin cậy, Flex 24h hay CTA riêng nữa. "
        "Các ý kỹ thuật được gài vào Demo và Risk; CTA được gài vào slide Team.",
        fill=PALE_BLUE,
        accent=BLUE,
    )
    add_timing_table(doc)
    p = doc.add_paragraph(style="Pitch Note")
    add_run(p, "Quy tắc bấm giờ: ", bold=True, color=BLUE, size=9.5)
    add_run(p, "demo dừng ở 2:25. Nếu thao tác chậm, bỏ phần xem PDF báo cáo trước; không cắt cảnh đo ba lần và không cắt câu chốt tài chính.", color=BLUE, size=9.5)

    doc.add_paragraph("KÝ HIỆU NHẤN NHÁ", style="Pitch Section")
    table = doc.add_table(rows=1, cols=3)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    headers = ("Ký hiệu", "Cách làm", "Ý nghĩa")
    for c, h in zip(table.rows[0].cells, headers):
        set_cell_shading(c, BLUE_DARK)
        add_run(c.paragraphs[0], h, bold=True, color=WHITE, size=9)
    legend = [
        ("/", "ngắt nửa nhịp", "không hít"),
        ("//", "dừng một nhịp", "hít nhanh bằng mũi"),
        ("↓", "hạ giọng cuối câu", "không hất lên như câu hỏi"),
        ("【CHẬM −10%】", "chậm hơn bình thường", "dành cho câu có số / câu neo"),
        ("【TO】", "tăng âm lượng khoảng 20%", "đánh dấu câu cần nhớ"),
        ("(dừng 2s)", "đứng yên, nhìn BGK", "cho câu chốt có độ nặng"),
    ]
    for i, row in enumerate(legend):
        cells = table.add_row().cells
        for c, v in zip(cells, row):
            set_cell_shading(c, CREAM_2 if i % 2 == 0 else WHITE)
            add_run(c.paragraphs[0], v, bold=(c is cells[0]), color=ORANGE if c is cells[0] else BROWN, size=9)
    set_table_borders(table)
    page_break(doc)

    # Slides 1–2
    add_slide_header(doc, 1, "Bìa / Hook", "Khánh", 28)
    cue(doc, "Đứng lệch trái để không che hình. Không giới thiệu thành tích trước; đi thẳng vào trải nghiệm cá nhân.")
    speech(doc, "Em chào ban giám khảo. // Suốt ba năm cấp ba, em giải hàng nghìn bài toán cơ học mà chưa từng chạm vào thực tế. / Em thuộc lòng công thức gia tốc, nhưng chưa từng thấy gia tốc. ↓")
    speech(doc, "Không phải vì em thiếu cố gắng. / Mà vì phòng lab chưa bao giờ đến được nơi em ngồi. // Bọn em là AI-mant — và đây là PhyLab: / chạm vào thực tế, chạm đến tương lai. ↓", emphasis="【CHẬM −10%】")
    add_callout(doc, "HOOK", "Nói câu “chưa từng thấy gia tốc” nhỏ hơn một chút, rồi dừng đúng một nhịp. Đây là cửa vào cảm xúc của cả bài.", fill=CREAM, accent=ORANGE)

    add_slide_header(doc, 2, "Vấn đề hiện nay", "Khánh", 35)
    cue(doc, "Chỉ tay theo thứ tự 56,5% → 30–40% → 5,56/9 → −71. Không giải thích nguồn trên sân khấu.")
    speech(doc, "Những con số trên slide cho thấy đây không phải câu chuyện của riêng em. / Thiết bị tối thiểu mới đáp ứng 56,5% yêu cầu; ở nhiều địa phương, đồ dùng thực hành chỉ đạt 30 đến 40%; bình quân chỉ có 5,56 phòng bộ môn, trong khi mức tối thiểu là 9. ↓")
    speech(doc, "Điểm Khoa học PISA 2022 trên slide thấp hơn 2018 là một cảnh báo khác. // Công cụ nước ngoài lại không bám SGK Việt Nam, còn học sinh vùng xa là người bị bỏ lại trước tiên. / Lỗi không nằm ở học sinh — lỗi nằm ở việc phòng lab chưa đến được nơi các em ngồi. ↓", emphasis="【CHẬM −10%】")
    page_break(doc)

    # Slides 3–4
    add_slide_header(doc, 3, "Giải pháp — pipeline AI 3 lớp", "Khánh", 38)
    cue(doc, "Dùng tay đi theo mũi tên của sơ đồ. Mỗi lớp đúng một hơi; không đọc tất cả chữ nhỏ.")
    speech(doc, "PhyLab biến chiếc điện thoại thành một phòng thí nghiệm bám sát sách giáo khoa. // Lớp một: SmartReader đọc trang SGK giấy. / Lớp hai: AI phân loại bài, dụng cụ, mục tiêu và điều kiện đo. / Lớp ba: học sinh tự lắp ráp, mô phỏng và nhận gợi ý theo đúng chỗ mình đang vấp. ↓")
    speech(doc, "Learner dành cho người cần dẫn đường; Explorer dành cho người muốn tự khám phá. / Hai lộ trình hội tụ ở Trợ lí PhyLab và tạo báo cáo, đồ thị, tài liệu PDF hoặc LaTeX từ chính số liệu của học sinh. ↓")
    add_callout(doc, "RANH GIỚI KỸ THUẬT", "AI hiểu ngôn ngữ và ngữ cảnh. Physics engine tạo chuyển động, nhiễu và điểm số. Tuyệt đối không nói “LLM sinh số liệu vật lí” — dễ bị hỏi vặn về độ đúng.", fill=PALE_BLUE, accent=BLUE)

    add_slide_header(doc, 4, "Vì sao chọn PhyLab", "Khánh", 25)
    cue(doc, "Nhìn BGK, không quay lưng đọc bảng 9 tiêu chí.")
    speech(doc, "PhyLab đứng ở giao điểm chưa ai chiếm: học sinh tự lắp ráp, nội dung bám SGK Việt Nam, trợ lý Socratic tiếng Việt, số đo có sai số và chạy nhẹ trên Android. ↓")
    speech(doc, "Theo ma trận của đội, PhyLab đạt 9 trên 9 tiêu chí; đối thủ gần nhất là 3. // Bọn em không cố làm AI trả lời hay nhất — bọn em đặt AI vào đúng chiếc ghế. ↓", emphasis="【TO】")
    page_break(doc)

    # Slide 5 demo
    add_slide_header(doc, 5, "★ LIVE DEMO", "Khánh", 145)
    add_banner(doc, "MỤC TIÊU DEMO: CHO BGK THẤY AI HỖ TRỢ — NHƯNG HỌC SINH VẪN TỰ LÀM")
    cue(doc, "Mở sẵn QR/link ở tab 1; video dự phòng ở tab 2. Nói trước rồi mới thao tác. Tất cả số đo đọc theo màn hình thật.")

    add_mixed_paragraph(doc, [("CẢNH 1 · Quét SGK — ~15s", {"bold": True, "color": ORANGE, "size": 11})], style="Pitch Slide")
    speech(doc, "Em không gõ tên bài và không tìm trong menu. / Em đưa trang sách vào camera — SmartReader đọc, còn lớp phân loại đưa em đến đúng bài và đúng bộ dụng cụ. ↓")

    add_mixed_paragraph(doc, [("CẢNH 2 · Prelab tương tác — ~15s", {"bold": True, "color": ORANGE, "size": 11})], style="Pitch Slide")
    speech(doc, "Trước khi đo, học sinh làm quen với dụng cụ bằng thao tác thật: siết, kéo, đặt và kiểm tra. / AI chỉ giải thích khi em cần; nó không đọc lại cả đề và không che mất không gian thực hành. ↓")

    add_mixed_paragraph(doc, [("CẢNH 3 · Kéo–thả, cố tình lắp sai — ~30s", {"bold": True, "color": ORANGE, "size": 11})], style="Pitch Slide")
    cue(doc, "Cố tình đặt sai một dụng cụ. Chờ gợi ý xuất hiện rồi mới nói câu dưới.")
    speech(doc, "Vào lab, em kéo–thả từng dụng cụ như trên bàn thật. // Em cố tình lắp sai ở đây. / Trợ lí không đưa đáp án hoàn chỉnh; nó hỏi và gợi ý đúng một bước để em tự sửa. ↓ Đây là gia sư 1:1 theo ngữ cảnh — website tĩnh không biết em đang sai ở đâu. ↓")

    add_mixed_paragraph(doc, [("CẢNH 4 · Đo ba lần, ba số khác nhau — ~35s", {"bold": True, "color": ORANGE, "size": 11})], style="Pitch Slide")
    cue(doc, "Thả 3 lần. Chỉ tay vào từng số. Đây là cảnh không được cắt.")
    speech(doc, "Ban giám khảo để ý giúp em: / lần một — [đọc số thật]; / lần hai — [đọc số thật]; / lần ba — [đọc số thật]. // Ba lần đo, ba kết quả khác nhau. ↓")
    speech(doc, "Đây không phải lỗi. / Physics engine đưa nhiễu theo cách lắp đặt và thao tác, vì thiết bị thật không bao giờ cho một dãy số đẹp. / Học sinh phải tự xử lý sai số — đúng nơi việc học xảy ra. ↓", emphasis="【CHẬM −10%】")
    page_break(doc)

    add_slide_header(doc, 5, "LIVE DEMO — tiếp", "Khánh", 50)
    add_mixed_paragraph(doc, [("CẢNH 5 · Sổ số liệu, đồ thị, chấm — ~35s", {"bold": True, "color": ORANGE, "size": 11})], style="Pitch Slide")
    cue(doc, "Nhập số → vẽ đồ thị → nộp. Nếu chậm giờ, bỏ thao tác mở file PDF nhưng vẫn nói câu xuất báo cáo.")
    speech(doc, "App không điền hộ một ô nào. / Em tự ghi số, tự tính và dựng đồ thị từ chính số liệu vừa đo. / Khi nộp, điểm được tính trên máy chủ bằng tiêu chí tất định; cùng dữ liệu thì cùng điểm. ↓")
    speech(doc, "AI chỉ biến kết quả đó thành nhận xét dễ hiểu, có thể đọc bằng SmartVoice; SmartUX tổng hợp lỗi để giáo viên nhìn heatmap của cả lớp. / Sau cùng, học sinh xuất báo cáo PDF hoặc LaTeX. ↓")

    add_mixed_paragraph(doc, [("CÂU CHỐT DEMO — ~15s", {"bold": True, "color": ORANGE, "size": 11})], style="Pitch Slide")
    speech(doc, "Mọi con số ban giám khảo vừa thấy đều do học sinh tự đo, tự nhập, tự tính. // 【TO】 Máy chấm điểm — AI kể chuyện. / AI ngồi bên cạnh học sinh, không ngồi thay chỗ học sinh. ↓")
    add_callout(doc, "NẾU DEMO MẤT MẠNG", "Nói: “Đây cũng là điều bọn em thiết kế cho vùng mạng yếu.” Chuyển video local đúng cảnh đang dở; không xin lỗi dài, không tải lại quá một lần.", fill=PALE_ORANGE, accent=ORANGE)
    page_break(doc)

    # Slides 6–8
    add_slide_header(doc, 6, "Quy mô thị trường", "Nguyên", 24)
    cue(doc, "Nguyên bước lên ngay khi Khánh nói xong ‘không ngồi thay’. Chỉ đọc ba vòng TAM–SAM–SOM.")
    speech(doc, "Cảm ơn Khánh. // TAM EdTech Việt Nam trên deck là 9 đến 10 nghìn tỷ đồng mỗi năm. / SAM phòng thí nghiệm Vật lí ảo THPT là 190 đến 230 tỷ. / SOM năm thứ ba là 15 đến 25 tỷ, tương đương 6 đến 10% SAM. ↓")
    speech(doc, "Nhu cầu bắt đầu từ hơn 354 nghìn thí sinh Vật lí mỗi năm, chưa kể học sinh đang học trong lớp. ↓")

    add_slide_header(doc, 7, "Tài chính — chi phí AI và hòa vốn", "Nguyên", 65)
    cue(doc, "Đây là slide BGK có thể ngắt để hỏi. Nói chậm, nhìn thẳng; dùng từ ‘biên đóng góp’, không gọi nhầm thành ‘lợi nhuận ròng’.")
    speech(doc, "Bọn em tính chi phí AI từ từng thao tác, không ước lượng bằng cảm giác. / Một lượt OCR khoảng 70 đến 250 đồng; một phiên có 3 đến 5 lượt AI, mỗi lượt 9 đến 35 đồng; xuất LaTeX khoảng 50 đồng; TTS từ 0 đến 200 đồng. ↓")
    speech(doc, "Theo mức sử dụng chuẩn trên bảng: Plus tốn khoảng 9.600 đồng AI một năm, Pro 26.400 đồng, School khoảng 6 triệu. / So với giá 499 nghìn, 1 triệu 299 và gói School mẫu 25 triệu, biên đóng góp lần lượt là 98,1%, 98% và 76%. ↓")
    speech(doc, "Định phí vận hành năm là 617 triệu. / Với 12 trường, điểm hòa vốn còn khoảng 537 khách cá nhân. // Kịch bản năm một đặt mục tiêu 1.800 khách cá nhân và 12 trường; doanh thu 1,6302 tỷ. / Sau khi stress-test mức dùng AI cao hơn và 670 triệu chi phí cố định, lợi nhuận trước thuế dự kiến 827,792 triệu — biên 50,8%. ↓", emphasis="【CHẬM −10%】")
    add_callout(doc, "CÂU NEO TÀI CHÍNH", "AI đắt khi bị gọi cho mọi việc. PhyLab không gọi AI để mô phỏng hay chấm điểm; chỉ gọi ở nơi AI tạo giá trị: đọc, hiểu ngữ cảnh, gợi ý và diễn giải.", fill=PALE_GREEN, accent=GREEN)

    add_slide_header(doc, 8, "Go-to-market — impact first", "Nguyên", 21)
    speech(doc, "Bọn em bắt đầu từ hai trường pilot ở Đắk Lắk — nơi giá trị thay thế phòng lab lớn nhất. / Quý hai mở B2C; quý ba đưa giáo viên thành kênh; quý bốn chốt 12 hợp đồng School. ↓")
    speech(doc, "Dữ liệu tiến bộ của học sinh vùng cao sẽ là bằng chứng để mở rộng sang phụ huynh, nhà trường và Sở Giáo dục. ↓")
    page_break(doc)

    # Slides 9–10
    add_slide_header(doc, 9, "Resources — nguồn lực hiện có", "Hồng", 23)
    cue(doc, "Không nói như thể mọi nguồn lực đã đủ. Slide này thuyết phục bằng sự trung thực và lớp bảo chứng chuyên môn.")
    speech(doc, "PhyLab có bốn nhân sự lõi, 20 đến 30 triệu đồng sẵn có, nhu cầu trước mắt 9,2 triệu; MVP đã hoàn thiện khoảng 70%. ↓")
    speech(doc, "Đội còn có giảng viên Vật lí Bách Khoa thẩm định mô hình, cố vấn Olympic cho bài nâng cao và giáo viên THPT thử nghiệm sư phạm. / Tổng thể, 78% nguồn lực đã sẵn sàng; phần còn lại dành cho nội dung và pilot. ↓")

    add_slide_header(doc, 10, "Đối tượng khách hàng mục tiêu", "Hồng", 22)
    speech(doc, "Bốn nhóm khách hàng gắn với bốn gói: Free để làm quen; Plus để học thường xuyên; Pro cho Explorer nâng cao và nhiều lượt AI; School để giáo viên giao lab, thu báo cáo và xem thống kê lỗi. ↓")
    speech(doc, "Nói ngắn gọn: học sinh là người dùng; phụ huynh và nhà trường trả tiền; giáo viên là kênh tăng trưởng quan trọng nhất. ↓", emphasis="【TO】")
    page_break(doc)

    # Slides 11–12
    add_slide_header(doc, 11, "Rủi ro & lớp phòng thủ", "Toàn", 29)
    cue(doc, "Chỉ nói 4 cặp rủi ro–phòng thủ ở bên phải; không đọc cả SWOT.")
    speech(doc, "Rủi ro phải có lớp phòng thủ. // OCR sai: cho sửa tay và dùng fallback. / Mạng yếu: PWA lưu offline rồi đồng bộ. / Mô hình sai: công thức chuẩn, unit test và cố vấn Bách Khoa. / Đối thủ tự build: đi trước bằng giáo viên, nội dung SGK và dữ liệu lỗi học tập. ↓")
    speech(doc, "Ưu tiên số một là “Vật lí đúng” trước “AI hay”. / LLM hỗ trợ ngôn ngữ; mô phỏng và điểm số luôn đi qua engine tất định. ↓", emphasis="【CHẬM −10%】")

    add_slide_header(doc, 12, "Thành viên nhóm / CTA", "Khánh", 25)
    cue(doc, "Cả đội đứng thành một hàng. Khánh bước nửa bước lên; câu cuối nói chậm nhất và dừng 2 giây.")
    speech(doc, "Bọn em là AI-mant: Toàn phụ trách công nghệ; Khánh phụ trách Vật lí và sản phẩm; Nguyên phụ trách kinh doanh; Hồng phụ trách vận hành và người dùng. / Bốn góc nhìn, cùng một mục tiêu. ↓")
    speech(doc, "【CHẬM −20%】 Bọn em không xây một app để đi thi. // Bọn em xây một phòng thí nghiệm — cho những ngôi trường chưa từng có nó. ↓ (dừng 2s) / Em cảm ơn ban giám khảo.")
    page_break(doc)

    # Demo checklist
    doc.add_paragraph("CHECKLIST DEMO — 10 PHÚT TRƯỚC KHI LÊN SÂN KHẤU", style="Pitch Section")
    checklist = [
        "Tab 1 đã đăng nhập đúng tài khoản học sinh; bài demo đã tải xong nhưng chưa có dữ liệu cũ.",
        "Camera/OCR đã được cấp quyền; mang đúng trang SGK dự kiến quét.",
        "Cỡ chữ trình duyệt 100%; điện thoại khóa xoay ngang; bật Không làm phiền.",
        "Ba lần đo đã dry-run để chắc số khác nhau và không vượt vùng hiển thị.",
        "Tài khoản giáo viên mở sẵn heatmap ở tab riêng nếu BGK yêu cầu xem.",
        "Video local gồm 5 clip ngắn: OCR, prelab, lắp sai, đo 3 lần, nộp + báo cáo.",
        "Toàn giữ đồng hồ: ra dấu ở 1:30 và 2:10 của demo; 2:25 phải bàn giao cho Nguyên.",
        "Tất cả token/secret ở server; không mở DevTools hoặc trang cấu hình trên máy chiếu.",
    ]
    for item in checklist:
        bullet(doc, "☐ " + item)
    add_callout(doc, "CÂU CỨU DEMO", "“Mạng đang mô phỏng đúng điều kiện bọn em thiết kế cho vùng yếu. Em chuyển sang video local của chính phiên bản này để không làm mất thời gian của ban giám khảo.”", fill=PALE_BLUE, accent=BLUE)
    page_break(doc)

    # Thinking and answering framework
    doc.add_paragraph("PLAYBOOK SUY NGHĨ & TRẢ LỜI Q&A", style="Pitch Section")
    add_banner(doc, "ĐỪNG HỌC THUỘC 30 CÂU — HỌC MỘT CÁCH DỰNG CÂU TRẢ LỜI")
    add_callout(
        doc,
        "FRAMEWORK LÕI · KẾT — CƠ — CHỨNG — GIỚI — CHỐT",
        "Mọi câu trả lời tốt đều có thể dựng từ năm mảnh: KẾT luận trước; giải thích CƠ chế; đưa CHỨNG cứ; nói rõ GIỚI hạn; rồi CHỐT lại điều BGK nên nhớ hoặc bước tiếp theo của đội.",
        fill=CREAM,
        accent=ORANGE,
    )
    numbered_step(doc, "KẾT", "Trả lời thẳng câu hỏi trong một câu. Nếu là câu yes/no, phải nói “có” hoặc “không” trước. Đừng bắt BGK chờ 40 giây mới biết quan điểm của đội.")
    numbered_step(doc, "CƠ", "Chỉ ra một chuỗi nguyên nhân–kết quả: vì sao cách làm của PhyLab giải được vấn đề. Cơ chế có giá trị hơn khẩu hiệu.")
    numbered_step(doc, "CHỨNG", "Chọn đúng một hoặc hai bằng chứng: thao tác vừa demo, số trên slide, test kỹ thuật, phản hồi giáo viên hoặc giả định tài chính đã công khai.")
    numbered_step(doc, "GIỚI", "Nói điều kiện áp dụng, dữ liệu chưa có hoặc rủi ro còn lại. Đây không phải tự dìm; đây là dấu hiệu đội hiểu sản phẩm thật.")
    numbered_step(doc, "CHỐT", "Kết bằng một câu trả lại quyền điều khiển: tác động với học sinh, ý nghĩa kinh doanh hoặc milestone đội sẽ đo tiếp.")
    add_callout(
        doc,
        "VÍ DỤ 35 GIÂY · “TẠI SAO PHẢI DÙNG AI?”",
        "KẾT: AI cần thiết, nhưng chỉ ở những phần có đầu vào ngôn ngữ và ngữ cảnh. CƠ: ảnh SGK và lỗi lắp ráp của mỗi học sinh không thể phủ hết bằng menu hay luật cứng. CHỨNG: trong demo, SmartReader nhận trang sách và trợ lý chỉ gợi đúng bước đang sai. GIỚI: mô phỏng, nhiễu và điểm số không giao cho LLM. CHỐT: AI giúp PhyLab hiểu học sinh; physics engine giữ cho Vật lí luôn đúng.",
        fill=PALE_BLUE,
        accent=BLUE,
    )

    doc.add_paragraph("QUÉT CÂU HỎI TRONG 3 GIÂY", style="Pitch Section")
    numbered_step(doc, "Họ đang kiểm tra điều gì?", "Nhu cầu, kỹ thuật, bằng chứng, tiền, rủi ro, khả năng mở rộng hay bản lĩnh của đội?")
    numbered_step(doc, "Một câu duy nhất họ phải nhớ là gì?", "Chọn trước kết luận. Nếu chưa chọn được kết luận, đừng bắt đầu nói.")
    numbered_step(doc, "Bằng chứng nào mạnh nhất?", "Ưu tiên thứ tự: thứ vừa demo → số trên deck → dữ liệu pilot → kế hoạch đo. Không lôi ba bằng chứng yếu vào thay một bằng chứng mạnh.")
    numbered_step(doc, "Có giả định nào phải khai báo?", "Đặc biệt với chi phí, thị trường và dự báo. Nói giả định trước giúp câu trả lời khó bị bắt bẻ.")
    numbered_step(doc, "Câu chốt thuộc tầng nào?", "Học tập, kỹ thuật, kinh doanh hay tác động xã hội. Chốt đúng tầng của câu hỏi.")

    doc.add_paragraph("BẢY LOẠI CÂU HỎI — BẢY CÁCH DỰNG", style="Pitch Section")
    table = doc.add_table(rows=1, cols=3)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    widths = [1.25, 2.25, 2.60]
    for cell, width, text_value in zip(table.rows[0].cells, widths, ("Loại câu", "BGK thật sự lo gì?", "Cấu trúc nên dùng")):
        cell.width = Inches(width)
        set_cell_shading(cell, BLUE_DARK)
        set_cell_margins(cell, top=70, bottom=70, start=85, end=85)
        add_run(cell.paragraphs[0], text_value, bold=True, color=WHITE, size=8.8)
    question_types = [
        ("WHY", "Vấn đề có thật và đáng giải không?", "Nỗi đau → vì sao cách cũ thất bại → giá trị PhyLab"),
        ("HOW", "Đội có hiểu hệ thống hay chỉ ghép API?", "Input → xử lý → ranh giới AI/engine → output → fallback"),
        ("PROOF", "Đây là sản phẩm thật hay lời hứa?", "Tuyên bố → bằng chứng trực tiếp → phạm vi → bước đo tiếp"),
        ("MONEY", "Số có sống được khi scale không?", "Giả định → unit economics → định phí → hòa vốn → độ nhạy"),
        ("RISK", "Nếu hỏng thì hậu quả và ai chịu?", "Rủi ro → tín hiệu kích hoạt → phòng thủ → rủi ro còn lại"),
        ("SCALE", "Có đường từ pilot tới thị trường không?", "Wedge → kênh → người trả tiền → lặp lại → mở rộng"),
        ("ATTACK", "Đội có tỉnh táo và chịu áp lực được không?", "Công nhận phần đúng → sửa tiền đề → bằng chứng → chốt"),
    ]
    for i, row_data in enumerate(question_types):
        cells = table.add_row().cells
        prevent_row_split(table.rows[-1])
        for idx, (cell, value, width) in enumerate(zip(cells, row_data, widths)):
            cell.width = Inches(width)
            set_cell_shading(cell, CREAM_2 if i % 2 == 0 else WHITE)
            set_cell_margins(cell, top=65, bottom=65, start=85, end=85)
            add_run(cell.paragraphs[0], value, bold=(idx == 0), color=ORANGE if idx == 0 else BROWN, size=8.7)
    set_table_borders(table)
    page_break(doc)

    doc.add_paragraph("BA CHẾ ĐỘ ĐỘ DÀI", style="Pitch Section")
    add_callout(doc, "20 GIÂY · TRẢ LỜI NHANH", "Kết luận → một cơ chế → câu chốt. Dùng khi BGK hỏi nối tiếp hoặc chủ tọa nhắc thời gian. Mục tiêu: 45–60 từ nói.", fill=CREAM, accent=ORANGE)
    add_callout(doc, "45 GIÂY · MẶC ĐỊNH", "Kết luận → cơ chế → một bằng chứng → một giới hạn → câu chốt. Đây là chế độ chuẩn cho hầu hết Q&A.", fill=PALE_BLUE, accent=BLUE)
    add_callout(doc, "90 GIÂY · CÂU SÂU", "Nói bản 20 giây trước, rồi hỏi hoặc báo hiệu: “Em xin làm rõ thêm hai lớp.” Sau đó thêm bằng chứng thứ hai, trade-off, độ nhạy và milestone. Không mở thẳng bằng một bài giảng 90 giây.", fill=PALE_GREEN, accent=GREEN)
    p = doc.add_paragraph(style="Pitch Note")
    add_run(p, "Câu cứu thời gian: ", bold=True, color=BLUE, size=9.5)
    add_run(p, "“Em trả lời ngắn trước: … Nếu ban giám khảo muốn, em xin mở sâu phần kỹ thuật/giả định tài chính.”", italic=True, color=BLUE, size=9.5)

    doc.add_paragraph("LÀM CÂU TRẢ LỜI BỚT CHÁN — MỞ BẰNG MỘT CÁI MÓC", style="Pitch Section")
    hooks = [
        ("Nghịch lý", "“Điểm quan trọng nhất của AI trong PhyLab là chỗ bọn em chủ động không dùng AI.”"),
        ("Nhân–quả", "“Nếu gọi LLM cho mọi thao tác, sản phẩm sẽ chết vì chi phí và không thể giải trình điểm số.”"),
        ("Ranh giới", "“AI hiểu học sinh; physics engine hiểu Vật lí.”"),
        ("Cảnh người dùng", "“Một học sinh vừa lắp sai không cần thêm một đáp án; em ấy cần đúng một câu hỏi để tự sửa.”"),
        ("Con số", "“Với gói Plus, chi phí AI chuẩn chỉ chiếm khoảng 1,9% giá bán.”"),
        ("Ba vai", "“Học sinh dùng, giáo viên mở cửa, nhà trường trả tiền.”"),
        ("Phản trực giác", "“Bọn em bắt đầu ở vùng cao không phải vì đó là thị trường dễ nhất, mà vì giá trị thay thế ở đó lớn nhất.”"),
    ]
    for title, line in hooks:
        p = doc.add_paragraph(style="Pitch Body")
        add_run(p, title + ": ", bold=True, color=ORANGE, size=10.2)
        add_run(p, line, italic=True, color=BROWN, size=10.2)
    add_callout(doc, "QUY TẮC HOOK", "Mỗi câu trả lời chỉ cần một cái móc. Hook phải dẫn vào cơ chế hoặc bằng chứng ngay sau đó; nếu chỉ kêu hay mà không trả lời câu hỏi, nó biến thành khẩu hiệu.", fill=CREAM, accent=ORANGE)
    page_break(doc)

    doc.add_paragraph("CÁCH XỬ LÝ CÂU HỎI KHÓ HOẶC CÓ TÍNH TẤN CÔNG", style="Pitch Section")
    add_mixed_paragraph(doc, [("1 · Tiền đề chỉ đúng một nửa", {"bold": True, "color": ORANGE, "size": 11})], style="Pitch Slide")
    speech(doc, "Công nhận phần đúng trước, rồi sửa ranh giới. / Mẫu: “Nhận định đó đúng nếu bọn em giao việc chấm điểm cho chatbot. PhyLab không làm vậy; LLM chỉ viết nhận xét, còn điểm đi qua rubric tất định.”")
    add_mixed_paragraph(doc, [("2 · Chưa có số đủ tin cậy", {"bold": True, "color": ORANGE, "size": 11})], style="Pitch Slide")
    speech(doc, "Không đoán. / Mẫu: “Hiện tại bọn em chưa có cỡ mẫu đủ để khẳng định con số đó. Điều bọn em đã biết là…; trong pilot tiếp theo, bọn em sẽ đo… và ngưỡng quyết định là…”.")
    add_mixed_paragraph(doc, [("3 · Hai con số nhìn như mâu thuẫn", {"bold": True, "color": ORANGE, "size": 11})], style="Pitch Slide")
    speech(doc, "Tách lớp giả định. / Mẫu: “9.600 đồng là mức sử dụng chuẩn của Plus; khối Year 1 dùng ngân sách stress-test cao hơn. Một con số dùng để tính unit economics, một con số dùng để bảo thủ khi lập ngân sách.”")
    add_mixed_paragraph(doc, [("4 · Hỏi hai câu cùng lúc", {"bold": True, "color": ORANGE, "size": 11})], style="Pitch Slide")
    speech(doc, "Nhắc lại thứ tự rồi trả lời lần lượt: “Em xin tách hai ý: trước hết là độ đúng của mô hình; sau đó là khả năng thương mại.” Không trộn hai tầng khiến câu trả lời mất kết luận.")
    add_mixed_paragraph(doc, [("5 · Bị ngắt giữa câu", {"bold": True, "color": ORANGE, "size": 11})], style="Pitch Slide")
    speech(doc, "Dừng ngay, nghe hết, rồi mở lại bằng kết luận một câu. Đừng cố nói nốt đoạn đã chuẩn bị. BGK ngắt thường vì họ đã hiểu phần cũ và muốn đi sâu phần mới.")
    add_mixed_paragraph(doc, [("6 · Câu hỏi ngoài phạm vi", {"bold": True, "color": ORANGE, "size": 11})], style="Pitch Slide")
    speech(doc, "Nêu ranh giới rồi nối về thứ đội kiểm soát: “Đó chưa phải phạm vi MVP hiện tại. Kiến trúc đã chừa điểm mở rộng…, nhưng milestone ba tháng tới của bọn em vẫn là…”.")
    add_callout(doc, "CẤM", "Không nói “chắc là”, “em nghĩ khoảng”, “bọn em sẽ dùng AI để tối ưu hết”. Không bịa số; không hứa roadmap như tính năng đã chạy; không tranh thắng với BGK; không nhắc model/API ngoài khuôn khổ VNPT.", fill=PALE_ORANGE, accent=RED)
    page_break(doc)

    doc.add_paragraph("FRAMEWORK THEO TỪNG CHỦ ĐỀ", style="Pitch Section")
    topic_frameworks = [
        ("AI", "Nhiệm vụ người dùng → vì sao luật cứng không đủ → AI làm đúng việc gì → guardrail → bằng chứng demo → chi phí mỗi lượt."),
        ("KỸ THUẬT", "Input → state của thí nghiệm → physics engine → gọi API ở đâu → dữ liệu lưu ở đâu → output → fallback."),
        ("TÀI CHÍNH", "Giả định sử dụng → doanh thu/user → biến phí AI → biên đóng góp → định phí → hòa vốn → độ nhạy → runway/milestone."),
        ("THỊ TRƯỜNG", "Người dùng → người trả tiền → công việc cần giải quyết → tần suất dùng → willingness-to-pay → kênh mua → wedge mở đầu."),
        ("CẠNH TRANH", "So cùng một nhu cầu → chọn trục khác biệt → chứng minh wedge → giải thích moat → phản ứng khi đối thủ copy."),
        ("RỦI RO", "Rủi ro cụ thể → tín hiệu kích hoạt → xác suất/ảnh hưởng → lớp phòng thủ → rủi ro còn lại → owner và metric."),
        ("TÁC ĐỘNG", "Baseline → can thiệp → chỉ số đầu ra → chỉ số kết quả → nhóm đối chứng hoặc trước–sau → thời điểm quyết định."),
        ("ĐỘI NGŨ", "Năng lực sống còn → ai phụ trách → bằng chứng đã làm → khoảng trống → người/đối tác cần bổ sung tiếp."),
    ]
    for title, body in topic_frameworks:
        p = doc.add_paragraph(style="Pitch Body")
        p.paragraph_format.space_after = Pt(5)
        add_run(p, title + " · ", bold=True, color=ORANGE, size=10.5)
        add_run(p, body, color=BROWN, size=10.2)
    add_callout(doc, "NẾU NÃO TRỐNG", "Quay về ba câu: “Kết luận của đội là gì?” → “Cơ chế nào khiến nó đúng?” → “Bằng chứng mạnh nhất đang có là gì?”. Chỉ ba câu này đã đủ tạo một câu trả lời 20 giây có chất lượng.", fill=PALE_BLUE, accent=BLUE)
    page_break(doc)

    # Q&A AI
    doc.add_paragraph("ĐẠN Q&A — AI THỰC SỰ GIÚP GÌ?", style="Pitch Section")
    add_callout(doc, "TRẢ LỜI 20 GIÂY", "AI của PhyLab có bốn việc: đọc trang SGK, phân loại bài và dụng cụ, gợi ý Socratic theo lỗi đang xảy ra, rồi cá nhân hóa nhận xét và lộ trình. Nhưng AI không sinh quy luật Vật lí, không tạo điểm và không điền hộ. Physics engine xử lý mô phỏng, nhiễu và chấm điểm — vì phần đó phải kiểm chứng được.", fill=PALE_BLUE, accent=BLUE)
    qas = [
        ("Vì sao bắt buộc dùng AI?", "Vì đầu vào là ảnh trang sách, lỗi lắp ráp phụ thuộc ngữ cảnh và mỗi học sinh vấp khác nhau. Luật cứng có thể điều khiển engine, nhưng không thể trò chuyện và dẫn dắt linh hoạt ở quy mô lớn."),
        ("Tại sao không để chatbot chấm điểm?", "Điểm phải lặp lại được và giải trình được. Vì vậy máy chủ chấm theo rubric tất định; AI chỉ chuyển kết quả thành nhận xét có tone và độ dài phù hợp."),
        ("Số liệu khác nhau có phải do AI bịa?", "Không. Physics engine sinh sai số theo mô hình và trạng thái lắp đặt. AI không được phép can thiệp vào con số đo hay đáp án chuẩn."),
        ("Nếu AI trả lời sai?", "Giới hạn vai trò, dùng prompt Socratic, chỉ cho AI truy cập ngữ cảnh bài đang học và có fallback. Dù AI diễn giải chưa tốt, mô phỏng và điểm số vẫn không đổi."),
        ("Dữ liệu giáo viên dùng thế nào?", "SmartUX gom các sự kiện học tập thành heatmap lỗi; giáo viên thấy cả lớp hay sai bước nào nhưng vẫn xem được từng học sinh. Đây là phân tích hành vi, không phải AI tự phán điểm."),
    ]
    for q, a in qas:
        p = doc.add_paragraph(style="Pitch Body")
        add_run(p, "Q: " + q + "\n", bold=True, color=ORANGE, size=10.5)
        add_run(p, "A: " + a, color=BROWN, size=10)
    page_break(doc)

    # Q&A finance
    doc.add_paragraph("ĐẠN Q&A — CHI PHÍ AI & TÀI CHÍNH", style="Pitch Section")
    add_callout(doc, "TRẢ LỜI 25 GIÂY", "Chi phí AI được tính theo lượt: OCR 70–250đ; 3–5 lượt tutor, 9–35đ/lượt; LaTeX khoảng 50đ; TTS 0–200đ. Vì mô phỏng và chấm điểm không gọi AI, biến phí năm chuẩn chỉ khoảng 9.600đ cho Plus, 26.400đ cho Pro và 6 triệu cho một gói School. Với 12 trường, đội cần khoảng 537 khách cá nhân để bù 617 triệu định phí vận hành.", fill=PALE_GREEN, accent=GREEN)
    table = doc.add_table(rows=1, cols=5)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    headers = ("Gói", "Giá", "AI/năm", "Biên đóng góp", "Vai trò")
    for c, h in zip(table.rows[0].cells, headers):
        set_cell_shading(c, BLUE_DARK)
        add_run(c.paragraphs[0], h, bold=True, color=WHITE, size=8.5)
    finance_rows = [
        ("Free", "0đ", "giới hạn quota", "—", "thu hút / vùng cao"),
        ("Plus", "499.000đ", "9.600đ", "98,1%", "học thường xuyên"),
        ("Pro", "1.299.000đ", "26.400đ", "98,0%", "học nâng cao"),
        ("School*", "25 triệu", "6 triệu", "76,0%", "mẫu trong dải 15–40 triệu"),
    ]
    for i, row in enumerate(finance_rows):
        cells = table.add_row().cells
        for c, v in zip(cells, row):
            set_cell_shading(c, CREAM_2 if i % 2 == 0 else WHITE)
            add_run(c.paragraphs[0], v, color=BROWN, size=8.5)
    set_table_borders(table)
    doc.add_paragraph("* Gói School trên slide dùng 25 triệu làm ví dụ để tính biên; giá bán thực tế nằm trong dải 15–40 triệu/năm.", style="Pitch Small")
    qas_fin = [
        ("Tại sao biên cao như vậy?", "Đây là biên đóng góp trên biến phí AI, chưa phải biên lợi nhuận ròng. Nhân sự, nội dung, cloud, marketing và dự phòng nằm trong 617 triệu định phí vận hành."),
        ("Free có đốt tiền không?", "Free giới hạn số lab và lượt tutor; mục tiêu là acquisition và tiếp cận vùng cao. Đội theo dõi chi phí theo cohort, không mở quota vô hạn."),
        ("Nếu số lượt AI tăng gấp đôi?", "Chi phí tutor tăng tuyến tính nhưng vẫn nhỏ so với giá gói. Kịch bản năm một trên slide đã dùng mức stress-test cao hơn mức sử dụng chuẩn."),
        ("Vì sao trường trả 15–40 triệu?", "Đó là license cho lớp/trường, dashboard giáo viên, giao lab, thu báo cáo và thống kê lỗi — chỉ bằng khoảng 0,5–1% chi phí một phòng thí nghiệm thật theo định vị của deck."),
    ]
    for q, a in qas_fin:
        p = doc.add_paragraph(style="Pitch Body")
        add_run(p, "Q: " + q + "\n", bold=True, color=ORANGE, size=10.5)
        add_run(p, "A: " + a, color=BROWN, size=10)
    page_break(doc)

    # Expanded answer bank
    doc.add_paragraph("ANSWER BANK SÂU — AI & SẢN PHẨM", style="Pitch Section")
    add_banner(doc, "KHÔNG HỌC THUỘC CHỮ · HỌC ĐƯỜNG SUY NGHĨ VÀ CÂU NEO")
    qa_block(
        doc,
        "Tại sao bài toán này bắt buộc phải dùng AI? Một website có rule-based là đủ mà?",
        "Kết luận → tách phần có thể dùng luật cứng và phần cần hiểu ngữ cảnh → demo → guardrail.",
        "Một phần hoàn toàn có thể và nên dùng luật cứng — đó là mô phỏng, logic lắp ráp cơ bản và chấm điểm. Nhưng luật cứng không xử lý tốt ba đầu vào: ảnh một trang SGK bất kỳ, cách diễn đạt khác nhau của học sinh và lỗi lắp ráp phụ thuộc trạng thái hiện tại của bàn lab. Vì vậy AI của PhyLab chỉ vào ba vị trí đó: SmartReader đọc và phân loại trang sách; trợ lý hiểu học sinh đang mắc ở bước nào; SmartUX gom hành vi thành gợi ý cá nhân hóa. Phần vừa demo là bằng chứng: AI không thay physics engine, nó giúp hệ thống hiểu ngữ cảnh mà menu tĩnh không hiểu được. Câu chốt của bọn em là: AI hiểu học sinh; engine hiểu Vật lí.",
        "Nếu BGK nói vẫn có thể viết hàng nghìn rule: đồng ý về mặt lý thuyết, rồi hỏi chi phí bảo trì, độ phủ ngôn ngữ và khả năng thêm 30+ bài trên ba bộ SGK.",
    )
    qa_block(
        doc,
        "AI có thể hallucinate và dạy sai. Tại sao phụ huynh nên tin?",
        "Công nhận rủi ro → giới hạn quyền của AI → nguồn ngữ cảnh → lớp kiểm chứng → rủi ro còn lại.",
        "Lo ngại đó đúng nếu một chatbot vừa sinh kiến thức, vừa tạo số liệu, vừa chấm điểm. PhyLab cố tình chia quyền: LLM chỉ giải thích và gợi ý Socratic trong phạm vi bài đang mở; công thức, trạng thái thí nghiệm, số đo và rubric nằm trong physics engine cùng dữ liệu chuẩn. Vì vậy một câu diễn giải chưa tốt không thể làm thay đổi điểm hay kết quả đo. Ở lớp vận hành, đội lưu log phản hồi, cho giáo viên báo lỗi và đưa câu trả lời rủi ro cao về template kiểm duyệt. Bọn em không tuyên bố AI không bao giờ sai; bọn em thiết kế để khi AI sai, sai số đó không lan sang phần Vật lí và đánh giá học sinh.",
        "Nếu hỏi tỷ lệ sai: không bịa. Nói đội cần benchmark câu hỏi theo từng bài và công bố precision/teacher-approval rate sau pilot.",
    )
    qa_block(
        doc,
        "Trợ lý có biến thành công cụ gian lận, làm hộ học sinh không?",
        "Nêu triết lý → cơ chế chống auto-answer → bằng chứng demo → giới hạn.",
        "Điểm khác của PhyLab là một sản phẩm AI chủ động từ chối ngồi vào ghế của học sinh. Trợ lý không nhận một câu “giải giúp em” rồi trả cả quy trình; nó nhìn bước hiện tại, hỏi một câu chẩn đoán và chỉ mở gợi ý theo tầng. Sổ số liệu không auto-fill; học sinh phải tự đo, tự nhập và tự tính. Khi nộp, máy chủ chấm theo điều kiện đề giáo viên đã cấu hình — chẳng hạn góc, khoảng cách và số lần đo — nên không thể dùng một bộ số cho mọi câu. Bọn em vẫn thừa nhận không thể ngăn việc học sinh dùng thiết bị khác bên ngoài; thứ PhyLab kiểm soát là không tự biến mình thành đường tắt và tạo log thao tác để giáo viên xem quá trình, không chỉ kết quả cuối.",
    )
    qa_block(
        doc,
        "Nếu API VNPT hoặc mạng bị lỗi giữa buổi học thì sao?",
        "Phân loại chức năng cốt lõi/phụ trợ → fallback → trải nghiệm người dùng → dữ liệu đồng bộ.",
        "Bọn em thiết kế theo nguyên tắc: mất AI không được làm mất thí nghiệm. Physics engine, kéo–thả, đo, ghi số và chấm deterministic vẫn là phần cốt lõi. Nếu OCR lỗi, học sinh chọn bài hoặc sửa kết quả nhận dạng bằng tay. Nếu tutor lỗi, hệ thống chuyển sang gợi ý template theo bước. Nếu TTS lỗi, trình duyệt dùng Web Speech hoặc giữ văn bản. Với mạng vùng cao, PWA lưu tiến độ cục bộ và đồng bộ lại khi có mạng. Rủi ro còn lại là trải nghiệm cá nhân hóa giảm, chứ không phải điểm bị sai hay bài làm mất. Đó là lý do slide Risk của bọn em nói về lớp phòng thủ, không hứa một hệ thống không bao giờ hỏng.",
    )
    page_break(doc)

    doc.add_paragraph("ANSWER BANK SÂU — TÀI CHÍNH", style="Pitch Section")
    qa_block(
        doc,
        "Biên đóng góp 98% nghe quá đẹp. Có phải đội đang bỏ sót chi phí?",
        "Sửa thuật ngữ → giải thích numerator/denominator → chỉ ra chi phí đã nằm ở đâu → không phòng thủ quá mức.",
        "Đúng là 98% sẽ gây hiểu nhầm nếu gọi đó là biên lợi nhuận ròng. Trên deck, đó là biên đóng góp sau biến phí AI của gói cá nhân: Plus 499.000 đồng trừ khoảng 9.600 đồng AI; Pro 1.299.000 đồng trừ 26.400 đồng. Nhân sự, nội dung, cloud nền, marketing, hỗ trợ và dự phòng không biến mất; chúng nằm trong 617 triệu chi phí vận hành năm. Vì vậy đội không dùng 98% để nói doanh nghiệp đã lời 98%. Con số cần nhìn ở kịch bản Year 1 là lợi nhuận trước thuế 827,792 triệu trên doanh thu 1,6302 tỷ, tương đương 50,8% theo các giả định hiện tại. Trước khi thương mại hóa, đội còn phải thêm phí thanh toán, thuế, hỗ trợ và chi phí bán hàng vào mô hình.",
    )
    qa_block(
        doc,
        "Tại sao bảng Finance có hai bộ chi phí AI khác nhau?",
        "Không né mâu thuẫn → tách base case/stress case → nói việc cần sửa trên deck.",
        "Hai khối đang trả lời hai câu khác nhau. Bảng unit economics dùng mức sử dụng chuẩn để biết một thuê bao có đóng góp dương hay không: Plus 9.600 đồng, Pro 26.400 đồng, School 6 triệu một năm. Khối Year 1 dùng ngân sách stress-test với tần suất AI cao hơn và 670 triệu chi phí cố định để tránh lập kế hoạch quá lạc quan. Tuy nhiên đội đồng ý rằng nếu không ghi nhãn, hai tầng giả định nhìn như mâu thuẫn. Trước giờ pitch, bọn em phải ghi rõ Base case và Conservative budget, kèm công thức số lượt nhân đơn giá. Câu trả lời không phải chọn con số đẹp hơn; câu trả lời là công khai mỗi con số đang phục vụ quyết định nào.",
    )
    qa_block(
        doc,
        "537 khách cá nhân cộng 12 trường — đội lấy khách ở đâu để hòa vốn?",
        "Công thức hòa vốn → kênh → funnel → milestone kiểm chứng → không coi dự báo là traction.",
        "537 không phải con số người dùng đăng ký; đó là lượng thuê bao trả phí còn cần sau phần biên đóng góp của 12 hợp đồng School để bù 617 triệu định phí. Đường đi không bắt đầu bằng quảng cáo đại trà. Hai pilot ở Đắk Lắk tạo case study và dữ liệu sử dụng; giáo viên là người đưa sản phẩm vào lớp; học sinh dùng Free tạo thói quen; một phần chuyển Plus hoặc Pro; song song đội bán School cho trường. Điều chưa được chứng minh là conversion rate và chu kỳ chốt trường. Vì vậy milestone đúng không phải “đạt ngay 537”, mà là đo bốn tỷ lệ: giáo viên kích hoạt lớp, học sinh hoàn thành lab, Free-to-paid và School renewal. Nếu funnel thực thấp hơn giả định, đội phải giảm CAC hoặc điều chỉnh gói trước khi tăng marketing.",
    )
    qa_block(
        doc,
        "Gói Free có khiến đội đốt tiền không kiểm soát?",
        "Vai trò Free → quota → cost cap → conversion metric → kill criteria.",
        "Free chỉ hợp lý nếu nó là một kênh acquisition có trần chi phí, không phải lời hứa dùng AI vô hạn. Gói này giới hạn số bài, lượt tutor, OCR và xuất báo cáo; phần mô phỏng cơ bản có chi phí biên thấp vì chạy bằng engine, không phải LLM. Đội theo dõi chi phí trên một người dùng hoạt động và trên một người chuyển đổi trả phí. Nếu một cohort dùng nhiều AI nhưng không quay lại hoặc không chuyển đổi, quota và onboarding phải đổi. Với học sinh vùng cao, đội có thể tài trợ riêng qua School hoặc đối tác thay vì bắt mô hình B2C gánh vô hạn. Nói ngắn gọn: Free là chiến lược phân phối có ngân sách và chỉ số dừng, không phải “miễn phí bằng mọi giá”.",
    )
    page_break(doc)

    doc.add_paragraph("ANSWER BANK SÂU — THỊ TRƯỜNG & CẠNH TRANH", style="Pitch Section")
    qa_block(
        doc,
        "Tại sao bắt đầu ở vùng cao khi khả năng chi trả thấp?",
        "Tách người dùng/người trả tiền → giá trị thay thế → pilot wedge → đường mở rộng.",
        "Bọn em bắt đầu ở vùng cao không phải vì học sinh ở đó là khách B2C dễ trả tiền nhất, mà vì giá trị thay thế phòng lab ở đó lớn nhất. Người dùng là học sinh; người trả tiền có thể là nhà trường, địa phương, doanh nghiệp CSR hoặc đối tác triển khai. Nếu PhyLab tạo được mức hoàn thành và tiến bộ rõ ở nơi thiếu thiết bị nhất, đó là bằng chứng mạnh hơn một pilot ở trường vốn đã có phòng lab tốt. Sau wedge tác động xã hội, Plus và Pro mở rộng sang nhóm học sinh thành thị, phụ huynh và người học nâng cao. Rủi ro cần đo là chu kỳ mua của trường và hạ tầng mạng; vì vậy pilot phải đo cả học tập lẫn vận hành, không chỉ số lượt đăng nhập.",
    )
    qa_block(
        doc,
        "PhET, Labster hoặc một công ty lớn có thể copy tính năng. Moat của PhyLab là gì?",
        "Không nói tính năng là moat → giao điểm khác biệt → tài sản tích lũy → tốc độ phản hồi.",
        "Một công ty lớn hoàn toàn có thể copy một màn kéo–thả hoặc thêm chatbot. Vì vậy moat của PhyLab không phải một button. Nó là hệ tích lũy gồm: nội dung bám từng bài của nhiều bộ SGK Việt Nam; template Vật lí và rubric đã được thẩm định; dữ liệu học sinh thường sai ở bước nào; workflow giáo viên giao–thu–xem heatmap; và mạng lưới giáo viên đã quen triển khai. Mỗi lớp học làm tài sản này dày hơn. Lợi thế ban đầu của đội là tốc độ và độ hiểu ngữ cảnh địa phương; lợi thế dài hạn phải là nội dung, dữ liệu có trách nhiệm và switching cost trong workflow giáo viên. Nếu chỉ dừng ở giao diện đẹp, bọn em đồng ý PhyLab sẽ bị copy rất nhanh.",
    )
    qa_block(
        doc,
        "TAM 9–10 nghìn tỷ có liên quan gì tới một sản phẩm chỉ làm Vật lí THPT?",
        "Không dùng TAM để che SAM → bottom-up → SOM → giả định phải xác minh.",
        "TAM chỉ cho biết bối cảnh EdTech, không phải doanh thu PhyLab có thể lấy ngay. Con số đội phải bảo vệ là SAM 190–230 tỷ cho phòng thí nghiệm Vật lí ảo THPT và SOM 15–25 tỷ ở năm thứ ba. Cách làm chặt hơn là bottom-up: số trường mục tiêu nhân giá School, cộng số thuê bao Plus và Pro có thể tiếp cận qua giáo viên. Vì vậy khi BGK hỏi, bọn em không dùng TAM để phóng đại. Bọn em sẽ trình bày TAM như bối cảnh, SAM như thị trường phục vụ và SOM như mục tiêu phụ thuộc trực tiếp vào số hợp đồng, conversion và retention. Sau cuộc thi, cả ba con số phải được gắn nguồn, năm dữ liệu và công thức rõ trên phụ lục.",
    )
    qa_block(
        doc,
        "Giá School 15–40 triệu dựa trên willingness-to-pay nào?",
        "Giá trị tạo ra → đơn vị mua → tham chiếu chi phí thay thế → cần pilot định giá.",
        "Dải 15–40 triệu phản ánh quy mô lớp/trường và mức dịch vụ, chứ không phải một giá duy nhất cho mọi nơi. Giá trị nhà trường mua gồm license, giao lab, thu báo cáo, dashboard giáo viên, thống kê lỗi và hỗ trợ triển khai. Deck đang định vị nó ở khoảng 0,5–1% chi phí một phòng thí nghiệm thật; đó là anchor giá trị, chưa phải bằng chứng willingness-to-pay hoàn chỉnh. Bước cần làm trong pilot là phỏng vấn người ra quyết định, thử ba gói theo số lớp và đo tỷ lệ ký biên bản quan tâm hoặc renewal. Nếu trường chỉ sẵn sàng ở mức thấp hơn, đội phải giảm scope hoặc dùng mô hình tài trợ, chứ không nên bảo vệ dải giá bằng cảm tính.",
    )
    page_break(doc)

    doc.add_paragraph("ANSWER BANK SÂU — BẰNG CHỨNG, RỦI RO & ĐỘI NGŨ", style="Pitch Section")
    qa_block(
        doc,
        "Làm sao chứng minh mô phỏng và chấm điểm đúng Vật lí?",
        "Chuẩn tham chiếu → unit test → test biên → chuyên gia → versioning.",
        "Ưu tiên của bọn em là “Vật lí đúng” trước “AI hay”. Mỗi bài cần một chuẩn tham chiếu từ công thức SGK và điều kiện thí nghiệm; engine có unit test ở giá trị danh định, test biên và test tính nhất quán đơn vị. Với chấm điểm, rubric kiểm tra cả điều kiện đề giáo viên cấu hình — góc, khoảng cách, số lần đo — chứ không chỉ nhìn một giá trị cuối. Các mô hình được giảng viên hoặc cố vấn Vật lí thẩm định trước khi phát hành. Khi sửa công thức hoặc noise model, đội version hóa để bài cũ không đổi điểm âm thầm. Điều bọn em cần bổ sung là benchmark công khai theo từng bài và log giải thích vì sao một submission được điểm đó.",
    )
    qa_block(
        doc,
        "Các con số pilot và tác động giáo dục hiện đã đủ mạnh chưa?",
        "Phân biệt product evidence và learning evidence → không overclaim → thiết kế đo tiếp.",
        "Hiện tại bằng chứng mạnh nhất của đội là sản phẩm chạy được, luồng học hoàn chỉnh và phản hồi chuyên môn ban đầu. Nó chưa đủ để tuyên bố PhyLab làm tăng điểm số ở quy mô lớn. Muốn chứng minh tác động, pilot phải có baseline, cùng một bài kiểm tra trước–sau, nhóm so sánh phù hợp hoặc ít nhất cohort đối chiếu, cùng chỉ số quá trình như hoàn thành lab, số lỗi tự sửa và retention. Kết quả học tập cần tách khỏi hiệu ứng giáo viên hoặc novelty. Vì vậy trên sân khấu bọn em nói pilot tạo dữ liệu để kiểm chứng, không biến mục tiêu thành thành tích đã đạt. Sự trung thực này giúp đội thiết kế một thử nghiệm mà Sở Giáo dục hoặc nhà đầu tư có thể tin.",
    )
    qa_block(
        doc,
        "Dữ liệu học sinh và dashboard giáo viên có rủi ro riêng tư không?",
        "Tối thiểu hóa dữ liệu → phân quyền → lưu trữ → retention → minh bạch.",
        "Dashboard chỉ nên thu dữ liệu cần cho việc học: bước thao tác, lỗi, số lần thử, kết quả và tiến độ; không cần thu nội dung cá nhân ngoài mục đích. Học sinh chỉ xem dữ liệu của mình; giáo viên xem lớp được phân quyền; token và khóa API nằm ở server. Với log dùng cho analytics, đội cần định danh giả hoặc tách thông tin nhận diện, quy định thời gian lưu và cho trường biết dữ liệu nào được dùng để cải thiện sản phẩm. Trẻ vị thành niên làm yêu cầu minh bạch và đồng thuận càng quan trọng. Hiện MVP mới chứng minh nguyên tắc kỹ thuật; trước triển khai School, đội cần hoàn thiện chính sách dữ liệu, quy trình xóa và nhật ký truy cập.",
    )
    qa_block(
        doc,
        "Nếu nhận hỗ trợ hoặc vốn, ba tháng tới đội dùng vào đâu?",
        "Một mục tiêu → ba workstream → metric → điều không làm.",
        "Bọn em không dùng vốn để thêm thật nhiều hiệu ứng. Mục tiêu ba tháng là chứng minh một vòng triển khai School có thể lặp lại. Workstream một: chuẩn hóa các bài cốt lõi, unit test và thẩm định Vật lí. Workstream hai: chạy pilot có baseline–posttest, đo hoàn thành, retention và lỗi phổ biến. Workstream ba: hoàn thiện dashboard, quyền dữ liệu và playbook tập huấn giáo viên. Ngân sách đi vào nội dung, hạ tầng, API có quota và hỗ trợ pilot; marketing chỉ tăng sau khi funnel giáo viên–học sinh cho thấy retention. Milestone kết thúc ba tháng là một bộ dữ liệu tác động đáng tin, chi phí thực trên mỗi học sinh và ít nhất một tín hiệu willingness-to-pay từ trường.",
    )
    qa_block(
        doc,
        "Tại sao chính đội này có thể làm được?",
        "Năng lực sống còn → bằng chứng → hệ cố vấn → khoảng trống và kế hoạch bù.",
        "PhyLab cần bốn năng lực cùng lúc: xây sản phẩm, hiểu Vật lí, triển khai giáo dục và biến nó thành mô hình kinh doanh. Toàn phụ trách công nghệ; Khánh nối Vật lí với sản phẩm; Nguyên phụ trách thị trường và tài chính; Hồng phụ trách vận hành và người dùng. Đội không tự nhận đã đủ mọi chuyên môn: phần mô hình có giảng viên Bách Khoa và cố vấn Olympic; phần sư phạm có giáo viên THPT thử nghiệm. Khoảng trống lớn nhất hiện tại là sản xuất nội dung quy mô và bán hàng trường học. Vì vậy kế hoạch nguồn lực không chỉ tuyển thêm developer; ưu tiên là chuyên gia nội dung và một người chịu trách nhiệm triển khai School. Điểm mạnh của đội là đã biến nỗi đau học chay thành sản phẩm chạy được; bước tiếp theo là biến thử nghiệm thành hệ thống lặp lại.",
    )
    page_break(doc)

    doc.add_paragraph("CƠ CHẾ ĐIỀU PHỐI Q&A CỦA CẢ ĐỘI", style="Pitch Section")
    add_callout(doc, "HỒNG GIỮ NHỊP", "Nhắc lại câu hỏi trong một câu → gọi đúng người → theo dõi thời gian → nếu câu trả lời lan man, chốt lại bằng một câu và chuyển. Không để hai người cùng tranh trả lời.", fill=PALE_BLUE, accent=BLUE)
    ownership = [
        ("Khánh", "AI, physics engine, sản phẩm, demo, độ đúng Vật lí"),
        ("Nguyên", "TAM–SAM–SOM, giá, unit economics, hòa vốn, GTM"),
        ("Toàn", "hạ tầng, API, bảo mật, fallback, offline, khả năng scale"),
        ("Hồng", "giáo viên, học sinh, pilot, vận hành School, đội ngũ, tác động"),
    ]
    table = doc.add_table(rows=1, cols=2)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    for c, h in zip(table.rows[0].cells, ("Người", "Quyền trả lời chính")):
        set_cell_shading(c, BLUE_DARK)
        add_run(c.paragraphs[0], h, bold=True, color=WHITE, size=9)
    for i, row in enumerate(ownership):
        cells = table.add_row().cells
        for idx, (c, v) in enumerate(zip(cells, row)):
            set_cell_shading(c, CREAM_2 if i % 2 == 0 else WHITE)
            add_run(c.paragraphs[0], v, bold=(idx == 0), color=ORANGE if idx == 0 else BROWN, size=9.5)
    set_table_borders(table)
    add_callout(doc, "CÂU BÀN GIAO", "“Phần này liên quan trực tiếp tới [tài chính/hạ tầng/pilot]. Em xin mời [tên] trả lời bằng giả định và số đội đang dùng.”", fill=CREAM, accent=ORANGE)

    doc.add_paragraph("BÀI TẬP LUYỆN — BIẾN FRAMEWORK THÀNH PHẢN XẠ", style="Pitch Section")
    numbered_step(doc, "Vòng 1 · 20 giây", "Một người bốc câu hỏi; người trả lời chỉ được dùng KẾT–CƠ–CHỐT. Nếu quá 20 giây, làm lại từ đầu.")
    numbered_step(doc, "Vòng 2 · 45 giây", "Thêm một bằng chứng và một giới hạn. Người nghe phải nhắc lại được đúng câu kết luận sau khi nghe.")
    numbered_step(doc, "Vòng 3 · Bị ngắt", "Người hỏi ngắt ngẫu nhiên ở giây 10–20. Người trả lời phải bỏ đoạn cũ và trả lời thẳng câu mới trong một câu trước.")
    numbered_step(doc, "Vòng 4 · Đổi giả định", "Thay conversion, đơn giá API hoặc số hợp đồng; người trả lời phải nói số nào đổi, số nào không đổi và dữ liệu nào cần đo.")
    numbered_step(doc, "Vòng 5 · Hostile", "Người hỏi dùng tiền đề mạnh như “AI này chỉ là chatbot”. Người trả lời công nhận phần đúng, sửa ranh giới, đưa bằng chứng — tuyệt đối không phản ứng phòng thủ.")
    add_callout(doc, "RUBRIC 10 ĐIỂM", "2 điểm trả lời thẳng · 2 điểm cơ chế rõ · 2 điểm bằng chứng đúng · 1 điểm khai giả định · 1 điểm thừa nhận giới hạn · 1 điểm đúng thời gian · 1 điểm có câu chốt đáng nhớ. Dưới 8 điểm: trả lời lại, không tranh luận điểm.", fill=PALE_GREEN, accent=GREEN)
    page_break(doc)

    # Internal consistency warnings
    doc.add_paragraph("CẢNH BÁO NỘI BỘ — KHÔNG ĐỌC TRÊN SÂN KHẤU", style="Pitch Section")
    add_banner(doc, "PHẢI CHỐT MỘT BỘ SỐ TRƯỚC GIỜ G", fill=RED)
    add_callout(
        doc,
        "1 · SLIDE FINANCE ĐANG CÓ HAI TẦNG GIẢ ĐỊNH",
        "Bảng unit economics dùng Plus 9.600đ, Pro 26.400đ, School 6 triệu và định phí 617 triệu. Khối Year 1 lại dùng ngân sách AI cao hơn, School 4,5 triệu và chi phí cố định 670 triệu. "
        "Kịch bản đã gọi đây là “mức sử dụng chuẩn” và “stress-test bảo thủ”. Trong Q&A phải giữ đúng cách giải thích này; tốt nhất thêm nhãn ngay trên slide.",
        fill=PALE_ORANGE,
        accent=RED,
    )
    add_callout(
        doc,
        "2 · KHÔNG DÙNG LẠI SỐ CŨ",
        "Kịch bản cũ có TAM 1–1,08 tỷ USD, biên 94% và hòa vốn 533 khách. Deck mới hiển thị TAM 9–10 nghìn tỷ VND, biên đóng góp Plus/Pro khoảng 98% và hòa vốn 537 khách + 12 trường. "
        "Khi nói trên sân khấu, dùng đúng bộ số của deck mới.",
        fill=CREAM,
        accent=ORANGE,
    )
    add_callout(
        doc,
        "3 · CON SỐ PISA −71 CẦN NGƯỜI PHỤ TRÁCH NGUỒN XÁC NHẬN",
        "Đừng nói “mức tụt sâu nhất” nếu chưa có bảng OECD gốc và điều kiện so sánh. Bản nói hiện dùng cách an toàn hơn: “là một cảnh báo khác”. Nếu chưa xác minh được trước giờ G, bỏ con số này khỏi lời nói nhưng vẫn có thể để slide chạy qua.",
        fill=PALE_BLUE,
        accent=BLUE,
    )
    add_callout(
        doc,
        "4 · TUYỆT ĐỐI KHÔNG NÓI ‘AI SINH SỐ LIỆU VẬT LÍ’",
        "Nói đúng: physics engine tạo chuyển động, nhiễu và điểm số; AI đọc, phân loại, gợi ý, diễn giải và cá nhân hóa. Đây là ranh giới giúp đội bảo vệ độ tin cậy trước ban giám khảo kỹ thuật.",
        fill=PALE_GREEN,
        accent=GREEN,
    )
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(16)
    add_run(p, "Chốt cuối: tập theo ý — không đọc thuộc chữ. Ba câu phải thuộc nguyên văn: Hook · Máy chấm điểm — AI kể chuyện · Câu CTA cuối.", bold=True, color=ORANGE, size=11)

    doc.save(OUTPUT)
    return OUTPUT


if __name__ == "__main__":
    print(build())
