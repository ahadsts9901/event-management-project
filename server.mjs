import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import './mongodb.mjs';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

import v1Routes from './v1Routes/index.mjs';
const app = express();
try {
    app.set('trust proxy', 1);
    app.use(helmet());
    app.use(cors({
        origin: [
            '*',
        ],
        credentials: true,
    }));
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(morgan('combined'));
    app.use(cookieParser(process.env.SERVER_SECRET));

    app.use('/api/v1', v1Routes);
    // server
    app.get('/', (req, res) => {
        res.send('OK.');
    });
    app.use((err, req, res, next) => {
        console.error(err.stack);
        res.status(500).send('Something went wrong!');
    });

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.info(`Server is running on port ${PORT}`);
    });
} catch (e) {
    console.error('Fetal Error');
    console.error(e);
}

export default app;
