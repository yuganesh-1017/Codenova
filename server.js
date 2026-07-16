require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc, addDoc } = require('firebase/firestore');
const { OAuth2Client } = require('google-auth-library');
const axios = require('axios');
const crypto = require('crypto');

// OAuth Configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'your_google_client_id_here';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'your_google_client_secret_here';
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || 'your_github_client_id_here';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || 'your_github_client_secret_here';

const googleClient = new OAuth2Client(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET
);
const app = express();
const cors = require('cors');
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
const PORT = process.env.PORT || 3001;

// Admin secure configuration
const ADMIN_PASSWORD = 'admin123';
const ADMIN_TOKEN = 'codenova_admin_secure_token';

// Create temp directory for code execution if it doesn't exist
const tempDir = path.join(__dirname, 'temp_runs');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

// Helper to delete directory recursively
function deleteFolderRecursive(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.readdirSync(dirPath).forEach((file) => {
      const curPath = path.join(dirPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        deleteFolderRecursive(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(dirPath);
  }
}

// Dynamic Java and C++ compiler path resolution for Windows
function getJavaCompilerPaths() {
  const standardRoots = [
    'C:\\Program Files\\Microsoft',
    'C:\\Program Files\\Java',
    'C:\\Program Files\\Eclipse Foundation',
    'C:\\Program Files\\Eclipse Adoptium'
  ];

  for (const root of standardRoots) {
    if (fs.existsSync(root)) {
      const dirs = fs.readdirSync(root);
      for (const dir of dirs) {
        const binDir = path.join(root, dir, 'bin');
        const testJavac = path.join(binDir, 'javac.exe');
        const testJava = path.join(binDir, 'java.exe');
        if (fs.existsSync(testJavac) && fs.existsSync(testJava)) {
          return { javac: `"${testJavac}"`, java: `"${testJava}"` };
        }
      }
    }
  }

  return { javac: 'javac', java: 'java' };
}

function getCppCompilerPath() {
  const localGpp = path.join(__dirname, 'temp_runs', 'w64devkit', 'bin', 'g++.exe');
  if (fs.existsSync(localGpp)) {
    return `"${localGpp}"`;
  }

  const standardPaths = [
    'C:\\w64devkit\\bin\\g++.exe',
    'C:\\MinGW\\bin\\g++.exe',
    'C:\\msys64\\mingw64\\bin\\g++.exe',
    'C:\\msys64\\ucrt64\\bin\\g++.exe',
    'C:\\Program Files\\MinGW\\bin\\g++.exe'
  ];

  for (const testPath of standardPaths) {
    if (fs.existsSync(testPath)) {
      return `"${testPath}"`;
    }
  }

  return 'g++';
}

function getCppBinDir() {
  const gpp = getCppCompilerPath();
  if (gpp === 'g++') return null;
  const cleanPath = gpp.replace(/^"|"$/g, '');
  return path.dirname(cleanPath);
}

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname), {
  setHeaders: (res, path) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  }
}));

// Middleware to verify Admin Authorization Token
function requireAdminAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || authHeader !== `Bearer ${ADMIN_TOKEN}`) {
    return res.status(403).json({ error: 'Access Denied: Invalid admin credentials.' });
  }
  next();
}

// Load problems database cache
let problems = {};
try {
  const problemsData = fs.readFileSync(path.join(__dirname, 'problems.json'), 'utf8');
  problems = JSON.parse(problemsData);
  console.log(`Successfully loaded ${Object.keys(problems).length} problems from database.`);
} catch (error) {
  console.error('Error loading problems.json:', error);
}

// Load custom problems database cache
const customProblemsFile = path.join(__dirname, 'custom_problems.json');
let customProblems = {};
if (fs.existsSync(customProblemsFile)) {
  try {
    customProblems = JSON.parse(fs.readFileSync(customProblemsFile, 'utf8'));
    console.log(`Successfully loaded ${Object.keys(customProblems).length} custom problems from database.`);
  } catch (e) {
    console.error('Error loading custom_problems.json:', e);
  }
} else {
  fs.writeFileSync(customProblemsFile, '{}', 'utf8');
}

function saveCustomProblems() {
  fs.writeFileSync(customProblemsFile, JSON.stringify(customProblems, null, 2), 'utf8');
}

// Load user details database cache
const usersFile = path.join(__dirname, 'users.json');
let users = {};
if (fs.existsSync(usersFile)) {
  try {
    users = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
    console.log(`Successfully loaded ${Object.keys(users).length} user details profiles from database.`);
  } catch (e) {
    console.error('Error loading users.json:', e);
  }
} else {
  fs.writeFileSync(usersFile, '{}', 'utf8');
}

// Load login history cache
const loginHistoryFile = path.join(__dirname, 'login_history.json');
let loginHistory = [];
if (fs.existsSync(loginHistoryFile)) {
  try {
    loginHistory = JSON.parse(fs.readFileSync(loginHistoryFile, 'utf8'));
    console.log(`Successfully loaded ${loginHistory.length} login history events from database.`);
  } catch (e) {
    console.error('Error loading login_history.json:', e);
  }
} else {
  fs.writeFileSync(loginHistoryFile, '[]', 'utf8');
}

function saveLoginHistory() {
  fs.writeFileSync(loginHistoryFile, JSON.stringify(loginHistory, null, 2), 'utf8');
}

async function recordLoginEvent(email, status) {
  const loginTime = new Date().toISOString();
    try {
      await addDoc(collection(db, 'login_history'), { email: email.toLowerCase(), loginTime, status });
      console.log(`[Firebase] Logged login event for ${email} (${status})`);
    } catch (e) {
      console.error('Failed to log login event in Firebase:', e);
    }

  loginHistory.push({
    email: email.toLowerCase(),
    loginTime,
    status
  });
  saveLoginHistory();
}

// Firebase Configuration and Initialization
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyBGWDUxEuRHji143a_ai6xArZahTABKPaM",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "codenova-7f865.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "codenova-7f865",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "codenova-7f865.firebasestorage.app",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "177154885761",
  appId: process.env.FIREBASE_APP_ID || "1:177154885761:web:4af4e3fa5d7fc073676580",
  measurementId: process.env.FIREBASE_MEASUREMENT_ID || "G-1G636LE71J"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

// Accessor helpers
async function getAllProblems() {
  const snapshot = await getDocs(collection(db, 'problems'));
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: data.id,
      title: data.title,
      difficulty: data.difficulty,
      difficultyText: data.difficultyText,
      category: data.category,
      acceptance: data.acceptance
    };
  });
}

async function getProblemById(id) {
  const table = String(id).startsWith('custom_') ? 'custom_problems' : 'problems';
  const docRef = doc(db, table, String(id));
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  const p = docSnap.data();
  return {
    ...p,
    examples: typeof p.examples === 'string' ? JSON.parse(p.examples) : (p.examples || []),
    constraints: typeof p.constraints === 'string' ? JSON.parse(p.constraints) : (p.constraints || []),
    params: typeof p.params === 'string' ? JSON.parse(p.params) : (p.params || []),
    argTypes: typeof p.argTypes === 'string' ? JSON.parse(p.argTypes) : (p.argTypes || []),
    templates: typeof p.templates === 'string' ? JSON.parse(p.templates) : (p.templates || {}),
    sampleTestCases: typeof p.sampleTestCases === 'string' ? JSON.parse(p.sampleTestCases) : (p.sampleTestCases || []),
    systemTestCases: typeof p.systemTestCases === 'string' ? JSON.parse(p.systemTestCases) : (p.systemTestCases || []),
    solutions: typeof p.solutions === 'string' ? JSON.parse(p.solutions) : (p.solutions || {})
  };
}

async function getAllCustomProblems() {
  const snapshot = await getDocs(collection(db, 'custom_problems'));
  return snapshot.docs.map(doc => {
    const p = doc.data();
    return {
      id: p.id,
      title: p.title,
      difficulty: p.difficulty,
      difficultyText: p.difficultyText,
      category: p.category,
      acceptance: p.acceptance,
      solutions: typeof p.solutions === 'string' ? JSON.parse(p.solutions) : (p.solutions || {})
    };
  });
}

async function createCustomProblem(problem) {
  const problemData = {
    ...problem,
    examples: typeof problem.examples === 'string' ? problem.examples : JSON.stringify(problem.examples || []),
    constraints: typeof problem.constraints === 'string' ? problem.constraints : JSON.stringify(problem.constraints || []),
    params: typeof problem.params === 'string' ? problem.params : JSON.stringify(problem.params || []),
    argTypes: typeof problem.argTypes === 'string' ? problem.argTypes : JSON.stringify(problem.argTypes || []),
    templates: typeof problem.templates === 'string' ? problem.templates : JSON.stringify(problem.templates || {}),
    sampleTestCases: typeof problem.sampleTestCases === 'string' ? problem.sampleTestCases : JSON.stringify(problem.sampleTestCases || []),
    systemTestCases: typeof problem.systemTestCases === 'string' ? problem.systemTestCases : JSON.stringify(problem.systemTestCases || []),
    solutions: typeof problem.solutions === 'string' ? problem.solutions : JSON.stringify(problem.solutions || {})
  };
  await setDoc(doc(db, 'custom_problems', String(problem.id)), problemData);
}

async function createGlobalProblem(problem) {
  const problemData = {
    ...problem,
    examples: typeof problem.examples === 'string' ? problem.examples : JSON.stringify(problem.examples || []),
    constraints: typeof problem.constraints === 'string' ? problem.constraints : JSON.stringify(problem.constraints || []),
    params: typeof problem.params === 'string' ? problem.params : JSON.stringify(problem.params || []),
    argTypes: typeof problem.argTypes === 'string' ? problem.argTypes : JSON.stringify(problem.argTypes || []),
    templates: typeof problem.templates === 'string' ? problem.templates : JSON.stringify(problem.templates || {}),
    sampleTestCases: typeof problem.sampleTestCases === 'string' ? problem.sampleTestCases : JSON.stringify(problem.sampleTestCases || []),
    systemTestCases: typeof problem.systemTestCases === 'string' ? problem.systemTestCases : JSON.stringify(problem.systemTestCases || []),
  };
  await setDoc(doc(db, 'problems', String(problem.id)), problemData);
}

async function getAllUsers() {
  const snapshot = await getDocs(collection(db, 'users'));
  return snapshot.docs.map(doc => {
    const u = doc.data();
    return {
      ...u,
      solved: typeof u.solved === 'string' ? JSON.parse(u.solved) : (u.solved || []),
      solutions: typeof u.solutions === 'string' ? JSON.parse(u.solutions) : (u.solutions || {}),
      customProblems: typeof u.customProblems === 'string' ? JSON.parse(u.customProblems) : (u.customProblems || []),
      streak: u.streak || 0,
      lastSolvedDate: u.lastSolvedDate || null
    };
  });
}

async function getUserByEmail(email) {
  const userKey = email.toLowerCase().replace(/[$.#]/g, '_');
  const docRef = doc(db, 'users', userKey);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  const u = docSnap.data();
  return {
    ...u,
    solved: typeof u.solved === 'string' ? JSON.parse(u.solved) : (u.solved || []),
    solutions: typeof u.solutions === 'string' ? JSON.parse(u.solutions) : (u.solutions || {}),
    customProblems: typeof u.customProblems === 'string' ? JSON.parse(u.customProblems) : (u.customProblems || []),
    streak: u.streak || 0,
    lastSolvedDate: u.lastSolvedDate || null
  };
}

async function upsertUser(user) {
  const userKey = user.email.toLowerCase().replace(/[$.#]/g, '_');
  const userData = {
    email: user.email.toLowerCase(),
    password: user.password || '',
    name: user.name,
    username: user.username,
    solved: typeof user.solved === 'string' ? user.solved : JSON.stringify(user.solved || []),
    solutions: typeof user.solutions === 'string' ? user.solutions : JSON.stringify(user.solutions || {}),
    customProblems: typeof user.customProblems === 'string' ? user.customProblems : JSON.stringify(user.customProblems || []),
    lastSynced: user.lastSynced || new Date().toISOString(),
    streak: user.streak || 0,
    lastSolvedDate: user.lastSolvedDate || null
  };
  await setDoc(doc(db, 'users', userKey), userData, { merge: true });
}

async function updateCustomProblemSolutions(problemId, language, code) {
  const docRef = doc(db, 'custom_problems', String(problemId));
  const docSnap = await getDoc(docRef);
  let solutions = {};
  if (docSnap.exists()) {
    const s = docSnap.data().solutions;
    solutions = typeof s === 'string' ? JSON.parse(s) : (s || {});
  }
  solutions[language] = code;
  await updateDoc(docRef, { solutions: JSON.stringify(solutions) });
}

// Start database check
async function initDatabase() {
  console.log('[Firebase Success] Backend is securely connected to Firebase Firestore!');
}

// 15 Problems schema matching types for C++ and Java code generation
const problemTypeSchemas = {
  1: { argTypes: ['int', 'int'], retType: 'int' },
  2: { argTypes: ['string'], retType: 'string' },
  3: { argTypes: ['vector<int>'], retType: 'int' },
  4: { argTypes: ['string'], retType: 'bool' },
  5: { argTypes: ['string'], retType: 'int' },
  6: { argTypes: ['int'], retType: 'int' },
  7: { argTypes: ['int'], retType: 'bool' },
  8: { argTypes: ['vector<int>'], retType: 'int' },
  9: { argTypes: ['vector<int>', 'int'], retType: 'vector<int>' },
  10: { argTypes: ['string'], retType: 'int' },
  11: { argTypes: ['vector<string>'], retType: 'string' },
  12: { argTypes: ['string'], retType: 'bool' },
  13: { argTypes: ['vector<int>', 'vector<int>'], retType: 'double' },
  14: { argTypes: ['string', 'string'], retType: 'int' },
  15: { argTypes: ['vector<int>'], retType: 'int' }
};

// Standard compiler pre-includes to align with LeetCode environments
const pythonPrecludes = `
import math
import collections
import itertools
import heapq
import bisect
import functools
import re
import os
import json
import time
import sys
from typing import List, Dict, Tuple, Set, Optional, Union

# Predefined DSA Node Classes
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def build_list(arr):
    if not arr: return None
    head = ListNode(arr[0])
    curr = head
    for val in arr[1:]:
        curr.next = ListNode(val)
        curr = curr.next
    return head

def list_to_arr(head):
    arr = []
    curr = head
    while curr:
        arr.append(curr.val)
        curr = curr.next
    return arr

def build_tree(arr):
    if not arr or arr[0] is None: return None
    root = TreeNode(arr[0])
    queue = [root]
    i = 1
    while queue and i < len(arr):
        curr = queue.pop(0)
        if arr[i] is not None:
            curr.left = TreeNode(arr[i])
            queue.append(curr.left)
        i += 1
        if i < len(arr) and arr[i] is not None:
            curr.right = TreeNode(arr[i])
            queue.append(curr.right)
        i += 1
    return root

def tree_to_arr(root):
    if not root: return []
    arr = []
    queue = [root]
    while queue:
        curr = queue.pop(0)
        if curr:
            arr.append(curr.val)
            queue.append(curr.left)
            queue.append(curr.right)
        else:
            arr.append(None)
    while arr and arr[-1] is None:
        arr.pop()
    return arr
`;

const cppPrecludes = `
#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
#include <cmath>
#include <stack>
#include <queue>
#include <map>
#include <unordered_map>
#include <set>
#include <unordered_set>
#include <numeric>
#include <list>
#include <utility>
#include <sstream>
#include <climits>
#include <iomanip>

using namespace std;

// Predefined DSA structures
struct ListNode {
    int val;
    ListNode *next;
    ListNode() : val(0), next(nullptr) {}
    ListNode(int x) : val(x), next(nullptr) {}
    ListNode(int x, ListNode *next) : val(x), next(next) {}
};

struct TreeNode {
    int val;
    TreeNode *left;
    TreeNode *right;
    TreeNode() : val(0), left(nullptr), right(nullptr) {}
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
    TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {}
};

// DSA Construction helpers
inline ListNode* buildLinkedList(const std::vector<int>& vals) {
    if (vals.empty()) return nullptr;
    ListNode* head = new ListNode(vals[0]);
    ListNode* curr = head;
    for (size_t i = 1; i < vals.size(); ++i) {
        curr->next = new ListNode(vals[i]);
        curr = curr->next;
    }
    return head;
}

inline void printLinkedList(ListNode* head) {
    std::cout << "[";
    ListNode* curr = head;
    while (curr) {
        std::cout << curr->val;
        if (curr->next) std::cout << ",";
        curr = curr->next;
    }
    std::cout << "]";
}

inline TreeNode* buildBinaryTree(const std::vector<std::string>& vals) {
    if (vals.empty() || vals[0] == "null") return nullptr;
    TreeNode* root = new TreeNode(std::stoi(vals[0]));
    std::queue<TreeNode*> q;
    q.push(root);
    size_t i = 1;
    while (!q.empty() && i < vals.size()) {
        TreeNode* curr = q.front();
        q.pop();
        if (vals[i] != "null") {
            curr->left = new TreeNode(std::stoi(vals[i]));
            q.push(curr->left);
        }
        i++;
        if (i < vals.size() && vals[i] != "null") {
            curr->right = new TreeNode(std::stoi(vals[i]));
            q.push(curr->right);
        }
        i++;
    }
    return root;
}

inline void printBinaryTree(TreeNode* root) {
    if (!root) {
        std::cout << "[]";
        return;
    }
    std::cout << "[";
    std::vector<std::string> res;
    std::queue<TreeNode*> q;
    q.push(root);
    while (!q.empty()) {
        TreeNode* curr = q.front();
        q.pop();
        if (curr) {
            res.push_back(std::to_string(curr->val));
            q.push(curr->left);
            q.push(curr->right);
        } else {
            res.push_back("null");
        }
    }
    while (!res.empty() && res.back() == "null") {
        res.pop_back();
    }
    for (size_t i = 0; i < res.size(); ++i) {
        if (res[i] == "null") std::cout << "null";
        else std::cout << res[i];
        if (i < res.size() - 1) std::cout << ",";
    }
    std::cout << "]";
}
`;

const javaPrecludes = `
import java.util.*;
import java.io.*;
import java.math.*;
import java.text.*;
import java.util.regex.*;
import java.util.stream.*;

// Predefined DSA Classes
class ListNode {
    public int val;
    public ListNode next;
    public ListNode() {}
    public ListNode(int val) { this.val = val; }
    public ListNode(int val, ListNode next) { this.val = val; this.next = next; }
}

class TreeNode {
    public int val;
    public TreeNode left;
    public TreeNode right;
    public TreeNode() {}
    public TreeNode(int val) { this.val = val; }
    public TreeNode(int val, TreeNode left, TreeNode right) {
        this.val = val;
        this.left = left;
        this.right = right;
    }
}
`;

// C++ Helper serializers
function toCppType(type) {
  if (type === 'int') return 'int';
  if (type === 'double') return 'double';
  if (type === 'string') return 'std::string';
  if (type === 'bool') return 'bool';
  if (type === 'vector<int>') return 'std::vector<int>';
  if (type === 'vector<string>') return 'std::vector<std::string>';
  if (type === 'vector<vector<int>>') return 'std::vector<std::vector<int>>';
  if (type === 'vector<vector<string>>') return 'std::vector<std::vector<std::string>>';
  if (type === 'ListNode') return 'ListNode*';
  if (type === 'TreeNode') return 'TreeNode*';
  if (type === 'map') return 'std::unordered_map<std::string, std::string>';
  if (type === 'json') return 'std::string';
  return 'void';
}

function toCppLiteral(val, type) {
  if (type === 'int') return `${val}`;
  if (type === 'double') return `${val}`;
  if (type === 'string') return `std::string("${val.replace(/"/g, '\\"')}")`;
  if (type === 'bool') return `${val}`;
  if (type === 'vector<int>') {
    return `std::vector<int>{${val.join(',')}}`;
  }
  if (type === 'vector<string>') {
    return `std::vector<std::string>{${val.map(s => `std::string("${s.replace(/"/g, '\\"')}")`).join(',')}}`;
  }
  if (type === 'vector<vector<int>>') {
    return `std::vector<std::vector<int>>{${val.map(row => `std::vector<int>{${row.join(',')}}`).join(',')}}`;
  }
  if (type === 'vector<vector<string>>') {
    return `std::vector<std::vector<std::string>>{${val.map(row => `std::vector<std::string>{${row.map(s => `std::string("${s.replace(/"/g, '\\"')}")`).join(',')}}`).join(',')}}`;
  }
  if (type === 'ListNode') {
    return `buildLinkedList(std::vector<int>{${val.join(',')}})`;
  }
  if (type === 'TreeNode') {
    return `buildBinaryTree(std::vector<std::string>{${val.map(x => x === null ? `"null"` : `"${x}"`).join(',')}})`;
  }
  if (type === 'map') {
    return `std::unordered_map<std::string, std::string>{${Object.entries(val).map(([k, v]) => `{"${k.replace(/"/g, '\\"')}", "${String(v).replace(/"/g, '\\"')}"}`).join(',')}}`;
  }
  if (type === 'json') {
    return `std::string("${JSON.stringify(val).replace(/"/g, '\\"')}")`;
  }
  return JSON.stringify(val);
}

function printCppValueCode(varName, type) {
  if (type === 'bool') {
    return `std::cout << (${varName} ? "true" : "false");`;
  }
  if (type === 'string') {
    return `std::cout << "\\"" << ${varName} << "\\"";`;
  }
  if (type === 'vector<int>') {
    return `
      std::cout << "[";
      for (size_t i = 0; i < ${varName}.size(); ++i) {
        std::cout << ${varName}[i];
        if (i < ${varName}.size() - 1) std::cout << ",";
      }
      std::cout << "]";
    `;
  }
  if (type === 'vector<vector<int>>' || type === 'vector<vector<string>>') {
    const isStr = type.includes('string');
    const cellPrinter = isStr ? `std::cout << "\\"" << ${varName}[r][c] << "\\"";` : `std::cout << ${varName}[r][c];`;
    return `
      std::cout << "[";
      for (size_t r = 0; r < ${varName}.size(); ++r) {
        std::cout << "[";
        for (size_t c = 0; c < ${varName}[r].size(); ++c) {
          ${cellPrinter}
          if (c < ${varName}[r].size() - 1) std::cout << ",";
        }
        std::cout << "]";
        if (r < ${varName}.size() - 1) std::cout << ",";
      }
      std::cout << "]";
    `;
  }
  if (type === 'ListNode') {
    return `printLinkedList(${varName});`;
  }
  if (type === 'TreeNode') {
    return `printBinaryTree(${varName});`;
  }
  if (type === 'map') {
    return `
      std::cout << "{";
      size_t idx_${varName} = 0;
      for (const auto& pair : ${varName}) {
        std::cout << "\\"" << pair.first << "\\":\\"" << pair.second << "\\"";
        if (++idx_${varName} < ${varName}.size()) std::cout << ",";
      }
      std::cout << "}";
    `;
  }
  if (type === 'json') {
    return `std::cout << ${varName};`;
  }
  return `std::cout << ${varName};`;
}

// Java Helper serializers
function toJavaType(type) {
  if (type === 'int') return 'int';
  if (type === 'double') return 'double';
  if (type === 'string') return 'String';
  if (type === 'bool') return 'boolean';
  if (type === 'vector<int>') return 'java.util.List<Integer>';
  if (type === 'vector<string>') return 'java.util.List<String>';
  if (type === 'vector<vector<int>>') return 'java.util.List<java.util.List<Integer>>';
  if (type === 'vector<vector<string>>') return 'java.util.List<java.util.List<String>>';
  if (type === 'ListNode') return 'ListNode';
  if (type === 'TreeNode') return 'TreeNode';
  if (type === 'map') return 'java.util.Map<String, String>';
  if (type === 'json') return 'String';
  return 'void';
}

function toJavaLiteral(val, type) {
  if (type === 'int') return `${val}`;
  if (type === 'double') return `${val}`;
  if (type === 'string') return `"${val.replace(/"/g, '\\"')}"`;
  if (type === 'bool') return `${val}`;
  if (type === 'vector<int>') {
    return `java.util.Arrays.asList(${val.join(',')})`;
  }
  if (type === 'vector<string>') {
    return `java.util.Arrays.asList(${val.map(s => `"${s.replace(/"/g, '\\"')}"`).join(',')})`;
  }
  if (type === 'vector<vector<int>>') {
    return `java.util.Arrays.asList(${val.map(row => `java.util.Arrays.asList(${row.join(',')})`).join(',')})`;
  }
  if (type === 'vector<vector<string>>') {
    return `java.util.Arrays.asList(${val.map(row => `java.util.Arrays.asList(${row.map(s => `"${s.replace(/"/g, '\\"')}"`).join(',')})`).join(',')})`;
  }
  if (type === 'ListNode') {
    return `buildLinkedList(java.util.Arrays.asList(${val.join(',')}))`;
  }
  if (type === 'TreeNode') {
    return `buildBinaryTree(java.util.Arrays.asList(${val.map(x => x === null ? `"null"` : `"${x}"`).join(',')}))`;
  }
  if (type === 'map') {
    return `new java.util.HashMap<String, String>() {{ ${Object.entries(val).map(([k, v]) => `put("${k.replace(/"/g, '\\"')}", "${String(v).replace(/"/g, '\\"')}");`).join(' ')} }}`;
  }
  if (type === 'json') {
    return `"${JSON.stringify(val).replace(/"/g, '\\"')}"`;
  }
  return JSON.stringify(val);
}

function printJavaValueCode(varName, type) {
  if (type === 'string') {
    return `System.out.print("\\"" + ${varName} + "\\"");`;
  }
  if (type === 'vector<int>') {
    return `
      System.out.print("[");
      for (int i = 0; i < ${varName}.size(); ++i) {
        System.out.print(${varName}.get(i));
        if (i < ${varName}.size() - 1) System.out.print(",");
      }
      System.out.print("]");
    `;
  }
  if (type === 'vector<vector<int>>' || type === 'vector<vector<string>>') {
    const isStr = type.includes('string');
    const cellPrinter = isStr ? `System.out.print("\\"" + ${varName}.get(r).get(c) + "\\"");` : `System.out.print(${varName}.get(r).get(c));`;
    return `
      System.out.print("[");
      for (int r = 0; r < ${varName}.size(); ++r) {
        System.out.print("[");
        for (int c = 0; c < ${varName}.get(r).size(); ++c) {
          ${cellPrinter}
          if (c < ${varName}.get(r).size() - 1) System.out.print(",");
        }
        System.out.print("]");
        if (r < ${varName}.size() - 1) System.out.print(",");
      }
      System.out.print("]");
    `;
  }
  if (type === 'ListNode') {
    return `printLinkedList(${varName});`;
  }
  if (type === 'TreeNode') {
    return `printBinaryTree(${varName});`;
  }
  if (type === 'map') {
    return `
      System.out.print("{");
      int idx_${varName} = 0;
      for (java.util.Map.Entry<String, String> entry : ${varName}.entrySet()) {
        System.out.print("\\"" + entry.getKey() + "\\":\\"" + entry.getValue() + "\\"");
        if (++idx_${varName} < ${varName}.size()) System.out.print(",");
      }
      System.out.print("}");
    `;
  }
  if (type === 'json') {
    return `System.out.print(${varName});`;
  }
  return `System.out.print(${varName});`;
}

// Helpers to generate execution wrappers
function generateJsRunner(userCode, funcName, schema) {
  return `
// Predefined JS Node definitions
class ListNode {
  constructor(val=0, next=null) {
    this.val = val;
    this.next = next;
  }
}

class TreeNode {
  constructor(val=0, left=null, right=null) {
    this.val = val;
    this.left = left;
    this.right = right;
  }
}

function buildList(arr) {
  if (!arr || arr.length === 0) return null;
  let head = new ListNode(arr[0]);
  let curr = head;
  for (let i = 1; i < arr.length; i++) {
    curr.next = new ListNode(arr[i]);
    curr = curr.next;
  }
  return head;
}

function listToArr(head) {
  let arr = [];
  let curr = head;
  while (curr) {
    arr.push(curr.val);
    curr = curr.next;
  }
  return arr;
}

function buildTree(arr) {
  if (!arr || arr.length === 0 || arr[0] === null) return null;
  let root = new TreeNode(arr[0]);
  let queue = [root];
  let i = 1;
  while (queue.length > 0 && i < arr.length) {
    let curr = queue.shift();
    if (arr[i] !== null && arr[i] !== undefined) {
      curr.left = new TreeNode(arr[i]);
      queue.push(curr.left);
    }
    i++;
    if (i < arr.length && arr[i] !== null && arr[i] !== undefined) {
      curr.right = new TreeNode(arr[i]);
      queue.push(curr.right);
    }
    i++;
  }
  return root;
}

function treeToArr(root) {
  if (!root) return [];
  let arr = [];
  let queue = [root];
  while (queue.length > 0) {
    let curr = queue.shift();
    if (curr) {
      arr.push(curr.val);
      queue.push(curr.left);
      queue.push(curr.right);
    } else {
      arr.push(null);
    }
  }
  while (arr.length > 0 && arr[arr.length - 1] === null) {
    arr.pop();
  }
  return arr;
}

// User Code
${userCode}

// Deep equal helper
function deepEqual(x, y) {
  if (x === y) return true;
  if (typeof x === 'object' && typeof y === 'object' && x != null && y != null) {
    const keysX = Object.keys(x);
    const keysY = Object.keys(y);
    if (keysX.length !== keysY.length) return false;
    for (let key of keysX) {
      if (!keysY.includes(key) || !deepEqual(x[key], y[key])) return false;
    }
    return true;
  }
  return false;
}

const testCases = require('./testcases.json');
const results = [];
const argTypes = ${JSON.stringify(schema.argTypes)};
const retType = "${schema.retType}";

try {
  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    const startTime = process.hrtime();
    
    // Convert inputs
    const convertedArgs = tc.args.map((val, idx) => {
      if (argTypes[idx] === 'ListNode') return buildList(val);
      if (argTypes[idx] === 'TreeNode') return buildTree(val);
      if (argTypes[idx] === 'json') return JSON.stringify(val);
      return val;
    });

    let output = ${funcName}(...convertedArgs);
    
    const diff = process.hrtime(startTime);
    const durationMs = (diff[0] * 1000) + (diff[1] / 1000000);
    
    // Convert outputs (handle in-place void-returning problems)
    let checkType = retType;
    if (retType === 'void' && argTypes.length > 0) {
      output = convertedArgs[0];
      checkType = argTypes[0];
    }
    
    if (checkType === 'ListNode') output = listToArr(output);
    else if (checkType === 'TreeNode') output = treeToArr(output);
    else if (checkType === 'json' && typeof output === 'object') output = JSON.stringify(output);
    
    results.push({
      passed: typeof output === 'string' && typeof tc.expected === 'string' ? output.trim() === tc.expected.trim() : deepEqual(output, tc.expected),
      output: output,
      expected: tc.expected,
      durationMs: durationMs
    });
  }
  console.log("\\nRESULT_START:" + JSON.stringify({ status: 'success', results: results }));
} catch (e) {
  console.log("\\nRESULT_START:" + JSON.stringify({ status: 'error', error: e.message, stack: e.stack }));
}
`;
}

function generatePyRunner(userCode, funcName, schema) {
  return `
${pythonPrecludes}

# User Code
${userCode}

# Deep equal helper
def deep_equal(x, y):
    if type(x) != type(y):
        if isinstance(x, (int, float)) and isinstance(y, (int, float)):
            return x == y
        return False
    if isinstance(x, dict):
        if len(x) != len(y): return False
        for k, v in x.items():
            if k not in y or not deep_equal(v, y[k]): return False
        return True
    if isinstance(x, (list, tuple)):
        if len(x) != len(y): return False
        for i in range(len(x)):
            if not deep_equal(x[i], y[i]): return False
        return True
    return x == y

# Load testcases dynamically
dir_path = os.path.dirname(os.path.realpath(__file__))
with open(os.path.join(dir_path, 'testcases.json'), 'r') as f:
    test_cases = json.load(f)

results = []
arg_types = ${JSON.stringify(schema.argTypes)}
ret_type = "${schema.retType}"

try:
    for tc in test_cases:
        start_time = time.perf_counter()
        
        # Convert args
        converted_args = []
        for idx, type_name in enumerate(arg_types):
            val = tc["args"][idx]
            if type_name == "ListNode":
                converted_args.append(build_list(val))
            elif type_name == "TreeNode":
                converted_args.append(build_tree(val))
            elif type_name == "json":
                converted_args.append(json.dumps(val))
            else:
                converted_args.append(val)
        
        output = ${funcName}(*converted_args)
        duration_ms = (time.perf_counter() - start_time) * 1000
        
        # Convert output (handle in-place void-returning problems)
        check_type = ret_type
        if ret_type == "void" and len(arg_types) > 0:
            output = converted_args[0]
            check_type = arg_types[0]
        
        if check_type == "ListNode":
            output = list_to_arr(output)
        elif check_type == "TreeNode":
            output = tree_to_arr(output)
        elif check_type == "json" and isinstance(output, (dict, list)):
            output = json.dumps(output)

        passed = deep_equal(output, tc["expected"])
        results.append({
            "passed": passed,
            "output": output,
            "expected": tc["expected"],
            "durationMs": duration_ms
        })
    print("\\nRESULT_START:" + json.dumps({"status": "success", "results": results}))
except Exception as e:
    import traceback
    print("\\nRESULT_START:" + json.dumps({"status": "error", "error": str(e), "stack": traceback.format_exc()}))
`;
}

function generateCppRunner(userCode, funcName, schema, testCases) {
  if (!schema) return "";

  let casesCode = "";
  testCases.forEach((tc, idx) => {
    casesCode += `  {\n`;
    schema.argTypes.forEach((type, argIdx) => {
      const val = tc.args[argIdx];
      casesCode += `    ${toCppType(type)} arg${argIdx} = ${toCppLiteral(val, type)};\n`;
    });
    const argList = schema.argTypes.map((_, argIdx) => `arg${argIdx}`).join(', ');

    const isVoid = schema.retType === 'void';
    const hasArgs = schema.argTypes.length > 0;
    const compType = isVoid && hasArgs ? schema.argTypes[0] : schema.retType;

    if (isVoid) {
      casesCode += `    ${funcName}(${argList});\n`;
      if (hasArgs) {
        casesCode += `    ${toCppType(compType)} out = arg0;\n`;
        casesCode += `    ${toCppType(compType)} expected = ${toCppLiteral(tc.expected, compType)};\n`;
      } else {
        casesCode += `    std::string out = "void";\n`;
        casesCode += `    std::string expected = "void";\n`;
      }
    } else {
      casesCode += `    ${toCppType(schema.retType)} out = ${funcName}(${argList});\n`;
      casesCode += `    ${toCppType(schema.retType)} expected = ${toCppLiteral(tc.expected, schema.retType)};\n`;
    }
    
    // Node comparison helpers
    let equalsCheck;
    if (compType === 'ListNode') {
        equalsCheck = `linkedListsEqual(out, expected)`;
    } else if (compType === 'TreeNode') {
        equalsCheck = `binaryTreesEqual(out, expected)`;
    } else {
        equalsCheck = `out == expected`;
    }
    
    casesCode += `    bool passed = ${equalsCheck};\n`;
    casesCode += `    std::cout << "{\\"passed\\":" << (passed ? "true" : "false") << ",\\"output\\":";\n`;
    casesCode += `    ${printCppValueCode('out', compType)}\n`;
    casesCode += `    std::cout << ",\\"expected\\":";\n`;
    casesCode += `    ${printCppValueCode('expected', compType)}\n`;
    casesCode += `    std::cout << ",\\"durationMs\\":0}";\n`;
    if (idx < testCases.length - 1) {
      casesCode += `    std::cout << ",";\n`;
    }
    casesCode += `  }\n`;
  });

  return `
${cppPrecludes}

// Deep Node comparison helpers
inline bool linkedListsEqual(ListNode* a, ListNode* b) {
    while (a && b) {
        if (a->val != b->val) return false;
        a = a->next;
        b = b->next;
    }
    return a == nullptr && b == nullptr;
}

inline bool binaryTreesEqual(TreeNode* a, TreeNode* b) {
    if (!a && !b) return true;
    if (!a || !b) return false;
    return a->val == b->val && binaryTreesEqual(a->left, b->left) && binaryTreesEqual(a->right, b->right);
}

#define main __user_main
${userCode}
#undef main

int main() {
  std::cout << "\\nRESULT_START:\\n{\\"status\\":\\"success\\",\\"results\\":[";
  ${casesCode}
  std::cout << "]}" << std::endl;
  return 0;
}
`;
}

function generateJavaRunner(userCode, funcName, schema, testCases) {
  if (!schema) return "";

  // Extract parameter list of target function from userCode
  const funcRegex = new RegExp(`${funcName}\\s*\\(([^)]*)\\)`);
  const match = funcRegex.exec(userCode);
  const paramTypesInCode = [];
  if (match) {
    const paramsStr = match[1];
    paramsStr.split(',').forEach(p => {
      const parts = p.trim().split(/\s+/);
      if (parts.length > 0) {
        let typeStr = parts[0];
        if (parts[1] && (parts[1].startsWith('[') || parts[1] === '[]')) {
          typeStr += '[]';
        }
        paramTypesInCode.push(typeStr);
      }
    });
  }

  // Look for return type preceding funcName, e.g. "public int[] twoSum" or "String[] longestCommonPrefix"
  const retRegex = new RegExp(`(\\w+\\s*\\[\\s*\\])\\s+${funcName}\\s*\\(`);
  const retMatch = retRegex.exec(userCode);
  let userRetType = null;
  if (retMatch) {
    userRetType = retMatch[1].replace(/\s+/g, ''); // normalize, e.g. "int[]"
  }

  let casesCode = "";
  testCases.forEach((tc, idx) => {
    casesCode += `    {\n`;
    
    // 1. Generate inputs from JSON test cases
    schema.argTypes.forEach((type, argIdx) => {
      const val = tc.args[argIdx];
      casesCode += `      ${toJavaType(type)} arg${argIdx} = ${toJavaLiteral(val, type)};\n`;
    });

    // 2. Perform parameter type adaptions (List vs Array)
    const targetArgNames = [];
    schema.argTypes.forEach((type, argIdx) => {
      let finalArgName = `arg${argIdx}`;
      const isVectorInt = type === 'vector<int>';
      const isVectorStr = type === 'vector<string>';
      const expectedArray = paramTypesInCode[argIdx] && paramTypesInCode[argIdx].includes('[]');

      if ((isVectorInt || isVectorStr) && expectedArray) {
        if (isVectorInt) {
          casesCode += `      int[] arg${argIdx}_arr = arg${argIdx}.stream().mapToInt(Integer::intValue).toArray();\n`;
          finalArgName = `arg${argIdx}_arr`;
        } else if (isVectorStr) {
          casesCode += `      String[] arg${argIdx}_arr = arg${argIdx}.toArray(new String[0]);\n`;
          finalArgName = `arg${argIdx}_arr`;
        }
      }
      targetArgNames.push(finalArgName);
    });

    const argList = targetArgNames.join(', ');

    // 3. Call target function with return type adaptation (List vs Array)
    const isVoid = schema.retType === 'void';
    const hasArgs = schema.argTypes.length > 0;
    const compType = isVoid && hasArgs ? schema.argTypes[0] : schema.retType;

    if (isVoid) {
      casesCode += `      solver.${funcName}(${argList});\n`;
      if (hasArgs) {
        // Check if user expects primitive array for arg0
        const isVectorInt = compType === 'vector<int>';
        const isVectorStr = compType === 'vector<string>';
        const expectedArray = paramTypesInCode[0] && paramTypesInCode[0].includes('[]');
        
        if ((isVectorInt || isVectorStr) && expectedArray) {
          // If we passed an array, we should convert the modified array back to List for comparison
          if (isVectorInt) {
            casesCode += `      java.util.List<Integer> out = java.util.stream.IntStream.of(arg0_arr).boxed().collect(java.util.stream.Collectors.toList());\n`;
          } else if (isVectorStr) {
            casesCode += `      java.util.List<String> out = java.util.Arrays.asList(arg0_arr);\n`;
          }
        } else {
          casesCode += `      ${toJavaType(compType)} out = arg0;\n`;
        }
        casesCode += `      ${toJavaType(compType)} expected = ${toJavaLiteral(tc.expected, compType)};\n`;
      } else {
        casesCode += `      String out = "void";\n`;
        casesCode += `      String expected = "void";\n`;
      }
    } else {
      if (schema.retType === 'vector<int>' && userRetType === 'int[]') {
        casesCode += `      int[] out_arr = solver.${funcName}(${argList});\n`;
        casesCode += `      java.util.List<Integer> out = java.util.stream.IntStream.of(out_arr).boxed().collect(java.util.stream.Collectors.toList());\n`;
      } else if (schema.retType === 'vector<string>' && userRetType === 'String[]') {
        casesCode += `      String[] out_arr = solver.${funcName}(${argList});\n`;
        casesCode += `      java.util.List<String> out = java.util.Arrays.asList(out_arr);\n`;
      } else {
        casesCode += `      ${toJavaType(schema.retType)} out = solver.${funcName}(${argList});\n`;
      }
      casesCode += `      ${toJavaType(schema.retType)} expected = ${toJavaLiteral(tc.expected, schema.retType)};\n`;
    }
    
    let equalsCheck;
    if (compType === 'ListNode') {
        equalsCheck = `linkedListsEqual(out, expected)`;
    } else if (compType === 'TreeNode') {
        equalsCheck = `binaryTreesEqual(out, expected)`;
    } else {
        const isPrimitive = ['int', 'double', 'bool'].includes(compType);
        equalsCheck = isPrimitive ? `out == expected` : `out.equals(expected)`;
    }
    
    casesCode += `      boolean passed = ${equalsCheck};\n`;
    casesCode += `      System.out.print("{\\"passed\\":" + (passed ? "true" : "false") + ",\\"output\\":");\n`;
    casesCode += `      ${printJavaValueCode('out', compType)}\n`;
    casesCode += `      System.out.print(",\\"expected\\":");\n`;
    casesCode += `      ${printJavaValueCode('expected', compType)}\n`;
    casesCode += `      System.out.print(",\\"durationMs\\":0}");\n`;
    if (idx < testCases.length - 1) {
      casesCode += `      System.out.print(",");\n`;
    }
    casesCode += `    }\n`;
  });

  return `
import java.util.*;

public class Main {
    // Java Node deep comparison algorithms
    public static boolean linkedListsEqual(ListNode a, ListNode b) {
        while (a != null && b != null) {
            if (a.val != b.val) return false;
            a = a.next;
            b = b.next;
        }
        return a == null && b == null;
    }

    public static boolean binaryTreesEqual(TreeNode a, TreeNode b) {
        if (a == null && b == null) return true;
        if (a == null || b == null) return false;
        return a.val == b.val && binaryTreesEqual(a.left, b.left) && binaryTreesEqual(a.right, b.right);
    }

    public static ListNode buildLinkedList(java.util.List<Integer> vals) {
        if (vals == null || vals.isEmpty()) return null;
        ListNode head = new ListNode(vals.get(0));
        ListNode curr = head;
        for (int i = 1; i < vals.size(); ++i) {
            curr.next = new ListNode(vals.get(i));
            curr = curr.next;
        }
        return head;
    }

    public static void printLinkedList(ListNode head) {
        System.out.print("[");
        ListNode curr = head;
        while (curr != null) {
            System.out.print(curr.val);
            if (curr.next != null) System.out.print(",");
            curr = curr.next;
        }
        System.out.print("]");
    }

    public static TreeNode buildBinaryTree(java.util.List<String> vals) {
        if (vals == null || vals.isEmpty() || vals.get(0).equals("null")) return null;
        TreeNode root = new TreeNode(Integer.parseInt(vals.get(0)));
        java.util.Queue<TreeNode> q = new java.util.LinkedList<>();
        q.add(root);
        int i = 1;
        while (!q.isEmpty() && i < vals.size()) {
            TreeNode curr = q.poll();
            if (!vals.get(i).equals("null")) {
                curr.left = new TreeNode(Integer.parseInt(vals.get(i)));
                q.add(curr.left);
            }
            i++;
            if (i < vals.size() && !vals.get(i).equals("null")) {
                curr.right = new TreeNode(Integer.parseInt(vals.get(i)));
                q.add(curr.right);
            }
            i++;
        }
        return root;
    }

    public static void printBinaryTree(TreeNode root) {
        if (root == null) {
            System.out.print("[]");
            return;
        }
        System.out.print("[");
        java.util.List<String> res = new java.util.ArrayList<>();
        java.util.Queue<TreeNode> q = new java.util.LinkedList<>();
        q.add(root);
        while (!q.isEmpty()) {
            TreeNode curr = q.poll();
            if (curr != null) {
                res.add(String.valueOf(curr.val));
                q.add(curr.left);
                q.add(curr.right);
            } else {
                res.add("null");
            }
        }
        while (!res.isEmpty() && res.get(res.size() - 1).equals("null")) {
            res.remove(res.size() - 1);
        }
        for (int i = 0; i < res.size(); ++i) {
            System.out.print(res.get(i));
            if (i < res.size() - 1) System.out.print(",");
        }
        System.out.print("]");
    }

    public static void main(String[] args) {
        Solution solver = new Solution();
        System.out.print("\\nRESULT_START:\\n{\\"status\\":\\"success\\",\\"results\\":[");
        ${casesCode}
        System.out.print("]}\\n");
    }
}
`;
}

// REST API Endpoints

// Verify admin login password
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ success: true, token: ADMIN_TOKEN });
  } else {
    res.status(401).json({ success: false, error: 'Incorrect admin verification password.' });
  }
});

// User Sign Up
app.post('/api/auth/signup', async (req, res) => {
  const { name, username, email, password } = req.body;
  if (!name || !username || !email || !password) {
    return res.status(400).json({ success: false, error: 'All fields are required' });
  }

  try {
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'An account with this email already exists' });
    }

    const newUser = {
      email: email.toLowerCase(),
      password: password,
      name,
      username: username.toLowerCase(),
      solved: [],
      solutions: {},
      customProblems: [],
      lastSynced: new Date().toISOString(),
      streak: 0,
      lastSolvedDate: null
    };

    await upsertUser(newUser);
    await recordLoginEvent(email, 'signup');

    const profile = {
      name,
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      solved: [],
      solutions: {},
      customProblems: [],
      bio: "Passionate developer on a coding journey.",
      streak: 0,
      lastSolvedDate: null,
      xp: 0,
      rank: 15000
    };
    res.json({ success: true, profile });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Helper to handle user creation/fetch for OAuth
async function handleOAuthUserLogin(email, name) {
  let user = await getUserByEmail(email);
  if (!user) {
    const randomSuffix = crypto.randomBytes(4).toString('hex');
    const username = `user_${randomSuffix}`;
    const password = crypto.randomBytes(16).toString('hex'); // High entropy secure password

    const newUser = {
      email: email.toLowerCase(),
      password,
      name,
      username,
      solved: [],
      solutions: {},
      customProblems: [],
      streak: 0,
      lastSolvedDate: null
    };

    const userKey = newUser.email.toLowerCase().replace(/[$.#]/g, '_');
    await setDoc(doc(db, 'users', userKey), {
      email: newUser.email,
      password: newUser.password,
      name: newUser.name,
      username: newUser.username,
      solved: JSON.stringify(newUser.solved),
      solutions: JSON.stringify(newUser.solutions),
      customProblems: JSON.stringify(newUser.customProblems),
      lastSynced: new Date().toISOString(),
      streak: newUser.streak,
      lastSolvedDate: newUser.lastSolvedDate
    }, { merge: true });
    user = newUser;
  }

  await recordLoginEvent(email, 'success');

  let solvedArr = [];
  try {
    solvedArr = typeof user.solved === 'string' ? JSON.parse(user.solved) : (user.solved || []);
  } catch(e) {}
  const xp = solvedArr.length * 10;
  const rank = Math.max(1, 15000 - xp * 5);
  
  return {
    name: user.name,
    username: user.username,
    email: user.email,
    solved: solvedArr,
    solutions: typeof user.solutions === 'string' ? JSON.parse(user.solutions) : (user.solutions || {}),
    customProblems: typeof user.customProblems === 'string' ? JSON.parse(user.customProblems) : (user.customProblems || []),
    bio: user.bio || "Passionate developer on a coding journey.",
    streak: user.streak || 0,
    lastSolvedDate: user.lastSolvedDate || null,
    xp: xp,
    rank: rank
  };
}

app.get('/api/auth/google', (req, res) => {
  const baseUrl = (process.env.BACKEND_URL || 'http://localhost:3001').replace(/\/+$/, '');
  const redirectUri = `${baseUrl}/api/auth/google/callback`;
  
  const tempClient = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, redirectUri);
  const url = tempClient.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/userinfo.email']
  });
  res.redirect(url);
});

// Google OAuth Callback
app.get('/api/auth/google/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).send('No code provided');
  }

  try {
    const baseUrl = (process.env.BACKEND_URL || 'http://localhost:3001').replace(/\/+$/, '');
    const redirectUri = `${baseUrl}/api/auth/google/callback`;
    const tempClient = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, redirectUri);

    const { tokens } = await tempClient.getToken(code);
    tempClient.setCredentials(tokens);

    // Verify ID Token to get user info
    const ticket = await tempClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    const { email, name } = payload;
    
    if (!email) {
      return res.status(400).send('Email not provided by Google');
    }

    const profile = await handleOAuthUserLogin(email, name || 'Google User');

    // Return HTML that sends the profile back to the opener window
    res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>Authentication Successful</title></head>
      <body>
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: 'oauth_success', profile: ${JSON.stringify(profile)} }, '*');
            window.close();
          } else {
            localStorage.setItem('cn_profile', JSON.stringify(${JSON.stringify(profile)}));
            window.location.href = '${process.env.FRONTEND_URL || ''}/dashboard.html';
          }
        </script>
        <p>Authentication successful. You can close this window.</p>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(500).send('Google authentication failed: ' + (error.message || error.toString()));
  }
});

// GitHub OAuth Login
app.get('/api/auth/github', (req, res) => {
  const redirectUri = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=user:email`;
  res.redirect(redirectUri);
});

// GitHub OAuth Callback
app.get('/api/auth/github/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).send('No code provided');
  }

  try {
    // 1. Exchange code for access token
    const tokenResponse = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code
    }, { headers: { accept: 'application/json' } });

    const accessToken = tokenResponse.data.access_token;
    if (!accessToken) {
      return res.status(400).send('Failed to obtain access token');
    }

    // 2. Fetch user profile
    const userResponse = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `token ${accessToken}` }
    });

    // 3. Fetch user emails (since primary email might be private)
    const emailResponse = await axios.get('https://api.github.com/user/emails', {
      headers: { Authorization: `token ${accessToken}` }
    });
    
    const primaryEmailObj = emailResponse.data.find(e => e.primary) || emailResponse.data[0];
    if (!primaryEmailObj) {
      return res.status(400).send('No email associated with GitHub account');
    }

    const email = primaryEmailObj.email;
    const name = userResponse.data.name || userResponse.data.login || 'GitHub User';

    const profile = await handleOAuthUserLogin(email, name);

    // 4. Return HTML that sends the profile back to the opener window
    res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>Authentication Successful</title></head>
      <body>
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: 'oauth_success', profile: ${JSON.stringify(profile)} }, '*');
            window.close();
          } else {
            // Fallback if not opened in popup (save to localStorage directly and redirect)
            localStorage.setItem('cn_profile', JSON.stringify(${JSON.stringify(profile)}));
            window.location.href = '${process.env.FRONTEND_URL || ''}/dashboard.html';
          }
        </script>
        <p>Authentication successful. You can close this window.</p>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('GitHub Auth Error:', error.response?.data || error.message);
    res.status(500).send('GitHub authentication failed');
  }
});

// User Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required' });
  }

  try {
    const user = await getUserByEmail(email);
    if (!user || user.password !== password) {
      await recordLoginEvent(email, 'failed');
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const xp = (user.solved ? user.solved.length : 0) * 10;
    const rank = Math.max(1, 15000 - xp * 5);
    const profile = {
      name: user.name,
      username: user.username,
      email: user.email,
      solved: user.solved,
      solutions: user.solutions,
      customProblems: user.customProblems,
      bio: user.bio || "Passionate developer on a coding journey.",
      streak: user.streak || 0,
      lastSolvedDate: user.lastSolvedDate || null,
      xp: xp,
      rank: rank
    };
    await recordLoginEvent(email, 'success');
    res.json({ success: true, profile });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 1. Get list of all problems (summarized)
app.get('/api/problems', async (req, res) => {
  try {
    const list = await getAllProblems();
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Get specific problem details
app.get('/api/problems/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const problem = await getProblemById(id);
    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }
    const { systemTestCases, ...details } = problem;
    res.json(details);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get list of all custom problems
app.get('/api/custom-problems', async (req, res) => {
  try {
    const list = await getAllCustomProblems();
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new custom problem
app.post('/api/custom-problems', async (req, res) => {
  const { title, difficulty, category, description, funcName, params, argTypes, retType, sampleTestCases, systemTestCases } = req.body;
  
  if (!title || !funcName || !params || !argTypes || !retType || !sampleTestCases) {
    return res.status(400).json({ error: 'Missing required challenge parameters' });
  }

  const id = `custom_${Math.random().toString(36).substring(2, 10)}`;
  const difficultyText = difficulty.charAt(0).toUpperCase() + difficulty.slice(1).toLowerCase();

  // Helper for python type generation
  function toPyType(type) {
    if (type === 'int') return 'int';
    if (type === 'double') return 'float';
    if (type === 'string') return 'str';
    if (type === 'bool') return 'bool';
    if (type === 'vector<int>') return 'list';
    if (type === 'vector<string>') return 'list';
    if (type === 'vector<vector<int>>') return 'list';
    if (type === 'vector<vector<string>>') return 'list';
    if (type === 'ListNode') return 'ListNode';
    if (type === 'TreeNode') return 'TreeNode';
    if (type === 'map') return 'dict';
    if (type === 'json') return 'str';
    return 'any';
  }

  // Generate templates automatically
  const templates = {
    javascript: `function ${funcName}(${params.join(', ')}) {\n    // Write your code here\n}`,
    python: `def ${funcName}(${params.map((p, idx) => `${p}: ${toPyType(argTypes[idx])}`).join(', ')}) -> ${toPyType(retType)}:\n    # Write your code here`,
    cpp: `${toCppType(retType)} ${funcName}(${params.map((p, idx) => `${toCppType(argTypes[idx])} ${p}`).join(', ')}) {\n    // Write your code here\n}`,
    java: `class Solution {\n    public ${toJavaType(retType)} ${funcName}(${params.map((p, idx) => `${toJavaType(argTypes[idx])} ${p}`).join(', ')}) {\n        // Write your code here\n    }\n}`
  };

  const newProblem = {
    id,
    title,
    difficulty,
    difficultyText,
    category: category || 'general',
    acceptance: '100.0%',
    description,
    examples: [{
      input: params.map((p, idx) => `${p} = ${JSON.stringify(sampleTestCases[0].args[idx])}`).join(', '),
      output: JSON.stringify(sampleTestCases[0].expected),
      explanation: `Automated test case validation.`
    }],
    constraints: [],
    funcName,
    params,
    argTypes,
    retType,
    templates,
    sampleTestCases,
    systemTestCases: systemTestCases || sampleTestCases,
    solutions: {}
  };

  try {
    await createCustomProblem(newProblem);
    res.json({ success: true, problem: newProblem });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin and Sync endpoints (requires admin authorization)

// 1. Get all synced users
app.get('/api/users', requireAdminAuth, async (req, res) => {
  try {
    const list = await getAllUsers();
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Sync user details and solved solutions
app.post('/api/users/sync', async (req, res) => {
  const { email, name, username, solved, solutions, customProblems, streak, lastSolvedDate } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const existingUser = await getUserByEmail(email) || {};
    const updatedUser = {
      email: email.toLowerCase(),
      password: existingUser.password || '',
      name,
      username,
      solved: solved || [],
      solutions: solutions || {},
      customProblems: customProblems || [],
      lastSynced: new Date().toISOString(),
      streak: streak !== undefined ? streak : (existingUser.streak || 0),
      lastSolvedDate: lastSolvedDate !== undefined ? lastSolvedDate : (existingUser.lastSolvedDate || null)
    };

    await upsertUser(updatedUser);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Create a new global problem
app.post('/api/admin/problems', requireAdminAuth, async (req, res) => {
  const { title, difficulty, category, description, funcName, params, argTypes, retType, sampleTestCases, systemTestCases } = req.body;

  if (!title || !funcName || !params || !argTypes || !retType || !sampleTestCases) {
    return res.status(400).json({ error: 'Missing required challenge parameters' });
  }

  let nextId = Object.keys(problems).length + 1;

  const difficultyText = difficulty.charAt(0).toUpperCase() + difficulty.slice(1).toLowerCase();

  // Helper for python type generation
  function toPyType(type) {
    if (type === 'int') return 'int';
    if (type === 'double') return 'float';
    if (type === 'string') return 'str';
    if (type === 'bool') return 'bool';
    if (type === 'vector<int>') return 'list';
    if (type === 'vector<string>') return 'list';
    if (type === 'vector<vector<int>>') return 'list';
    if (type === 'vector<vector<string>>') return 'list';
    if (type === 'ListNode') return 'ListNode';
    if (type === 'TreeNode') return 'TreeNode';
    if (type === 'map') return 'dict';
    if (type === 'json') return 'str';
    return 'any';
  }

  // Generate templates automatically
  const templates = {
    javascript: `function ${funcName}(${params.join(', ')}) {\n    // Write your code here\n}`,
    python: `def ${funcName}(${params.map((p, idx) => `${p}: ${toPyType(argTypes[idx])}`).join(', ')}) -> ${toPyType(retType)}:\n    # Write your code here`,
    cpp: `${toCppType(retType)} ${funcName}(${params.map((p, idx) => `${toCppType(argTypes[idx])} ${p}`).join(', ')}) {\n    // Write your code here\n}`,
    java: `class Solution {\n    public ${toJavaType(retType)} ${funcName}(${params.map((p, idx) => `${toJavaType(argTypes[idx])} ${p}`).join(', ')}) {\n        // Write your code here\n    }\n}`
  };

  const newGlobalProblem = {
    id: nextId,
    title,
    difficulty,
    difficultyText,
    category: category || 'general',
    acceptance: '50.0%',
    description,
    examples: [{
      input: params.map((p, idx) => `${p} = ${JSON.stringify(sampleTestCases[0].args[idx])}`).join(', '),
      output: JSON.stringify(sampleTestCases[0].expected),
      explanation: `Verification test case.`
    }],
    constraints: [],
    funcName,
    params,
    argTypes,
    retType,
    templates,
    sampleTestCases,
    systemTestCases: systemTestCases || sampleTestCases
  };

  try {
    await createGlobalProblem(newGlobalProblem);
    res.json({ success: true, problem: newGlobalProblem });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generic process runner block
function runProcess(command, runDir, callback) {
  exec(command, { timeout: 1500, killSignal: 'SIGTERM' }, (error, stdout, stderr) => {
    // Delete temporary directory recursively
    try {
      deleteFolderRecursive(runDir);
    } catch (e) {
      console.error('Failed to delete temp dir:', e);
    }

    if (error) {
      if (error.killed || error.signal === 'SIGTERM') {
        return callback(null, {
          status: 'timeout',
          error: 'Time Limit Exceeded. Make sure your code does not contain infinite loops or excessive operations.'
        });
      }
      return callback(null, {
        status: 'error',
        error: stderr || error.message,
        stdout: stdout
      });
    }

    // Parse stdout
    const marker = "RESULT_START:";
    const index = stdout.indexOf(marker);
    let userLogs = "";
    let runResult = null;

    if (index !== -1) {
      userLogs = stdout.substring(0, index).trim();
      const jsonStr = stdout.substring(index + marker.length).trim();
      try {
        runResult = JSON.parse(jsonStr);
      } catch (err) {
        return callback(null, {
          status: 'error',
          error: `Failed to parse execution results: ${err.message}`,
          stdout: stdout
        });
      }
    } else {
      userLogs = stdout.trim();
      return callback(null, {
        status: 'error',
        error: 'Execution completed but results were not found. Make sure your function returns a valid output.',
        stdout: stdout
      });
    }

    if (runResult.status === 'error') {
      return callback(null, {
        status: 'runtime_error',
        error: runResult.error,
        stack: runResult.stack,
        userLogs: userLogs
      });
    }

    // Success run
    callback(null, {
      status: 'success',
      results: runResult.results,
      userLogs: userLogs
    });
  });
}

function runConsoleIoCases(runCmd, testCases, runDir, callback) {
  const results = [];
  let currentCase = 0;

  function runNext() {
    if (currentCase >= testCases.length) {
      deleteFolderRecursive(runDir);
      return callback(null, {
        status: 'success',
        results: results
      });
    }

    const tc = testCases[currentCase];
    const inputStr = Array.isArray(tc.args) ? String(tc.args[0]) : String(tc.args);
    const expectedStr = String(tc.expected).trim().replace(/\r\n/g, '\n');

    const startTime = process.hrtime();
    const child = exec(runCmd, { timeout: 1500, killSignal: 'SIGTERM' }, (error, stdout, stderr) => {
      const diff = process.hrtime(startTime);
      const durationMs = (diff[0] * 1000) + (diff[1] / 1000000);

      if (error) {
        let errType = 'runtime_error';
        let errMsg = stderr || error.message;
        if (error.killed || error.signal === 'SIGTERM') {
          errType = 'timeout';
          errMsg = 'Time Limit Exceeded';
        }
        results.push({
          passed: false,
          output: stdout,
          expected: expectedStr,
          error: errMsg,
          status: errType,
          durationMs: durationMs
        });
      } else {
        const actualStr = stdout.trim().replace(/\r\n/g, '\n');
        results.push({
          passed: actualStr === expectedStr,
          output: stdout,
          expected: expectedStr,
          durationMs: durationMs
        });
      }

      currentCase++;
      runNext();
    });

    if (child.stdin) {
      child.stdin.write(inputStr);
      child.stdin.end();
    }
  }

  runNext();
}

// Code runner executor
async function executeCode(language, code, testCases, funcName, problemId, callback) {
  const id = Math.random().toString(36).substring(2, 10);
  const runDir = path.join(tempDir, `run_${id}`);
  fs.mkdirSync(runDir);

  // Write testcases to JSON file
  const testCasesFile = path.join(runDir, `testcases.json`);
  fs.writeFileSync(testCasesFile, JSON.stringify(testCases));

  // Dynamic schema resolution from MySQL database or fallback cache
  let schema = null;
  try {
    const prob = await getProblemById(problemId);
    if (prob && prob.argTypes && prob.argTypes.length > 0 && prob.retType) {
      schema = { argTypes: prob.argTypes, retType: prob.retType };
    }
  } catch (err) {
    console.error('Error loading problem schema inside executeCode:', err);
  }

  // Fallback to hardcoded type schemas if database resolution is incomplete or fails
  if (!schema || !schema.argTypes || schema.argTypes.length === 0 || !schema.retType) {
    schema = problemTypeSchemas[problemId];
  }

  // Console I/O Judge Mode router
  if (schema && schema.retType === 'console-io') {
    let fileName, compileCmd, runCmd;
    if (language === 'javascript') {
      fileName = path.join(runDir, 'run.js');
      fs.writeFileSync(fileName, code);
      runCmd = `node "${fileName}"`;
    } else if (language === 'python') {
      fileName = path.join(runDir, 'run.py');
      fs.writeFileSync(fileName, code);
      runCmd = `python "${fileName}"`;
    } else if (language === 'cpp') {
      fileName = path.join(runDir, 'run.cpp');
      fs.writeFileSync(fileName, code);
      const exePath = path.join(runDir, 'run.exe');
      const gpp = getCppCompilerPath();
      compileCmd = `${gpp} "${fileName}" -o "${exePath}"`;
      runCmd = `"${exePath}"`;
    } else if (language === 'java') {
      let finalCode = code;
      const classRegex = /public\s+class\s+(\w+)/g;
      const match = classRegex.exec(code);
      if (match) {
        const className = match[1];
        finalCode = code.replace(new RegExp(`public\\s+class\\s+${className}`, 'g'), 'public class Main');
      } else {
        finalCode = code.replace(/class\s+(\w+)/, 'class Main');
      }
      fileName = path.join(runDir, 'Main.java');
      fs.writeFileSync(fileName, finalCode);
      const paths = getJavaCompilerPaths();
      compileCmd = `${paths.javac} "${fileName}" -d "${runDir}"`;
      runCmd = `${paths.java} -cp "${runDir}" Main`;
    }

    if (compileCmd) {
      const options = {};
      if (language === 'cpp') {
        const binDir = getCppBinDir();
        if (binDir) {
          const env = { ...process.env };
          const pathKey = Object.keys(env).find(k => k.toLowerCase() === 'path') || 'PATH';
          env[pathKey] = `${binDir};${env[pathKey]}`;
          options.env = env;
        }
      }
      exec(compileCmd, options, (cErr, cStdout, cStderr) => {
        if (cErr) {
          deleteFolderRecursive(runDir);
          return callback(null, {
            status: 'error',
            error: `Compilation Error:\n${cStderr || cErr.message}`
          });
        }
        runConsoleIoCases(runCmd, testCases, runDir, callback);
      });
    } else {
      runConsoleIoCases(runCmd, testCases, runDir, callback);
    }
    return;
  }

  let fileName, command;

  if (language === 'javascript') {
    fileName = path.join(runDir, `run.js`);
    const runnerCode = generateJsRunner(code, funcName, schema);
    fs.writeFileSync(fileName, runnerCode);
    command = `node "${fileName}"`;
    runProcess(command, runDir, callback);
  } else if (language === 'python') {
    fileName = path.join(runDir, `run.py`);
    const runnerCode = generatePyRunner(code, funcName, schema);
    fs.writeFileSync(fileName, runnerCode);
    command = `python "${fileName}"`;
    runProcess(command, runDir, callback);
  } else if (language === 'cpp') {
    fileName = path.join(runDir, `run.cpp`);
    const runnerCode = generateCppRunner(code, funcName, schema, testCases);
    if (!runnerCode) {
      deleteFolderRecursive(runDir);
      return callback(new Error(`Failed to generate runner code for problem ${problemId}`));
    }
    fs.writeFileSync(fileName, runnerCode);
    
    // Compilation command for C++
    const exePath = path.join(runDir, `run.exe`);
    const gpp = getCppCompilerPath();
    const compileCommand = `${gpp} "${fileName}" -o "${exePath}"`;
    
    const options = {};
    const binDir = getCppBinDir();
    if (binDir) {
      const env = { ...process.env };
      const pathKey = Object.keys(env).find(k => k.toLowerCase() === 'path') || 'PATH';
      env[pathKey] = `${binDir};${env[pathKey]}`;
      options.env = env;
    }

    exec(compileCommand, options, (compileErr, compileStdout, compileStderr) => {
      if (compileErr) {
        deleteFolderRecursive(runDir);
        return callback(null, {
          status: 'error',
          error: `Compilation Error:\n${compileStderr || compileErr.message}`
        });
      }
      command = `"${exePath}"`;
      runProcess(command, runDir, callback);
    });
  } else if (language === 'java') {
    const solutionFile = path.join(runDir, `Solution.java`);
    const mainFile = path.join(runDir, `Main.java`);
    
    // Force user's class to be named Solution to match the runner expectations
    let processedCode = code;
    const classRegex = /public\s+class\s+(\w+)/g;
    const match = classRegex.exec(code);
    if (match) {
      const className = match[1];
      if (className !== 'Solution') {
        processedCode = code.replace(new RegExp(`public\\s+class\\s+${className}`, 'g'), 'public class Solution');
      }
    } else {
      processedCode = code.replace(/class\s+(\w+)/, 'class Solution');
    }

    // Extract user imports and place them at the very top of the file
    const lines = processedCode.split('\n');
    const imports = lines.filter(l => l.trim().startsWith('import '));
    const nonImports = lines.filter(l => !l.trim().startsWith('import '));
    const finalJavaCode = imports.join('\n') + '\n' + javaPrecludes + '\n' + nonImports.join('\n');
    
    const runnerCode = generateJavaRunner(finalJavaCode, funcName, schema, testCases);
    if (!runnerCode) {
      deleteFolderRecursive(runDir);
      return callback(new Error(`Failed to generate runner code for problem ${problemId}`));
    }
    fs.writeFileSync(solutionFile, finalJavaCode);
    fs.writeFileSync(mainFile, runnerCode);
    
    // Compilation command for Java
    const paths = getJavaCompilerPaths();
    const compileCommand = `${paths.javac} "${solutionFile}" "${mainFile}" -d "${runDir}"`;
    
    exec(compileCommand, (compileErr, compileStdout, compileStderr) => {
      if (compileErr) {
        deleteFolderRecursive(runDir);
        return callback(null, {
          status: 'error',
          error: `Compilation Error:\n${compileStderr || compileErr.message}`
        });
      }
      command = `${paths.java} -cp "${runDir}" Main`;
      runProcess(command, runDir, callback);
    });
  } else {
    deleteFolderRecursive(runDir);
    return callback(new Error(`Language '${language}' is not supported.`));
  }
}

// 3. POST Run Code (runs sample test cases or custom inputs)
app.post('/api/run', async (req, res) => {
  const { problemId, language, code } = req.body;
  
  try {
    const problem = await getProblemById(problemId);
    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    executeCode(language, code, problem.sampleTestCases, problem.funcName, problemId, (err, result) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      res.json(result);
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. POST Submit Code (runs validation test cases)
app.post('/api/submit', async (req, res) => {
  const { problemId, language, code } = req.body;
  
  try {
    const problem = await getProblemById(problemId);
    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    executeCode(language, code, problem.systemTestCases, problem.funcName, problemId, async (err, result) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      // Save solution on successful submit
      if (result.status === 'success' && result.results && result.results.every(r => r.passed)) {
        const isCustom = String(problemId).startsWith('custom_');
        if (isCustom) {
          try {
            await updateCustomProblemSolutions(problemId, language, code);
          } catch (e) {
            console.error('Failed to sync custom problem solution inside SQL:', e);
          }
        }
      }
      res.json(result);
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fallback: serve index.html for undefined requests
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Background automated compiler download and configuration engine
function ensureCppCompiler() {
  const compilerPath = getCppCompilerPath();
  if (compilerPath !== 'g++') {
    console.log(`[C++ Compiler] Found C++ compiler at: ${compilerPath}`);
    return;
  }

  // Check if g++ is globally available in PATH
  exec('g++ --version', (err) => {
    if (!err) {
      console.log('[C++ Compiler] C++ compiler is globally available in PATH.');
      return;
    }

    console.log('[C++ Compiler] C++ compiler not found. Automatically setting up standalone MinGW C++ compiler in background...');
    const localCompilerDir = path.join(__dirname, 'temp_runs', 'w64devkit');
    const localGppPath = path.join(localCompilerDir, 'bin', 'g++.exe');
    const zipPath = path.join(__dirname, 'temp_runs', 'w64devkit.zip');

    if (fs.existsSync(localGppPath)) {
      console.log('[C++ Compiler] Standalone C++ compiler is already set up.');
      return;
    }

    // Ensure temp_runs folder exists
    const tempDir = path.join(__dirname, 'temp_runs');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Download and extract in the background
    const https = require('https');
    const downloadUrl = 'https://github.com/skeeto/w64devkit/releases/download/v1.20.0/w64devkit-1.20.0.zip';
    console.log(`[C++ Compiler] Downloading standalone C++ compiler from ${downloadUrl}...`);

    const file = fs.createWriteStream(zipPath);
    https.get(downloadUrl, (response) => {
      // Handle redirect if any
      if (response.statusCode === 302 || response.statusCode === 301) {
        https.get(response.headers.location, (redirectResponse) => {
          redirectResponse.pipe(file);
        });
      } else {
        response.pipe(file);
      }

      file.on('finish', () => {
        file.close();
        console.log('[C++ Compiler] Download finished. Extracting compiler zip archive...');
        
        // Extract using PowerShell Expand-Archive
        const extractCmd = `powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${tempDir}' -Force"`;
        exec(extractCmd, (extractErr) => {
          // Delete temporary zip
          try {
            fs.unlinkSync(zipPath);
          } catch (e) {}

          if (extractErr) {
            console.error('[C++ Compiler Error] Failed to extract C++ compiler archive:', extractErr);
          } else {
            console.log('🎉 [C++ Compiler Success] Standalone C++ compiler successfully installed and set up!');
          }
        });
      });
    }).on('error', (e) => {
      console.error('[C++ Compiler Error] Failed to download compiler:', e);
      try {
        fs.unlinkSync(zipPath);
      } catch (e2) {}
    });
  });
}

// Initialize database and start Server
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`CodeNova server running at http://localhost:${PORT}`);
    // Auto-install compiler if missing
    ensureCppCompiler();
  });
});
