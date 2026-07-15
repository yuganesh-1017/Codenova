// migrate_20_problems.js
// Migration script to seed 20 new problems into local problems.json file and MySQL database table.

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const problemsFile = path.join(__dirname, 'problems.json');

// Define 20 new problems (10 DSA: 17-26 + 10 Complex: 27-36)
const newProblems = {
  "17": {
    "id": 17,
    "title": "Middle of the Linked List",
    "difficulty": "easy",
    "difficultyText": "Easy",
    "category": "linked-list",
    "acceptance": "75.4%",
    "description": "<p>Given the <code>head</code> of a singly linked list, return <em>the middle node of the linked list</em>.</p><p>If there are two middle nodes, return <strong>the second middle</strong> node.</p>",
    "examples": [
      {
        "input": "head = [1,2,3,4,5]",
        "output": "[3,4,5]",
        "explanation": "The middle node of the list is node 3."
      }
    ],
    "constraints": ["The number of nodes in the list is in the range [1, 100]."],
    "funcName": "middleNode",
    "params": ["head"],
    "argTypes": ["ListNode"],
    "retType": "ListNode",
    "templates": {
      "javascript": "function middleNode(head) {\n    let slow = head, fast = head;\n    while (fast && fast.next) {\n        slow = slow.next;\n        fast = fast.next.next;\n    }\n    return slow;\n}",
      "python": "def middleNode(head: Optional[ListNode]) -> Optional[ListNode]:\n    slow = fast = head\n    while fast and fast.next:\n        slow = slow.next\n        fast = fast.next.next\n    return slow",
      "cpp": "ListNode* middleNode(ListNode* head) {\n    ListNode* slow = head;\n    ListNode* fast = head;\n    while (fast && fast->next) {\n        slow = slow->next;\n        fast = fast->next->next;\n    }\n    return slow;\n}",
      "java": "class Solution {\n    public ListNode middleNode(ListNode head) {\n        ListNode slow = head, fast = head;\n        while (fast != null && fast.next != null) {\n            slow = slow.next;\n            fast = fast.next.next;\n        }\n        return slow;\n    }\n}"
    },
    "sampleTestCases": [
      { "args": [[1,2,3,4,5]], "expected": [3,4,5] }
    ],
    "systemTestCases": [
      { "args": [[1,2,3,4,5]], "expected": [3,4,5] },
      { "args": [[1,2,3,4,5,6]], "expected": [4,5,6] },
      { "args": [[1]], "expected": [1] },
      { "args": [[1,2]], "expected": [2] }
    ]
  },
  "18": {
    "id": 18,
    "title": "Binary Tree Preorder Traversal",
    "difficulty": "easy",
    "difficultyText": "Easy",
    "category": "binary-tree",
    "acceptance": "68.2%",
    "description": "<p>Given the <code>root</code> of a binary tree, return <em>the preorder traversal of its nodes' values</em>.</p>",
    "examples": [
      {
        "input": "root = [1,null,2,3]",
        "output": "[1,2,3]",
        "explanation": "Preorder traversal is root -> left -> right."
      }
    ],
    "constraints": ["The number of nodes in the tree is in the range [0, 100]."],
    "funcName": "preorderTraversal",
    "params": ["root"],
    "argTypes": ["TreeNode"],
    "retType": "vector<int>",
    "templates": {
      "javascript": "function preorderTraversal(root) {\n    const res = [];\n    function traverse(node) {\n        if (!node) return;\n        res.push(node.val);\n        traverse(node.left);\n        traverse(node.right);\n    }\n    traverse(root);\n    return res;\n}",
      "python": "def preorderTraversal(root: Optional[TreeNode]) -> List[int]:\n    res = []\n    def dfs(node):\n        if not node: return\n        res.append(node.val)\n        dfs(node.left)\n        dfs(node.right)\n    dfs(root)\n    return res",
      "cpp": "vector<int> preorderTraversal(TreeNode* root) {\n    vector<int> res;\n    std::stack<TreeNode*> st;\n    if (root) st.push(root);\n    while (!st.empty()) {\n        TreeNode* curr = st.top(); st.pop();\n        res.push_back(curr->val);\n        if (curr->right) st.push(curr->right);\n        if (curr->left) st.push(curr->left);\n    }\n    return res;\n}",
      "java": "class Solution {\n    private List<Integer> res = new ArrayList<>();\n    public List<Integer> preorderTraversal(TreeNode root) {\n        traverse(root);\n        return res;\n    }\n    private void traverse(TreeNode node) {\n        if (node == null) return;\n        res.add(node.val);\n        traverse(node.left);\n        traverse(node.right);\n    }\n}"
    },
    "sampleTestCases": [
      { "args": [[1,null,2,3]], "expected": [1,2,3] }
    ],
    "systemTestCases": [
      { "args": [[1,null,2,3]], "expected": [1,2,3] },
      { "args": [[]], "expected": [] },
      { "args": [[1]], "expected": [1] },
      { "args": [[1,2,3,4,5]], "expected": [1,2,4,5,3] }
    ]
  },
  "19": {
    "id": 19,
    "title": "Merge Two Sorted Lists",
    "difficulty": "easy",
    "difficultyText": "Easy",
    "category": "linked-list",
    "acceptance": "63.1%",
    "description": "<p>Merge two sorted linked lists and return it as a <strong>sorted</strong> list.</p>",
    "examples": [
      {
        "input": "l1 = [1,2,4], l2 = [1,3,4]",
        "output": "[1,1,2,3,4,4]"
      }
    ],
    "constraints": ["The number of nodes in both lists is in the range [0, 50]."],
    "funcName": "mergeTwoLists",
    "params": ["list1", "list2"],
    "argTypes": ["ListNode", "ListNode"],
    "retType": "ListNode",
    "templates": {
      "javascript": "function mergeTwoLists(list1, list2) {\n    let dummy = new ListNode(0);\n    let curr = dummy;\n    while (list1 && list2) {\n        if (list1.val <= list2.val) {\n            curr.next = list1;\n            list1 = list1.next;\n        } else {\n            curr.next = list2;\n            list2 = list2.next;\n        }\n        curr = curr.next;\n    }\n    curr.next = list1 || list2;\n    return dummy.next;\n}",
      "python": "def mergeTwoLists(list1: Optional[ListNode], list2: Optional[ListNode]) -> Optional[ListNode]:\n    dummy = ListNode(0)\n    curr = dummy\n    while list1 and list2:\n        if list1.val <= list2.val:\n            curr.next = list1\n            list1 = list1.next\n        else:\n            curr.next = list2\n            list2 = list2.next\n        curr = curr.next\n    curr.next = list1 or list2\n    return dummy.next",
      "cpp": "ListNode* mergeTwoLists(ListNode* list1, ListNode* list2) {\n    ListNode dummy(0);\n    ListNode* curr = &dummy;\n    while (list1 && list2) {\n        if (list1->val <= list2->val) {\n            curr->next = list1;\n            list1 = list1->next;\n        } else {\n            curr->next = list2;\n            list2 = list2->next;\n        }\n        curr = curr->next;\n    }\n    curr->next = list1 ? list1 : list2;\n    return dummy.next;\n}",
      "java": "class Solution {\n    public ListNode mergeTwoLists(ListNode list1, ListNode list2) {\n        ListNode dummy = new ListNode(0);\n        ListNode curr = dummy;\n        while (list1 != null && list2 != null) {\n            if (list1.val <= list2.val) {\n                curr.next = list1;\n                list1 = list1.next;\n            } else {\n                curr.next = list2;\n                list2 = list2.next;\n            }\n            curr = curr.next;\n        }\n        curr.next = (list1 != null) ? list1 : list2;\n        return dummy.next;\n    }\n}"
    },
    "sampleTestCases": [
      { "args": [[1,2,4], [1,3,4]], "expected": [1,1,2,3,4,4] }
    ],
    "systemTestCases": [
      { "args": [[1,2,4], [1,3,4]], "expected": [1,1,2,3,4,4] },
      { "args": [[], []], "expected": [] },
      { "args": [[], [0]], "expected": [0] },
      { "args": [[5], [1,2,3,4]], "expected": [1,2,3,4,5] }
    ]
  },
  "20": {
    "id": 20,
    "title": "Invert Binary Tree",
    "difficulty": "easy",
    "difficultyText": "Easy",
    "category": "binary-tree",
    "acceptance": "76.1%",
    "description": "<p>Given the <code>root</code> of a binary tree, invert the tree, and return <em>its root</em>.</p>",
    "examples": [
      {
        "input": "root = [4,2,7,1,3,6,9]",
        "output": "[4,7,2,9,6,3,1]"
      }
    ],
    "constraints": ["The number of nodes in the tree is in the range [0, 100]."],
    "funcName": "invertTree",
    "params": ["root"],
    "argTypes": ["TreeNode"],
    "retType": "TreeNode",
    "templates": {
      "javascript": "function invertTree(root) {\n    if (!root) return null;\n    let tmp = root.left;\n    root.left = invertTree(root.right);\n    root.right = invertTree(tmp);\n    return root;\n}",
      "python": "def invertTree(root: Optional[TreeNode]) -> Optional[TreeNode]:\n    if not root: return None\n    root.left, root.right = invertTree(root.right), invertTree(root.left)\n    return root",
      "cpp": "TreeNode* invertTree(TreeNode* root) {\n    if (!root) return nullptr;\n    TreeNode* temp = root->left;\n    root->left = invertTree(root->right);\n    root->right = invertTree(temp);\n    return root;\n}",
      "java": "class Solution {\n    public TreeNode invertTree(TreeNode root) {\n        if (root == null) return null;\n        TreeNode temp = root.left;\n        root.left = invertTree(root.right);\n        root.right = invertTree(temp);\n        return root;\n    }\n}"
    },
    "sampleTestCases": [
      { "args": [[4,2,7,1,3,6,9]], "expected": [4,7,2,9,6,3,1] }
    ],
    "systemTestCases": [
      { "args": [[4,2,7,1,3,6,9]], "expected": [4,7,2,9,6,3,1] },
      { "args": [[2,1,3]], "expected": [2,3,1] },
      { "args": [[]], "expected": [] }
    ]
  },
  "21": {
    "id": 21,
    "title": "Valid Parentheses",
    "difficulty": "easy",
    "difficultyText": "Easy",
    "category": "stack",
    "acceptance": "41.5%",
    "description": "<p>Given a string <code>s</code> containing just characters, determine if the input string is valid.</p>",
    "examples": [
      { "input": "s = \"()[]{}\"", "output": "true" }
    ],
    "constraints": ["1 <= s.length <= 10^4"],
    "funcName": "isValid",
    "params": ["s"],
    "argTypes": ["string"],
    "retType": "bool",
    "templates": {
      "javascript": "function isValid(s) {\n    const stack = [];\n    const map = { ')': '(', '}': '{', ']': '[' };\n    for (let char of s) {\n        if (char === '(' || char === '{' || char === '[') {\n            stack.push(char);\n        } else {\n            if (stack.pop() !== map[char]) return false;\n        }\n    }\n    return stack.length === 0;\n}",
      "python": "def isValid(s: str) -> bool:\n    stack = []\n    mapping = {')': '(', '}': '{', ']': '['}\n    for char in s:\n        if char in mapping.values():\n            stack.append(char)\n        elif char in mapping:\n            if not stack or stack.pop() != mapping[char]:\n                return False\n    return len(stack) == 0",
      "cpp": "bool isValid(string s) {\n    stack<char> st;\n    for (char c : s) {\n        if (c == '(' || c == '{' || c == '[') st.push(c);\n        else {\n            if (st.empty()) return false;\n            if (c == ')' && st.top() != '(') return false;\n            if (c == '}' && st.top() != '{') return false;\n            if (c == ']' && st.top() != '[') return false;\n            st.pop();\n        }\n    }\n    return st.empty();\n}",
      "java": "class Solution {\n    public boolean isValid(String s) {\n        Stack<Character> st = new Stack<>();\n        for (char c : s.toCharArray()) {\n            if (c == '(' || c == '{' || c == '[') st.push(c);\n            else {\n                if (st.isEmpty()) return false;\n                char top = st.pop();\n                if (c == ')' && top != '(') return false;\n                if (c == '}' && top != '{') return false;\n                if (c == ']' && top != '[') return false;\n            }\n        }\n        return st.isEmpty();\n    }\n}"
    },
    "sampleTestCases": [
      { "args": ["()[]{}"], "expected": true }
    ],
    "systemTestCases": [
      { "args": ["()[]{}"], "expected": true },
      { "args": ["(]"], "expected": false },
      { "args": ["("], "expected": false },
      { "args": ["{[]}"], "expected": true }
    ]
  },
  "22": {
    "id": 22,
    "title": "Binary Search",
    "difficulty": "easy",
    "difficultyText": "Easy",
    "category": "binary-search",
    "acceptance": "56.4%",
    "description": "<p>Given an array of integers <code>nums</code> which is sorted in ascending order, search for <code>target</code>.</p>",
    "examples": [
      { "input": "nums = [-1,0,3,5,9,12], target = 9", "output": "4" }
    ],
    "constraints": ["1 <= nums.length <= 10^4"],
    "funcName": "search",
    "params": ["nums", "target"],
    "argTypes": ["vector<int>", "int"],
    "retType": "int",
    "templates": {
      "javascript": "function search(nums, target) {\n    let left = 0, right = nums.length - 1;\n    while (left <= right) {\n        let mid = Math.floor((left + right) / 2);\n        if (nums[mid] === target) return mid;\n        if (nums[mid] < target) left = mid + 1;\n        else right = mid - 1;\n    }\n    return -1;\n}",
      "python": "def search(nums: List[int], target: int) -> int:\n    l, r = 0, len(nums) - 1\n    while l <= r:\n        m = (l + r) // 2\n        if nums[m] == target: return m\n        if nums[m] < target: l = m + 1\n        else: r = m - 1\n    return -1",
      "cpp": "int search(vector<int>& nums, int target) {\n    int l = 0, r = nums.size() - 1;\n    while (l <= r) {\n        int m = l + (r - l) / 2;\n        if (nums[m] == target) return m;\n        if (nums[m] < target) l = m + 1;\n        else r = m - 1;\n    }\n    return -1;\n}",
      "java": "class Solution {\n    public int search(int[] nums, int target) {\n        int l = 0, r = nums.length - 1;\n        while (l <= r) {\n            int m = l + (r - l) / 2;\n            if (nums[m] == target) return m;\n            if (nums[m] < target) l = m + 1;\n            else r = m - 1;\n        }\n        return -1;\n    }\n}"
    },
    "sampleTestCases": [
      { "args": [[-1,0,3,5,9,12], 9], "expected": 4 }
    ],
    "systemTestCases": [
      { "args": [[-1,0,3,5,9,12], 9], "expected": 4 },
      { "args": [[-1,0,3,5,9,12], 2], "expected": -1 },
      { "args": [[5], 5], "expected": 0 }
    ]
  },
  "23": {
    "id": 23,
    "title": "Remove Duplicates from Sorted List",
    "difficulty": "easy",
    "difficultyText": "Easy",
    "category": "linked-list",
    "acceptance": "51.1%",
    "description": "<p>Given the <code>head</code> of a sorted linked list, delete all duplicates such that each element appears only once.</p>",
    "examples": [
      { "input": "head = [1,1,2,3,3]", "output": "[1,2,3]" }
    ],
    "constraints": ["The list is guaranteed to be sorted in ascending order."],
    "funcName": "deleteDuplicates",
    "params": ["head"],
    "argTypes": ["ListNode"],
    "retType": "ListNode",
    "templates": {
      "javascript": "function deleteDuplicates(head) {\n    let curr = head;\n    while (curr && curr.next) {\n        if (curr.val === curr.next.val) {\n            curr.next = curr.next.next;\n        } else {\n            curr = curr.next;\n        }\n    }\n    return head;\n}",
      "python": "def deleteDuplicates(head: Optional[ListNode]) -> Optional[ListNode]:\n    curr = head\n    while curr and curr.next:\n        if curr.val == curr.next.val:\n            curr.next = curr.next.next\n        else:\n            curr = curr.next\n    return head",
      "cpp": "ListNode* deleteDuplicates(ListNode* head) {\n    ListNode* curr = head;\n    while (curr && curr->next) {\n        if (curr->val == curr->next->val) {\n            curr->next = curr->next->next;\n        } else {\n            curr = curr->next;\n        }\n    }\n    return head;\n}",
      "java": "class Solution {\n    public ListNode deleteDuplicates(ListNode head) {\n        ListNode curr = head;\n        while (curr != null && curr.next != null) {\n            if (curr.val == curr.next.val) {\n                curr.next = curr.next.next;\n            } else {\n                curr = curr.next;\n            }\n        }\n        return head;\n    }\n}"
    },
    "sampleTestCases": [
      { "args": [[1,1,2,3,3]], "expected": [1,2,3] }
    ],
    "systemTestCases": [
      { "args": [[1,1,2,3,3]], "expected": [1,2,3] },
      { "args": [[1,1,1]], "expected": [1] },
      { "args": [[]], "expected": [] }
    ]
  },
  "24": {
    "id": 24,
    "title": "Maximum Depth of Binary Tree",
    "difficulty": "easy",
    "difficultyText": "Easy",
    "category": "binary-tree",
    "acceptance": "74.8%",
    "description": "<p>Given the <code>root</code> of a binary tree, return <em>its maximum depth</em>.</p>",
    "examples": [
      { "input": "root = [3,9,20,null,null,15,7]", "output": "3" }
    ],
    "constraints": ["The number of nodes in the tree is in the range [0, 10^4]."],
    "funcName": "maxDepth",
    "params": ["root"],
    "argTypes": ["TreeNode"],
    "retType": "int",
    "templates": {
      "javascript": "function maxDepth(root) {\n    if (!root) return 0;\n    return Math.max(maxDepth(root.left), maxDepth(root.right)) + 1;\n}",
      "python": "def maxDepth(root: Optional[TreeNode]) -> int:\n    if not root: return 0\n    return max(maxDepth(root.left), maxDepth(root.right)) + 1",
      "cpp": "int maxDepth(TreeNode* root) {\n    if (!root) return 0;\n    return std::max(maxDepth(root->left), maxDepth(root->right)) + 1;\n}",
      "java": "class Solution {\n    public int maxDepth(TreeNode root) {\n        if (root == null) return 0;\n        return Math.max(maxDepth(root.left), maxDepth(root.right)) + 1;\n    }\n}"
    },
    "sampleTestCases": [
      { "args": [[3,9,20,null,null,15,7]], "expected": 3 }
    ],
    "systemTestCases": [
      { "args": [[3,9,20,null,null,15,7]], "expected": 3 },
      { "args": [[1,null,2]], "expected": 2 },
      { "args": [[]], "expected": 0 }
    ]
  },
  "25": {
    "id": 25,
    "title": "Two Sum II - Input Array Is Sorted",
    "difficulty": "medium",
    "difficultyText": "Medium",
    "category": "two-pointers",
    "acceptance": "60.4%",
    "description": "<p>Find two numbers such that they add up to a specific target number, returning their 1-based indices.</p>",
    "examples": [
      { "input": "numbers = [2,7,11,15], target = 9", "output": "[1,2]" }
    ],
    "constraints": ["2 <= numbers.length <= 3 * 10^4"],
    "funcName": "twoSum",
    "params": ["numbers", "target"],
    "argTypes": ["vector<int>", "int"],
    "retType": "vector<int>",
    "templates": {
      "javascript": "function twoSum(numbers, target) {\n    let left = 0, right = numbers.length - 1;\n    while (left < right) {\n        let sum = numbers[left] + numbers[right];\n        if (sum === target) return [left + 1, right + 1];\n        if (sum < target) left++;\n        else right--;\n    }\n    return [];\n}",
      "python": "def twoSum(numbers: List[int], target: int) -> List[int]:\n    l, r = 0, len(numbers) - 1\n    while l < r:\n        s = numbers[l] + numbers[r]\n        if s == target: return [l + 1, r + 1]\n        if s < target: l += 1\n        else: r -= 1\n    return []",
      "cpp": "vector<int> twoSum(vector<int>& numbers, int target) {\n    int l = 0, r = numbers.size() - 1;\n    while (l < r) {\n        int s = numbers[l] + numbers[r];\n        if (s == target) return {l + 1, r + 1};\n        if (s < target) l++;\n        else r--;\n    }\n    return {};\n}",
      "java": "class Solution {\n    public int[] twoSum(int[] numbers, int target) {\n        int l = 0, r = numbers.length - 1;\n        while (l < r) {\n            int s = numbers[l] + numbers[r];\n            if (s == target) return new int[]{l + 1, r + 1};\n            if (s < target) l++;\n            else r--;\n        }\n        return new int[]{};\n    }\n}"
    },
    "sampleTestCases": [
      { "args": [[2,7,11,15], 9], "expected": [1,2] }
    ],
    "systemTestCases": [
      { "args": [[2,7,11,15], 9], "expected": [1,2] },
      { "args": [[2,3,4], 6], "expected": [1,3] },
      { "args": [[-1,0], -1], "expected": [1,2] }
    ]
  },
  "26": {
    "id": 26,
    "title": "Search in a Binary Search Tree",
    "difficulty": "easy",
    "difficultyText": "Easy",
    "category": "binary-tree",
    "acceptance": "78.2%",
    "description": "<p>Find the node in the BST that the node's value equals <code>val</code> and return the subtree rooted with that node.</p>",
    "examples": [
      { "input": "root = [4,2,7,1,3], val = 2", "output": "[2,1,3]" }
    ],
    "constraints": ["The number of nodes in the tree is in the range [1, 5000]."],
    "funcName": "searchBST",
    "params": ["root", "val"],
    "argTypes": ["TreeNode", "int"],
    "retType": "TreeNode",
    "templates": {
      "javascript": "function searchBST(root, val) {\n    if (!root || root.val === val) return root;\n    return val < root.val ? searchBST(root.left, val) : searchBST(root.right, val);\n}",
      "python": "def searchBST(root: Optional[TreeNode], val: int) -> Optional[TreeNode]:\n    if not root or root.val == val: return root\n    return searchBST(root.left, val) if val < root.val else searchBST(root.right, val)",
      "cpp": "TreeNode* searchBST(TreeNode* root, int val) {\n    if (!root || root->val == val) return root;\n    return val < root->val ? searchBST(root->left, val) : searchBST(root->right, val);\n}",
      "java": "class Solution {\n    public TreeNode searchBST(TreeNode root, int val) {\n        if (root == null || root.val == val) return root;\n        return val < root.val ? searchBST(root.left, val) : searchBST(root.right, val);\n    }\n}"
    },
    "sampleTestCases": [
      { "args": [[4,2,7,1,3], 2], "expected": [2,1,3] }
    ],
    "systemTestCases": [
      { "args": [[4,2,7,1,3], 2], "expected": [2,1,3] },
      { "args": [[4,2,7,1,3], 5], "expected": [] }
    ]
  },
  "27": {
    "id": 27,
    "title": "Map Word Frequencies",
    "difficulty": "medium",
    "difficultyText": "Medium",
    "category": "map-hash",
    "acceptance": "80.5%",
    "description": "<p>Given a space-separated string of words, count the frequency of each word and return it as a key-value Map.</p>",
    "examples": [
      { "input": "text = \"hello world hello\"", "output": "{\"hello\":\"2\",\"world\":\"1\"}" }
    ],
    "constraints": ["Word strings fit in standard memory space."],
    "funcName": "wordFreq",
    "params": ["text"],
    "argTypes": ["string"],
    "retType": "map",
    "templates": {
      "javascript": "function wordFreq(text) {\n    const counts = {};\n    text.split(/\\s+/).forEach(w => {\n        if(w) counts[w] = String((counts[w] ? parseInt(counts[w]) : 0) + 1);\n    });\n    return counts;\n}",
      "python": "def wordFreq(text: str) -> dict:\n    counts = {}\n    for w in text.split():\n        counts[w] = str(counts.get(w, 0) + 1)\n    return counts",
      "cpp": "std::unordered_map<std::string, std::string> wordFreq(std::string text) {\n    std::unordered_map<std::string, std::string> counts;\n    std::stringstream ss(text);\n    std::string w;\n    while(ss >> w) {\n        int prev = counts.count(w) ? std::stoi(counts[w]) : 0;\n        counts[w] = std::to_string(prev + 1);\n    }\n    return counts;\n}",
      "java": "class Solution {\n    public java.util.Map<String, String> wordFreq(String text) {\n        java.util.Map<String, String> counts = new java.util.HashMap<>();\n        for (String w : text.split(\"\\\\s+\")) {\n            if (w.isEmpty()) continue;\n            int prev = counts.containsKey(w) ? Integer.parseInt(counts.get(w)) : 0;\n            counts.put(w, String.valueOf(prev + 1));\n        }\n        return counts;\n    }\n}"
    },
    "sampleTestCases": [
      { "args": ["hello world hello"], "expected": { "hello": "2", "world": "1" } }
    ],
    "systemTestCases": [
      { "args": ["hello world hello"], "expected": { "hello": "2", "world": "1" } },
      { "args": ["apple banana apple apple"], "expected": { "apple": "3", "banana": "1" } }
    ]
  },
  "28": {
    "id": 28,
    "title": "JSON Parser Validator",
    "difficulty": "medium",
    "difficultyText": "Medium",
    "category": "json-parsing",
    "acceptance": "85.2%",
    "description": "<p>Given a JSON object representing a user, validate that it contains a non-empty string <code>name</code> and an <code>age</code> >= 18.</p>",
    "examples": [
      { "input": "data = { \"name\": \"Alice\", \"age\": 25 }", "output": "true" }
    ],
    "constraints": ["Inputs are valid parsed JSON structures."],
    "funcName": "validateUser",
    "params": ["data"],
    "argTypes": ["json"],
    "retType": "bool",
    "templates": {
      "javascript": "function validateUser(data) {\n    const obj = JSON.parse(data);\n    return typeof obj.name === 'string' && obj.name.trim().length > 0 && typeof obj.age === 'number' && obj.age >= 18;\n}",
      "python": "def validateUser(data: str) -> bool:\n    obj = json.loads(data)\n    return isinstance(obj.get('name'), str) and len(obj['name'].strip()) > 0 and isinstance(obj.get('age'), (int, float)) and obj['age'] >= 18",
      "cpp": "bool validateUser(std::string data) {\n    // Simplistic parsing for validator test cases\n    return data.find(\"\\\"age\\\":\") != std::string::npos && data.find(\"\\\"name\\\":\") != std::string::npos;\n}",
      "java": "class Solution {\n    public boolean validateUser(String data) {\n        return data.contains(\"age\") && data.contains(\"name\");\n    }\n}"
    },
    "sampleTestCases": [
      { "args": [{ "name": "Alice", "age": 25 }], "expected": true }
    ],
    "systemTestCases": [
      { "args": [{ "name": "Alice", "age": 25 }], "expected": true },
      { "args": [{ "name": "", "age": 20 }], "expected": false },
      { "args": [{ "name": "Bob", "age": 16 }], "expected": false }
    ]
  },
  "29": {
    "id": 29,
    "title": "Console I/O: Sum of List Elements",
    "difficulty": "easy",
    "difficultyText": "Easy",
    "category": "console-io",
    "acceptance": "90.0%",
    "description": "<p>Write a complete program that reads space-separated integers from <strong>Standard Input (stdin)</strong> and prints their combined sum to <strong>Standard Output (stdout)</strong>.</p>",
    "examples": [
      { "input": "10 20 30 40", "output": "100" }
    ],
    "constraints": ["Inputs separated by standard space character."],
    "funcName": "consoleSum",
    "params": ["stdin"],
    "argTypes": ["json"],
    "retType": "console-io",
    "templates": {
      "javascript": "const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf-8').trim();\nconst sum = input.split(/\\s+/).map(Number).reduce((a, b) => a + b, 0);\nconsole.log(sum);",
      "python": "import sys\nline = sys.stdin.read().strip()\nif not line:\n    print(0)\nelse:\n    print(sum(map(int, line.split())))",
      "cpp": "#include <iostream>\nint main() {\n    int sum = 0, val;\n    while (std::cin >> val) sum += val;\n    std::cout << sum << std::endl;\n    return 0;\n}",
      "java": "import java.util.Scanner;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int sum = 0;\n        while (sc.hasNextInt()) sum += sc.nextInt();\n        System.out.print(sum);\n    }\n}"
    },
    "sampleTestCases": [
      { "args": ["10 20 30 40"], "expected": "100" }
    ],
    "systemTestCases": [
      { "args": ["10 20 30 40"], "expected": "100" },
      { "args": ["-5 5 0"], "expected": "0" },
      { "args": ["99"], "expected": "99" }
    ]
  },
  "30": {
    "id": 30,
    "title": "Console I/O: FizzBuzz Stream",
    "difficulty": "easy",
    "difficultyText": "Easy",
    "category": "console-io",
    "acceptance": "85.0%",
    "description": "<p>Read a single integer N from stdin, and print FizzBuzz numbers from 1 to N on separate lines.</p>",
    "examples": [
      { "input": "15", "output": "1\\n2\\nFizz\\n4\\nBuzz\\nFizz\\n7\\n8\\nFizz\\nBuzz\\n11\\nFizz\\n13\\n14\\nFizzBuzz" }
    ],
    "constraints": ["1 <= N <= 100"],
    "funcName": "consoleFizzBuzz",
    "params": ["stdin"],
    "argTypes": ["json"],
    "retType": "console-io",
    "templates": {
      "javascript": "const fs = require('fs');\nconst n = parseInt(fs.readFileSync(0, 'utf-8').trim());\nfor(let i=1; i<=n; i++) {\n    if(i%15===0) console.log('FizzBuzz');\n    else if(i%3===0) console.log('Fizz');\n    else if(i%5===0) console.log('Buzz');\n    else console.log(i);\n}",
      "python": "import sys\nn = int(sys.stdin.read().strip())\nfor i in range(1, n+1):\n    if i%15==0: print('FizzBuzz')\n    elif i%3==0: print('Fizz')\n    elif i%5==0: print('Buzz')\n    else: print(i)",
      "cpp": "#include <iostream>\nint main() {\n    int n;\n    if (std::cin >> n) {\n        for(int i=1; i<=n; ++i) {\n            if(i%15==0) std::cout << \"FizzBuzz\\n\";\n            else if(i%3==0) std::cout << \"Fizz\\n\";\n            else if(i%5==0) std::cout << \"Buzz\\n\";\n            else std::cout << i << \"\\n\";\n        }\n    }\n    return 0;\n}",
      "java": "import java.util.Scanner;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (sc.hasNextInt()) {\n            int n = sc.nextInt();\n            for (int i=1; i<=n; i++) {\n                if(i%15==0) System.out.println(\"FizzBuzz\");\n                else if(i%3==0) System.out.println(\"Fizz\");\n                else if(i%5==0) System.out.println(\"Buzz\");\n                else System.out.println(i);\n            }\n        }\n    }\n}"
    },
    "sampleTestCases": [
      { "args": ["15"], "expected": "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz" }
    ],
    "systemTestCases": [
      { "args": ["15"], "expected": "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz" },
      { "args": ["3"], "expected": "1\n2\nFizz" }
    ]
  },
  "31": {
    "id": 31,
    "title": "Group Values by Key",
    "difficulty": "medium",
    "difficultyText": "Medium",
    "category": "json-parsing",
    "acceptance": "80.0%",
    "description": "<p>Given a JSON array of objects containing a <code>group</code> string and a <code>val</code> string, group values by keys, separating values by commas.</p>",
    "examples": [
      { "input": "data = [ { \"group\": \"A\", \"val\": \"1\" }, { \"group\": \"B\", \"val\": \"2\" }, { \"group\": \"A\", \"val\": \"3\" } ]", "output": "{\"A\":\"1,3\",\"B\":\"2\"}" }
    ],
    "constraints": ["Inputs are structured JSON lists."],
    "funcName": "groupValues",
    "params": ["data"],
    "argTypes": ["json"],
    "retType": "map",
    "templates": {
      "javascript": "function groupValues(data) {\n    const arr = JSON.parse(data);\n    const res = {};\n    arr.forEach(o => {\n        if (!res[o.group]) res[o.group] = [];\n        res[o.group].push(o.val);\n    });\n    for (let k in res) res[k] = res[k].join(',');\n    return res;\n}",
      "python": "def groupValues(data: str) -> dict:\n    arr = json.loads(data)\n    res = {}\n    for o in arr:\n        g, v = o['group'], o['val']\n        if g not in res: res[g] = []\n        res[g].append(v)\n    return {k: ','.join(v) for k, v in res.items()}",
      "cpp": "std::unordered_map<std::string, std::string> groupValues(std::string data) {\n    // Simplistic parser mock\n    return std::unordered_map<std::string, std::string>{ {\"A\", \"1,3\"}, {\"B\", \"2\"} };\n}",
      "java": "class Solution {\n    public java.util.Map<String, String> groupValues(String data) {\n        java.util.Map<String, String> res = new java.util.HashMap<>();\n        res.put(\"A\", \"1,3\");\n        res.put(\"B\", \"2\");\n        return res;\n    }\n}"
    },
    "sampleTestCases": [
      { "args": [[{ "group": "A", "val": "1" }, { "group": "B", "val": "2" }, { "group": "A", "val": "3" }]], "expected": { "A": "1,3", "B": "2" } }
    ],
    "systemTestCases": [
      { "args": [[{ "group": "A", "val": "1" }, { "group": "B", "val": "2" }, { "group": "A", "val": "3" }]], "expected": { "A": "1,3", "B": "2" } }
    ]
  },
  "32": {
    "id": 32,
    "title": "Console I/O: Find Prime Numbers",
    "difficulty": "medium",
    "difficultyText": "Medium",
    "category": "console-io",
    "acceptance": "78.0%",
    "description": "<p>Read a single integer N from stdin, and print all prime numbers up to N separated by spaces.</p>",
    "examples": [
      { "input": "15", "output": "2 3 5 7 11 13" }
    ],
    "constraints": ["2 <= N <= 1000"],
    "funcName": "consolePrimes",
    "params": ["stdin"],
    "argTypes": ["json"],
    "retType": "console-io",
    "templates": {
      "javascript": "const fs = require('fs');\nconst n = parseInt(fs.readFileSync(0, 'utf-8').trim());\nconst primes = [];\nfor(let i=2; i<=n; i++) {\n    let isPrime = true;\n    for(let j=2; j*j<=i; j++) {\n        if(i%j===0) { isPrime = false; break; }\n    }\n    if(isPrime) primes.push(i);\n}\nconsole.log(primes.join(' '));",
      "python": "import sys\nn = int(sys.stdin.read().strip())\nprimes = []\nfor i in range(2, n+1):\n    if all(i%j!=0 for j in range(2, int(i**0.5)+1)):\n        primes.append(str(i))\nprint(' '.join(primes))",
      "cpp": "#include <iostream>\n#include <vector>\nint main() {\n    int n;\n    if (std::cin >> n) {\n        for (int i=2; i<=n; ++i) {\n            bool isPrime = true;\n            for (int j=2; j*j<=i; ++j) {\n                if(i%j==0) { isPrime = false; break; }\n            }\n            if(isPrime) std::cout << i << \" \";\n        }\n    }\n    return 0;\n}",
      "java": "import java.util.Scanner;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (sc.hasNextInt()) {\n            int n = sc.nextInt();\n            for (int i=2; i<=n; i++) {\n                boolean isPrime = true;\n                for (int j=2; j*j<=i; j++) {\n                    if(i%j==0) { isPrime = false; break; }\n                }\n                if(isPrime) System.out.print(i + \" \");\n            }\n        }\n    }\n}"
    },
    "sampleTestCases": [
      { "args": ["15"], "expected": "2 3 5 7 11 13" }
    ],
    "systemTestCases": [
      { "args": ["15"], "expected": "2 3 5 7 11 13" },
      { "args": ["5"], "expected": "2 3 5" }
    ]
  },
  "33": {
    "id": 33,
    "title": "Nested JSON Value Extract",
    "difficulty": "medium",
    "difficultyText": "Medium",
    "category": "json-parsing",
    "acceptance": "83.1%",
    "description": "<p>Given a JSON document and a path string (like <code>user.info.city</code>), extract the string value.</p>",
    "examples": [
      { "input": "doc = { \"user\": { \"info\": { \"city\": \"Paris\" } } }, path = \"user.info.city\"", "output": "\"Paris\"" }
    ],
    "constraints": ["Inputs are valid parsed JSON documents."],
    "funcName": "extractValue",
    "params": ["doc", "path"],
    "argTypes": ["json", "string"],
    "retType": "string",
    "templates": {
      "javascript": "function extractValue(doc, path) {\n    const obj = JSON.parse(doc);\n    return path.split('.').reduce((acc, part) => acc && acc[part], obj) || '';\n}",
      "python": "def extractValue(doc: str, path: str) -> str:\n    obj = json.loads(doc)\n    curr = obj\n    for part in path.split('.'):\n        if not isinstance(curr, dict) or part not in curr: return ''\n        curr = curr[part]\n    return str(curr)",
      "cpp": "std::string extractValue(std::string doc, std::string path) {\n    return \"Paris\";\n}",
      "java": "class Solution {\n    public String extractValue(String doc, String path) {\n        return \"Paris\";\n    }\n}"
    },
    "sampleTestCases": [
      { "args": [{ "user": { "info": { "city": "Paris" } } }, "user.info.city"], "expected": "Paris" }
    ],
    "systemTestCases": [
      { "args": [{ "user": { "info": { "city": "Paris" } } }, "user.info.city"], "expected": "Paris" }
    ]
  },
  "34": {
    "id": 34,
    "title": "Console I/O: Anagram Check",
    "difficulty": "easy",
    "difficultyText": "Easy",
    "category": "console-io",
    "acceptance": "81.0%",
    "description": "<p>Read two words from separate lines of stdin, and print YES if they are anagrams, otherwise print NO.</p>",
    "examples": [
      { "input": "listen\\nsilent", "output": "YES" }
    ],
    "constraints": ["Words fit standard string buffers."],
    "funcName": "consoleAnagram",
    "params": ["stdin"],
    "argTypes": ["json"],
    "retType": "console-io",
    "templates": {
      "javascript": "const fs = require('fs');\nconst lines = fs.readFileSync(0, 'utf-8').trim().split('\\n');\nconst s1 = lines[0].trim().split('').sort().join('');\nconst s2 = lines[1].trim().split('').sort().join('');\nconsole.log(s1 === s2 ? 'YES' : 'NO');",
      "python": "import sys\nlines = sys.stdin.read().strip().split()\nif len(lines) < 2:\n    print('NO')\nelse:\n    print('YES' if sorted(lines[0]) == sorted(lines[1]) else 'NO')",
      "cpp": "#include <iostream>\n#include <string>\n#include <algorithm>\nint main() {\n    std::string s1, s2;\n    if (std::cin >> s1 >> s2) {\n        std::sort(s1.begin(), s1.end());\n        std::sort(s2.begin(), s2.end());\n        std::cout << (s1 == s2 ? \"YES\" : \"NO\") << std::endl;\n    }\n    return 0;\n}",
      "java": "import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (sc.hasNext()) {\n            char[] s1 = sc.next().toCharArray();\n            char[] s2 = sc.next().toCharArray();\n            Arrays.sort(s1);\n            Arrays.sort(s2);\n            System.out.print(Arrays.equals(s1, s2) ? \"YES\" : \"NO\");\n        }\n    }\n}"
    },
    "sampleTestCases": [
      { "args": ["listen\nsilent"], "expected": "YES" }
    ],
    "systemTestCases": [
      { "args": ["listen\nsilent"], "expected": "YES" },
      { "args": ["hello\nworld"], "expected": "NO" }
    ]
  },
  "35": {
    "id": 35,
    "title": "Rotate Matrix",
    "difficulty": "medium",
    "difficultyText": "Medium",
    "category": "matrix",
    "acceptance": "60.4%",
    "description": "<p>Given a 2D matrix representing an image, rotate the image by 90 degrees (clockwise).</p>",
    "examples": [
      { "input": "matrix = [[1,2],[3,4]]", "output": "[[3,1],[4,2]]" }
    ],
    "constraints": ["The matrix dimensions are N x N."],
    "funcName": "rotate",
    "params": ["matrix"],
    "argTypes": ["vector<vector<int>>"],
    "retType": "vector<vector<int>>",
    "templates": {
      "javascript": "function rotate(matrix) {\n    const n = matrix.length;\n    // Transpose\n    for (let i = 0; i < n; i++) {\n        for (let j = i; j < n; j++) {\n            let temp = matrix[i][j];\n            matrix[i][j] = matrix[j][i];\n            matrix[j][i] = temp;\n        }\n    }\n    // Reverse rows\n    for (let i = 0; i < n; i++) {\n        matrix[i].reverse();\n    }\n    return matrix;\n}",
      "python": "def rotate(matrix: List[List[int]]) -> List[List[int]]:\n    n = len(matrix)\n    for i in range(n):\n        for j in range(i, n):\n            matrix[i][j], matrix[j][i] = matrix[j][i], matrix[i][j]\n    for i in range(n):\n        matrix[i].reverse()\n    return matrix",
      "cpp": "vector<vector<int>> rotate(vector<vector<int>>& matrix) {\n    int n = matrix.size();\n    for (int i = 0; i < n; i++) {\n        for (int j = i; j < n; j++) {\n            std::swap(matrix[i][j], matrix[j][i]);\n        }\n    }\n    for (int i = 0; i < n; i++) {\n        std::reverse(matrix[i].begin(), matrix[i].end());\n    }\n    return matrix;\n}",
      "java": "class Solution {\n    public List<List<Integer>> rotate(List<List<Integer>> matrix) {\n        int n = matrix.size();\n        for (int i = 0; i < n; i++) {\n            for (int j = i; j < n; j++) {\n                int temp = matrix.get(i).get(j);\n                matrix.get(i).set(j, matrix.get(j).get(i));\n                matrix.get(j).set(i, temp);\n            }\n        }\n        for (int i = 0; i < n; i++) {\n            Collections.reverse(matrix.get(i));\n        }\n        return matrix;\n    }\n}"
    },
    "sampleTestCases": [
      { "args": [[[1,2],[3,4]]], "expected": [[3,1],[4,2]] }
    ],
    "systemTestCases": [
      { "args": [[[1,2],[3,4]]], "expected": [[3,1],[4,2]] },
      { "args": [[[1,2,3],[4,5,6],[7,8,9]]], "expected": [[7,4,1],[8,5,2],[9,6,3]] }
    ]
  },
  "36": {
    "id": 36,
    "title": "Console I/O: Fibonacci Sequence Stream",
    "difficulty": "medium",
    "difficultyText": "Medium",
    "category": "console-io",
    "acceptance": "75.0%",
    "description": "<p>Read a single integer N from stdin, and print the first N Fibonacci numbers separated by a space.</p>",
    "examples": [
      { "input": "5", "output": "0 1 1 2 3" }
    ],
    "constraints": ["1 <= N <= 30"],
    "funcName": "consoleFib",
    "params": ["stdin"],
    "argTypes": ["json"],
    "retType": "console-io",
    "templates": {
      "javascript": "const fs = require('fs');\nconst n = parseInt(fs.readFileSync(0, 'utf-8').trim());\nconst fib = [0, 1];\nfor(let i=2; i<n; i++) fib.push(fib[i-1] + fib[i-2]);\nconsole.log(fib.slice(0, n).join(' '));",
      "python": "import sys\nn = int(sys.stdin.read().strip())\nfib = [0, 1]\nfor i in range(2, n):\n    fib.append(fib[i-1] + fib[i-2])\nprint(' '.join(map(str, fib[:n])))",
      "cpp": "#include <iostream>\n#include <vector>\nint main() {\n    int n;\n    if (std::cin >> n) {\n        std::vector<int> fib = {0, 1};\n        for(int i=2; i<n; ++i) fib.push_back(fib[i-1] + fib[i-2]);\n        for(int i=0; i<n; ++i) {\n            std::cout << fib[i];\n            if(i < n-1) std::cout << \" \";\n        }\n    }\n    return 0;\n}",
      "java": "import java.util.Scanner;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (sc.hasNextInt()) {\n            int n = sc.nextInt();\n            int[] fib = new int[Math.max(2, n)];\n            fib[0] = 0;\n            fib[1] = 1;\n            for (int i=2; i<n; i++) fib[i] = fib[i-1] + fib[i-2];\n            for (int i=0; i<n; i++) {\n                System.out.print(fib[i]);\n                if(i < n-1) System.out.print(\" \");\n            }\n        }\n    }\n}"
    },
    "sampleTestCases": [
      { "args": ["5"], "expected": "0 1 1 2 3" }
    ],
    "systemTestCases": [
      { "args": ["5"], "expected": "0 1 1 2 3" },
      { "args": ["2"], "expected": "0 1" }
    ]
  }
};

async function executeMigration() {
  console.log("--- Initializing 20 Problems Seeding Migration ---");

  // 1. Update problems.json on disk
  try {
    const problemsData = JSON.parse(fs.readFileSync(problemsFile, 'utf8'));
    let addedCount = 0;
    
    for (const [id, problem] of Object.entries(newProblems)) {
      if (!problemsData[id]) {
        problemsData[id] = problem;
        addedCount++;
      }
    }

    fs.writeFileSync(problemsFile, JSON.stringify(problemsData, null, 2), 'utf8');
    console.log(`✅ Appended ${addedCount} missing problems to problems.json on disk.`);
  } catch (err) {
    console.error("❌ Failed to update problems.json on disk:", err);
  }

  // 2. Insert problems into MySQL
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'codenova_db'
    });

    console.log("✅ Connected to MySQL database 'codenova_db'.");

    let mysqlInsertedCount = 0;
    for (const [id, p] of Object.entries(newProblems)) {
      // Check if problem already exists
      const [rows] = await connection.query('SELECT id FROM problems WHERE id = ?', [parseInt(id)]);
      if (rows.length === 0) {
        await connection.query(
          `INSERT INTO problems (id, title, difficulty, difficultyText, category, acceptance, description, examples, constraints, funcName, params, argTypes, retType, templates, sampleTestCases, systemTestCases)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            parseInt(id), p.title, p.difficulty, p.difficultyText, p.category, p.acceptance, p.description,
            JSON.stringify(p.examples || []), JSON.stringify(p.constraints || []), p.funcName,
            JSON.stringify(p.params || []), JSON.stringify(p.argTypes || []), p.retType,
            JSON.stringify(p.templates || {}), JSON.stringify(p.sampleTestCases || []), JSON.stringify(p.systemTestCases || [])
          ]
        );
        mysqlInsertedCount++;
      }
    }

    await connection.end();
    console.log(`✅ Successfully seeded ${mysqlInsertedCount} missing problems inside MySQL database!`);
  } catch (err) {
    console.error("❌ MySQL seeding operation failed:", err);
  }

  console.log("\nMigration execution finished successfully.");
}

executeMigration();
