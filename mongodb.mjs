import mongoose from 'mongoose';

const uri = `mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_PASS}@${process.env.MONGODB_CLUSTER}/?retryWrites=true&w=majority`;


async function run() {
    try {
        await mongoose.connect(uri, { dbName: process.env.MONGODB_DB_NAME });
    } catch (err) {
        console.error('Mongodb connection error', err);
        process.exit(1);
    }
}
run().catch(console.dir);

mongoose.connection.on('connected', () => { // connected
    console.info('Mongoose is connected');
});

mongoose.connection.on('disconnected', () => { // disconnected
    console.info('Mongoose is disconnected');
    process.exit(1);
});

mongoose.connection.on('error', (err) => { // any error
    console.info('Mongoose connection error: ', err);
    process.exit(1);
});

process.on('SIGINT', async () => { /// //this function will run jst before app is closing
    console.info('app is terminating');
    await mongoose.connection.close();

    console.info('Mongoose default connection closed');
    process.exit(0);
});

process.once('SIGUSR2', async () => {
    console.info('SIGUSR2 cleanup');
    await mongoose.connection.close();
    process.kill(process.pid, 'SIGUSR2');
});
