// ─── Schema: Type definitions ──────────────────────────────────────

export interface Device {
  id: string;
  label: string;
  width: number;
  height: number;
  cameraZoneRatio: number; // 0.0 to 1.0
}

export interface ConfigOption {
  v: string;
  l: string;
}

export interface ConfigField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'color' | 'range' | 'select';
  default: string | number;
  min?: number;
  max?: number;
  options?: ConfigOption[];
}

export interface ConfigGroup {
  group: string;
  fields: ConfigField[];
}

export type ElementType = 'text' | 'rectangle' | 'circle' | 'image' | 'video';

export interface CustomElement {
  type: ElementType;
  // Position
  x: number;
  y: number;
  // Size
  w?: number;
  h?: number;
  r?: number; // circle radius
  // Text
  text?: string;
  size?: number;
  color?: string;
  textAlign?: 'left' | 'center' | 'right';
  bold?: boolean;
  multiLine?: boolean;
  // Shape
  radius?: number;
  // Media
  fileName?: string;
  src?: string;
}

export interface UploadedFile {
  data: ArrayBuffer;
  mimeType: string;
  dataUrl: string;
  originalName: string;
}

export interface CardTemplate {
  id: string;
  icon: string;
  name: string;
  desc: string;
  config: ConfigGroup[];
  updater?: string;
  gen: ((cfg: Record<string, any>) => string) | null;
}
