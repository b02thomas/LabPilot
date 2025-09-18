import OpenAI from "openai";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export interface ChemistryAnalysis {
  summary: string;
  flags: Array<{
    level: 'info' | 'warning' | 'critical';
    message: string;
    parameter: string;
    value: any;
    expectedRange?: string;
  }>;
  recommendations: string;
  confidence: number;
}

export class ChemistryExpertService {
  // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
  async analyzeChemicalData(
    data: any,
    analysisType: string,
    metadata?: any
  ): Promise<ChemistryAnalysis> {
    try {
      const prompt = `As a chemistry expert, analyze the following ${analysisType} data and provide a comprehensive evaluation. 

Data: ${JSON.stringify(data)}
Metadata: ${JSON.stringify(metadata || {})}

Please analyze for:
1. Data quality and integrity
2. Chemical parameters and their values
3. Any anomalies or out-of-specification results
4. Safety concerns or critical flags
5. Recommendations for next steps

Respond with JSON in this exact format:
{
  "summary": "Brief summary of findings",
  "flags": [
    {
      "level": "info|warning|critical",
      "message": "Description of the issue",
      "parameter": "Parameter name",
      "value": "Actual value",
      "expectedRange": "Expected range if applicable"
    }
  ],
  "recommendations": "Detailed recommendations",
  "confidence": 85
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: "You are an expert analytical chemist with decades of experience in chromatography, spectroscopy, and laboratory data analysis. Provide accurate, detailed chemical analysis."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      
      return {
        summary: result.summary || "Analysis completed",
        flags: Array.isArray(result.flags) ? result.flags : [],
        recommendations: result.recommendations || "No specific recommendations",
        confidence: Math.max(0, Math.min(100, result.confidence || 85))
      };
    } catch (error) {
      console.error("Error analyzing chemical data:", error);
      throw new Error("Failed to analyze chemical data: " + error.message);
    }
  }

  async answerChemistryQuestion(
    question: string,
    context?: any
  ): Promise<string> {
    try {
      const contextInfo = context ? `\n\nContext: ${JSON.stringify(context)}` : "";
      
      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: "You are a helpful chemistry expert assistant. Provide accurate, practical answers to chemistry questions. Focus on laboratory analysis, chromatography, spectroscopy, and analytical chemistry. Be concise but informative."
          },
          {
            role: "user",
            content: question + contextInfo
          }
        ],
      });

      return response.choices[0].message.content || "I couldn't generate a response. Please try again.";
    } catch (error) {
      console.error("Error answering chemistry question:", error);
      throw new Error("Failed to answer question: " + error.message);
    }
  }

  async generateAnalysisInsights(
    experiments: any[],
    timeframe: string = "recent"
  ): Promise<string> {
    try {
      const prompt = `Analyze the following laboratory experiments and provide insights about trends, patterns, and recommendations:

Experiments: ${JSON.stringify(experiments)}
Timeframe: ${timeframe}

Provide insights about:
1. Overall quality trends
2. Common issues or flags
3. Recommendations for process improvement
4. Any concerning patterns

Keep the response practical and actionable for lab managers.`;

      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: "You are a laboratory data analyst expert. Provide strategic insights and recommendations based on laboratory data trends."
          },
          {
            role: "user",
            content: prompt
          }
        ],
      });

      return response.choices[0].message.content || "No insights available.";
    } catch (error) {
      console.error("Error generating insights:", error);
      throw new Error("Failed to generate insights: " + error.message);
    }
  }
}

export const chemistryExpertService = new ChemistryExpertService();
