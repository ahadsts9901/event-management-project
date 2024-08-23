import swaggerJsdoc from 'swagger-jsdoc';

const options = {
    swaggerDefinition: {
        swagger: '2.0',
        info: {
            title: 'Progziel Event Management Task  Documentation',
            version: '1.0.0',
            description: 'Documentation for Event Management Backend',
        },
    },
    apis: ['./v1Routes/*.mjs'],
};

const specs = swaggerJsdoc(options);

export default specs;
