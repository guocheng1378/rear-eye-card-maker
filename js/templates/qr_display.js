import { escXml } from '../maml.js';

export default {
  id: 'qr_display', icon: '📱', name: '二维码', desc: '展示收款码/WiFi码等二维码',
  updater: 'None',
  config: [
    { group: '基本', fields: [
      { key: 'cardName', label: '卡片名称', type: 'text', default: '二维码' },
      { key: 'bgColor', label: '背景颜色', type: 'color', default: '#ffffff' },
      { key: 'qrLabel', label: '说明文字', type: 'text', default: '扫码支付' },
      { key: 'qrContent', label: '二维码内容', type: 'text', default: 'https://example.com' },
    ]},
    { group: '样式', fields: [
      { key: 'qrColor', label: '码颜色', type: 'color', default: '#000000' },
      { key: 'labelColor', label: '标签颜色', type: 'color', default: '#333333' },
      { key: 'subColor', label: '副文字颜色', type: 'color', default: '#999999' },
      { key: 'qrSize', label: '码大小', type: 'range', min: 100, max: 250, default: 180 },
    ]},
  ],
  elements(c) {
    var qs = Number(c.qrSize) || 180;
    return [
      { type: 'rectangle', x: 0, y: 0, w: 976, h: 596, color: c.bgColor, locked: true },
      { type: 'text', text: c.qrLabel || '扫码支付', x: 30, y: 30, size: 16, color: c.labelColor, bold: true },
      { type: 'rectangle', x: 30, y: 60, w: qs, h: qs, color: '#f0f0f0' },
      { type: 'text', text: 'QR', x: 30 + qs / 2 - 15, y: 60 + qs / 2, size: 24, color: c.qrColor },
      { type: 'text', text: '长按识别', x: 30 + qs / 2 - 30, y: 70 + qs, size: 12, color: c.subColor },
    ];
  },
  rawXml(c) {
    var label = escXml(c.qrLabel || '扫码支付');
    var content = escXml(c.qrContent || 'https://example.com');
    var qs = Number(c.qrSize) || 180;
    return [
      '<Widget screenWidth="976" frameRate="0" scaleByDensity="false" name="' + escXml(c.cardName || '二维码') + '">',
      '  <Var name="marginL" type="number" expression="(#view_width * 0.25)" />',
      '',
      '  <!-- 背景 -->',
      '  <Rectangle w="#view_width" h="#view_height" fillColor="' + c.bgColor + '" />',
      '',
      '  <Group x="#marginL" y="0">',
      '    <!-- 说明文字 -->',
      '    <Text x="0" y="20" size="16" color="' + c.labelColor + '" text="' + label + '" bold="true" />',
      '',
      '    <!-- 二维码 -->',
      '    <QRCode x="0" y="50" w="' + qs + '" h="' + qs + '" content="' + content + '" color="' + c.qrColor + '" backgroundColor="' + c.bgColor + '" />',
      '',
      '    <!-- 提示文字 -->',
      '    <Text x="0" y="' + (60 + qs) + '" size="12" color="' + c.subColor + '" text="长按识别" />',
      '  </Group>',
      '</Widget>',
    ].join('\n');
  },
};
