const PDFDocument = require('pdfkit');

const generateMemberReportPDF = async (pool, memberId, res) => {
  try {
    // 1. Fetch Member Details
    const memberRes = await pool.query('SELECT * FROM members WHERE id = $1', [memberId]);
    if (memberRes.rows.length === 0) {
      throw new Error('Member not found');
    }
    const member = memberRes.rows[0];

    // 2. Fetch Stats
    const statsRes = await pool.query(`
      SELECT
        COALESCE(SUM(amount), 0) as lifetime_total,
        MAX(donation_date) as last_donation_date,
        (SELECT amount FROM donations WHERE member_id = $1 ORDER BY donation_date DESC LIMIT 1) as last_donation_amount
      FROM donations
      WHERE member_id = $1
    `, [memberId]);
    const stats = statsRes.rows[0];

    // 3. Fetch Recent Donations (last 20)
    const donationsRes = await pool.query(`
      SELECT * FROM donations
      WHERE member_id = $1
      ORDER BY donation_date DESC
      LIMIT 20
    `, [memberId]);
    const donations = donationsRes.rows;

    // 4. Calculate Membership Years
    let membershipYears = 'N/A';
    if (member.joined_at) {
      const joinDate = new Date(member.joined_at);
      const now = new Date();
      const diffTime = Math.abs(now - joinDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      membershipYears = (diffDays / 365.25).toFixed(1);
    }

    // 5. Generate PDF
    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    // Header
    doc.fontSize(20).text('Member Profile Report', { align: 'center' });
    doc.moveDown();

    // Member Info Block
    doc.fontSize(14).font('Helvetica-Bold').text(`${member.first_name} ${member.last_name}`);
    doc.fontSize(10).font('Helvetica').text(member.email || 'No Email');
    doc.text(member.telephone || 'No Phone');
    doc.text(`${member.address || ''} ${member.city || ''}, ${member.state || ''} ${member.zip || ''}`);
    doc.moveDown();

    // Stats Grid (Simulated with text columns)
    const startY = doc.y;

    // Left Column: Membership
    doc.font('Helvetica-Bold').text('Membership Details', 50, startY);
    doc.font('Helvetica').text(`Joined: ${member.joined_at ? new Date(member.joined_at).toLocaleDateString() : 'Unknown'}`);
    doc.text(`Tenure: ${membershipYears} Years`);

    // Right Column: Giving
    doc.font('Helvetica-Bold').text('Giving Summary', 300, startY);
    doc.font('Helvetica').text(`Lifetime Giving: $${parseFloat(stats.lifetime_total).toFixed(2)}`);
    doc.text(`Last Donation: ${stats.last_donation_date ? new Date(stats.last_donation_date).toLocaleDateString() : 'None'} ($${parseFloat(stats.last_donation_amount || 0).toFixed(2)})`);

    doc.moveDown(4);

    // Recent Activity Table
    doc.font('Helvetica-Bold').fontSize(12).text('Recent Activity (Last 20 Donations)', 50, doc.y);
    doc.moveDown(0.5);

    const tableTop = doc.y;
    const dateX = 50;
    const fundX = 150;
    const amountX = 400;

    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Date', dateX, tableTop);
    doc.text('Fund', fundX, tableTop);
    doc.text('Amount', amountX, tableTop, { width: 100, align: 'right' });
    doc.font('Helvetica');

    let y = tableTop + 20;
    doc.moveTo(50, y - 5).lineTo(550, y - 5).stroke();

    donations.forEach(d => {
       if (y > 700) {
          doc.addPage();
          y = 50;
       }
       doc.text(new Date(d.donation_date).toLocaleDateString(), dateX, y);
       doc.text(d.fund, fundX, y);
       doc.text(`$${parseFloat(d.amount).toFixed(2)}`, amountX, y, { width: 100, align: 'right' });
       y += 20;
    });

    doc.moveTo(50, y).lineTo(550, y).stroke();

    doc.end();

  } catch (err) {
    console.error('Error generating member report PDF:', err);
    throw err;
  }
};

const generateAnnualStatementPDF = (member, donations, summary, narrative, res) => {
  try {
    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    // Header
    doc.fontSize(20).text('Mt. Herman A.M.E. Church', { align: 'center' });
    doc.fontSize(16).text('Annual Contribution Statement', { align: 'center' });
    doc.fontSize(12).text(`Tax Year: ${summary.year}`, { align: 'center' });
    doc.moveDown();

    // Member Info
    doc.fontSize(12).font('Helvetica-Bold').text(`${member.firstName} ${member.lastName}`);
    doc.font('Helvetica').text(member.address || '');
    if (member.city || member.state || member.zip) {
      doc.text(`${member.city || ''}, ${member.state || ''} ${member.zip || ''}`);
    }
    doc.moveDown();

    // Narrative Section
    if (narrative) {
      doc.font('Helvetica-Bold').text('Impact Summary');
      doc.font('Helvetica-Oblique').text(narrative);
      doc.moveDown();
    }

    // Donations Table
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

    donations.forEach(d => {
      if (y > 700) {
        doc.addPage();
        y = 50;
      }
      
      const dateStr = d.date ? new Date(d.date).toLocaleDateString() : 'N/A';
      
      doc.text(dateStr, dateX, y);
      doc.text(d.fund, fundX, y);
      doc.text(`$${parseFloat(d.amount).toFixed(2)}`, amountX, y, { width: 100, align: 'right' });
      
      y += 20;
    });

    doc.moveTo(50, y).lineTo(550, y).stroke();
    y += 10;

    // Total
    doc.font('Helvetica-Bold');
    doc.text('Total Contributions:', 250, y);
    doc.text(`$${parseFloat(summary.totalAmount).toFixed(2)}`, amountX, y, { width: 100, align: 'right' });

    // IRS Disclaimer
    const bottomY = 700;
    if (doc.y > 650) doc.addPage();
    
    doc.font('Helvetica-Oblique').fontSize(8);
    doc.text(
      '"No goods or services were provided in exchange for this contribution other than intangible religious benefits."',
      50, 
      doc.y > bottomY ? doc.y + 20 : bottomY, 
      { align: 'center', width: 500 }
    );

    doc.end();
  } catch (err) {
    console.error('Error generating annual statement PDF:', err);
    throw err;
  }
};

module.exports = { generateMemberReportPDF, generateAnnualStatementPDF };
