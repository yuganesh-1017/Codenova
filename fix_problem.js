const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc } = require('firebase/firestore');
require('dotenv').config();

const app = initializeApp({
  apiKey: process.env.FIREBASE_API_KEY || 'AIzaSyBGWDUxEuRHji143a_ai6xArZahTABKPaM',
  authDomain: 'codenova-7f865.firebaseapp.com',
  projectId: 'codenova-7f865'
});
const db = getFirestore(app);

async function fix() {
  const docRef = doc(db, 'custom_problems', 'custom_k2z4gi9a');
  
  const templates = {
    javascript: "function maxConsecutiveEvenSum(nums) {\n    // Write your code here\n}",
    python: "from typing import List\n\ndef maxConsecutiveEvenSum(nums: List[int]) -> int:\n    # Write your code here",
    cpp: "#include <vector>\nusing namespace std;\n\nint maxConsecutiveEvenSum(vector<int>& nums) {\n    // Write your code here\n}",
    java: "class Solution {\n    public int maxConsecutiveEvenSum(int[] nums) {\n        // Write your code here\n    }\n}"
  };

  const sampleTestCases = [
    { args: [[2,4,1,6,8,10]], expected: 24 },
    { args: [[1,3,5]], expected: 0 }
  ];

  const systemTestCases = [
    { args: [[2,4,1,6,8,10]], expected: 24 },
    { args: [[1,3,5]], expected: 0 },
    { args: [[2,2,2]], expected: 6 },
    { args: [[1,2,4,1,8,10,12]], expected: 30 },
    { args: [[10, 20, 30]], expected: 60 },
    { args: [[-2, -4]], expected: -6 }
  ];

  await updateDoc(docRef, {
    argTypes: JSON.stringify(["vector<int>"]),
    templates: JSON.stringify(templates),
    sampleTestCases: JSON.stringify(sampleTestCases),
    systemTestCases: JSON.stringify(systemTestCases)
  });

  console.log("Fixed custom problem custom_k2z4gi9a!");
  process.exit(0);
}

fix();
