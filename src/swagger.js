const { app } = require('@azure/functions');
const fs = require('fs');
const path = require('path');

// OpenAPI Specification as JavaScript object (no external YAML file needed)
const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'EPD Extractor API',
    version: '1.2.0',
    description: 'Azure Functions API für die Extraktion von Environmental Product Declaration (EPD) Daten aus PDF-Dokumenten.',
  },
  servers: [
    {
      url: 'https://epd-extractor-api-2025.azurewebsites.net/api',
      description: 'Azure Production Server'
    },
    {
      url: 'http://localhost:7071/api',
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

// Swagger UI Endpoint
app.http('swagger', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'docs',
    handler: async (request, context) => {
        context.log('Swagger UI requested');

        // Custom Swagger UI HTML
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>EPD Extractor API - Swagger UI</title>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.10.3/swagger-ui.css">
    <style>
        html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
        *, *:before, *:after { box-sizing: inherit; }
        body { margin:0; padding:0; }
        .topbar { display: none; }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5.10.3/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@5.10.3/swagger-ui-standalone-preset.js"></script>
    <script>
        window.onload = function() {
            const spec = ${JSON.stringify(openApiSpec)};
            const ui = SwaggerUIBundle({
                spec: spec,
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIStandalonePreset
                ],
                plugins: [
                    SwaggerUIBundle.plugins.DownloadUrl
                ],
                layout: "StandaloneLayout",
                tryItOutEnabled: true
            });
            window.ui = ui;
        };
    </script>
</body>
</html>`;

        return {
            status: 200,
            headers: {
                'Content-Type': 'text/html',
                'Access-Control-Allow-Origin': '*'
            },
            body: html
        };
    }
});

// OpenAPI JSON Endpoint
app.http('openapi', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'openapi.json',
    handler: async (request, context) => {
        context.log('OpenAPI spec requested');

        return {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            jsonBody: openApiSpec
        };
    }
});