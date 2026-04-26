import express from 'express';
import cors from 'cors';
import emailRouter from './utils/email.js';
import careersRouter from './routes/careers.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL
}));
app.use(express.json());
app.use('/api', emailRouter);
app.use('/api', careersRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});