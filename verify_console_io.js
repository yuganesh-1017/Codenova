// verify_console_io.js
// Verification suite for Console I/O (stdin/stdout) competitive programming judge

const http = require('http');
const { spawn } = require('child_process');

console.log("--- Starting Console I/O Compiler Verification Tests ---");

// Start test server on isolated port 3009
const serverProcess = spawn('node', ['server.js'], {
  env: { ...process.env, PORT: '3009' }
});

serverProcess.stdout.on('data', (data) => {
  const line = data.toString().trim();
  console.log(`[Server stdout] ${line}`);
  if (line.includes('CodeNova server running')) {
    runConsoleIoTests();
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
      port: 3009,
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

async function runConsoleIoTests() {
  let allPassed = true;

  try {
    // 1. Create a Console I/O custom challenge (A + B Problem)
    console.log("\n1. Publishing custom A+B Console I/O challenge...");
    const createRes = await postRequest('/api/custom-problems', {
      title: "Add A and B",
      difficulty: "easy",
      category: "basic",
      description: "Read two space-separated integers A and B from standard input, and print their sum A + B to standard output.",
      funcName: "main",
      params: ["stdin"],
      argTypes: ["json"],
      retType: "console-io",
      sampleTestCases: [
        { args: ["5 10"], expected: "15" }
      ]
    });

    if (createRes.success && createRes.problem && createRes.problem.id) {
      console.log(`✅ Console I/O Challenge published! ID: ${createRes.problem.id}`);
      const problemId = createRes.problem.id;

      // 2. Test JavaScript console-io solver
      console.log("\n2. Testing JavaScript Console I/O execution...");
      const jsCode = `
        const fs = require('fs');
        const input = fs.readFileSync(0, 'utf-8').trim();
        const [a, b] = input.split(' ').map(Number);
        console.log(a + b);
      `;
      const jsRes = await postRequest('/api/run', { problemId, language: 'javascript', code: jsCode });
      if (jsRes.status === 'success' && jsRes.results && jsRes.results[0].passed) {
        console.log("✅ JavaScript Console I/O execution passed!");
      } else {
        console.error("❌ JavaScript Console I/O execution failed:", jsRes);
        allPassed = false;
      }

      // 3. Test Python console-io solver
      console.log("\n3. Testing Python Console I/O execution...");
      const pyCode = `
import sys
def main():
    input_data = sys.stdin.read().strip()
    a, b = map(int, input_data.split())
    print(a + b, end='')

if __name__ == '__main__':
    main()
      `;
      const pyRes = await postRequest('/api/run', { problemId, language: 'python', code: pyCode });
      if (pyRes.status === 'success' && pyRes.results && pyRes.results[0].passed) {
        console.log("✅ Python Console I/O execution passed!");
      } else {
        console.error("❌ Python Console I/O execution failed:", pyRes);
        allPassed = false;
      }

      // 4. Test C++ console-io solver
      console.log("\n4. Testing C++ Console I/O execution...");
      const cppCode = `
#include <iostream>
using namespace std;
int main() {
    int a, b;
    if (cin >> a >> b) {
        cout << (a + b);
    }
    return 0;
}
      `;
      const cppRes = await postRequest('/api/run', { problemId, language: 'cpp', code: cppCode });
      if (cppRes.status === 'success' && cppRes.results && cppRes.results[0].passed) {
        console.log("✅ C++ Console I/O execution passed!");
      } else {
        console.error("❌ C++ Console I/O execution failed:", cppRes);
        allPassed = false;
      }

      // 5. Test Java console-io solver
      console.log("\n5. Testing Java Console I/O execution...");
      const javaCode = `
import java.util.*;
public class SolverClass { // Using non-standard class name to verify our Main replacement regex!
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (sc.hasNextInt()) {
            int a = sc.nextInt();
            int b = sc.nextInt();
            System.out.print(a + b);
        }
    }
}
      `;
      const javaRes = await postRequest('/api/run', { problemId, language: 'java', code: javaCode });
      if (javaRes.status === 'success' && javaRes.results && javaRes.results[0].passed) {
        console.log("✅ Java Console I/O execution passed!");
      } else {
        console.error("❌ Java Console I/O execution failed:", javaRes);
        allPassed = false;
      }
    } else {
      console.error("❌ Failed to create console-io challenge:", createRes);
      allPassed = false;
    }

  } catch (e) {
    console.error("❌ Exception during Console I/O verification:", e);
    allPassed = false;
  } finally {
    console.log("\nStopping test server...");
    serverProcess.kill('SIGTERM');
    process.exit(allPassed ? 0 : 1);
  }
}
