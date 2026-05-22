import swaggerJsdoc from "swagger-jsdoc";

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "My API Docs",
      version: "1.0.0",
    },
  },
  apis: ["./src/docs/*.yaml"], // Swagger will scan your route files
});
