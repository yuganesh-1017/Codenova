// sync_templates_db.js
// Script to update templates for all problems in MySQL from the local problems.json file

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function syncTemplates() {
  console.log("Reading problems.json...");
  const problemsPath = path.join(__dirname, 'problems.json');
  const problems = JSON.parse(fs.readFileSync(problemsPath, 'utf8'));

  console.log("Connecting to MySQL codenova_db on localhost:3306...");
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'codenova_db'
    });

    console.log("Connected! Syncing templates for problems 1 to 36...");
    for (const [id, p] of Object.entries(problems)) {
      await connection.query(
        'UPDATE problems SET templates = ? WHERE id = ?',
        [JSON.stringify(p.templates), parseInt(id)]
      );
    }
    
    console.log("✅ Successfully updated all templates inside MySQL!");
    await connection.end();
  } catch (error) {
    console.error("❌ Failed to sync templates in database:", error);
  }
}

syncTemplates();
