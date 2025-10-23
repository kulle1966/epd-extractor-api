# 🚀 Deployment Anleitung - EPD-Extractor API

## 📋 Übersicht

Diese Anleitung beschreibt das Deployment der EPD-Extractor API auf Azure Functions.

## 🛠️ Voraussetzungen

### Lokale Tools
- Node.js 18+
- Azure CLI
- Azure Functions Core Tools v4
- Git

### Azure Resources
- Azure Functions App: `epd-extractor-api-2025`
- Resource Group: `epd-extractor-rg`
- Azure OpenAI Service
- Application Insights (optional)

## 🏗️ Erstmaliges Setup

### 1. Azure CLI Setup
```bash
# Login
az login

# Subscription setzen
az account set --subscription "your-subscription-id"

# Resource Group erstellen (falls nicht vorhanden)
az group create --name epd-extractor-rg --location "West Europe"
```

### 2. Azure Functions App erstellen
```bash
# Storage Account
az storage account create \
  --name epdextractorstorage \
  --resource-group epd-extractor-rg \
  --location "West Europe" \
  --sku Standard_LRS

# Function App
az functionapp create \
  --resource-group epd-extractor-rg \
  --consumption-plan-location "West Europe" \
  --runtime node \
  --runtime-version 18 \
  --functions-version 4 \
  --name epd-extractor-api-2025 \
  --storage-account epdextractorstorage
```

### 3. Environment Variables konfigurieren
```bash
az functionapp config appsettings set \
  --name epd-extractor-api-2025 \
  --resource-group epd-extractor-rg \
  --settings \
    AZURE_OPENAI_API_KEY="your-azure-openai-key" \
    AZURE_OPENAI_ENDPOINT="https://your-instance.openai.azure.com/"
```

## 📦 Deployment Methoden

### Methode 1: Azure Functions Core Tools (Recommended)

```bash
# Repository klonen
git clone <repository-url>
cd epd-extraction-api

# Dependencies installieren
npm install

# Deploy
func azure functionapp publish epd-extractor-api-2025
```

### Methode 2: GitHub Actions (CI/CD)

1. **Repository Secrets konfigurieren:**
   ```
   AZURE_FUNCTIONAPP_PUBLISH_PROFILE
   ```

2. **Publish Profile herunterladen:**
   ```bash
   az functionapp deployment list-publishing-profiles \
     --name epd-extractor-api-2025 \
     --resource-group epd-extractor-rg \
     --xml
   ```

3. **Push zu main branch:**
   ```bash
   git push origin main
   ```

### Methode 3: Azure CLI Deployment

```bash
# ZIP-Package erstellen
npm install --production
zip -r deployment.zip . -x "node_modules/.*" ".git/*" "*.log"

# Deploy
az functionapp deployment source config-zip \
  --name epd-extractor-api-2025 \
  --resource-group epd-extractor-rg \
  --src deployment.zip
```

## 🔧 Konfiguration

### CORS Setup
```bash
az functionapp cors add \
  --name epd-extractor-api-2025 \
  --resource-group epd-extractor-rg \
  --allowed-origins "https://happy-smoke-03817c603.5.azurestaticapps.net"
```

### Application Insights
```bash
# Application Insights erstellen
az monitor app-insights component create \
  --app epd-extractor-insights \
  --location "West Europe" \
  --resource-group epd-extractor-rg

# Function App verbinden
az functionapp config appsettings set \
  --name epd-extractor-api-2025 \
  --resource-group epd-extractor-rg \
  --settings APPINSIGHTS_INSTRUMENTATIONKEY="your-insights-key"
```

## ✅ Deployment Verification

### 1. Health Check
```bash
curl https://epd-extractor-api-2025.azurewebsites.net/api/health
```

**Erwartete Antwort:**
```json
{
  "status": "healthy",
  "version": "1.2.0-exact-local-prompts",
  "timestamp": "2025-10-23T..."
}
```

### 2. API Test
```bash
curl -X POST \
  -F "pdf=@test-epd.pdf" \
  https://epd-extractor-api-2025.azurewebsites.net/api/extract-epd
```

### 3. CORS Test
```bash
curl -H "Origin: https://happy-smoke-03817c603.5.azurestaticapps.net" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -X OPTIONS \
  https://epd-extractor-api-2025.azurewebsites.net/api/extract-epd
```

## 🔄 Rollback

### Letzte Version wiederherstellen
```bash
# Deployment Slots verwenden
az functionapp deployment slot swap \
  --name epd-extractor-api-2025 \
  --resource-group epd-extractor-rg \
  --slot staging \
  --target-slot production
```

### Spezifische Version deployen
```bash
# Git commit hash verwenden
git checkout <commit-hash>
func azure functionapp publish epd-extractor-api-2025
```

## 📊 Monitoring

### Logs anzeigen
```bash
# Live Logs
az webapp log tail \
  --name epd-extractor-api-2025 \
  --resource-group epd-extractor-rg

# Application Insights
# https://portal.azure.com -> Application Insights -> Logs
```

### Metriken überwachen
- **Invocations:** Anzahl API-Aufrufe
- **Duration:** Durchschnittliche Antwortzeit
- **Errors:** Fehlerrate und Typen
- **Availability:** Uptime und Health Checks

## 🚨 Troubleshooting

### Deployment Probleme

1. **"Function runtime is unable to start"**
   ```bash
   # Dependencies prüfen
   npm audit
   npm install --production
   ```

2. **"Host lock lease expired"**
   ```bash
   # Function App neustarten
   az functionapp restart \
     --name epd-extractor-api-2025 \
     --resource-group epd-extractor-rg
   ```

3. **"Missing API Key"**
   ```bash
   # Environment Variables prüfen
   az functionapp config appsettings list \
     --name epd-extractor-api-2025 \
     --resource-group epd-extractor-rg
   ```

### Performance Optimierung

1. **Cold Start reduzieren:**
   - Always On aktivieren (Premium Plan)
   - Deployment Slots nutzen
   - Function warming implementieren

2. **Memory/CPU optimieren:**
   ```bash
   # App Service Plan upgraden
   az functionapp plan update \
     --name epd-extractor-plan \
     --resource-group epd-extractor-rg \
     --sku P1V2
   ```

## 🔒 Sicherheit

### API Keys rotieren
```bash
# Neue OpenAI Keys setzen
az functionapp config appsettings set \
  --name epd-extractor-api-2025 \
  --resource-group epd-extractor-rg \
  --settings AZURE_OPENAI_API_KEY="new-key"
```

### Network Security
```bash
# IP Restrictions
az functionapp config access-restriction add \
  --name epd-extractor-api-2025 \
  --resource-group epd-extractor-rg \
  --rule-name "Frontend-Only" \
  --action Allow \
  --ip-address "frontend-ip-range"
```

## 📚 Weitere Ressourcen

- [Azure Functions Documentation](https://docs.microsoft.com/azure/azure-functions/)
- [Azure OpenAI Service](https://docs.microsoft.com/azure/cognitive-services/openai/)
- [GitHub Actions for Azure](https://docs.microsoft.com/azure/azure-functions/functions-how-to-github-actions)

---

**Last Updated:** 2025-10-23  
**Version:** 1.2.0