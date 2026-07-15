require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyBGWDUxEuRHji143a_ai6xArZahTABKPaM",
  authDomain: "codenova-7f865.firebaseapp.com",
  projectId: "codenova-7f865",
  storageBucket: "codenova-7f865.firebasestorage.app",
  messagingSenderId: "177154885761",
  appId: "1:177154885761:web:4af4e3fa5d7fc073676580",
  measurementId: "G-1G636LE71J"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrate() {
  console.log("Starting migration from local JSON files to Firebase Firestore...");
  
  // 1. Migrate Users
  try {
    const usersFile = path.join(__dirname, 'users.json');
    if (fs.existsSync(usersFile)) {
      console.log("Migrating users...");
      const users = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
      for (const [key, u] of Object.entries(users)) {
        const userKey = u.email.toLowerCase().replace(/[$.#]/g, '_');
        const userData = {
          ...u,
          solved: typeof u.solved === 'string' ? JSON.parse(u.solved) : (u.solved || []),
          solutions: typeof u.solutions === 'string' ? JSON.parse(u.solutions) : (u.solutions || {}),
          customProblems: typeof u.customProblems === 'string' ? JSON.parse(u.customProblems) : (u.customProblems || []),
          streak: u.streak || 0,
          lastSolvedDate: u.lastSolvedDate || null
        };
        
        const userRef = doc(db, 'users', userKey);
        await setDoc(userRef, userData);
        console.log(` Migrated user: ${u.email}`);
      }
    }
  } catch (err) {
    console.warn("Could not migrate users.", err.message);
  }

  // 2. Migrate Problems
  try {
    const problemsFile = path.join(__dirname, 'problems.json');
    if (fs.existsSync(problemsFile)) {
      console.log("Migrating problems...");
      const problems = JSON.parse(fs.readFileSync(problemsFile, 'utf8'));
      for (const [id, p] of Object.entries(problems)) {
        const problemData = {
          ...p,
          examples: typeof p.examples === 'string' ? p.examples : JSON.stringify(p.examples || []),
          constraints: typeof p.constraints === 'string' ? p.constraints : JSON.stringify(p.constraints || []),
          params: typeof p.params === 'string' ? p.params : JSON.stringify(p.params || []),
          argTypes: typeof p.argTypes === 'string' ? p.argTypes : JSON.stringify(p.argTypes || []),
          templates: typeof p.templates === 'string' ? p.templates : JSON.stringify(p.templates || {}),
          sampleTestCases: typeof p.sampleTestCases === 'string' ? p.sampleTestCases : JSON.stringify(p.sampleTestCases || []),
          systemTestCases: typeof p.systemTestCases === 'string' ? p.systemTestCases : JSON.stringify(p.systemTestCases || []),
          solutions: typeof p.solutions === 'string' ? p.solutions : JSON.stringify(p.solutions || {})
        };
        
        const problemRef = doc(db, 'problems', String(p.id));
        await setDoc(problemRef, problemData);
        console.log(` Migrated problem: ${p.id} - ${p.title}`);
      }
    }
  } catch (err) {
    console.warn("Could not migrate problems.", err.message);
  }

  // 3. Migrate Custom Problems
  try {
    const customProblemsFile = path.join(__dirname, 'custom_problems.json');
    if (fs.existsSync(customProblemsFile)) {
      console.log("Migrating custom problems...");
      const customProblems = JSON.parse(fs.readFileSync(customProblemsFile, 'utf8'));
      for (const [id, p] of Object.entries(customProblems)) {
        const problemData = {
          ...p,
          examples: typeof p.examples === 'string' ? p.examples : JSON.stringify(p.examples || []),
          constraints: typeof p.constraints === 'string' ? p.constraints : JSON.stringify(p.constraints || []),
          params: typeof p.params === 'string' ? p.params : JSON.stringify(p.params || []),
          argTypes: typeof p.argTypes === 'string' ? p.argTypes : JSON.stringify(p.argTypes || []),
          templates: typeof p.templates === 'string' ? p.templates : JSON.stringify(p.templates || {}),
          sampleTestCases: typeof p.sampleTestCases === 'string' ? p.sampleTestCases : JSON.stringify(p.sampleTestCases || []),
          systemTestCases: typeof p.systemTestCases === 'string' ? p.systemTestCases : JSON.stringify(p.systemTestCases || []),
          solutions: typeof p.solutions === 'string' ? p.solutions : JSON.stringify(p.solutions || {})
        };
        
        const problemRef = doc(db, 'custom_problems', String(p.id));
        await setDoc(problemRef, problemData);
        console.log(` Migrated custom problem: ${p.id} - ${p.title}`);
      }
    }
  } catch (err) {
    console.warn("Could not migrate custom problems.", err.message);
  }

  console.log("Migration complete!");
  process.exit(0);
}

migrate();
