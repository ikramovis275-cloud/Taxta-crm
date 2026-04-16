const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'Taxta CRM API',
      version: '1.0.0',
      description: 'Yog\'och savdosi CRM tizimi API hujjatlari',
      contact: {
        name: 'Taxta Admin'
      },
      servers: [{ url: 'http://localhost:5000/api' }]
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [{ bearerAuth: [] }]
  },
  apis: ['./src/routes/*.js'] // In reality, we might need documented comments in controllers/routes
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

module.exports = {
  swaggerUi,
  swaggerDocs
};
