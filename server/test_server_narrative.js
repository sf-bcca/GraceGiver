require('dotenv').config({ path: '../.env' });
const { Pool } = require('pg');
const { getFinancialSummary, generateMemberNarrative } = require('./geminiService');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
});

const getMemberStatement = async (pool, memberId, year) => {
  const memberQuery = `
    SELECT id, first_name, last_name, address, city, state, zip
    FROM members
    WHERE id = $1
  `;
  const memberRes = await pool.query(memberQuery, [memberId]);
  
  if (memberRes.rows.length === 0) {
    return null;
  }
  
  const member = memberRes.rows[0];

  const donationsQuery = `
    SELECT id, donation_date, amount, fund, notes
    FROM donations
    WHERE member_id = $1 
    AND EXTRACT(YEAR FROM donation_date) = $2
    ORDER BY donation_date ASC
  `;
  const donationsRes = await pool.query(donationsQuery, [memberId, year]);
  
  const donations = donationsRes.rows.map(d => ({
    id: d.id,
    date: d.donation_date,
    amount: parseFloat(d.amount),
    fund: d.fund,
    notes: d.notes
  }));

  const totalAmount = donations.reduce((sum, d) => sum + d.amount, 0);

  return {
    member: {
      id: member.id,
      firstName: member.first_name,
      lastName: member.last_name,
      address: member.address,
      city: member.city,
      state: member.state,
      zip: member.zip
    },
    donations,
    summary: {
      totalAmount,
      year: parseInt(year)
    }
  };
};

async function run() {
  try {
    const res = await pool.query("SELECT id, first_name, last_name FROM members WHERE first_name = 'Chastity'");
    console.log("Found members:", res.rows);
    if (res.rows.length === 0) {
      console.log("Chastity not found in DB.");
      return;
    }
    const memberId = res.rows[0].id;
    console.log(`Generating statement for memberId ${memberId} for year 2026...`);
    const statement = await getMemberStatement(pool, memberId, '2026');
    console.log("Statement:", JSON.stringify(statement, null, 2));

    console.log("Generating narrative...");
    const narrative = await generateMemberNarrative(
      statement.member,
      statement.donations,
      '2026'
    );
    console.log("Generated Narrative:", narrative);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

run();
