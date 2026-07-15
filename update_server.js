const fs = require('fs');
const path = require('path');

const serverFile = path.join(__dirname, 'server.js');
let code = fs.readFileSync(serverFile, 'utf8');

// 1. getAllUsers
code = code.replace(
  /customProblems: typeof u.customProblems === 'string' \? JSON.parse\(u.customProblems\) : \(u.customProblems \|\| \[\]\)\n    \}\)\);/,
  "customProblems: typeof u.customProblems === 'string' ? JSON.parse(u.customProblems) : (u.customProblems || []),\n      streak: u.streak || 0,\n      lastSolvedDate: u.lastSolvedDate || null\n    }));"
);

// 2. getUserByEmail
code = code.replace(
  /customProblems: typeof u\.customProblems === 'string' \? JSON\.parse\(u\.customProblems\) : \(u\.customProblems \|\| \[\]\)\n    \};\n  \}/,
  "customProblems: typeof u.customProblems === 'string' ? JSON.parse(u.customProblems) : (u.customProblems || []),\n      streak: u.streak || 0,\n      lastSolvedDate: u.lastSolvedDate || null\n    };\n  }"
);

// 3. upsertUser
code = code.replace(
  /INSERT INTO users \(email, password, name, username, solved, solutions, customProblems, lastSynced\)\n       VALUES \(\?, \?, \?, \?, \?, \?, \?, \?\)/,
  "INSERT INTO users (email, password, name, username, solved, solutions, customProblems, lastSynced, streak, lastSolvedDate)\n       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
);
code = code.replace(
  /lastSynced = VALUES\(lastSynced\)`,\n      \[\n        user\.email\.toLowerCase\(\), user\.password \|\| '', user\.name, user\.username,\n        JSON\.stringify\(user\.solved \|\| \[\]\), JSON\.stringify\(user\.solutions \|\| \{\}\),\n        JSON\.stringify\(user\.customProblems \|\| \[\]\), user\.lastSynced \|\| new Date\(\)\.toISOString\(\)\n      \]/,
  "lastSynced = VALUES(lastSynced),\n         streak = VALUES(streak),\n         lastSolvedDate = VALUES(lastSolvedDate)`,\n      [\n        user.email.toLowerCase(), user.password || '', user.name, user.username,\n        JSON.stringify(user.solved || []), JSON.stringify(user.solutions || {}),\n        JSON.stringify(user.customProblems || []), user.lastSynced || new Date().toISOString(),\n        user.streak || 0, user.lastSolvedDate || null\n      ]"
);

// 4. Seeding MySQL
code = code.replace(
  /INSERT INTO users \(email, password, name, username, solved, solutions, customProblems, lastSynced\)\n           VALUES \(\?, \?, \?, \?, \?, \?, \?, \?\)`,\n          \[\n            u\.email, u\.password \|\| '', u\.name, u\.username,\n            JSON\.stringify\(u\.solved \|\| \[\]\), JSON\.stringify\(u\.solutions \|\| \{\}\),\n            JSON\.stringify\(u\.customProblems \|\| \[\]\), u\.lastSynced \|\| new Date\(\)\.toISOString\(\)\n          \]/,
  "INSERT INTO users (email, password, name, username, solved, solutions, customProblems, lastSynced, streak, lastSolvedDate)\n           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,\n          [\n            u.email, u.password || '', u.name, u.username,\n            JSON.stringify(u.solved || []), JSON.stringify(u.solutions || {}),\n            JSON.stringify(u.customProblems || []), u.lastSynced || new Date().toISOString(),\n            u.streak || 0, u.lastSolvedDate || null\n          ]"
);

// 5. Create Table
code = code.replace(
  /customProblems JSON,\n        lastSynced VARCHAR\(255\)\n      \)\n    `\);/,
  "customProblems JSON,\n        lastSynced VARCHAR(255),\n        streak INT DEFAULT 0,\n        lastSolvedDate VARCHAR(255)\n      )\n    `);\n    try { await dbPool.query('ALTER TABLE users ADD COLUMN streak INT DEFAULT 0'); } catch(e) {}\n    try { await dbPool.query('ALTER TABLE users ADD COLUMN lastSolvedDate VARCHAR(255)'); } catch(e) {}"
);

// 6. Signup
code = code.replace(
  /customProblems: \[\],\n      lastSynced: new Date\(\)\.toISOString\(\)\n    \};\n\n    await upsertUser\(newUser\);/,
  "customProblems: [],\n      lastSynced: new Date().toISOString(),\n      streak: 0,\n      lastSolvedDate: null\n    };\n\n    await upsertUser(newUser);"
);
code = code.replace(
  /customProblems: \[\],\n      bio: "Passionate developer on a coding journey\."\n    \};\n    res\.json\(\{ success: true, profile \}\);/,
  "customProblems: [],\n      bio: \"Passionate developer on a coding journey.\",\n      streak: 0,\n      lastSolvedDate: null,\n      xp: 0,\n      rank: 15000\n    };\n    res.json({ success: true, profile });"
);

// 7. Login
code = code.replace(
  /const profile = \{\n      name: user\.name,\n      username: user\.username,\n      email: user\.email,\n      solved: user\.solved,\n      solutions: user\.solutions,\n      customProblems: user\.customProblems,\n      bio: user\.bio \|\| "Passionate developer on a coding journey\."\n    \};/,
  "const xp = (user.solved ? user.solved.length : 0) * 10;\n    const rank = Math.max(1, 15000 - xp * 5);\n    const profile = {\n      name: user.name,\n      username: user.username,\n      email: user.email,\n      solved: user.solved,\n      solutions: user.solutions,\n      customProblems: user.customProblems,\n      bio: user.bio || \"Passionate developer on a coding journey.\",\n      streak: user.streak || 0,\n      lastSolvedDate: user.lastSolvedDate || null,\n      xp: xp,\n      rank: rank\n    };"
);

// 8. Sync
code = code.replace(
  /const \{ email, name, username, solved, solutions, customProblems \} = req\.body;/,
  "const { email, name, username, solved, solutions, customProblems, streak, lastSolvedDate } = req.body;"
);
code = code.replace(
  /customProblems: customProblems \|\| \[\],\n      lastSynced: new Date\(\)\.toISOString\(\)\n    \};/,
  "customProblems: customProblems || [],\n      lastSynced: new Date().toISOString(),\n      streak: streak !== undefined ? streak : (existingUser.streak || 0),\n      lastSolvedDate: lastSolvedDate !== undefined ? lastSolvedDate : (existingUser.lastSolvedDate || null)\n    };"
);

fs.writeFileSync(serverFile, code, 'utf8');
console.log("server.js updated successfully.");
