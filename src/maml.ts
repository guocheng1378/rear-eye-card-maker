// ─── MAML: XML generation with proper escaping ─────────────────────

import { Device, CustomElement } from './schema';

/** Escape for XML text content and attribute values */
export function escXml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '&#10;');
}

export interface MAMLGenOptions {
  cardName: string;
  device: Device;
  innerXml: string;         // Template-generated inner XML
  updater?: string;
  extraElements: CustomElement[];
  uploadedFiles: Record<string, any>;
}

/** Generate complete MAML XML */
export function generateMAML(opts: MAMLGenOptions): string {
  const { cardName, device, innerXml, updater, extraElements, uploadedFiles } = opts;
  const lines: string[] = [];

  // Widget root
  let widgetAttrs = `screenWidth="${device.width}" frameRate="0" scaleByDensity="false"`;
  if (updater) widgetAttrs += ` useVariableUpdater="${updater}"`;
  widgetAttrs += ` name="${escXml(cardName)}"`;
  lines.push(`<Widget ${widgetAttrs}>`);

  // Template inner content
  lines.push(innerXml);

  // Extra elements — wrapped in Group with camera offset
  if (extraElements.length > 0) {
    lines.push('  <Group x="#marginL" y="0">');
    for (const el of extraElements) {
      lines.push(renderExtraElement(el, uploadedFiles));
    }
    lines.push('  </Group>');
  }

  lines.push('</Widget>');
  return lines.join('\n');
}

function renderExtraElement(el: CustomElement, files: Record<string, any>): string {
  const pad = '    ';

  switch (el.type) {
    case 'text': {
      const textAttr = `text="${escXml(el.text || '')}"`;
      const align = el.textAlign && el.textAlign !== 'left' ? ` textAlign="${el.textAlign}"` : '';
      const ml = el.multiLine ? ' multiLine="true"' : '';
      const w = el.multiLine || (el.textAlign && el.textAlign !== 'left') ? ` w="${el.w || 200}"` : '';
      const bold = el.bold ? ' bold="true"' : '';
      return `${pad}<Text ${textAttr} x="${el.x}" y="${el.y}" size="${el.size}" color="${el.color}"${w}${align}${ml}${bold} />`;
    }
    case 'rectangle':
      return `${pad}<Rectangle x="${el.x}" y="${el.y}" w="${el.w}" h="${el.h}" fillColor="${el.color}"${el.radius ? ` cornerRadius="${el.radius}"` : ''} />`;
    case 'circle':
      return `${pad}<Circle x="${el.x}" y="${el.y}" r="${el.r}" fillColor="${el.color}" />`;
    case 'image': {
      const folder = el.src && files[el.src]?.mimeType?.startsWith('video/') ? 'videos' : 'images';
      const src = el.src ? `${folder}/${escXml(el.src)}` : '';
      return `${pad}<Image src="${src}" x="${el.x}" y="${el.y}" w="${el.w || 100}" h="${el.h || 100}" />`;
    }
    case 'video': {
      const src = el.src ? `videos/${escXml(el.src)}` : '';
      return `${pad}<Video src="${src}" x="${el.x}" y="${el.y}" w="${el.w || 240}" h="${el.h || 135}" autoPlay="true" loop="true" />`;
    }
    default:
      return '';
  }
}
