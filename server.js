const express = require('express');
const { app } = require('@azure/functions');
const swaggerUi = require('swagger-ui-express');

// Create Express app for local development
const expressApp = express();
const port = 7071;

// Enable CORS
expressApp.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// Swagger spec
const swaggerSpec = {
    openapi: '3.0.0',
    info: {
        title: 'EPD Extractor API',
        version: '1.2.0',
        description: 'Azure Functions API für die Extraktion von Environmental Product Declaration (EPD) Daten aus PDF-Dokumenten.',
    },
    servers: [
        {
            url: `http://localhost:${port}/api`,
            description: 'Local Development Server'
        }
    ],
    paths: {
        '/extract-epd': {
            post: {
                summary: 'EPD-Daten aus PDF extrahieren',
                description: 'Extrahiert Environmental Product Declaration Daten aus einem hochgeladenen PDF-Dokument',
                tags: ['EPD Extraction'],
                requestBody: {
                    required: true,
                    content: {
                        'multipart/form-data': {
                            schema: {
                                type: 'object',
                                required: ['pdf'],
                                properties: {
                                    pdf: {
                                        type: 'string',
                                        format: 'binary',
                                        description: 'PDF-Datei mit EPD-Daten'
                                    }
                                }
                            }
                        }
                    }
                },
                responses: {
                    '200': {
                        description: 'EPD-Daten erfolgreich extrahiert',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean' },
                                        data: { type: 'object' },
                                        carbonFootprintPerKg: { type: 'object' }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        '/health': {
            get: {
                summary: 'Health Check',
                description: 'Gibt den Gesundheitsstatus der API zurück',
                tags: ['Health'],
                responses: {
                    '200': {
                        description: 'API ist gesund',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        status: { type: 'string' },
                                        timestamp: { type: 'string' },
                                        version: { type: 'string' }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    tags: [
        {
            name: 'EPD Extraction',
            description: 'Operationen für die Extraktion von EPD-Daten'
        },
        {
            name: 'Health',
            description: 'API-Status und Health-Check-Endpunkte'
        }
    ]
};

// Swagger UI route
expressApp.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }'
}));

// OpenAPI JSON route
expressApp.get('/api/openapi.json', (req, res) => {
    res.json(swaggerSpec);
});

// Start server
expressApp.listen(port, () => {
    console.log(`🚀 EPD Extractor API with Swagger UI running at:`);
    console.log(`📊 Swagger Documentation: http://localhost:${port}/api/docs`);
    console.log(`📋 OpenAPI Spec: http://localhost:${port}/api/openapi.json`);
});

console.log('Express server configuration loaded successfully!');