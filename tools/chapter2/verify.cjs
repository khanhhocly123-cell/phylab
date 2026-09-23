const assert=require('node:assert/strict');
global.Engine=require('./engine.js');
const {LESSONS}=require('./content.js');
assert.equal(LESSONS.length,22);
assert.equal(LESSONS.reduce((n,l)=>n+l.tasks.length,0),72);
assert.deepEqual(Engine.truth('!(A+B)', ['A','B']),[1,0,0,0]);
assert.deepEqual(Engine.truth("A'B+AB'", ['A','B']),[0,1,1,0]);
assert.deepEqual(Engine.truth('A^B^C', ['A','B','C']),[0,1,1,0,1,0,0,1]);
assert.throws(()=>Engine.parse('alert(1)',['A']));
let states=0;
for(const l of LESSONS)for(const t of l.tasks){
  assert.equal(t.values.length,2**t.vars.length);
  for(const value of t.values)assert([0,1,'X'].includes(value));
  for(const f of [t.sop.expr,t.pos.expr,Engine.canonical(t.values,t.vars),Engine.canonical(t.values,t.vars,true),...(t.proof?t.proof.map(p=>p[1]):[]),...(t.right?[t.right]:[])])assert.equal(Engine.mismatch(f,t),-1,t.id+' expression '+f);
  for(const [isPos,result] of [[false,t.sop],[true,t.pos]]){
    const target=isPos?0:1;
    for(let i=0;i<t.values.length;i++)if(t.values[i]===target)assert(result.groups.some(g=>g.cells.includes(i)),t.id+' uncovered '+i);
    for(const g of result.groups){assert.equal(Math.log2(g.cells.length)%1,0);assert(g.cells.every(i=>t.values[i]!==1-target));}
  }
  for(const mode of ['normal','nand2','nor2']){
    const net=Engine.network(t.prefer==='pos'?t.pos.expr:t.sop.expr,t.vars,mode);
    for(const n of net.nodes)if(mode!=='normal'&&n.op!=='var'){assert.equal(n.ins.length,2);assert.equal(n.op,mode.slice(0,-1));}
    for(let i=0;i<t.values.length;i++){const v=Engine.simulate(net,Engine.env(i,t.vars))[net.output];assert([0,1].includes(v));if(t.values[i]!=='X')assert.equal(v,t.values[i],t.id+' '+mode+' '+i);states++;}
  }
}
assert.deepEqual(LESSONS[1].tasks[0].vars,['C','B','A']);
assert.equal(LESSONS[12].tasks[1].sop.expr,'0');
assert.equal(LESSONS[19].tasks[0].sop.expr,'1');
assert.deepEqual(LESSONS[14].tasks[0].wave.map(i=>LESSONS[14].tasks[0].values[i]),[1,0,0,0,0,0,1,0,1,1,0,1,1,1,1,1,1,0]);
console.log(`PASS: 22 lessons, 72 functions; SOP/POS and every proof step; ${states} gate-network states; exact 2-input NAND/NOR; waveform and source-order checks.`);
