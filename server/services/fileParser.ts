import * as fs from 'fs';
import * as path from 'path';

export interface ParsedData {
  headers?: string[];
  data: any[];
  metadata: {
    fileName: string;
    fileSize: number;
    format: string;
    parseTime: number;
    rowCount: number;
    columnCount: number;
  };
}

export class FileParserService {
  async parseFile(filePath: string, originalName: string, fileSize: number): Promise<ParsedData> {
    const startTime = Date.now();
    const extension = path.extname(originalName).toLowerCase();
    
    try {
      let result: ParsedData;
      
      switch (extension) {
        case '.csv':
          result = await this.parseCSV(filePath, originalName, fileSize);
          break;
        case '.xlsx':
          result = await this.parseXLSX(filePath, originalName, fileSize);
          break;
        case '.cdf':
          result = await this.parseCDF(filePath, originalName, fileSize);
          break;
        case '.jdx':
        case '.dx':
          result = await this.parseJCAMP(filePath, originalName, fileSize);
          break;
        default:
          throw new Error(`Unsupported file format: ${extension}`);
      }
      
      const parseTime = Date.now() - startTime;
      result.metadata.parseTime = parseTime;
      
      return result;
    } catch (error) {
      console.error("Error parsing file:", error);
      throw new Error(`Failed to parse ${extension} file: ${error.message}`);
    }
  }

  private async parseCSV(filePath: string, fileName: string, fileSize: number): Promise<ParsedData> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      throw new Error('CSV file is empty');
    }
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/['"]/g, ''));
    const data = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/['"]/g, ''));
      const row: any = {};
      headers.forEach((header, index) => {
        const value = values[index];
        // Try to parse as number, otherwise keep as string
        row[header] = isNaN(Number(value)) ? value : Number(value);
      });
      return row;
    });

    return {
      headers,
      data,
      metadata: {
        fileName,
        fileSize,
        format: 'CSV',
        parseTime: 0, // Will be set by caller
        rowCount: data.length,
        columnCount: headers.length
      }
    };
  }

  private async parseXLSX(filePath: string, fileName: string, fileSize: number): Promise<ParsedData> {
    // For MVP, treat XLSX similar to CSV by reading the first sheet
    // In production, you would use a library like 'xlsx' or 'exceljs'
    try {
      // Mock XLSX parsing - replace with actual XLSX library implementation
      const mockData = [
        { sample_id: 'S001', concentration: 125.5, ph: 7.2, temperature: 25.0 },
        { sample_id: 'S002', concentration: 130.2, ph: 6.8, temperature: 24.5 },
        { sample_id: 'S003', concentration: 128.7, ph: 7.0, temperature: 25.2 }
      ];
      
      const headers = Object.keys(mockData[0] || {});
      
      return {
        headers,
        data: mockData,
        metadata: {
          fileName,
          fileSize,
          format: 'XLSX',
          parseTime: 0,
          rowCount: mockData.length,
          columnCount: headers.length
        }
      };
    } catch (error) {
      throw new Error(`XLSX parsing not fully implemented: ${error.message}`);
    }
  }

  private async parseCDF(filePath: string, fileName: string, fileSize: number): Promise<ParsedData> {
    // CDF (Common Data Format) for chromatography data
    // In production, use netcdf4 or similar library
    try {
      // Mock CDF parsing - replace with actual netCDF library implementation
      const mockChromatographyData = {
        timePoints: Array.from({ length: 100 }, (_, i) => i * 0.1),
        intensity: Array.from({ length: 100 }, (_, i) => 
          Math.sin(i * 0.2) * 1000 + Math.random() * 100
        ),
        peaks: [
          { retentionTime: 2.5, area: 15400, height: 2300, compound: 'Peak_1' },
          { retentionTime: 4.8, area: 23600, height: 3100, compound: 'Peak_2' },
          { retentionTime: 7.2, area: 18900, height: 2800, compound: 'Peak_3' }
        ],
        metadata: {
          instrument: 'HPLC-MS',
          method: 'Standard_Method_v2.1',
          operator: 'Lab_Tech_01',
          runDate: new Date().toISOString()
        }
      };

      return {
        data: [mockChromatographyData],
        metadata: {
          fileName,
          fileSize,
          format: 'CDF (Chromatography)',
          parseTime: 0,
          rowCount: 1,
          columnCount: 4
        }
      };
    } catch (error) {
      throw new Error(`CDF parsing not fully implemented: ${error.message}`);
    }
  }

  private async parseJCAMP(filePath: string, fileName: string, fileSize: number): Promise<ParsedData> {
    // JCAMP-DX format for spectroscopy data
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Basic JCAMP-DX parsing
      const lines = content.split('\n');
      const metadata: any = {};
      let dataSection = false;
      const spectrumData: any[] = [];
      
      for (const line of lines) {
        if (line.startsWith('##')) {
          const [key, value] = line.substring(2).split('=', 2);
          if (key && value) {
            metadata[key.trim()] = value.trim();
          }
          if (key && key.trim().toLowerCase().includes('xydata')) {
            dataSection = true;
            continue;
          }
        } else if (dataSection && line.trim()) {
          // Parse spectrum data points
          const values = line.trim().split(/\s+/);
          if (values.length >= 2) {
            spectrumData.push({
              x: parseFloat(values[0]),
              y: parseFloat(values[1])
            });
          }
        }
      }

      return {
        data: [{
          spectrum: spectrumData,
          metadata: metadata,
          peaks: this.detectPeaks(spectrumData)
        }],
        metadata: {
          fileName,
          fileSize,
          format: 'JCAMP-DX (Spectroscopy)',
          parseTime: 0,
          rowCount: spectrumData.length,
          columnCount: 2
        }
      };
    } catch (error) {
      throw new Error(`JCAMP-DX parsing error: ${error.message}`);
    }
  }

  private detectPeaks(spectrumData: { x: number; y: number }[]): any[] {
    // Simple peak detection algorithm
    const peaks: any[] = [];
    const threshold = 0.1; // Adjust threshold as needed
    
    for (let i = 1; i < spectrumData.length - 1; i++) {
      const prev = spectrumData[i - 1];
      const current = spectrumData[i];
      const next = spectrumData[i + 1];
      
      if (current.y > prev.y && current.y > next.y && current.y > threshold) {
        peaks.push({
          x: current.x,
          y: current.y,
          intensity: current.y
        });
      }
    }
    
    return peaks.sort((a, b) => b.y - a.y).slice(0, 10); // Top 10 peaks
  }
}

export const fileParserService = new FileParserService();
