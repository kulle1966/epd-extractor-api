# Matelio GreenComplay EPD-Extractor API - Bruno Collection

Diese Bruno-Collection enthält alle notwendigen API-Tests für den EPD-Extractor.

## 🚀 Setup

1. **Bruno installieren:**
   ```bash
   # Via Winget
   winget install Bruno.Bruno
   
   # Via Chocolatey
   choco install bruno
   
   # Oder download: https://www.usebruno.com/
   ```

2. **Collection öffnen:**
   - Bruno starten
   - "Open Collection" wählen
   - Ordner `C:\DEV\Matelio_ki_showcase\bruno-api-tests` auswählen

## 📋 Verfügbare Tests

### 1. Health Check
- **URL:** `GET /api/health`
- **Zweck:** API-Status und Version prüfen
- **Erwartetes Ergebnis:** Status "healthy" + Versionsinformation

### 2. Extract EPD - Concrete
- **URL:** `POST /api/extract-epd`
- **Datei:** `2023-10-20-EPD-C8-10.pdf`
- **Erwartetes Ergebnis:** CO2-Wert ~0.047 kg CO2-eq/kg

### 3. Extract EPD - Door Handle
- **URL:** `POST /api/extract-epd`
- **Datei:** `V_202409_ECO_EPD_Door-and-window-handles.pdf`
- **Erwartetes Ergebnis:** CO2-Wert ~6.470 kg CO2-eq/kg

### 4. CORS Preflight Check
- **URL:** `OPTIONS /api/extract-epd`
- **Zweck:** CORS-Konfiguration testen

## 🎯 API-Endpoints

- **Base URL:** `https://epd-extractor-api-2025.azurewebsites.net`
- **Health:** `/api/health` (GET)
- **Extract:** `/api/extract-epd` (POST)
- **CORS:** Automatisch für alle Endpoints (OPTIONS)

## 🧪 Test Execution

1. **Einzeltest:** Request anklicken → "Send" drücken
2. **Alle Tests:** Collection rechtsklick → "Run"
3. **Automatisiert:** Bruno CLI für CI/CD

## 📊 Erwartete Antworten

### Health Check Response:
```json
{
  "status": "healthy",
  "version": "1.2.0-exact-local-prompts",
  "timestamp": "2025-10-23T...",
  "features": [...]
}
```

### EPD Extraction Response:
```json
{
  "success": true,
  "data": {
    "product_name": "...",
    "gwp": { "value": "...", "unit": "..." },
    "material_density": { "value": "...", "unit": "..." }
  },
  "carbonFootprintPerKg": {
    "value": "0.047",
    "unit": "kg CO2-eq/kg",
    "reason": "Calculated from GWP and material density"
  }
}
```

## 🔄 Environment Variables

Die Collection nutzt Environment Variables:
- `base_url`: API Base URL (Production Environment)

Weitere Environments können hinzugefügt werden (Development, Staging, etc.)