// ─── Preview: HTML rendering from template config ──────────────────

import { Device, CustomElement, UploadedFile } from './schema';
import { cameraZoneWidth } from './devices';

const PREVIEW_WIDTH = 420;

export class PreviewRenderer {
  private scale: number;
  private camW: number;

  constructor(
    private device: Device,
    private showCamera: boolean,
  ) {
    this.scale = PREVIEW_WIDTH / device.width;
    this.camW = showCamera ? PREVIEW_WIDTH * device.cameraZoneRatio : 0;
  }

  /** Render the clock template */
  renderClock(cfg: Record<string, any>): string {
    const now = new Date();
    const timeStr = this.formatTime(now, cfg.timeFormat);
    const dateStr = this.formatDate(now, cfg.dateFormat);

    const timeFontSize = Math.round(Number(cfg.timeSize) * this.scale);
    const dateY = Math.round(30 + timeFontSize + 6 * this.scale);

    return this.withBg(cfg.bgColor, `
      <div style="position:absolute;left:${this.camW + 10}px;top:30px;font-size:${timeFontSize}px;color:${cfg.timeColor};font-weight:700;letter-spacing:1px">${this.esc(timeStr)}</div>
      <div style="position:absolute;left:${this.camW + 10}px;top:${dateY}px;font-size:${Math.round(20 * this.scale)}px;color:${cfg.dateColor}">${this.esc(dateStr)}</div>
    `);
  }

  /** Render the quote template */
  renderQuote(cfg: Record<string, any>): string {
    const lines = String(cfg.text).split('\n');
    return this.withBg(cfg.bgColor, `
      <div style="position:absolute;left:${this.camW + 10}px;top:24px;right:10px;font-size:${Math.round(Number(cfg.textSize) * this.scale)}px;color:${cfg.textColor};line-height:1.4">${lines.map(l => this.esc(l)).join('<br>')}</div>
      <div style="position:absolute;left:${this.camW + 10}px;bottom:20px;font-size:${Math.round(16 * this.scale)}px;color:${cfg.authorColor}">${this.esc(cfg.author)}</div>
    `);
  }

  /** Render the battery template */
  renderBattery(cfg: Record<string, any>): string {
    const level = 78; // Demo value for preview
    const barWidth = PREVIEW_WIDTH - this.camW - 20;
    let status = '电量充足';
    if (level < 20) status = '电量极低';
    else if (level < 80) status = '电量偏低';

    return this.withBg(cfg.bgColor, `
      <div style="position:absolute;left:${this.camW + 10}px;top:20px;font-size:${Math.round(18 * this.scale)}px;color:${cfg.textColor};opacity:0.6">电量</div>
      <div style="position:absolute;left:${this.camW + 10}px;top:42px;font-size:${Math.round(56 * this.scale)}px;color:${cfg.textColor};font-weight:700">${level}%</div>
      <div style="position:absolute;left:${this.camW + 10}px;top:110px;width:${barWidth}px;height:7px;background:#333;border-radius:4px">
        <div style="width:${level}%;height:100%;background:${cfg.barColor};border-radius:4px"></div>
      </div>
      <div style="position:absolute;left:${this.camW + 10}px;top:126px;font-size:${Math.round(16 * this.scale)}px;color:${cfg.textColor};opacity:0.5">${status}</div>
    `);
  }

  /** Render the status template */
  renderStatus(cfg: Record<string, any>): string {
    const items = [cfg.item1, cfg.item2, cfg.item3, cfg.item4].filter(Boolean);
    return this.withBg(cfg.bgColor, `
      <div style="position:absolute;left:${this.camW + 6}px;top:18px;display:flex;align-items:center;gap:6px">
        <div style="width:3px;height:${Math.round(24 * this.scale)}px;background:${cfg.accentColor};border-radius:2px"></div>
        <span style="font-size:${Math.round(22 * this.scale)}px;color:${cfg.textColor};font-weight:600">${this.esc(cfg.title)}</span>
      </div>
      ${items.map((t, i) => `<div style="position:absolute;left:${this.camW + 16}px;top:${50 + i * Math.round(40 * this.scale)}px;font-size:${Math.round(16 * this.scale)}px;color:${cfg.textColor};opacity:0.8">${this.esc(t)}</div>`).join('')}
    `);
  }

  /** Render the countdown template */
  renderCountdown(cfg: Record<string, any>): string {
    const diff = this.calcCountdownDiff(cfg.targetDate);
    return this.withBg(cfg.bgColor, `
      <div style="position:absolute;left:${this.camW + 10}px;top:20px;font-size:${Math.round(18 * this.scale)}px;color:${cfg.textColor};opacity:0.6">${this.esc(cfg.eventName)}</div>
      <div style="position:absolute;left:${this.camW + 10}px;top:44px;font-size:${Math.round(72 * this.scale)}px;color:${cfg.accentColor};font-weight:700">${diff}</div>
      <div style="position:absolute;left:${this.camW + 10}px;top:${Math.round(44 + 72 * this.scale + 4)}px;font-size:${Math.round(20 * this.scale)}px;color:${cfg.textColor};opacity:0.5">天</div>
    `);
  }

  /** Render the music template */
  renderMusic(cfg: Record<string, any>): string {
    const boxSize = Math.round(48 * this.scale);
    const boxRadius = Math.round(12 * this.scale);
    const iconSize = Math.round(28 * this.scale);
    const afterBox = 18 + boxSize + 10;

    return this.withBg(cfg.bgColor, `
      <div style="position:absolute;left:${this.camW + 10}px;top:18px;display:flex;gap:8px;align-items:center">
        <div style="width:${boxSize}px;height:${boxSize}px;background:${cfg.accentColor};border-radius:${boxRadius}px;display:flex;align-items:center;justify-content:center;font-size:${iconSize}px;color:#fff">♪</div>
        <span style="font-size:${Math.round(12 * this.scale)}px;color:${cfg.accentColor}">正在播放</span>
      </div>
      <div style="position:absolute;left:${this.camW + 10}px;top:${afterBox}px;font-size:${Math.round(24 * this.scale)}px;color:${cfg.titleColor};font-weight:600">${this.esc(cfg.songName)}</div>
      <div style="position:absolute;left:${this.camW + 10}px;top:${afterBox + Math.round(28 * this.scale)}px;font-size:${Math.round(16 * this.scale)}px;color:${cfg.artistColor}">${this.esc(cfg.artistName)}</div>
      <div style="position:absolute;left:${this.camW + 10}px;right:10px;top:${afterBox + Math.round(50 * this.scale)}px;height:2px;background:#333;border-radius:1px">
        <div style="width:40%;height:100%;background:${cfg.accentColor};border-radius:1px"></div>
      </div>
    `);
  }

  /** Render the gradient template */
  renderGradient(cfg: Record<string, any>): string {
    const lines = String(cfg.text).split('\n');
    return `
      <div style="position:absolute;left:0;top:0;width:50%;height:100%;background:${cfg.bgColor1}"></div>
      <div style="position:absolute;left:50%;top:0;width:50%;height:100%;background:${cfg.bgColor2};opacity:0.7"></div>
      <div style="position:absolute;left:${this.camW}px;right:0;top:30%;text-align:center;font-size:${Math.round(Number(cfg.textSize) * this.scale)}px;color:${cfg.textColor};font-weight:700;line-height:1.3">${lines.map(l => this.esc(l)).join('<br>')}</div>
    `;
  }

  /** Render the custom template (just background) */
  renderCustom(cfg: Record<string, any>): string {
    return this.withBg(cfg.bgColor, '');
  }

  /** Render extra custom elements overlay */
  renderElements(elements: CustomElement[], uploadedFiles: Record<string, UploadedFile>, selectedIdx: number): string {
    if (elements.length === 0) return '';

    return elements.map((el, i) => {
      const px = this.camW + el.x * this.scale;
      const py = el.y * this.scale;
      const inCam = el.x < this.device.width * this.device.cameraZoneRatio;
      const selected = i === selectedIdx;

      let bdr = '';
      if (selected && inCam) bdr = 'outline:2px solid #e17055;outline-offset:2px;';
      else if (selected) bdr = 'outline:1.5px dashed #6c5ce7;outline-offset:2px;';
      else if (inCam) bdr = 'outline:1.5px dashed rgba(225,112,85,0.6);outline-offset:2px;';

      switch (el.type) {
        case 'text': {
          const ta = el.textAlign && el.textAlign !== 'left' ? `text-align:${el.textAlign};` : '';
          const fw = el.bold ? 'font-weight:700;' : '';
          const w = el.multiLine || (el.textAlign && el.textAlign !== 'left') ? `width:${(el.w || 200) * this.scale}px;` : '';
          const lh = el.multiLine ? 'white-space:pre-wrap;line-height:1.4;' : '';
          return `<div style="position:absolute;left:${px}px;top:${py}px;font-size:${el.size! * this.scale}px;color:${el.color};${w}${ta}${fw}${lh}${bdr}">${this.esc(el.text || '')}</div>`;
        }
        case 'rectangle':
          return `<div style="position:absolute;left:${px}px;top:${py}px;width:${el.w! * this.scale}px;height:${el.h! * this.scale}px;background:${el.color};border-radius:${(el.radius || 0) * this.scale}px;${bdr}"></div>`;
        case 'circle':
          return `<div style="position:absolute;left:${this.camW + (el.x - el.r!) * this.scale}px;top:${(el.y - el.r!) * this.scale}px;width:${el.r! * 2 * this.scale}px;height:${el.r! * 2 * this.scale}px;background:${el.color};border-radius:50%;${bdr}"></div>`;
        case 'image': {
          const fi = el.fileName ? uploadedFiles[el.fileName] : null;
          if (fi) return `<img src="${fi.dataUrl}" style="position:absolute;left:${px}px;top:${py}px;width:${(el.w || 100) * this.scale}px;height:${(el.h || 100) * this.scale}px;object-fit:cover;border-radius:2px;${bdr}">`;
          return `<div style="position:absolute;left:${px}px;top:${py}px;width:${(el.w || 100) * this.scale}px;height:${(el.h || 100) * this.scale}px;background:#222;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:8px;color:#666;${bdr}">🖼</div>`;
        }
        case 'video': {
          const fi = el.fileName ? uploadedFiles[el.fileName] : null;
          if (fi) return `<video src="${fi.dataUrl}" muted loop autoplay style="position:absolute;left:${px}px;top:${py}px;width:${(el.w || 240) * this.scale}px;height:${(el.h || 135) * this.scale}px;object-fit:cover;border-radius:2px;${bdr}"></video>`;
          return `<div style="position:absolute;left:${px}px;top:${py}px;width:${(el.w || 240) * this.scale}px;height:${(el.h || 135) * this.scale}px;background:#1a1a2e;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:16px;color:#555;${bdr}">🎬</div>`;
        }
        default:
          return '';
      }
    }).join('');
  }

  // ─── Helpers ───

  private withBg(bgColor: string, content: string): string {
    return `<div style="position:absolute;inset:0;background:${bgColor}"></div>${content}`;
  }

  private esc(s: string): string {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /** Format time according to MAML-style format string */
  private formatTime(now: Date, fmt: string): string {
    const h = now.getHours();
    const m = String(now.getMinutes()).padStart(2, '0');
    if (fmt.includes('hh')) {
      const h12 = h % 12 || 12;
      const ampm = h < 12 ? 'AM' : 'PM';
      return `${String(h12).padStart(2, '0')}:${m} ${ampm}`;
    }
    return `${String(h).padStart(2, '0')}:${m}`;
  }

  /** Format date according to MAML-style format string */
  private formatDate(now: Date, fmt: string): string {
    const days = ['日', '一', '二', '三', '四', '五', '六'];
    const yyyy = String(now.getFullYear());
    const MM = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const EEEE = `星期${days[now.getDay()]}`;

    return fmt
      .replace('yyyy', yyyy)
      .replace('MM', MM)
      .replace('dd', dd)
      .replace('EEEE', EEEE);
  }

  /** Calculate countdown days (exact, using JS Date) */
  private calcCountdownDiff(targetDateStr: string): number {
    const target = Number(targetDateStr);
    if (isNaN(target)) return 0;
    const tMonth = Math.floor(target / 100);
    const tDay = target % 100;
    const now = new Date();
    const currentYear = now.getFullYear();

    // Try this year first
    let targetDate = new Date(currentYear, tMonth - 1, tDay);
    let diff = Math.ceil((targetDate.getTime() - now.getTime()) / 86400000);
    if (diff < 0) {
      // Try next year
      targetDate = new Date(currentYear + 1, tMonth - 1, tDay);
      diff = Math.ceil((targetDate.getTime() - now.getTime()) / 86400000);
    }
    return diff;
  }
}
