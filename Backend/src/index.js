import express from 'express';
import cors from 'cors';
import emailRouter from './utils/email.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api', emailRouter);

// console.log("API KEY:", process.env.SENDGRID_API_KEY);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});


