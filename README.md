# 🌱 Matelio GreenComplay EPD-Extractor API

Azure Functions API für die Extraktion von Umweltdaten aus Environmental Product Declarations (EPDs) mit Azure OpenAI Integration.

## 🚀 Features

- 📄 **PDF-Extraktion** - Automatische Textextraktion aus EPD-PDFs
- 🤖 **Azure OpenAI Integration** - Intelligente Datenextraktion mit GPT-4
- 📊 **CO2-Berechnung** - Automatische Berechnung von CO2-Äquivalenten pro kg Material
- 🌍 **CORS-Support** - Vollständige Frontend-Integration
- ⚡ **Serverless** - Azure Functions v4 für optimale Performance
- 🔒 **Sicherheit** - Sichere API-Key-Verwaltung
- 📈 **Monitoring** - Application Insights Integration

## 🏛️ Architektur

```
EPD PDF → Azure Functions → Azure OpenAI → Strukturierte Daten + CO2-Berechnung
```

### Komponenten:
- **Azure Functions v4** - Serverless API-Backend
- **Azure OpenAI Service** - GPT-4 für Datenextraktion
- **PDF-Parse** - PDF-Textextraktion
- **Smart CO2 Calculation** - Volumetrische und gewichtsbasierte Berechnungen

## 📋 API Endpoints

### 📚 API Documentation (Swagger UI)
```http
GET /api/docs
```
Vollständige interaktive API-Dokumentation mit Swagger UI.

### 📄 OpenAPI Specification
```http
GET /api/docs/swagger.json
```
OpenAPI 3.0 Spezifikation im JSON-Format.

### Health Check
```http
GET /api/health
```
**Response:**
```json
{
  "status": "healthy",
  "version": "1.2.0-exact-local-prompts",
  "timestamp": "2025-10-23T...",
  "features": [...]
}
```

### EPD Extraction
```http
POST /api/extract-epd
Content-Type: multipart/form-data

{
  "pdf": <EPD-PDF-File>
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "product_name": "Concrete C8/10",
    "functional_unit": "1 kg",
    "gwp": {
      "value": "47.0",
      "unit": "kg CO2-eq",
      "source": "Table 5.1"
    },
    "material_density": {
      "value": "1000",
      "unit": "kg/m³",
      "source": "Section 3.2"
    }
  },
  "carbonFootprintPerKg": {
    "value": "0.047",
    "unit": "kg CO2-eq/kg",
    "reason": "Calculated from GWP and material density",
    "calculation": "47.0 kg CO2-eq/m³ ÷ 1000 kg/m³ = 0.047 kg CO2-eq/kg"
  }
}
```

## 🔧 Setup & Development

### Voraussetzungen
- Node.js 18+ 
- Azure Functions Core Tools v4
- Azure CLI
- Azure OpenAI Service (GPT-4)

### Lokale Entwicklung

1. **Repository klonen:**
   ```bash
   git clone <repository-url>
   cd epd-extraction-api
   ```

2. **Dependencies installieren:**
   ```bash
   npm install
   ```

3. **Environment konfigurieren:**
   ```bash
   cp local.settings.json.example local.settings.json
   # Azure OpenAI API Key eintragen
   ```

4. **Lokal starten:**
   ```bash
   func start
   ```

API ist verfügbar unter: `http://localhost:7071`

### Environment Variables
```json
{
  "AZURE_OPENAI_API_KEY": "your-azure-openai-key",
  "AZURE_OPENAI_ENDPOINT": "https://your-instance.openai.azure.com/"
}
```

## 🚀 Deployment

### Azure Functions Deployment

1. **Azure Login:**
   ```bash
   az login
   ```

2. **Deploy:**
   ```bash
   func azure functionapp publish epd-extractor-api-2025
   ```

3. **Environment Variables setzen:**
   ```bash
   az functionapp config appsettings set \
     --name epd-extractor-api-2025 \
     --resource-group epd-extractor-rg \
     --settings AZURE_OPENAI_API_KEY="your-key"
   ```

### CI/CD Pipeline (GitHub Actions)

Das Repository enthält automatische Deployment-Pipelines:

```yaml
# .github/workflows/deploy-api.yml
name: Deploy Azure Functions API
on:
  push:
    branches: [main]
```

## 🧪 Testing

### Bruno API Client
Vollständige API-Tests sind verfügbar:
```bash
# Bruno installieren
winget install Bruno.Bruno

# Tests ausführen
# Collection öffnen: ./api-tests/
```

### Manuelle Tests
```bash
# Health Check
curl https://epd-extractor-api-2025.azurewebsites.net/api/health

# EPD Extraction
curl -X POST \
  -F "pdf=@path/to/epd-file.pdf" \
  https://epd-extractor-api-2025.azurewebsites.net/api/extract-epd
```

## 📊 Monitoring

### Application Insights
- **Traces:** Function-Ausführung und Performance
- **Errors:** Fehleranalyse und Debugging
- **Metrics:** API-Usage und Antwortzeiten

### Azure Portal Logs
```
https://portal.azure.com/#@/resource/.../logStream
```

## 🔬 Supported EPD Types

Die API kann verschiedene EPD-Formate verarbeiten:

- ✅ **Concrete/Beton** - Volumetrische Berechnung (kg/m³)
- ✅ **Metals/Metalle** - Gewichtsbasierte Berechnung (kg/kg)
- ✅ **Insulation/Dämmung** - Flächenbasierte Berechnung (kg/m²)
- ✅ **Generic Materials** - Adaptive Berechnungslogik

### Testdateien
```
- 2023-10-20-EPD-C8-10.pdf (Concrete)
- V_202409_ECO_EPD_Door-and-window-handles.pdf (Metal)
```

## 📈 Performance

- **Cold Start:** < 10 Sekunden
- **Warm Request:** < 3 Sekunden  
- **PDF Processing:** 10-30 Sekunden (abhängig von Größe)
- **Concurrent Users:** Bis zu 200 gleichzeitige Anfragen

## 🛠️ Troubleshooting

### Häufige Probleme

1. **"AZURE_OPENAI_API_KEY not configured"**
   - Environment Variable in Azure Functions setzen

2. **"PDF extraction failed"**
   - PDF-Format prüfen (nur echte PDFs, keine Scans)

3. **"Not calculable"**
   - EPD enthält keine verwertbaren GWP/Density-Daten

### Debug-Logs
```bash
# Azure CLI Logs
az webapp log tail --name epd-extractor-api-2025 --resource-group epd-extractor-rg

# Application Insights Query
# KustoQL in Azure Portal verwenden
```

## 🤝 Contributing

1. Fork des Repositories
2. Feature Branch erstellen (`git checkout -b feature/amazing-feature`)
3. Änderungen committen (`git commit -m 'Add amazing feature'`)
4. Branch pushen (`git push origin feature/amazing-feature`)
5. Pull Request erstellen

## 📄 License

MIT License - siehe [LICENSE](LICENSE) Datei.

## 🔗 Related Projects

- **Frontend:** [epd-frontend](https://github.com/kulle1966/epd-frontend)
- **Live Demo:** https://happy-smoke-03817c603.5.azurestaticapps.net
- **API Documentation:** [Bruno API Tests](./api-tests/)

## 📞 Support

Bei Fragen oder Problemen:
- 📧 Email: [support@matelio-greencomplay.com]
- 🐛 Issues: [GitHub Issues](../../issues)
- 📖 Docs: [Wiki](../../wiki)

---

**Powered by Azure Functions | Entwickelt für Matelio GreenComplay** 🌱