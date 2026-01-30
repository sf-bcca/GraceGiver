#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const description = process.argv.slice(2).join('_').toLowerCase().replace(/[^a-z0-9_]/g, '');

if (!description) {
  console.error('Error: Please provide a description for the migration.');
  console.error('Usage: node generate_migration.cjs <description>');
  process.exit(1);
}

const migrationsDir = path.resolve(__dirname, '../../../db/migrations');
const templatePath = path.resolve(__dirname, '../assets/migration_template.sql');

if (!fs.existsSync(migrationsDir)) {
  fs.mkdirSync(migrationsDir, { recursive: true });
}

const files = fs.readdirSync(migrationsDir);
const sequenceNumbers = files
  .map(f => parseInt(f.split('_')[0]))
  .filter(n => !isNaN(n));

const nextSequence = (sequenceNumbers.length > 0 ? Math.max(...sequenceNumbers) : 0) + 1;
const paddedSequence = String(nextSequence).padStart(3, '0');
const fileName = `${paddedSequence}_${description}.sql`;
const filePath = path.join(migrationsDir, fileName);

let template = fs.readFileSync(templatePath, 'utf8');
template = template.replace('<DESCRIPTION>', description.replace(/_/g, ' '));
template = template.replace('<TIMESTAMP>', new Date().toISOString());

fs.writeFileSync(filePath, template);

console.log(`✅ Migration created: db/migrations/${fileName}`);
console.log(`Path: ${filePath}`);
