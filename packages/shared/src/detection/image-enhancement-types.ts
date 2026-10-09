export type ImageEditingMode = 'DOCUMENT' | 'PORTRAIT' | 'ID_CARD' | 'GENERAL_PHOTO';

export type DocumentEnhanceMode = 'ORIGINAL' | 'COLOR_ENHANCED' | 'GRAYSCALE' | 'HIGH_CONTRAST';

export type PrintQualityLevel = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'LOW_RESOLUTION';

export interface PrintQualityReport {
  effectiveDpi: number;
  level: PrintQualityLevel;
  widthPx: number;
  heightPx: number;
  targetWidthMm: number;
  targetHeightMm: number;
  warningMessage: string | null;
  recommendation: string | null;
  isPrintable: boolean;
}

export interface CornerPoint {
  x: number; // 0 to 100 percentage
  y: number; // 0 to 100 percentage
}

export interface PerspectiveCorners {
  tl: CornerPoint;
  tr: CornerPoint;
  br: CornerPoint;
  bl: CornerPoint;
}

export interface ImageProcessingSettings {
  mode: ImageEditingMode;
  documentEnhanceMode: DocumentEnhanceMode;
  brightness: number; // -50 to +50, default 0
  contrast: number; // -50 to +50, default 0
  shadowReduction: number; // 0 to 100, default 30
  sharpen: number; // 0 to 100, default 20
  straightenAngle: number; // -15 to +15, default 0
  rotation: 0 | 90 | 180 | 270;
  cropBox?: { x: number; y: number; width: number; height: number }; // percentage 0-100
  perspectiveCorners?: PerspectiveCorners;
  passportGuide?: boolean;
  targetPhysicalMm?: { width: number; height: number };
}

export interface AutoDetectionResult {
  suggestedMode: ImageEditingMode;
  confidence: number;
  aspectRatio: number;
  detectedDimensions: { width: number; height: number };
  explanation: string;
  requiresManualChoice: boolean;
}
