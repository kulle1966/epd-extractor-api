const { app } = require('@azure/functions');
const pdf = require('pdf-parse');
const fs = require('fs');

// Main app entry point for Azure Functions v4
app.setup({
    enableHttpStream: true,
});

// Helper function to extract text from PDF buffer
async function extractTextFromPDF(pdfBuffer) {
    try {
        const data = await pdf(pdfBuffer);
        return data.text;
    } catch (error) {
        console.error('PDF extraction error:', error);
        throw new Error('Failed to extract text from PDF');
    }
}

// Helper function to call Azure OpenAI API
async function callAzureOpenAI(prompt, systemMessage, context) {
    const endpoint = 'https://thinkai-aff6f5f8-aif.services.ai.azure.com/openai/deployments/gpt-4.1-mini/chat/completions?api-version=2024-02-15-preview';
    const apiKey = process.env.AZURE_OPENAI_API_KEY;

    if (!apiKey) {
        context.error('AZURE_OPENAI_API_KEY environment variable is not set');
        throw new Error('AZURE_OPENAI_API_KEY environment variable is not set');
    }

    context.log('Making Azure OpenAI API call...');
    context.log('Endpoint:', endpoint);
    context.log('API Key prefix:', apiKey.substring(0, 10) + '...');
    context.log('Prompt length:', prompt.length);
    context.log('System message:', systemMessage);

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': apiKey
            },
            body: JSON.stringify({
                messages: [
                    { role: 'system', content: systemMessage },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 4000,
                temperature: 0.1
            })
        });

        context.log('Azure OpenAI response status:', response.status);
        context.log('Azure OpenAI response headers:', JSON.stringify([...response.headers.entries()]));

        if (!response.ok) {
            const errorText = await response.text();
            context.error('Azure OpenAI API error response:', errorText);
            throw new Error(`Azure OpenAI API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        context.log('Azure OpenAI response received, choices:', data.choices?.length || 0);
        
        if (!data.choices || data.choices.length === 0) {
            context.error('No choices in Azure OpenAI response:', data);
            throw new Error('No choices returned from Azure OpenAI');
        }

        const content = data.choices[0].message.content;
        context.log('Azure OpenAI content length:', content.length);
        context.log('Azure OpenAI content preview:', content.substring(0, 200));

        return content;

    } catch (fetchError) {
        context.error('Fetch error when calling Azure OpenAI:', fetchError.message);
        context.error('Fetch error stack:', fetchError.stack);
        throw new Error(`Failed to call Azure OpenAI: ${fetchError.message}`);
    }
}

// Multi-pass EPD extraction function
async function extractEPDData(pdfText, fileName, context) {
    context.log('=== STARTING MULTI-PASS EPD EXTRACTION ===');
    context.log('PDF text length:', pdfText.length);
    context.log('File name:', fileName);
    
    try {
        // EXACT COPY from working local solution - Single Pass Extraction
        context.log('--- SINGLE PASS EXTRACTION (using exact local solution approach) ---');
        const extractionPrompt = `You are an expert Environmental Product Declaration (EPD) analyst. Extract ALL environmental impact data from the provided EPD document text.

CRITICAL INSTRUCTIONS:
1. Extract EXACT numerical values with their units
2. Look for data in tables, charts, and text descriptions
3. Search for alternative names/abbreviations for each indicator
4. If a value appears multiple times, use the most complete/official one
5. Return "Not found" only if absolutely no relevant data exists

REQUIRED EPD INDICATORS TO EXTRACT:
- Global Warming Potential (GWP, CO2-eq, Carbon footprint)
- Acidification Potential (AP, SO2-eq, Acid rain potential)
- Eutrophication Potential (EP, PO4-eq, Nutrient enrichment)
- Ozone Depletion Potential (ODP, CFC-11-eq)
- Photochemical Ozone Creation Potential (POCP, C2H4-eq, Smog formation)
- Abiotic Depletion Potential Elements (ADPE, Sb-eq, Mineral depletion)
- Abiotic Depletion Potential Fossil (ADPF, MJ, Fossil fuel depletion)
- Primary Energy Demand (PED, MJ, Energy consumption)
- Water Use (WU, m3, Water consumption)
- Land Use (LU, m2*year, Land occupation)

ADDITIONAL DATA TO EXTRACT:
- Product name and description
- Functional unit (what the values are per)
- Material density (kg/m³, g/cm³) if available
- Material weight per unit (kg/m², kg/piece, etc.)
- System boundaries (cradle-to-gate, cradle-to-grave, etc.)
- Reference study period
- EPD program operator
- Verification status
- Valid until date

OUTPUT FORMAT:
Return a JSON object with this exact structure:
{
  "product_name": "extracted name",
  "functional_unit": "per kg, per m2, etc.",
  "material_density": {"value": number, "unit": "kg/m³", "source": "table/text location"},
  "material_weight": {"value": number, "unit": "kg/m²", "source": "table/text location"},
  "gwp": {"value": number, "unit": "kg CO2-eq", "source": "table/text location"},
  "ap": {"value": number, "unit": "kg SO2-eq", "source": "table/text location"},
  "ep": {"value": number, "unit": "kg PO4-eq", "source": "table/text location"},
  "odp": {"value": number, "unit": "kg CFC-11-eq", "source": "table/text location"},
  "pocp": {"value": number, "unit": "kg C2H4-eq", "source": "table/text location"},
  "adpe": {"value": number, "unit": "kg Sb-eq", "source": "table/text location"},
  "adpf": {"value": number, "unit": "MJ", "source": "table/text location"},
  "ped": {"value": number, "unit": "MJ", "source": "table/text location"},
  "water_use": {"value": number, "unit": "m3", "source": "table/text location"},
  "land_use": {"value": number, "unit": "m2*year", "source": "table/text location"},
  "system_boundaries": "extracted boundaries",
  "epd_program": "program name",
  "valid_until": "date",
  "verification_status": "verified/not verified"
}

Use "Not found" for any indicator that cannot be located in the document.

DOCUMENT TEXT:
${pdfText}`;

        const extractionSystem = "You are an expert EPD analyst. Extract data precisely according to the specified JSON format. Return only valid JSON.";
        
        context.log('Calling Azure OpenAI with exact local solution prompt...');
        const finalResult = await callAzureOpenAI(extractionPrompt, extractionSystem, context);
        context.log('Extraction completed - Final result length:', finalResult.length);

        // Parse the final result
        context.log('--- PARSING FINAL RESULT ---');
        let parsedData;
        try {
            // Clean the response to extract JSON
            const jsonMatch = finalResult.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                context.log('JSON found in response, parsing...');
                parsedData = JSON.parse(jsonMatch[0]);
                context.log('JSON parsed successfully, keys:', Object.keys(parsedData));
            } else {
                context.log('ERROR: No valid JSON found in AI response');
                context.log('AI Response preview:', finalResult.substring(0, 500));
                throw new Error('No valid JSON found in response');
            }
        } catch (parseError) {
            context.error('JSON parsing error:', parseError.message);
            context.log('Raw response that failed to parse:', finalResult);
            throw new Error('Failed to parse extracted EPD data: ' + parseError.message);
        }

        // Format data similar to working solution
        context.log('--- FORMATTING DATA ---');
        const formattedData = formatAndStandardizeData(parsedData, context);
        context.log('Formatted data keys:', Object.keys(formattedData));

        // Calculate CO2 per kg using smart logic
        context.log('--- CALCULATING CO2 PER KG ---');
        const carbonFootprint = calculateCO2PerKgMaterial(formattedData, context);
        context.log('CO2 calculation result:', carbonFootprint);

        const result = {
            success: true,
            data: parsedData,
            formattedData: formattedData,
            carbonFootprintPerKg: carbonFootprint,
            metadata: {
                fileName: fileName,
                extractionTimestamp: new Date().toISOString(),
                textLength: pdfText.length,
                extractionMethod: 'multi-pass-chatgpt-style'
            }
        };

        context.log('=== EPD EXTRACTION COMPLETED SUCCESSFULLY ===');
        return result;

    } catch (error) {
        context.error('Error in extractEPDData:', error.message);
        context.error('Error stack:', error.stack);
        throw error;
    }
}

/**
 * Format and standardize extracted data - EXACT COPY FROM WORKING SOLUTION
 */
function formatAndStandardizeData(rawData, context) {
    const formatted = {};

    // Standard field mappings - EXACT COPY from working local solution
    const fieldMappings = {
        'product_name': 'Product Name',
        'functional_unit': 'Functional Unit',
        'material_density': 'Material Density',
        'material_weight': 'Material Weight',
        'gwp': 'Global Warming Potential',
        'ap': 'Acidification Potential', 
        'ep': 'Eutrophication Potential',
        'odp': 'Ozone Depletion Potential',
        'pocp': 'Photochemical Ozone Creation Potential',
        'adpe': 'Abiotic Depletion Potential (Elements)',
        'adpf': 'Abiotic Depletion Potential (Fossil)',
        'ped': 'Primary Energy Demand',
        'water_use': 'Water Use',
        'land_use': 'Land Use',
        'system_boundaries': 'System Boundaries',
        'epd_program': 'EPD Program',
        'valid_until': 'Valid Until',
        'verification_status': 'Verification Status'
    };

    for (const [key, label] of Object.entries(fieldMappings)) {
        if (rawData[key] && rawData[key] !== "Not found") {
            if (typeof rawData[key] === 'object' && rawData[key].value !== undefined) {
                // Structured data with value/unit
                formatted[label] = {
                    value: parseNumericValue(rawData[key].value),
                    unit: rawData[key].unit || '',
                    source: rawData[key].source || ''
                };
            } else {
                // Simple string data
                formatted[label] = {
                    value: rawData[key],
                    unit: '',
                    source: ''
                };
            }
        } else {
            formatted[label] = {
                value: 'Not found',
                unit: '',
                source: ''
            };
        }
    }

    context.log('Formatted field mappings completed');
    return formatted;
}

/**
 * Parse numeric values, handling various formats - EXACT COPY FROM WORKING SOLUTION
 */
function parseNumericValue(value) {
    if (typeof value === 'number') {
        return value;
    }
    
    if (typeof value === 'string') {
        // Remove common non-numeric characters but preserve decimal points and scientific notation
        const cleaned = value.replace(/[^\d.\-+eE]/g, '');
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? value : parsed;
    }
    
    return value;
}

// Smart CO2/kg calculation function - EXACT COPY FROM WORKING SOLUTION
function calculateCO2PerKgMaterial(formattedData, context) {
    try {
        context.log('=== CO2/kg Calculation Debug ===');
        context.log('Formatted Data:', formattedData);
        
        const gwpData = formattedData['Global Warming Potential'];
        const materialWeight = formattedData['Material Weight'];
        const materialDensity = formattedData['Material Density'];
        const functionalUnit = formattedData['Functional Unit'];

        context.log('GWP Data:', gwpData);
        context.log('Material Weight:', materialWeight);
        context.log('Material Density:', materialDensity);
        context.log('Functional Unit:', functionalUnit);

        // Check if we have GWP data
        if (!gwpData || gwpData.value === 'Not found' || !gwpData.value) {
            context.log('❌ No GWP data found');
            return {
                value: 'Not calculable',
                reason: 'Global Warming Potential not found',
                unit: 'kg CO2-eq/kg material'
            };
        }

        const gwpValue = parseNumericValue(gwpData.value);
        context.log('Parsed GWP Value:', gwpValue);
        
        if (typeof gwpValue !== 'number') {
            context.log('❌ Invalid GWP value');
            return {
                value: 'Not calculable',
                reason: 'Invalid GWP value',
                unit: 'kg CO2-eq/kg material'
            };
        }

        // Determine the functional unit to show correct calculation
        const funcUnitStr = functionalUnit?.value?.toLowerCase() || '';
        context.log('Functional Unit String:', funcUnitStr);

        // Smart decision based on units and functional unit
        // Priority 1: Check if we have density with m³ unit OR functional unit indicates m³
        const hasDensityM3 = materialDensity && materialDensity.value && materialDensity.value !== 'Not found' &&
            (materialDensity.unit?.includes('m³') || materialDensity.unit?.includes('m3') || funcUnitStr.includes('m³') || funcUnitStr.includes('m3'));
        
        // Priority 2: Check if we have weight with m² unit OR functional unit indicates m²  
        const hasWeightM2 = materialWeight && materialWeight.value && materialWeight.value !== 'Not found' &&
            (materialWeight.unit?.includes('m²') || materialWeight.unit?.includes('m2') || 
             (!hasDensityM3 && (funcUnitStr.includes('m²') || funcUnitStr.includes('m2'))));

        context.log('Has Density M3:', hasDensityM3);
        context.log('Has Weight M2:', hasWeightM2);

        // Use density calculation for volume-based materials (per m³)
        if (hasDensityM3) {
            const densityValue = parseNumericValue(materialDensity.value);
            context.log('Material Density Value:', densityValue);
            context.log('Material Density Unit:', materialDensity.unit);
            
            if (typeof densityValue === 'number' && densityValue > 0) {
                const co2PerKg = gwpValue / densityValue;
                context.log('✅ CALCULATION SUCCESS (using density for m³)!');
                context.log(`${gwpValue} ÷ ${densityValue} = ${co2PerKg}`);
                
                return {
                    value: Math.round(co2PerKg * 1000) / 1000,
                    reason: 'Calculated using material density (volume-based)',
                    unit: 'kg CO2-eq/kg material',
                    calculation: `${gwpValue} kg CO2-eq/m³ ÷ ${densityValue} kg/m³ = ${co2PerKg.toFixed(3)} kg CO2-eq/kg`
                };
            }
        }

        // Use weight calculation for area-based materials (per m²)
        if (hasWeightM2) {
            const weightValue = parseNumericValue(materialWeight.value);
            context.log('Material Weight Value:', weightValue);
            context.log('Material Weight Unit:', materialWeight.unit);
            
            if (typeof weightValue === 'number' && weightValue > 0) {
                const co2PerKg = gwpValue / weightValue;
                context.log('✅ CALCULATION SUCCESS (using weight for m²)!');
                context.log(`${gwpValue} ÷ ${weightValue} = ${co2PerKg}`);
                
                return {
                    value: Math.round(co2PerKg * 1000) / 1000,
                    reason: 'Calculated using material weight (area-based)',
                    unit: 'kg CO2-eq/kg material',
                    calculation: `${gwpValue} kg CO2-eq/m² ÷ ${weightValue} kg/m² = ${co2PerKg.toFixed(3)} kg CO2-eq/kg`
                };
            }
        }

        // Fallback: Try any available data
        if (materialDensity && materialDensity.value && materialDensity.value !== 'Not found') {
            const densityValue = parseNumericValue(materialDensity.value);
            if (typeof densityValue === 'number' && densityValue > 0) {
                const co2PerKg = gwpValue / densityValue;
                return {
                    value: Math.round(co2PerKg * 1000) / 1000,
                    reason: 'Calculated using available density data',
                    unit: 'kg CO2-eq/kg material',
                    calculation: `${gwpValue} kg CO2-eq/m³ ÷ ${densityValue} kg/m³ = ${co2PerKg.toFixed(3)} kg CO2-eq/kg`
                };
            }
        }

        if (materialWeight && materialWeight.value && materialWeight.value !== 'Not found') {
            const weightValue = parseNumericValue(materialWeight.value);
            if (typeof weightValue === 'number' && weightValue > 0) {
                const co2PerKg = gwpValue / weightValue;
                return {
                    value: Math.round(co2PerKg * 1000) / 1000,
                    reason: 'Calculated using available weight data',
                    unit: 'kg CO2-eq/kg material',
                    calculation: `${gwpValue} kg CO2-eq/m² ÷ ${weightValue} kg/m² = ${co2PerKg.toFixed(3)} kg CO2-eq/kg`
                };
            }
        }

        context.log('❌ No suitable calculation method found');
        return {
            value: 'Not calculable',
            reason: `No valid material density or weight data found`,
            unit: 'kg CO2-eq/kg material'
        };

    } catch (error) {
        context.error('❌ CO2/kg calculation error:', error);
        return {
            value: 'Calculation error',
            reason: error.message,
            unit: 'kg CO2-eq/kg material'
        };
    }
}

// HTTP trigger for EPD extraction
app.http('extractEPD', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'extract-epd',
    handler: async (request, context) => {
        context.log('=== EPD EXTRACTION REQUEST START ===');
        context.log('Request method:', request.method);
        context.log('Request headers:', JSON.stringify(request.headers, null, 2));

        try {
            // Parse multipart form data
            const contentType = request.headers.get('content-type') || '';
            context.log('Content-Type:', contentType);
            
            if (!contentType.includes('multipart/form-data')) {
                context.log('ERROR: Invalid content type');
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        error: 'Content-Type must be multipart/form-data',
                        received: contentType
                    }
                };
            }

            context.log('Step 1: Parsing form data...');
            // Get the PDF file from the request
            const formData = await request.formData();
            context.log('Form data parsed successfully');
            
            const file = formData.get('pdf');
            context.log('File from form data:', file ? 'Found' : 'Not found');
            
            if (!file) {
                context.log('ERROR: No PDF file in form data');
                context.log('Available form fields:', Array.from(formData.keys()));
                return {
                    status: 400,
                    jsonBody: {
                        success: false,
                        error: 'No PDF file provided',
                        availableFields: Array.from(formData.keys())
                    }
                };
            }

            // Convert file to buffer
            context.log('Step 2: Converting file to buffer...');
            const pdfBuffer = Buffer.from(await file.arrayBuffer());
            const fileName = file.name || 'uploaded-epd.pdf';
            context.log(`File processed: ${fileName}, Size: ${pdfBuffer.length} bytes`);

            // Extract text from PDF
            context.log('Step 3: Extracting text from PDF...');
            const pdfText = await extractTextFromPDF(pdfBuffer);
            context.log(`Text extraction completed. Length: ${pdfText.length} characters`);
            context.log('First 200 characters:', pdfText.substring(0, 200));

            // Check if we have Azure OpenAI API key
            context.log('Step 4: Checking Azure OpenAI configuration...');
            const apiKey = process.env.AZURE_OPENAI_API_KEY;
            if (!apiKey) {
                context.log('ERROR: AZURE_OPENAI_API_KEY not found');
                return {
                    status: 500,
                    jsonBody: {
                        success: false,
                        error: 'Azure OpenAI API key not configured'
                    }
                };
            }
            context.log('Azure OpenAI API key found:', apiKey.substring(0, 10) + '...');

            // Extract EPD data using multi-pass approach
            context.log('Step 5: Starting EPD data extraction...');
            const result = await extractEPDData(pdfText, fileName, context);
            
            context.log('=== EPD EXTRACTION COMPLETED SUCCESSFULLY ===');
            context.log('Result summary:', {
                success: result.success,
                dataKeys: Object.keys(result.data || {}),
                carbonFootprint: result.carbonFootprintPerKg?.value
            });

            return {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                },
                jsonBody: result
            };

        } catch (error) {
            context.error('=== EPD EXTRACTION ERROR ===');
            context.error('Error message:', error.message);
            context.error('Error stack:', error.stack);
            
            return {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                jsonBody: {
                    success: false,
                    error: error.message || 'Internal server error',
                    errorType: error.constructor.name,
                    timestamp: new Date().toISOString()
                }
            };
        }
    }
});

// Health check endpoint
app.http('health', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'health',
    handler: async (request, context) => {
        return {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            jsonBody: {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                version: '1.2.0-exact-local-prompts',
                deployedAt: '2025-10-23T10:55:00Z',
                features: [
                    'Working solution CO2 calculation',
                    'Formatted data structure',
                    'parseNumericValue function',
                    'Fixed nested data mapping'
                ]
            }
        };
    }
});

// OPTIONS handler for CORS
app.http('options', {
    methods: ['OPTIONS'],
    authLevel: 'anonymous',
    route: '{*path}',
    handler: async (request, context) => {
        return {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'Access-Control-Max-Age': '86400'
            }
        };
    }
});

module.exports = { app };