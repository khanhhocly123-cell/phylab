/* Transcribed from BTC2.pdf, chapter 2 only, printed pages 5–9. */
const LESSONS=[];
const V=s=>s.split(' ');
function exprTask(name,vars,expr,extra={}){vars=V(vars);return {name,vars,expr,values:Engine.truth(expr,vars),...extra};}
function setTask(name,vars,indices,dc=[],pos=false,extra={}){vars=V(vars);return {name,vars,values:Array.from({length:2**vars.length},(_,i)=>dc.includes(i)?'X':indices.includes(i)?(pos?0:1):(pos?1:0)),given:(pos?'ΠM':'Σm')+'('+indices.join(',')+')'+(dc.length?' ; d('+dc.join(',')+')':''),...extra};}
function lesson(id,title,category,page,request,insight,tasks,extra={}){const l={id,title,category,page,request,insight,tasks,...extra};LESSONS.push(l);return l;}
const proof=(name,vars,left,right,steps,question,options,correct)=>exprTask(name,vars,left,{right,proof:steps,question,options,correct});
lesson('2-1','Biến đổi đẳng thức','Đại số',5,'Chứng minh cả 5 đẳng thức bằng đại số. Bảng chân trị chỉ dùng để đối chiếu; phần chứng minh nằm ở chuỗi biến đổi.','Bắt đầu từ vế có cấu trúc dễ khai triển. Mỗi lần chỉ áp dụng một định luật; chú ý một vạch phủ cả ngoặc khác với phủ từng biến.',[
proof('a','A B C D','!A*B+!A*!D+B*!C*D','(!A+D)*(!A+!C)*(B+!D)',[
['Chọn vế phải','(!A+D)*(!A+!C)*(B+!D)','Hai ngoặc đầu cùng chứa !A. Dùng (x+y)(x+z)=x+yz.'],
['Gộp hai ngoặc','(!A+D*!C)*(B+!D)','Đặt x=!A, y=D, z=!C. Giữ nguyên ngoặc cuối.'],
['Phân phối','!A*B+!A*!D+D*!C*B+D*!C*!D','Nhân từng hạng trong ngoặc trái với từng hạng trong ngoặc phải.'],
['Triệt tiêu mâu thuẫn','!A*B+!A*!D+B*!C*D','D!D=0 nên hạng cuối mất. Ba hạng còn lại đúng bằng vế trái.']
],'Hạng D·!C·!D biến mất vì…',['D·!D = 0','D + !D = 0','D·D = 0'],0),
proof('b','A B C D','!C*D+!B*!C+!A*B*D','(!A+!C)*(B+!C)*(!B+D)',[
['Chọn vế phải','(!A+!C)*(B+!C)*(!B+D)','Đảo thứ tự các hạng để nhìn ra biến chung !C trong hai ngoặc đầu.'],
['Gộp ngoặc','(!C+!A*B)*(!B+D)','Dùng (x+y)(x+z)=x+yz với x=!C.'],
['Khai triển','!C*!B+!C*D+!A*B*!B+!A*B*D','Phân phối đủ bốn tích, chưa bỏ hạng nào.'],
['Dùng luật bù','!C*D+!B*!C+!A*B*D','B!B=0. Đổi thứ tự ba hạng còn lại thu được vế trái.']
],'Quy tắc gộp (x+y)(x+z) là…',['x+yz','xy+xz','x+y+z'],0),
proof('c','X Y Z','Z+X*Y+!X*Z','(X+Z)*(Y+Z)',[
['Bắt đầu từ vế trái','Z+X*Y+!X*Z','Z đã bao phủ mọi trường hợp !XZ=1.'],
['Hấp thụ','Z+X*Y','Z+!XZ=Z theo x+xy=x.'],
['Phân phối ngược','(Z+X)*(Z+Y)','Áp dụng x+yz=(x+y)(x+z).'],
['Sắp lại thứ tự','(X+Z)*(Y+Z)','OR có tính giao hoán. Hai vế đã trùng nhau.']
],'Vì sao bỏ được !XZ trong Z+XY+!XZ?',['Z hấp thụ !XZ','!XZ luôn bằng 0','XY luôn bằng 1'],0),
proof('d','A B','!(A^B)','!A^B',[
['Mở XOR','!(!A*B+A*!B)','A⊕B bằng 1 khi đúng một đầu vào bằng 1.'],
['De Morgan','(A+!B)*(!A+B)','Phủ tổng thành tích các phủ định.'],
['Phân phối','A*!A+A*B+!B*!A+!B*B','Hai tích chứa biến và phủ định của chính nó đều bằng 0.'],
['Nhận dạng XNOR','A*B+!A*!B','Đây là (!A)⊕B. Chú ý ! phủ toàn bộ XOR ở đề.']
],'Phủ định của XOR bằng 1 khi…',['A và B bằng nhau','A và B khác nhau','Chỉ khi A=1'],0),
proof('e','A B C','A*B*(A^B^C)','A*B*C',[
['Xét lớp XOR lẻ','A*B*(!A*!B*C+!A*B*!C+A*!B*!C+A*B*C)','XOR ba biến bằng 1 khi số bit 1 là lẻ: 001, 010, 100, 111.'],
['Phân phối AB','A*B*!A*!B*C+A*B*!A*B*!C+A*B*A*!B*!C+A*B*A*B*C','Nhân AB vào cả bốn hạng.'],
['Triệt tiêu ba hạng','A*B*A*B*C','Ba hạng đầu chứa A!A hoặc B!B.'],
['Lũy đẳng','A*B*C','AA=A, BB=B. Trực giác: AB=1 ép A=B=1, nên A⊕B⊕C=C.']
],'Khi AB=1, A⊕B⊕C bằng…',['C','!C','1'],0)
]);
const l22=lesson('2-2','Từ bảng đến biểu thức','Bảng chân trị',5,'a) Viết F1, F2. b) F1 dạng POS. c) F2 dạng SOP. d–e) Cả hai dạng Σ và Π.','Thứ tự cột của đề là C,B,A. Vì vậy i=4C+2B+A; đừng tự đổi sang A,B,C khi ghi chỉ số.',[
setTask('F1','C B A',[2,5,7]),setTask('F2','C B A',[0,3,4,5,6])]);
const l23=lesson('2-3','Hiểu đúng ô X','Bảng chân trị',5,'a) Viết biểu thức hai hàm. b) Viết Σ và Π, kèm tập d.','X ở cột đầu ra là don’t-care: không bị ép bằng 0 hoặc 1. Tập d phải tách riêng khỏi tập 1 và tập 0.',[
setTask('F1','A B C',[0,5],[2,6]),setTask('F2','A B C',[0,3,4],[1,5,6])]);
const l24=lesson('2-4','Tính từng hàng của hàm','Bảng chân trị',5,'Lập bảng chân trị cho F1 và F2 từ các biểu thức đã cho.','Tính NOT trước, rồi các tích/ngoặc, cuối cùng OR/AND ngoài cùng. Bấm đầu vào để thấy tín hiệu đi qua mạch.',[
exprTask('F1','A B C D','!A*B*C*!D+A*!B*D+A*C*D+!A*!C'),
exprTask('F2','A B C D','(!B+C+D)*(!A+!C+!D)*(!B+!D)')]);
const l25=lesson('2-5','Đọc Σ, Π và don’t-care','Bảng chân trị',5,'Lập bảng chân trị cho hai hàm được cho bằng chỉ số.','Σ liệt kê các hàng 1; Π liệt kê các hàng 0. Đánh X cho tập d trước, rồi mới điền các hàng còn lại.',[
setTask('F1','A B C D',[0,1,2,4,6,8,12],[3,13,15]),
setTask('F2','A B C D',[1,3,4,5,11,12,14,15],[0,6,7,8],true)]);
const wave26=[0,8,4,12,2,10,6,14,1,13,0], dc26=[3,5,7,9,11,15];
const l26=lesson('2-6','Đọc hàm từ giản đồ xung','Giản đồ xung',6,'a) Viết F1, F2, F3. b) Viết Σ và Π cho từng hàm theo các trạng thái quan sát được.','Lấy mẫu giữa các cạnh xung. Chỉ có 10 tổ hợp khác nhau được vẽ; 6 tổ hợp còn lại chưa được đề xác định. Ở đây X biểu thị “chưa quan sát”; coi chúng là d để tìm một hàm tương thích, không khẳng định đó là hàm duy nhất.',[
setTask('F1','A B C D',[0,2,4,6,8,10,12,14],dc26,false,{wave:wave26,partial:true}),
setTask('F2','A B C D',[13],dc26,false,{wave:wave26,partial:true}),
setTask('F3','A B C D',[1],dc26,false,{wave:wave26,partial:true})]);
const l27=lesson('2-7','Khai triển hàng gộp','Bảng chân trị',6,'a) Viết F1 và F2. b) Viết dạng Σ và Π.','Hàng 1XXX nằm ở đầu vào: nó đại diện 8 tổ hợp A=1, còn B,C,D tùy ý. Đầu ra của cả 8 hàng đã xác định; đây không phải 8 đầu ra don’t-care.',[
setTask('F1','A B C D',[0,4,8,9,10,11,12,13,14,15]),setTask('F2','A B C D',[0,1,3,4,5,7])]);
lesson('2-8','Đưa tất cả hàm lên bìa K','Bìa Karnaugh',6,'Biểu diễn toàn bộ 13 hàm của các bài 2-2 đến 2-7 lên bìa Karnaugh.','Giữ đúng thứ tự biến của từng bài. Các nhãn Gray 00,01,11,10 giúp hai ô kề nhau chỉ khác đúng một biến.',[l22,l23,l24,l25,l26,l27].flatMap(l=>l.tasks.map(t=>({...t,name:l.id+' · '+t.name,origin:l.id,proof:undefined}))),{mapOnly:true});
lesson('2-9','Đọc mạch AND–OR','Mạch logic',6,'Viết dạng chuẩn 1 (SOP) và chuẩn 2 (POS) của F1 và F2.','F1 lấy X và !Y qua AND. F2 OR hai nhánh !XZ và X!Z, nên chính là XOR của X,Z; Y không ảnh hưởng F2.',[
exprTask('F1','X Y Z','X*!Y'),exprTask('F2','X Y Z','!X*Z+X*!Z')]);
lesson('2-10','Tín hiệu chạy qua mạch','Giản đồ xung',6,'Vẽ dạng tín hiệu F từ mạch trang 6 và các tín hiệu A,B,C ở đầu trang 7.','Nhánh trên là ABC, nhánh dưới là B!C. F=B(A+!C). Chỉ xét mức logic ổn định; đề không cho độ trễ cổng.',[
exprTask('F','A B C','A*B*C+B*!C',{wave:[4,0,6,2,6,1,5,1,7,3,7,0,4,0]})]);
lesson('2-11','Mạch giải mã tích cực thấp','Mạch logic',7,'Lập bảng chân trị và viết Y0–Y3 trong hai trường hợp: a) E=0,D=0; b) E=0.','E và D được đảo rồi AND: điều kiện cho phép là !E!D. Bốn ngõ ra dùng NAND nên ngõ được chọn xuống 0. Theo dây trong hình: Y1 chọn A=1,B=0; Y2 chọn A=0,B=1.',[
...['!A*!B','A*!B','!A*B','A*B'].map((e,i)=>exprTask('a · Y'+i,'A B','!('+e+')')),
...['!A*!B','A*!B','!A*B','A*B'].map((e,i)=>exprTask('b · Y'+i,'A B D','!('+e+'*!D)'))]);
lesson('2-12','Chuẩn hóa bốn biểu thức','Đại số',7,'Tìm dạng chuẩn 1 và chuẩn 2 của F1–F4.','Dạng chuẩn cần đủ tất cả biến trong mỗi hạng. F3 rút gọn thành A+B+C. Ở F4, ! phủ cả (A⊕B), còn !A!B!C là ba phủ định riêng.',[
exprTask('F1','X Y Z','X*Y+Y*Z+X*Z'),exprTask('F2','X Y Z','X*Y+!X*Z'),
exprTask('F3','A B C','A+C+!A*B'),exprTask('F4','A B C','!(A^B)+!A*!B*!C')]);
lesson('2-13','Nhóm lớn và bìa K 5 biến','Bìa Karnaugh',7,'Rút gọn bốn hàm bằng bìa Karnaugh, gồm một hàm 5 biến.','F2 chỉ ép F(000)=0, mọi hàng khác là X: chọn F=0 là hợp lệ và tối giản. Bìa 5 biến gồm hai lớp A=0 và A=1; các ô cùng vị trí ở hai lớp kề nhau.',[
setTask('F1','A B C D',[0,1,2,4,5,8,10,12,14]),setTask('F2','A B C',[0],[1,2,3,4,5,6,7],true),
exprTask('F3','A B C D','!A*!B*!C*!D+!A*B+!A*(C^D)+A*B*C+C*!D'),
setTask('F4','A B C D E',[1,3,4,5,6,9,12,14,20,21,22,25,28,29],[13,16,30],true,{prefer:'pos'})]);
lesson('2-14-I','Luyện gom nhóm 4 biến','Bìa Karnaugh',7,'Dùng bìa Karnaugh rút gọn cả bốn hàm. Đây là bài 2-14 xuất hiện lần đầu.','SOP gom ô 1; POS gom ô 0. X có thể tham gia nhóm khi có lợi, nhưng không bắt buộc phải được phủ.',[
setTask('F1','A B C D',[1,2,4,7,9,15],[3,5]),setTask('F2','A B C D',[0,1,2,4,5,8,10,11,14,15]),
setTask('F3','A B C D',[2,5,7,8,13,15],[0,10],true,{prefer:'pos'}),setTask('F4','A B C D',[0,2,4,5,6,8,10,12,13],[],true,{prefer:'pos'})]);
lesson('2-15-I','Từ xung đến mạch NAND','Giản đồ xung',8,'a) Dạng chuẩn 2. b) Bìa Karnaugh. c) Rút gọn và vẽ mạch chỉ dùng NAND.','Thứ tự thời gian không phải thứ tự minterm. Đọc ABCD trong từng khoảng rồi quy về i=8A+4B+2C+D. Hai lần gặp cùng đầu vào phải cho cùng F.',[
setTask('F','A B C D',[0,1,2,4,5,8,10,12,14],[],false,{wave:[0,15,7,11,3,13,5,9,1,14,6,10,2,12,4,8,0,15],gate:'nand'})]);
lesson('2-16-I','Chỉ dùng NAND 2 ngõ vào','NAND / NOR',8,'Rút gọn rồi thực hiện hàm chỉ bằng NAND 2 ngõ vào.','NAND không kết hợp: NAND(NAND(a,b),c) không phải NAND(a,b,c). App tách cây AND bằng cặp NAND và đảo lại đúng cực tính; mọi cổng trong sơ đồ đều có đúng 2 ngõ vào.',[
setTask('F','A B C D',[4,6,9,10,12,14],[8,11,13],false,{gate:'nand2'})]);
lesson('2-17-I','Chỉ dùng NOR 2 ngõ vào','NAND / NOR',8,'Rút gọn rồi thực hiện hàm chỉ bằng NOR 2 ngõ vào.','Gom các ô 0 để có POS. NOR(x,x)=!x; hai tầng NOR thực hiện OR–AND. Khi tách cổng nhiều ngõ, phải khôi phục cực tính ở mỗi tầng.',[
setTask('F','A B C D',[0,2,3,4,6,9,10,11],[7,13,15],true,{gate:'nor2',prefer:'pos'})]);
lesson('2-14-II','Đổi biểu thức sang NAND','NAND / NOR',8,'Thực hiện F chỉ bằng cổng NAND. Đây là bài 2-14 được đánh số lặp trên trang 8.','Khai triển thành !BC + !B!D + !A!CD rồi dùng De Morgan. Mạch minh họa dùng NAND 2 ngõ vào, cũng thỏa yêu cầu toàn NAND của đề.',[
exprTask('F','A B C D','!B*(C+!D)+!A*!C*D',{gate:'nand'})]);
lesson('2-15-II','Đổi biểu thức sang NOR','NAND / NOR',8,'Thực hiện F chỉ bằng cổng NOR. Đây là bài 2-15 đánh số lặp.','!C+BCD = !C+BD = (!C+B)(!C+D). Vì vậy có thể viết F=(!A+!B)(!C+B)(!C+D) rồi đổi sang NOR.',[
exprTask('F','A B C D','(!A+!B)*(!C+B*C*D)',{gate:'nor',prefer:'pos'})]);
lesson('2-16-II','Phủ định nhiều tầng','NAND / NOR',8,'a) Bìa K. b) Dạng POS. c) Rút gọn và vẽ mạch toàn NAND cho cả ba hàm. Đây là bài 2-16 đánh số lặp.','Đọc đúng phạm vi các vạch phủ định. F1 chứa (A⊕B) và phủ định của nó nên F1=1. F3 phủ cả (!A!B+ABD), rồi mới nhân với (B+!CD).',[
exprTask('F1','A B C D','(A^B)+(!B*C*D+!(B*C*D))*C+!(A^B)+!(B*D*C)',{gate:'nand'}),
exprTask('F2','A B C D','!((A+C)*(C+D)+!A*!B*!D)',{gate:'nand'}),
exprTask('F3','A B C D','!(!A*!B+A*B*D)*(B+!C*D)',{gate:'nand'})]);
lesson('2-17-II','Chọn cấu trúc mạch phù hợp','NAND / NOR',8,'a) F1 dạng AND–OR. b) F2 dạng OR–AND. c) F1 toàn NAND. d) F2 toàn NOR. Đây là bài 2-17 đánh số lặp.','Cùng một hàm có thể có nhiều cách chọn các ô X. Tối ưu F1 theo SOP và F2 theo POS, sau đó đổi sang NAND/NOR mà giữ nguyên bảng chân trị ở các hàng xác định.',[
setTask('F1','A B C D',[0,2,3,4,6,7,8],[5,12,14],false,{gate:'nand',both:true}),
setTask('F2','A B C D',[2,3,8,9,10,12,14,15],[0,11,13],true,{gate:'nor',prefer:'pos',both:true})]);
lesson('2-18','Giải mã 3 → 8 có điều khiển','Mạch logic',8,'a) Viết Y0 đến Y7. b) Vẽ sơ đồ logic của tất cả ngõ ra (yêu cầu tiếp ở trang 9).','Enable=G1·!G2. Nếu G1=0 hoặc G2=1, cả 8 ngõ ra bằng 0. Khi cho phép, đúng một ngõ ra bằng 1 theo mã X2X1X0. X ở cột vào nghĩa là không cần xét bit đó.',
Array.from({length:8},(_,i)=>exprTask('Y'+i,'G1 G2 X2 X1 X0','G1*!G2*'+Engine.bits(i,3).map((b,j)=>(b?'':'!')+['X2','X1','X0'][j]).join('*'),{decoder:i})));
for(const l of LESSONS)for(const [i,t]of l.tasks.entries()){t.id=l.id+':'+i;t.sop=Engine.minimize(t.values,t.vars);t.pos=Engine.minimize(t.values,t.vars,true);}
if(typeof module!=='undefined')module.exports={LESSONS};
