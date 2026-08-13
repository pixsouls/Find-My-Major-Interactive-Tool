import express from 'express';
import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';

dotenv.config();
console.log('SENDGRID KEY:', process.env.SENDGRID_API_KEY?.substring(0, 10));

sgMail.setApiKey(process.env.SENDGRID_API_KEY);  // move here, outside the route

const router = express.Router();

router.post('/send-email', async (req, res) => {
  const { to, subject, text } = req.body;

  const msg = { to, from: process.env.FROM_EMAIL, subject, text };
  try {
    await sgMail.send(msg);
    res.status(200).json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ message: 'Failed to send email' });
  }
});

export default router;