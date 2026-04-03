// ─── UI: State management, config rendering, DOM updates ───────────

import { Device, CustomElement, UploadedFile, CardTemplate, ConfigField } from './schema';
import { DEVICES, getDevice, cameraZoneWidth } from './devices';
import { generateMAML } from './maml';
import { TEMPLATES } from './templates';
import { PreviewRenderer } from './preview';
import { exportZip } from './export';

// ─── State ─────────────────────────────────────────────────────────

let currentStep = 0;
let currentTpl: CardTemplate | null = null;
let configValues: Record<string, any> = {};
let customElements: CustomElement[] = [];
let selectedElIdx = -1;
let previewDirty = true;
let uploadedFiles: Record<string, UploadedFile> = {};
let pendingMediaAdd: 'image' | 'video' | null = null;
let pendingMediaReplace = -1;

// ─── Step Navigation ───────────────────────────────────────────────

export function goStep(n: number): void {
  if (n === 1 && !currentTpl) { toast('请先选择一个模板', 'error'); return; }
  if (n === 2 && !currentTpl) { toast('请先选择模板并配置', 'error'); return; }
  currentStep = n;

  document.querySelectorAll('.page').forEach((p, i) => {
    p.classList.toggle('active', i === n);
  });
  document.querySelectorAll('.step-dot').forEach((d, i) => {
    d.classList.remove('active', 'done');
    if (i === n) d.classList.add('active');
    else if (i < n) d.classList.add('done');
  });
  document.querySelectorAll('.step-line').forEach((l, i) => {
    l.classList.toggle('done', i < n);
  });

  const btnBack = document.getElementById('btnBack')!;
  btnBack.style.display = n > 0 ? '' : 'none';

  const btnNext = document.getElementById('btnNext')!;
  if (n === 2) {
    btnNext.style.display = 'none';
  } else {
    btnNext.style.display = '';
    btnNext.innerHTML = n === 0
      ? '下一步 <span class="btn-icon">→</span>'
      : '预览 & 导出 <span class="btn-icon">→</span>';
  }

  if (n === 1) renderConfig();
  if (n === 2 && previewDirty) renderPreview();
}

export function nextStep(): void { goStep(currentStep + 1); }
export function prevStep(): void { goStep(currentStep - 1); }

// ─── Template Selection ────────────────────────────────────────────

export function selectTemplate(id: string): void {
  const tpl = TEMPLATES.find(t => t.id === id);
  if (!tpl) return;

  currentTpl = tpl;
  configValues = {};
  tpl.config.forEach(g => g.fields.forEach(f => configValues[f.key] = f.default));
  customElements = tpl.id === 'custom'
    ? [{ type: 'text', text: 'Hello Card', x: 10, y: 60, size: 28, color: '#ffffff', textAlign: 'left', bold: false, multiLine: false, w: 200 }]
    : [];
  selectedElIdx = -1;
  previewDirty = true;
  uploadedFiles = {};

  renderTplGrid();
  goStep(1);
}

// ─── Template Grid ─────────────────────────────────────────────────

export function renderTplGrid(): void {
  const grid = document.getElementById('tplGrid')!;
  grid.innerHTML = TEMPLATES.map(t =>
    `<div class="tpl-card${currentTpl?.id === t.id ? ' active' : ''}" onclick="window.__app.selectTemplate('${t.id}')">
      <span class="tpl-icon">${t.icon}</span>
      <div class="tpl-card-name">${t.name}</div>
      <div class="tpl-card-desc">${t.desc}</div>
    </div>`
  ).join('');
}

// ─── Config Rendering ──────────────────────────────────────────────

export function renderConfig(): void {
  if (!currentTpl) return;

  const device = getSelectedDevice();

  document.getElementById('cfgIcon')!.textContent = currentTpl.icon;
  document.getElementById('cfgTitle')!.textContent = currentTpl.name;
  document.getElementById('cfgDesc')!.textContent = currentTpl.desc;

  let html = '';

  // Config groups
  for (const group of currentTpl.config) {
    html += `<div class="config-section">
      <div class="config-section-title"><span>▸</span> ${group.group}</div>
      <div class="config-grid">`;
    for (const f of group.fields) {
      html += renderField(f);
    }
    html += `</div></div>`;
  }

  // Custom elements editor
  html += `<div class="config-section">
    <div class="config-section-title"><span>▸</span> 额外元素</div>
    <div class="el-toolbar">
      <button class="el-btn" onclick="window.__app.addElement('text')"><span class="el-btn-icon">T</span> 文字</button>
      <button class="el-btn" onclick="window.__app.addElement('rectangle')"><span class="el-btn-icon">▢</span> 矩形</button>
      <button class="el-btn" onclick="window.__app.addElement('circle')"><span class="el-btn-icon">○</span> 圆形</button>
      <button class="el-btn" onclick="window.__app.pickMedia('image')"><span class="el-btn-icon">🖼</span> 图片</button>
      <button class="el-btn" onclick="window.__app.pickMedia('video')"><span class="el-btn-icon">🎬</span> 视频</button>
    </div>
    <div class="el-list">`;

  customElements.forEach((el, i) => {
    const label = el.type === 'text' ? (el.text || '')
      : el.type === 'image' ? '🖼 ' + (el.fileName || '图片')
      : el.type === 'video' ? '🎬 ' + (el.fileName || '视频')
      : el.type + ' #' + (i + 1);
    const inCam = isInCameraZone(el, device);
    html += `<div class="el-item${selectedElIdx === i ? ' active' : ''}" onclick="window.__app.selectElement(${i})">
      <span class="el-badge">${el.type}</span>
      <span class="el-item-name">${escHtml(label)}</span>
      ${inCam ? '<span title="在摄像头遮挡区内" style="color:#e17055;font-size:14px">⚠️</span>' : ''}
      <button class="el-item-del" onclick="event.stopPropagation();window.__app.removeElement(${i})">✕</button>
    </div>`;
  });

  if (customElements.length === 0) {
    html += `<div style="text-align:center;padding:20px;color:var(--text3);font-size:12px">点击上方按钮添加元素</div>`;
  }
  html += `</div>`;

  if (selectedElIdx >= 0 && selectedElIdx < customElements.length) {
    html += renderElementEditor(customElements[selectedElIdx], selectedElIdx, device);
  }
  html += `</div>`;

  document.getElementById('cfgContent')!.innerHTML = html;

  // Restore color values
  document.querySelectorAll('.color-val').forEach(el => {
    const input = (el as HTMLElement).previousElementSibling as HTMLInputElement;
    if (input) el.textContent = input.value;
  });
}

function renderField(f: ConfigField): string {
  const v = configValues[f.key];
  switch (f.type) {
    case 'text':
      return `<div class="field"><label>${f.label}</label><input type="text" value="${escHtml(String(v))}" onchange="window.__app.setCfg('${f.key}',this.value)"></div>`;
    case 'textarea':
      return `<div class="field"><label>${f.label}</label><textarea rows="3" onchange="window.__app.setCfg('${f.key}',this.value)">${escHtml(String(v))}</textarea></div>`;
    case 'color':
      return `<div class="field field-color"><label>${f.label}</label><input type="color" value="${v}" onchange="window.__app.setCfg('${f.key}',this.value);this.nextElementSibling.textContent=this.value"><span class="color-val">${v}</span></div>`;
    case 'range':
      return `<div class="field"><label>${f.label}: <strong>${v}</strong></label><input type="range" min="${f.min}" max="${f.max}" value="${v}" oninput="window.__app.setCfg('${f.key}',+this.value);this.previousElementSibling.querySelector('strong').textContent=this.value"></div>`;
    case 'select':
      return `<div class="field"><label>${f.label}</label><select onchange="window.__app.setCfg('${f.key}',this.value)">${f.options!.map(o => `<option value="${o.v}"${v === o.v ? ' selected' : ''}>${o.l}</option>`).join('')}</select></div>`;
    default:
      return '';
  }
}

function renderElementEditor(el: CustomElement, idx: number, device: Device): string {
  let html = `<div class="el-detail">`;

  // Camera zone warning
  if (isInCameraZone(el, device)) {
    const safeX = cameraZoneWidth(device);
    html += `<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;margin-bottom:12px;background:rgba(225,112,85,0.1);border:1px solid rgba(225,112,85,0.3);border-radius:8px;font-size:12px;color:#e17055">
      <span>⚠️</span> 此元素位于摄像头遮挡区内，导出后可能被遮挡。建议将 X 调整到 ≥ ${safeX}
    </div>`;
  }

  if (el.type === 'image' || el.type === 'video') {
    const isImage = el.type === 'image';
    const fileInfo = el.fileName ? uploadedFiles[el.fileName] : null;
    const hasFile = !!fileInfo;

    html += `<div class="media-picker ${hasFile ? 'has-file' : ''}" onclick="window.__app.pickMediaReplace(${idx})">`;
    if (hasFile && isImage) {
      html += `<img class="media-picker-thumb" src="${fileInfo.dataUrl}" alt="">`;
    } else {
      html += `<span class="media-picker-icon">${isImage ? '🖼' : '🎬'}</span>`;
    }
    html += `<div class="media-picker-info">
      <div class="media-picker-name">${hasFile ? escHtml(fileInfo.originalName) : (isImage ? '点击选择图片' : '点击选择视频')}</div>
      <div class="media-picker-hint">${hasFile ? formatFileSize(fileInfo.data.byteLength) + ' · 点击更换' : (isImage ? '支持 JPG / PNG / GIF / WebP' : '支持 MP4 / WebM / 3GP')}</div>
    </div>`;
    if (hasFile) {
      html += `<button class="media-picker-change" onclick="event.stopPropagation();window.__app.pickMediaReplace(${idx})">更换</button>`;
    }
    html += `</div>`;

    html += `<div class="config-grid">
      <div class="field"><label>X</label><input type="number" value="${el.x}" onchange="window.__app.setElProp('x',+this.value)"></div>
      <div class="field"><label>Y</label><input type="number" value="${el.y}" onchange="window.__app.setElProp('y',+this.value)"></div>
      <div class="field"><label>宽</label><input type="number" value="${el.w || 100}" onchange="window.__app.setElProp('w',+this.value)"></div>
      <div class="field"><label>高</label><input type="number" value="${el.h || 100}" onchange="window.__app.setElProp('h',+this.value)"></div>
    </div>`;
  } else if (el.type === 'text') {
    html += `<div class="config-grid">
      <div class="field" style="grid-column:1/-1"><label>文字</label><input type="text" value="${escHtml(el.text || '')}" onchange="window.__app.setElProp('text',this.value)"></div>
      <div class="field"><label>字号</label><input type="number" value="${el.size}" onchange="window.__app.setElProp('size',+this.value)"></div>
      <div class="field field-color"><label>颜色</label><input type="color" value="${el.color}" onchange="window.__app.setElProp('color',this.value);this.nextElementSibling.textContent=this.value"><span class="color-val">${el.color}</span></div>
      <div class="field"><label>对齐</label><select onchange="window.__app.setElProp('textAlign',this.value)">
        <option value="left"${el.textAlign === 'left' ? ' selected' : ''}>左对齐</option>
        <option value="center"${el.textAlign === 'center' ? ' selected' : ''}>居中</option>
        <option value="right"${el.textAlign === 'right' ? ' selected' : ''}>右对齐</option>
      </select></div>
      <div class="field"><label>加粗</label><select onchange="window.__app.setElProp('bold',this.value==='true')">
        <option value="false"${!el.bold ? ' selected' : ''}>否</option>
        <option value="true"${el.bold ? ' selected' : ''}>是</option>
      </select></div>
      <div class="field"><label>多行</label><select onchange="window.__app.setElProp('multiLine',this.value==='true')">
        <option value="false"${!el.multiLine ? ' selected' : ''}>否</option>
        <option value="true"${el.multiLine ? ' selected' : ''}>是</option>
      </select></div>
      <div class="field"><label>宽度</label><input type="number" value="${el.w || 200}" onchange="window.__app.setElProp('w',+this.value)"></div>
      <div class="field"><label>X</label><input type="number" value="${el.x}" onchange="window.__app.setElProp('x',+this.value)"></div>
      <div class="field"><label>Y</label><input type="number" value="${el.y}" onchange="window.__app.setElProp('y',+this.value)"></div>
    </div>`;
  } else if (el.type === 'rectangle') {
    html += `<div class="config-grid">
      <div class="field"><label>X</label><input type="number" value="${el.x}" onchange="window.__app.setElProp('x',+this.value)"></div>
      <div class="field"><label>Y</label><input type="number" value="${el.y}" onchange="window.__app.setElProp('y',+this.value)"></div>
      <div class="field"><label>宽</label><input type="number" value="${el.w}" onchange="window.__app.setElProp('w',+this.value)"></div>
      <div class="field"><label>高</label><input type="number" value="${el.h}" onchange="window.__app.setElProp('h',+this.value)"></div>
      <div class="field field-color"><label>颜色</label><input type="color" value="${el.color}" onchange="window.__app.setElProp('color',this.value);this.nextElementSibling.textContent=this.value"><span class="color-val">${el.color}</span></div>
      <div class="field"><label>圆角</label><input type="number" value="${el.radius || 0}" onchange="window.__app.setElProp('radius',+this.value)"></div>
    </div>`;
  } else if (el.type === 'circle') {
    html += `<div class="config-grid">
      <div class="field"><label>中心 X</label><input type="number" value="${el.x}" onchange="window.__app.setElProp('x',+this.value)"></div>
      <div class="field"><label>中心 Y</label><input type="number" value="${el.y}" onchange="window.__app.setElProp('y',+this.value)"></div>
      <div class="field"><label>半径</label><input type="number" value="${el.r}" onchange="window.__app.setElProp('r',+this.value)"></div>
      <div class="field field-color"><label>颜色</label><input type="color" value="${el.color}" onchange="window.__app.setElProp('color',this.value);this.nextElementSibling.textContent=this.value"><span class="color-val">${el.color}</span></div>
    </div>`;
  }

  html += `</div>`;
  return html;
}

// ─── Config Actions ────────────────────────────────────────────────

export function setCfg(key: string, val: any): void {
  configValues[key] = val;
  previewDirty = true;
}

export function addElement(type: string): void {
  const defs: Record<string, CustomElement> = {
    text: { type: 'text', text: '新文字', x: 10, y: 60, size: 24, color: '#ffffff', textAlign: 'left', bold: false, multiLine: false, w: 200 },
    rectangle: { type: 'rectangle', x: 10, y: 60, w: 100, h: 40, color: '#333333', radius: 0 },
    circle: { type: 'circle', x: 50, y: 100, r: 30, color: '#6c5ce7' },
  };
  if (defs[type]) {
    customElements.push(JSON.parse(JSON.stringify(defs[type])));
    selectedElIdx = customElements.length - 1;
    previewDirty = true;
    renderConfig();
  }
}

export function selectElement(idx: number): void {
  selectedElIdx = idx;
  renderConfig();
}

export function removeElement(idx: number): void {
  const el = customElements[idx];
  if (el && el.fileName) {
    const stillUsed = customElements.some((e, i) => i !== idx && e.fileName === el.fileName);
    if (!stillUsed) delete uploadedFiles[el.fileName];
  }
  customElements.splice(idx, 1);
  if (selectedElIdx >= customElements.length) selectedElIdx = customElements.length - 1;
  previewDirty = true;
  renderConfig();
}

export function setElProp(prop: string, val: any): void {
  if (selectedElIdx >= 0) {
    (customElements[selectedElIdx] as any)[prop] = val;
    previewDirty = true;
  }
}

// ─── Media Upload ──────────────────────────────────────────────────

export function pickMedia(type: 'image' | 'video'): void {
  pendingMediaAdd = type;
  pendingMediaReplace = -1;
  const input = document.getElementById(type === 'image' ? 'fileImagePick' : 'fileVideoPick') as HTMLInputElement;
  input.value = '';
  input.click();
}

export function pickMediaReplace(idx: number): void {
  const el = customElements[idx];
  if (!el) return;
  pendingMediaAdd = el.type as 'image' | 'video';
  pendingMediaReplace = idx;
  const input = document.getElementById(el.type === 'image' ? 'fileImagePick' : 'fileVideoPick') as HTMLInputElement;
  input.value = '';
  input.click();
}

function handleFilePicked(e: Event): void {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  const type = pendingMediaAdd;
  const replaceIdx = pendingMediaReplace;
  pendingMediaAdd = null;
  pendingMediaReplace = -1;

  const ext = file.name.split('.').pop() || (type === 'image' ? 'png' : 'mp4');
  const safeName = 'media_' + Date.now() + '.' + ext;

  const reader = new FileReader();
  reader.onload = function (ev) {
    const arrayBuf = ev.target!.result as ArrayBuffer;
    const blob = new Blob([arrayBuf], { type: file.type });
    const urlReader = new FileReader();
    urlReader.onload = function () {
      uploadedFiles[safeName] = {
        data: arrayBuf,
        mimeType: file.type,
        dataUrl: urlReader.result as string,
        originalName: file.name,
      };

      if (replaceIdx >= 0 && replaceIdx < customElements.length) {
        customElements[replaceIdx].fileName = safeName;
        customElements[replaceIdx].src = safeName;
      } else {
        customElements.push({
          type: type!,
          fileName: safeName,
          src: safeName,
          x: 10, y: 60,
          w: type === 'image' ? 200 : 240,
          h: type === 'image' ? 200 : 135,
        });
        selectedElIdx = customElements.length - 1;
      }

      previewDirty = true;
      renderConfig();
      toast(file.name + ' 已添加', 'success');
    };
    urlReader.readAsDataURL(blob);
  };
  reader.readAsArrayBuffer(file);
}

// ─── Preview ───────────────────────────────────────────────────────

function getSelectedDevice(): Device {
  const sel = document.getElementById('deviceSelect') as HTMLSelectElement;
  return getDevice(sel.value);
}

export function renderPreview(): void {
  if (!currentTpl) return;

  const device = getSelectedDevice();
  const showCam = (document.getElementById('showCamera') as HTMLInputElement).checked;

  document.getElementById('deviceLabel')!.textContent = device.label;

  const camera = document.getElementById('previewCamera')!;
  camera.style.width = showCam ? '30%' : '0';
  camera.className = 'preview-camera' + (showCam ? '' : ' hidden');

  const renderer = new PreviewRenderer(device, showCam);
  const content = document.getElementById('previewContent')!;

  // Render template preview
  let html = '';
  switch (currentTpl.id) {
    case 'clock':     html = renderer.renderClock(configValues); break;
    case 'quote':     html = renderer.renderQuote(configValues); break;
    case 'battery':   html = renderer.renderBattery(configValues); break;
    case 'status':    html = renderer.renderStatus(configValues); break;
    case 'countdown': html = renderer.renderCountdown(configValues); break;
    case 'music':     html = renderer.renderMusic(configValues); break;
    case 'gradient':  html = renderer.renderGradient(configValues); break;
    case 'custom':    html = renderer.renderCustom(configValues); break;
  }

  // Add custom elements overlay
  html += renderer.renderElements(customElements, uploadedFiles, selectedElIdx);

  content.innerHTML = html;

  // Generate MAML
  const innerXml = currentTpl.gen ? currentTpl.gen(configValues) : generateCustomMAML(device);
  const maml = generateMAML({
    cardName: configValues.cardName || currentTpl.name,
    device,
    innerXml,
    updater: currentTpl.updater,
    extraElements: customElements,
    uploadedFiles,
  });

  document.getElementById('codeContent')!.textContent = maml;
  previewDirty = false;
}

function generateCustomMAML(device: Device): string {
  const c = configValues;
  const lines: string[] = [
    `  <Var name="marginL" type="number" expression="(#view_width * 0.30)" />`,
    `  <Rectangle w="#view_width" h="#view_height" fillColor="${c.bgColor}" />`,
    `  <Group x="#marginL" y="0">`,
  ];

  for (const el of customElements) {
    switch (el.type) {
      case 'text': {
        const align = el.textAlign && el.textAlign !== 'left' ? ` textAlign="${el.textAlign}"` : '';
        const ml = el.multiLine ? ' multiLine="true"' : '';
        const w = el.multiLine || (el.textAlign && el.textAlign !== 'left') ? ` w="${el.w || 200}"` : '';
        const bold = el.bold ? ' bold="true"' : '';
        lines.push(`    <Text text="${escXmlAttr(el.text || '')}" x="${el.x}" y="${el.y}" size="${el.size}" color="${el.color}"${w}${align}${ml}${bold} />`);
        break;
      }
      case 'rectangle':
        lines.push(`    <Rectangle x="${el.x}" y="${el.y}" w="${el.w}" h="${el.h}" fillColor="${el.color}"${el.radius ? ` cornerRadius="${el.radius}"` : ''} />`);
        break;
      case 'circle':
        lines.push(`    <Circle x="${el.x}" y="${el.y}" r="${el.r}" fillColor="${el.color}" />`);
        break;
      case 'image': {
        const folder = el.src && uploadedFiles[el.src]?.mimeType?.startsWith('video/') ? 'videos' : 'images';
        lines.push(`    <Image src="${folder}/${el.src || ''}" x="${el.x}" y="${el.y}" w="${el.w || 100}" h="${el.h || 100}" />`);
        break;
      }
      case 'video':
        lines.push(`    <Video src="videos/${el.src || ''}" x="${el.x}" y="${el.y}" w="${el.w || 240}" h="${el.h || 135}" autoPlay="true" loop="true" />`);
        break;
    }
  }

  lines.push(`  </Group>`);
  return lines.join('\n');
}

// ─── Export ────────────────────────────────────────────────────────

export async function handleExport(): Promise<void> {
  if (!currentTpl) { toast('请先选择模板', 'error'); return; }

  const device = getSelectedDevice();
  const innerXml = currentTpl.gen ? currentTpl.gen(configValues) : generateCustomMAML(device);
  const maml = generateMAML({
    cardName: configValues.cardName || currentTpl.name,
    device,
    innerXml,
    updater: currentTpl.updater,
    extraElements: customElements,
    uploadedFiles,
  });

  try {
    await exportZip(maml, configValues.cardName || 'card', customElements, uploadedFiles, currentTpl.id === 'custom');
    toast('✅ ZIP 已导出', 'success');
  } catch (e: any) {
    toast('导出失败: ' + e.message, 'error');
  }
}

// ─── Camera Zone ───────────────────────────────────────────────────

function isInCameraZone(el: CustomElement, device: Device): boolean {
  const zoneWidth = device.width * device.cameraZoneRatio;
  const elW = el.w || (el.r ? el.r * 2 : 0) || (el.size ? (el.text || '').length * el.size * 0.6 : 50);
  const elRight = el.x + elW;
  return el.x < zoneWidth && elRight <= zoneWidth * 1.5;
}

// ─── Utilities ─────────────────────────────────────────────────────

function escHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escXmlAttr(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '&#10;');
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function toast(msg: string, type: 'success' | 'error' = 'success'): void {
  const el = document.getElementById('toast')!;
  el.textContent = msg;
  el.className = 'toast ' + type;
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => el.classList.remove('show'), 2500);
}

// ─── Init ──────────────────────────────────────────────────────────

export function init(): void {
  renderTplGrid();

  // File input listeners
  document.getElementById('fileImagePick')!.addEventListener('change', handleFilePicked);
  document.getElementById('fileVideoPick')!.addEventListener('change', handleFilePicked);

  // Expose to global for onclick handlers
  (window as any).__app = {
    goStep, nextStep, prevStep, selectTemplate,
    setCfg, addElement, selectElement, removeElement, setElProp,
    pickMedia, pickMediaReplace, renderPreview, handleExport,
  };
}
