// query_db.js
// Script to query MySQL directly and verify data seeding and connection status

const mysql = require('mysql2/promise');

async function testConnectionAndQuery() {
  console.log("Connecting to MySQL on localhost:3306...");
  
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'codenova_db'
    });

    console.log("✅ Successfully connected to MySQL database 'codenova_db'!\n");

    // 1. Query users
    console.log("--- Querying 'users' table (SELECT email, name, username FROM users) ---");
    const [userRows] = await connection.query('SELECT email, name, username FROM users');
    console.table(userRows);

    // 2. Query problems
    console.log("\n--- Querying 'problems' table (SELECT id, title, difficulty FROM problems LIMIT 5) ---");
    const [problemRows] = await connection.query('SELECT id, title, difficulty FROM problems LIMIT 5');
    console.table(problemRows);

    // 3. Query login history
    console.log("\n--- Querying 'login_history' table (SELECT email, loginTime, status FROM login_history) ---");
    const [loginRows] = await connection.query('SELECT email, loginTime, status FROM login_history');
    console.table(loginRows);

    await connection.end();
    console.log("\nQuery successful. Connection closed.");
  } catch (error) {
    console.error("❌ Failed to query database:", error);
  }
}

testConnectionAndQuery();
