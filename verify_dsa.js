// verify_dsa.js
// Verification suite for Linked List and Binary Tree DSA compilers

const http = require('http');
const { spawn } = require('child_process');

console.log("--- Starting DSA Compiler Verification Tests ---");

// Start backend test server on isolated port 3008
const serverProcess = spawn('node', ['server.js'], {
  env: { ...process.env, PORT: '3008' }
});

serverProcess.stdout.on('data', (data) => {
  const line = data.toString().trim();
  console.log(`[Server stdout] ${line}`);
  if (line.includes('CodeNova server running')) {
    runDsaTests();
  }
});

serverProcess.stderr.on('data', (data) => {
  console.error(`[Server stderr] ${data.toString().trim()}`);
});

function postRequest(path, payload) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);
    const req = http.request({
      hostname: 'localhost',
      port: 3008,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(new Error(`Failed to parse body: ${body}`));
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.write(postData);
    req.end();
  });
}

async function runDsaTests() {
  let allPassed = true;

  try {
    // 1. Create a custom ListNode problem (Reverse Linked List)
    console.log("\n1. Publishing custom Reverse Linked List DSA challenge (ListNode -> ListNode)...");
    const createRes = await postRequest('/api/custom-problems', {
      title: "Reverse List",
      difficulty: "easy",
      category: "linked-list",
      description: "Reverse a linked list.",
      funcName: "reverseList",
      params: ["head"],
      argTypes: ["ListNode"],
      retType: "ListNode",
      sampleTestCases: [
        { args: [[1, 2, 3]], expected: [3, 2, 1] }
      ]
    });

    if (createRes.success && createRes.problem && createRes.problem.id) {
      console.log(`✅ DSA Challenge published successfully! ID: ${createRes.problem.id}`);
      const problemId = createRes.problem.id;

      // 2. Run JavaScript Solution
      console.log("\n2. Testing JavaScript ListNode execution (POST /api/run)...");
      const jsCode = `
        function reverseList(head) {
          let prev = null;
          let curr = head;
          while (curr !== null) {
            let nextTemp = curr.next;
            curr.next = prev;
            prev = curr;
            curr = nextTemp;
          }
          return prev;
        }
      `;

      const jsRunRes = await postRequest('/api/run', {
        problemId: problemId,
        language: "javascript",
        code: jsCode
      });

      if (jsRunRes.status === 'success' && jsRunRes.results && jsRunRes.results[0].passed) {
        console.log("✅ JavaScript Linked List node creation and reverse algorithm execution passed!");
      } else {
        console.error("❌ JavaScript ListNode execution failed:", jsRunRes);
        allPassed = false;
      }

      // 3. Run Python Solution
      console.log("\n3. Testing Python ListNode execution (POST /api/run)...");
      const pyCode = `
def reverseList(head: ListNode) -> ListNode:
    prev = None
    curr = head
    while curr is not None:
        next_temp = curr.next
        curr.next = prev
        prev = curr
        curr = next_temp
    return prev
`;

      const pyRunRes = await postRequest('/api/run', {
        problemId: problemId,
        language: "python",
        code: pyCode
      });

      if (pyRunRes.status === 'success' && pyRunRes.results && pyRunRes.results[0].passed) {
        console.log("✅ Python Linked List node creation and reverse algorithm execution passed!");
      } else {
        console.error("❌ Python ListNode execution failed:", pyRunRes);
        allPassed = false;
      }
    } else {
      console.error("❌ Failed to create custom ListNode problem:", createRes);
      allPassed = false;
    }

  } catch (error) {
    console.error("❌ Error running DSA verification tests:", error);
    allPassed = false;
  } finally {
    console.log("\nStopping test server...");
    serverProcess.kill('SIGTERM');
    process.exit(allPassed ? 0 : 1);
  }
}
