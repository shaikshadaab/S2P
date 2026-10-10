export type ImageEditingMode = 'DOCUMENT' | 'PORTRAIT' | 'ID_CARD' | 'GENERAL_PHOTO';

export type DocumentEnhanceMode = 'ORIGINAL' | 'COLOR_ENHANCED' | 'GRAYSCALE' | 'HIGH_CONTRAST';

export type PrintQualityLevel = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'LOW_RESOLUTION';

export type CropAspectRatioPreset =
  | 'FREE'
  | 'ORIGINAL'
  | '1:1'
  | '4:6'
  | 'A4'
  | 'PASSPORT_35X45'
  | 'PASSPORT_2X2'
  | 'STAMP_25X30';

export type BackgroundRemovalMode =
  | 'ORIGINAL'
  | 'TRANSPARENT'
  | 'WHITE'
  | 'LIGHT_BLUE'
  | 'OFF_WHITE'
  | 'CUSTOM';

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
  saturation?: number; // -50 to +50, default 0
  shadowReduction: number; // 0 to 100, default 30
  sharpen: number; // 0 to 100, default 20
  denoise?: number; // 0 to 100, default 0
  autoEnhanceStrength?: number; // 0 to 100
  scanMode?: boolean; // preserves faint writing & official marks
  upscale?: boolean; // 2x digital upscaling with honest disclosure
  straightenAngle: number; // -15 to +15, default 0
  rotation: 0 | 90 | 180 | 270;
  flipHorizontal?: boolean;
  flipVertical?: boolean;
  zoom?: number; // 1 to 3
  pan?: { x: number; y: number };
  cropAspectRatio?: CropAspectRatioPreset;
  cropBox?: { x: number; y: number; width: number; height: number }; // percentage 0-100
  perspectiveCorners?: PerspectiveCorners;
  perspectiveMode?: boolean; // true = 4-corner perspective warp, false = rectangular crop
  passportGuide?: boolean;
  backgroundMode?: BackgroundRemovalMode;
  customBackgroundColor?: string;
  edgeRefinement?: number; // 0 to 10 px edge feathering
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
