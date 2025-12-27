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

module.exports = { generateBatchStatement, exportTransactions };
