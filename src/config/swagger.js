import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Walletly API Documentation',
      version: '1.0.0',
      description: 'Comprehensive API documentation for the Walletly financial management application.',
      contact: {
        name: 'Walletly Support',
        email: 'support@walletly.com',
      },
    },
    servers: [
      {
        url: `https://apis-walletly-app.onrender.com`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.js', './src/routes/api/*.js', './src/routes/api/v1/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
