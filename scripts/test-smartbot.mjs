const BASE = process.argv[2] || "http://localhost:3000";
const url = `${BASE.replace(/\/$/, "")}/api/vnpt/chat`;

console.log(`Testing SmartBot API route fallback at: ${url}`);

let passed = 0;
let failed = 0;

function assert(name, condition) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name} (FAILED)`);
  }
}

async function runTests() {
  try {
    // Check 1: Standard Q&A Chat
    const chatRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        task: "chat",
        text: "Công thức tính gia tốc rơi tự do là gì?"
      })
    });
    assert("Chat task HTTP status should be 200", chatRes.status === 200);
    const chatData = await chatRes.json();
    assert("Chat response should contain message", typeof chatData.message === "string" && chatData.message.length > 0);
    assert("Chat response source should be 'smartbot' or 'rag'", ["smartbot", "rag"].includes(chatData.source));

    // Check 2: Problem rewrite task
    const probRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        task: "problem",
        labKind: "freefall",
        prompt: "Hãy đo gia tốc rơi tự do với s = 0.40m.",
        targets: [0.40]
      })
    });
    assert("Problem task HTTP status should be 200", probRes.status === 200);
    const probData = await probRes.json();
    assert("Problem response should contain message and keep targets", probData.message && (probData.message.includes("0.40") || probData.message.includes("0,40")));

    // Check 3: Grading feedback task
    const gradeRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        task: "grade",
        summary: "Bài: Đo gia tốc rơi tự do. Điểm: 9.0/10.",
        totalScore: 9.0,
        dataCloseness: 95,
        physicalCloseness: 90,
        badSetupCount: 0
      })
    });
    assert("Grade task HTTP status should be 200", gradeRes.status === 200);
    const gradeData = await gradeRes.json();
    assert("Grade response should contain feedback comment", typeof gradeData.message === "string" && gradeData.message.length > 0);

    // Check 4: Security empty input check
    const emptyRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        task: "chat",
        text: ""
      })
    });
    assert("Empty chat text should return 400 Bad Request", emptyRes.status === 400);

    console.log(`SmartBot API fallback tests finished: ${passed} passed, ${failed} failed.`);
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error("Failed to connect or test SmartBot API endpoint:", err.message);
    process.exit(1);
  }
}

runTests();
