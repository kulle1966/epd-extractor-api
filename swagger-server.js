const http = require('http');
const fs = require('fs');
const path = require('path');

const port = 7071;

// Swagger UI HTML template
const swaggerHTML = `
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
        .swagger-ui .info { margin: 50px 0; }
        .swagger-ui .info .title { font-size: 36px; color: #3b4151; }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5.10.3/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@5.10.3/swagger-ui-standalone-preset.js"></script>
    <script>
        window.onload = function() {
            const spec = {
                "openapi": "3.0.0",
                "info": {
                    "title": "EPD Extractor API",
                    "version": "1.2.0",
                    "description": "Azure Functions API für die Extraktion von Environmental Product Declaration (EPD) Daten aus PDF-Dokumenten."
                },
                "servers": [
                    {
                        "url": "http://localhost:7071/api",
                        "description": "Local Development Server"
                    }
                ],
                "paths": {
                    "/extract-epd": {
                        "post": {
                            "summary": "EPD-Daten aus PDF extrahieren",
                            "description": "Extrahiert Environmental Product Declaration Daten aus einem hochgeladenen PDF-Dokument",
                            "tags": ["EPD Extraction"],
                            "requestBody": {
                                "required": true,
                                "content": {
                                    "multipart/form-data": {
                                        "schema": {
                                            "type": "object",
                                            "required": ["pdf"],
                                            "properties": {
                                                "pdf": {
                                                    "type": "string",
                                                    "format": "binary",
                                                    "description": "PDF-Datei mit EPD-Daten"
                                                }
                                            }
                                        }
                                    }
                                }
                            },
                            "responses": {
                                "200": {
                                    "description": "EPD-Daten erfolgreich extrahiert",
                                    "content": {
                                        "application/json": {
                                            "schema": {
                                                "type": "object",
                                                "properties": {
                                                    "success": { "type": "boolean" },
                                                    "data": { 
                                                        "type": "object",
                                                        "description": "Extrahierte EPD-Daten"
                                                    },
                                                    "carbonFootprintPerKg": { 
                                                        "type": "object",
                                                        "description": "CO2-Fußabdruck pro Kilogramm"
                                                    }
                                                }
                                            }
                                        }
                                    }
                                },
                                "400": {
                                    "description": "Ungültiger Request"
                                },
                                "500": {
                                    "description": "Server-Fehler"
                                }
                            }
                        }
                    },
                    "/health": {
                        "get": {
                            "summary": "Health Check",
                            "description": "Gibt den Gesundheitsstatus der API zurück",
                            "tags": ["Health"],
                            "responses": {
                                "200": {
                                    "description": "API ist gesund",
                                    "content": {
                                        "application/json": {
                                            "schema": {
                                                "type": "object",
                                                "properties": {
                                                    "status": { "type": "string" },
                                                    "timestamp": { "type": "string" },
                                                    "version": { "type": "string" }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                "tags": [
                    {
                        "name": "EPD Extraction",
                        "description": "Operationen für die Extraktion von EPD-Daten aus PDF-Dokumenten"
                    },
                    {
                        "name": "Health",
                        "description": "API-Status und Health-Check-Endpunkte"
                    }
                ]
            };
            
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

// Create HTTP server
const server = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    const url = req.url;
    
    if (url === '/api/docs' || url === '/docs') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(swaggerHTML);
    } else if (url === '/api/openapi.json' || url === '/openapi.json') {
        const spec = {
            openapi: "3.0.0",
            info: {
                title: "EPD Extractor API",
                version: "1.2.0",
                description: "Azure Functions API für die Extraktion von Environmental Product Declaration (EPD) Daten aus PDF-Dokumenten."
            },
            servers: [
                { 
                    url: "https://epd-extractor-api-2025.azurewebsites.net/api", 
                    description: "Azure Production Server" 
                },
                { 
                    url: "http://localhost:7071/api", 
                    description: "Local Development Server" 
                }
            ],
            paths: {
                "/extract-epd": {
                    post: {
                        summary: "EPD-Daten aus PDF extrahieren",
                        tags: ["EPD Extraction"],
                        responses: { "200": { description: "Success" } }
                    }
                },
                "/health": {
                    get: {
                        summary: "Health Check",
                        tags: ["Health"],
                        responses: { "200": { description: "API ist gesund" } }
                    }
                }
            }
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(spec, null, 2));
    } else if (url === '/' || url === '/api') {
        res.writeHead(302, { 'Location': '/api/docs' });
        res.end();
    } else {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 - Not Found</h1><p><a href="/api/docs">Swagger Documentation</a></p>');
    }
});

server.listen(port, () => {
    console.log('🚀 EPD Extractor API - Swagger Documentation Server');
    console.log('================================================');
    console.log(`📊 Swagger UI:    http://localhost:${port}/api/docs`);
    console.log(`📋 OpenAPI Spec:  http://localhost:${port}/api/openapi.json`);
    console.log(`🏠 Root:          http://localhost:${port}/`);
    console.log('================================================');
    console.log('✅ Server läuft! Öffnen Sie http://localhost:7071/api/docs im Browser');
});

// Handle server errors
server.on('error', (err) => {
    console.error('Server Error:', err);
});