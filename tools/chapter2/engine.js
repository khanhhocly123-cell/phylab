/* Boolean engine: no eval, exhaustive equivalence, exact prime-implicant cover. */
const Engine = (() => {
  function parse(source, vars) {
    const input = source.toUpperCase().replace(/\s/g,'').replace(/[¬~]/g,'!').replace(/[·&]/g,'*').replace(/[∨|]/g,'+').replace(/⊕/g,'^').replace(/[’′]/g,"'");
    const tokens = input.match(/[A-Z][0-9]*|[01]|[!+*^()']/g) || [];
    if (tokens.join('') !== input || !tokens.length) throw Error('Dùng biến của đề, 0, 1, !, +, *, ^ và dấu ngoặc.');
    let p = 0;
    function atom(){
      let t = tokens[p++], n;
      if(t==='!') n={op:'not',a:atom()};
      else if(t==='('){ n=or(); if(tokens[p++]!==')')throw Error('Thiếu dấu đóng ngoặc.'); }
      else if(t==='0'||t==='1') n={op:'const',v:+t};
      else if(vars.includes(t)) n={op:'var',v:t};
      else throw Error('Biến không hợp lệ: '+(t||'cuối biểu thức'));
      while(tokens[p]==="'"){p++;n={op:'not',a:n};}return n;
    }
    function and(){let n=atom();while(tokens[p]==='*'||(tokens[p]&&![')',"'",'+','^'].includes(tokens[p]))){if(tokens[p]==='*')p++;n={op:'and',a:n,b:atom()};}return n;}
    function xor(){let n=and();while(tokens[p]==='^'){p++;n={op:'xor',a:n,b:and()};}return n;}
    function or(){let n=xor();while(tokens[p]==='+'){p++;n={op:'or',a:n,b:xor()};}return n;}
    const n=or();if(p!==tokens.length)throw Error('Kiểm tra lại toán tử và dấu ngoặc.');return n;
  }
  function evaluate(n,env){switch(n.op){case'var':return env[n.v];case'const':return n.v;case'not':return 1-evaluate(n.a,env);case'and':return evaluate(n.a,env)&evaluate(n.b,env);case'or':return evaluate(n.a,env)|evaluate(n.b,env);case'xor':return evaluate(n.a,env)^evaluate(n.b,env);}}
  const bits=(i,n)=>i.toString(2).padStart(n,'0').split('').map(Number);
  const env=(i,vars)=>Object.fromEntries(vars.map((v,k)=>[v,bits(i,vars.length)[k]]));
  function truth(expr,vars){const tree=parse(expr,vars);return Array.from({length:2**vars.length},(_,i)=>evaluate(tree,env(i,vars)));}
  function minimize(values,vars,pos=false){
    const target=pos?0:1, required=values.flatMap((v,i)=>v===target?[i]:[]);
    if(!required.length)return {expr:pos?'1':'0',groups:[]};
    const candidates=[];
    function cubes(s){if(s.length<vars.length){for(const b of ['0','1','-'])cubes(s+b);return;}
      const cells=values.flatMap((v,i)=>bits(i,vars.length).every((b,k)=>s[k]==='-'||+s[k]===b)?[i]:[]);
      if(cells.some(i=>values[i]===1-target)||!cells.some(i=>values[i]===target))return;
      candidates.push({pattern:s,cells,cover:cells.filter(i=>values[i]===target),literals:s.replaceAll('-','').length});}
    cubes('');
    const primes=candidates.filter(c=>!candidates.some(d=>d.cells.length>c.cells.length&&c.cells.every(i=>d.cells.includes(i))));
    let best=null;const memo=new Map();
    function search(left,chosen,cost){
      if(!left.length){if(!best||chosen.length<best.length||chosen.length===best.length&&cost<best.cost){best=[...chosen];best.cost=cost;}return;}
      if(best&&chosen.length>=best.length)return;
      const key=left.join(','), old=memo.get(key);
      if(old&&(old[0]<chosen.length||old[0]===chosen.length&&old[1]<=cost))return;
      memo.set(key,[chosen.length,cost]);
      const i=left.reduce((a,b)=>primes.filter(c=>c.cover.includes(a)).length<=primes.filter(c=>c.cover.includes(b)).length?a:b);
      for(const c of primes.filter(c=>c.cover.includes(i)).sort((a,b)=>b.cover.length-a.cover.length||a.literals-b.literals)) search(left.filter(j=>!c.cover.includes(j)),[...chosen,c],cost+c.literals);
    }
    search(required,[],0);
    const groups=best.map(c=>({...c,term:c.pattern.split('').flatMap((b,k)=>b==='-'?[]:[(pos?(b==='1'):(b==='0'))?'!'+vars[k]:vars[k]]).join(pos?'+':'*')||(pos?'0':'1')}));
    return {expr:groups.map(c=>pos?'('+c.term+')':c.term).join(pos?'*':'+'),groups};
  }
  function canonical(values,vars,pos=false){const cells=values.flatMap((v,i)=>v===(pos?0:1)?[i]:[]);return cells.map(i=>{const term=bits(i,vars.length).map((b,k)=>(pos?b:!b)?'!'+vars[k]:vars[k]).join(pos?'+':'*');return pos?'('+term+')':term;}).join(pos?'*':'+')||(pos?'1':'0');}
  function mismatch(expr,task){const values=truth(expr,task.vars);return task.values.findIndex((v,i)=>v!=='X'&&v!==values[i]);}
  function network(expr,vars,mode='normal'){
    const nodes=[],cache=new Map();
    const add=(op,ins=[],label='')=>{const key=op+':'+ins.join(',')+':'+label;if(cache.has(key))return cache.get(key);const id=nodes.length;nodes.push({id,op,ins,label,depth:ins.length?1+Math.max(...ins.map(i=>nodes[i].depth)):0});cache.set(key,id);return id;};
    const type=mode.startsWith('nor')?'nor':'nand',only=mode!=='normal';
    const inv=a=>{const n=nodes[a];if(only&&n.op===type&&n.ins.length===2&&n.ins[0]===n.ins[1])return n.ins[0];if(!only&&n.op==='not')return n.ins[0];return add(only?type:'not',[a,...(only?[a]:[])]);};
    function make(n){if(n.op==='var')return add(n.op,[],String(n.v));if(n.op==='const'){if(!only)return add(n.op,[],String(n.v));const v=add('var',[],vars[0]),base=add(type,[v,inv(v)]);return n.v===(type==='nand'?1:0)?base:inv(base);}if(!only&&(n.op==='and'||n.op==='or')){const terms=[];function flatten(t){if(t.op===n.op){flatten(t.a);flatten(t.b);}else terms.push(make(t));}flatten(n);return add(n.op,terms);}const a=make(n.a);if(n.op==='not')return inv(a);const b=make(n.b);if(!only)return add(n.op,[a,b]);
      if(n.op==='and')return type==='nand'?inv(add('nand',[a,b])):add('nor',[inv(a),inv(b)]);
      if(n.op==='or')return type==='nor'?inv(add('nor',[a,b])):add('nand',[inv(a),inv(b)]);
      const t=add('nand',[a,b]);if(type==='nand')return add('nand',[add('nand',[a,t]),add('nand',[b,t])]);
      return add('nor',[add('nor',[a,b]),add('nor',[inv(a),inv(b)])]);
    }
    const output=make(parse(expr,vars)),reachable=new Set();function mark(id){if(reachable.has(id))return;reachable.add(id);nodes[id].ins.forEach(mark);}mark(output);const clean=[],ids=new Map();for(const n of nodes)if(reachable.has(n.id)){const id=clean.length,ins=n.ins.map(i=>ids.get(i));ids.set(n.id,id);clean.push({...n,id,ins,depth:ins.length?1+Math.max(...ins.map(i=>clean[i].depth)):0});}return {nodes:clean,output:ids.get(output)};
  }
  function simulate(net,input){const out=[];for(const n of net.nodes){const a=out[n.ins[0]],b=out[n.ins[1]];out.push(n.op==='var'?input[n.label]:n.op==='const'?+n.label:n.op==='not'?1-a:n.op==='and'?n.ins.reduce((v,i)=>v&out[i],1):n.op==='or'?n.ins.reduce((v,i)=>v|out[i],0):n.op==='xor'?a^b:n.op==='nand'?1-(a&b):1-(a|b));}return out;}
  return {parse,evaluate,bits,env,truth,minimize,canonical,mismatch,network,simulate};
})();
if(typeof module!=='undefined')module.exports=Engine;
