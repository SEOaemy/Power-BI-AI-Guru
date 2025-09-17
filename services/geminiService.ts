import { GoogleGenAI, Type } from "@google/genai";
import { DaxGenerationResponse, FileProfile, AIInsights, ColumnIssue, CleaningSuggestion, FullProfileResult, RelationshipSuggestion } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const model = "gemini-2.5-flash";

const daxResponseSchema = {
  type: Type.OBJECT,
  properties: {
    dax_formula: {
      type: Type.STRING,
      description: "The generated DAX formula. It should be a single line of valid DAX code."
    },
    explanation: {
      type: Type.STRING,
      description: "A clear, concise explanation of what the DAX formula does, how it works, and in what context it should be used. This should be aimed at a business user."
    },
    optimization_tips: {
        type: Type.STRING,
        description: "Provide 1-2 concise tips for optimizing this DAX formula or related performance considerations in Power BI."
    },
    common_pitfalls: {
        type: Type.STRING,
        description: "List 1-2 common pitfalls or mistakes users should be aware of when using this DAX formula or a similar pattern."
    }
  },
  required: ["dax_formula", "explanation", "optimization_tips", "common_pitfalls"]
};

const insightsResponseSchema = {
    type: Type.OBJECT,
    properties: {
        suggested_kpis: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "An array of 3-4 strings, each being a potential KPI based on the column names and stats."
        },
        data_quality_summary: {
            type: Type.STRING,
            description: "A brief paragraph (2-3 sentences) highlighting potential data quality issues or strengths, such as columns with many missing values or high cardinality."
        }
    },
    required: ["suggested_kpis", "data_quality_summary"]
};

const cleaningSuggestionsSchema = {
    type: Type.OBJECT,
    properties: {
        suggestions: {
            type: Type.ARRAY,
            description: "An array of suggested cleaning actions.",
            items: {
                type: Type.OBJECT,
                properties: {
                    action: {
                        type: Type.STRING,
                        enum: ['REMOVE_ROWS', 'FILL_MEAN', 'FILL_MEDIAN', 'FILL_MODE', 'FILL_CUSTOM', 'CHANGE_TYPE'],
                        description: "The programmatic action type."
                    },
                    description: {
                        type: Type.STRING,
                        description: "A user-friendly description of the action. E.g., 'Remove 15 rows with missing values'."
                    },
                    parameters: {
                        type: Type.OBJECT,
                        properties: {
                            value: { type: Type.STRING },
                            targetType: { type: Type.STRING, enum: ['number', 'string'] }
                        },
                        description: "Optional parameters for the action, e.g., a custom value for filling or a target data type."
                    }
                },
                required: ["action", "description"]
            }
        }
    },
    required: ["suggestions"]
};

const relationshipSuggestionsSchema = {
    type: Type.OBJECT,
    properties: {
        suggestions: {
            type: Type.ARRAY,
            description: "An array of suggested table relationships.",
            items: {
                type: Type.OBJECT,
                properties: {
                    fromTable: { type: Type.STRING },
                    fromColumn: { type: Type.STRING },
                    toTable: { type: Type.STRING },
                    toColumn: { type: Type.STRING },
                    type: { type: Type.STRING, enum: ['One-to-Many', 'Many-to-One', 'One-to-One', 'Many-to-Many'] },
                    confidence: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] },
                    reason: { type: Type.STRING }
                },
                required: ["fromTable", "fromColumn", "toTable", "toColumn", "type", "confidence", "reason"]
            }
        }
    },
    required: ["suggestions"]
};


export const generateDaxFromNaturalLanguage = async (prompt: string): Promise<DaxGenerationResponse> => {
  try {
    const systemInstruction = `You are an expert Power BI developer and DAX code generator. Your task is to take a user's request in natural language and convert it into a valid, efficient DAX (Data Analysis Expressions) formula.
    - Assume the user has a data model with tables and columns that are conventionally named (e.g., a 'Sales' table with 'Revenue' and 'OrderDate' columns, a 'Products' table with 'ProductName', etc.).
    - Generate a single, complete DAX formula.
    - The explanation should be simple enough for a beginner to understand.
    - Provide concise optimization tips and common pitfalls associated with the generated formula.
    - Return the response in the specified JSON format.`;

    const response = await ai.models.generateContent({
      model: model,
      contents: `User request: "${prompt}"`,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: daxResponseSchema,
        temperature: 0.2,
      },
    });

    const jsonText = response.text.trim();
    const parsedResponse = JSON.parse(jsonText);
    
    if (parsedResponse && parsedResponse.dax_formula && parsedResponse.explanation && parsedResponse.optimization_tips && parsedResponse.common_pitfalls) {
        return parsedResponse as DaxGenerationResponse;
    } else {
        throw new Error("Invalid JSON structure received from API.");
    }

  } catch (error) {
    console.error("Error generating DAX formula:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to generate DAX. Reason: ${error.message}`);
    }
    throw new Error("An unknown error occurred while generating the DAX formula.");
  }
};

export const generateInsightsFromProfile = async (profile: FileProfile, fileName: string): Promise<AIInsights> => {
    try {
        const systemInstruction = `You are an expert data analyst assisting a user with Power BI. Your task is to analyze a data profile summary and provide actionable insights in a specific JSON format.
        - The user has just uploaded a file and you need to give them a starting point for their analysis.
        - Based on the column names and stats, suggest potential Key Performance Indicators (KPIs).
        - Briefly summarize the data quality, pointing out potential issues like columns with a high number of missing values.
        - Keep the language clear and accessible for a business user.`;

        const prompt = `Here is a data profile for the file named "${fileName}":\n${JSON.stringify(profile, null, 2)}\n\nBased on this profile, please provide suggested KPIs and a data quality summary.`;

        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: insightsResponseSchema,
                temperature: 0.5,
            },
        });

        const jsonText = response.text.trim();
        const parsedResponse = JSON.parse(jsonText);

        if (parsedResponse && parsedResponse.suggested_kpis && parsedResponse.data_quality_summary) {
            return parsedResponse as AIInsights;
        } else {
            throw new Error("Invalid JSON structure received from AI for insights.");
        }

    } catch (error) {
        console.error("Error generating insights from profile:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to generate insights. Reason: ${error.message}`);
        }
        throw new Error("An unknown error occurred while generating insights.");
    }
};

export const generateCleaningSuggestions = async (issue: ColumnIssue): Promise<CleaningSuggestion[]> => {
    try {
        const systemInstruction = `You are a data cleaning expert for Power BI users. Based on a column's identified issue, provide a concise list of actionable cleaning suggestions in a specific JSON format.
        - For 'missing_values', suggest removing rows, filling with statistical measures (if plausible), and filling with a custom value.
        - For 'mixed_type', suggest changing the data type to 'number' or 'string'. When suggesting a change to 'number', explicitly mention in the description that non-numeric values will become empty/null.
        - The descriptions should be very clear and easy for a non-technical user to understand.`;

        let prompt = '';
        if (issue.issueType === 'missing_values') {
             prompt = `The column "${issue.columnName}" in the file "${issue.fileName}" has ${issue.details.missingCount} missing values out of ${issue.details.totalRows} total rows. Please provide cleaning suggestions.`;
        } else if (issue.issueType === 'mixed_type') {
            prompt = `The column "${issue.columnName}" in the file "${issue.fileName}" has a mixed data type (both numbers and text). It contains ${issue.details.nonNumericCount} non-numeric text values. Please provide suggestions to standardize the data type.`;
        } else {
            return []; // No prompt for unknown issue types
        }


        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: cleaningSuggestionsSchema,
                temperature: 0.4,
            },
        });

        const jsonText = response.text.trim();
        const parsedResponse = JSON.parse(jsonText);

        if (parsedResponse && parsedResponse.suggestions) {
            return parsedResponse.suggestions as CleaningSuggestion[];
        } else {
            throw new Error("Invalid JSON structure received from AI for cleaning suggestions.");
        }

    } catch (error) {
        console.error("Error generating cleaning suggestions:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to generate cleaning suggestions. Reason: ${error.message}`);
        }
        throw new Error("An unknown error occurred while generating cleaning suggestions.");
    }
};

export const generateRelationshipSuggestions = async (profiles: Record<string, FullProfileResult>): Promise<RelationshipSuggestion[]> => {
    const fileCount = Object.keys(profiles).length;
    if (fileCount < 2) {
        return []; // Cannot have relationships with only one file.
    }

    try {
        const systemInstruction = `You are a data modeling expert for Power BI. Your task is to analyze the schemas of multiple data tables (provided as JSON) and suggest logical relationships between them.
        - Identify pairs of columns across different tables that likely represent a relationship (e.g., primary key to foreign key).
        - Common patterns include matching names like 'ProductID' and 'Product_ID', or a table name prefix like 'products.ID' and 'sales.ProductID'.
        - Determine the most likely relationship type (One-to-Many, Many-to-One, etc.). A table with more unique values in the key column is likely the 'One' side.
        - Provide a confidence level and a brief reason for each suggestion.
        - Return the response in the specified JSON format.`;
        
        const simplifiedProfiles = Object.entries(profiles).map(([fileName, profile]) => ({
            tableName: fileName,
            columns: profile.columns.map(c => ({ name: c.name, uniqueValues: c.uniqueValues, dataType: c.dataType })),
            rowCount: profile.rowCount,
        }));

        const prompt = `Here are the schemas for ${fileCount} tables:\n${JSON.stringify(simplifiedProfiles, null, 2)}\n\nPlease suggest the relationships between them.`;

        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: relationshipSuggestionsSchema,
                temperature: 0.3,
            },
        });

        const jsonText = response.text.trim();
        const parsedResponse = JSON.parse(jsonText);

        if (parsedResponse && parsedResponse.suggestions) {
            return parsedResponse.suggestions as RelationshipSuggestion[];
        } else {
            throw new Error("Invalid JSON structure received from AI for relationship suggestions.");
        }

    } catch (error) {
        console.error("Error generating relationship suggestions:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to generate suggestions. Reason: ${error.message}`);
        }
        throw new Error("An unknown error occurred while generating relationship suggestions.");
    }
};