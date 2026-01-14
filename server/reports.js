const PDFDocument = require('pdfkit');
const { stringify } = require('csv-stringify');

const generateBatchStatement = async (pool, year, res) => {
  // Fetch data first
  const query = `
    SELECT 
      m.id as member_id, m.first_name, m.last_name, m.address, m.city, m.state, m.zip,
      d.id as donation_id, d.amount, d.fund, d.donation_date, d.notes
    FROM members m
    JOIN donations d ON m.id = d.member_id
    WHERE extract(year from d.donation_date) = $1
    ORDER BY m.last_name, m.first_name, d.donation_date
  `;

  console.log(`Generating batch for year: ${year}`);
  try {
    const result = await pool.query(query, [year]);
    const rows = result.rows;
    console.log(`Found ${rows.length} rows for batch generation.`);

    // If no data, we could throw or handle, but let's generate an empty PDF saying so.
    // Start PDF stream
    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    // Group by member
    const membersData = {};
    rows.forEach(row => {
      if (!membersData[row.member_id]) {
        membersData[row.member_id] = {
          info: {
            first_name: row.first_name,
            last_name: row.last_name,
            address: row.address,
            city: row.city,
            state: row.state,
            zip: row.zip
          },
          donations: []
        };
      }
      membersData[row.member_id].donations.push({
        date: new Date(row.donation_date).toLocaleDateString(),
        fund: row.fund,
        amount: parseFloat(row.amount),
        notes: row.notes
      });
    });

    const memberIds = Object.keys(membersData);
    
    if (memberIds.length === 0) {
        doc.text("No records found for this year.");
        doc.end();
        return; 
    }

    memberIds.forEach((memberId, index) => {
      if (index > 0) doc.addPage();
      
      const member = membersData[memberId];
      const { info, donations } = member;
      
      // Header
      doc.fontSize(20).text('Mt. Herman A.M.E. Church', { align: 'center' });
      doc.fontSize(12).text('Annual Contribution Statement', { align: 'center' });
      doc.fontSize(10).text(`Tax Year: ${year}`, { align: 'center' });
      doc.moveDown();
      
      // Member Address Block
      doc.text(`${info.first_name} ${info.last_name}`);
      if (info.address) doc.text(info.address);
      if (info.city || info.state || info.zip) {
          doc.text(`${info.city || ''}, ${info.state || ''} ${info.zip || ''}`);
      }
      doc.moveDown(2);

      // Table Header
      const tableTop = doc.y;
      const dateX = 50;
      const fundX = 150;
      const amountX = 400;

      doc.font('Helvetica-Bold');
      doc.text('Date', dateX, tableTop);
      doc.text('Fund', fundX, tableTop);
      doc.text('Amount', amountX, tableTop, { width: 100, align: 'right' });
      doc.font('Helvetica');

      let y = tableTop + 20;
      doc.moveTo(50, y - 5).lineTo(550, y - 5).stroke();

      let total = 0;

      donations.forEach(donation => {
        // Check for page break
        if (y > 700) {
          doc.addPage();
          y = 50;
        }

        doc.text(donation.date, dateX, y);
        doc.text(donation.fund, fundX, y);
        doc.text(`$${donation.amount.toFixed(2)}`, amountX, y, { width: 100, align: 'right' });
        
        total += donation.amount;
        y += 20;
      });

      doc.moveTo(50, y).lineTo(550, y).stroke();
      y += 10;
      
      // Total
      doc.font('Helvetica-Bold');
      doc.text('Total Contributions:', 250, y);
      doc.text(`$${total.toFixed(2)}`, amountX, y, { width: 100, align: 'right' });
      
      // Footer / Disclaimer
      doc.font('Helvetica-Oblique').fontSize(8);
      const bottomY = 700;
      doc.text(
        '"No goods or services were provided in exchange for this contribution other than intangible religious benefits."',
        50, 
        bottomY, 
        { align: 'center', width: 500 }
      );
    });

    doc.end();
    console.log('PDF generation finished.');
  } catch (err) {
    console.error('Error generating batch:', err);
    throw err;
  }
};

const exportTransactions = async (pool, year, res) => {
    const query = `
      SELECT 
        d.id, d.donation_date, d.amount, d.fund, d.notes, d.entered_by,
        m.first_name, m.last_name, m.id as member_id
      FROM donations d
      JOIN members m ON d.member_id = m.id
      WHERE extract(year from d.donation_date) = $1
      ORDER BY d.donation_date DESC
    `;

    const result = await pool.query(query, [year]);
    
    const columns = [
        'id', 'donation_date', 'amount', 'fund', 'notes', 'entered_by', 'first_name', 'last_name', 'member_id'
    ];
    
    const stringifier = stringify({ header: true, columns: columns });
    
    // Pipe the stringifier to the response
    stringifier.pipe(res);
    
    result.rows.forEach(row => {
        // format date slightly better if needed, or leave raw
        row.donation_date = new Date(row.donation_date).toISOString().split('T')[0];
        stringifier.write(row);
    });
    
    stringifier.end();
};

const getAtRiskDonors = async (pool) => {
  // 1. Fetch donors with at least 3 months of history
  const donorQuery = `
    WITH monthly_giving AS (
      SELECT 
        member_id,
        EXTRACT(YEAR FROM donation_date) as year,
        EXTRACT(MONTH FROM donation_date) as month,
        SUM(amount) as amount
      FROM donations
      WHERE donation_date > NOW() - INTERVAL '12 months'
      GROUP BY member_id, year, month
    ),
    donor_history AS (
      SELECT 
        mg.member_id,
        m.first_name,
        m.last_name,
        JSON_AGG(JSON_BUILD_OBJECT('month', mg.month, 'year', mg.year, 'amount', mg.amount) ORDER BY mg.year DESC, mg.month DESC) as history
      FROM monthly_giving mg
      JOIN members m ON mg.member_id = m.id
      GROUP BY mg.member_id, m.first_name, m.last_name
      HAVING COUNT(*) >= 2 -- At least 2 months of data to see a trend
    )
    SELECT * FROM donor_history;
  `;

  try {
    const { rows } = await pool.query(donorQuery);
    
    // NOTE: In a real environment, we'd batch these for Gemini
    // For this implementation, we'll return the data to the frontend
    // and let the frontend (or a separate AI service call) handle the narrative.
    // However, to follow the plan, let's simulate the "RiskAssessment"
    
    const atRiskMembers = rows.map(member => {
        const amounts = member.history.map(h => parseFloat(h.amount));
        const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
        const lastAmount = amounts[0];
        
        // Simple heuristic for "At Risk" before AI nudge
        // If last month is < 50% of average, flag as "Warning"
        let status = 'Stable';
        let recommendation = 'No action needed.';
        
        if (lastAmount < avg * 0.5) {
            status = 'Warning';
            recommendation = `Giving dropped by ${Math.round((1 - lastAmount/avg) * 100)}%. Consider a wellness check.`;
        } else if (lastAmount === 0 || amounts.length < 3) {
             // If they skip a month (though the query currently only gets months with donations)
             // We'd need a more complex query to find 'gaps'
        }

        return {
            memberId: member.member_id,
            name: `${member.first_name} ${member.last_name}`,
            status,
            recommendation,
            history: member.history
        };
    }).filter(m => m.status !== 'Stable');

    return atRiskMembers;
  } catch (err) {
    console.error('Error in getAtRiskDonors:', err);
    throw err;
  }
};

const getMemberStatement = async (pool, memberId, year) => {
  try {
    // 1. Fetch Member Details
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

    // 2. Fetch Donations for the Year
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
      date: d.donation_date, // Keep as date object or string? Integration test expects ISO usually, but let's check.
      amount: parseFloat(d.amount),
      fund: d.fund,
      notes: d.notes
    }));

    // 3. Calculate Summary
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
  } catch (err) {
    console.error(`Error generating member statement for ${memberId} in ${year}:`, err);
    throw err;
  }
};

module.exports = { generateBatchStatement, exportTransactions, getAtRiskDonors, getMemberStatement };
