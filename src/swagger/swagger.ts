import swaggerJsdoc from 'swagger-jsdoc';

import { env } from '@config/env';

const swaggerDefinition: swaggerJsdoc.OAS3Definition = {
  openapi: '3.0.0',
  info: {
    title: 'WeOur Matrimony API',
    version: '0.1.0',
    description: 'REST API for the WeOur Matrimony platform (Ionic Angular + Node/Express + MongoDB).',
  },
  servers: [{ url: `http://localhost:${env.PORT}${env.API_BASE_PATH}` }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  security: [{ bearerAuth: [] }],
};

export const swaggerSpec = swaggerJsdoc({
  definition: swaggerDefinition,
  apis: ['./src/routes/**/*.ts', './src/dto/**/*.ts'],
});
