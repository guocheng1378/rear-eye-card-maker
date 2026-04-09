import { escXml } from '../maml.js';

var QUOTES = [
  { text: '生活不是等待风暴过去，而是学会在雨中翩翩起舞', author: '佚名' },
  { text: '愿你出走半生，归来仍是少年', author: '佚名' },
  { text: '不乱于心，不困于情，不畏将来，不念过往', author: '丰子恺' },
  { text: '人生如逆旅，我亦是行人', author: '苏轼' },
  { text: '山中何事？松花酿酒，春水煎茶', author: '张可久' },
  { text: '浮生只合尊前老，雪满长安道', author: '舒亶' },
  { text: '纵有千古，横有八荒，前途似海，来日方长', author: '梁启超' },
  { text: '万物皆有裂痕，那是光照进来的地方', author: 'Leonard Cohen' },
  { text: '凡心所向，素履以往', author: '七堇年' },
  { text: '岁月不居，时节如流', author: '孔融' },
];

// Rotate quote by day index
function getQuoteIndex() {
  var d = new Date();
  return (d.getFullYear() * 366 + d.getMonth() * 31 + d.getDate()) % QUOTES.length;
}

export default {
  id: 'daily_quote', icon: '📖', name: '每日一句', desc: '每日轮换名言语录，配渐变背景',
  updater: 'DateTime.Day',
  config: [
    { group: '基本', fields: [
      { key: 'cardName', label: '卡片名称', type: 'text', default: '每日一句' },
      { key: 'bgColor', label: '背景色1', type: 'color', default: '#0f0c29' },
      { key: 'bgColor2', label: '背景色2', type: 'color', default: '#302b63' },
    ]},
    { group: '文字', fields: [
      { key: 'quoteColor', label: '语录颜色', type: 'color', default: '#ffffff' },
      { key: 'authorColor', label: '作者颜色', type: 'color', default: '#a0a0c0' },
      { key: 'quoteSize', label: '语录字号', type: 'range', min: 14, max: 32, default: 20 },
      { key: 'decoColor', label: '装饰线颜色', type: 'color', default: '#6c5ce7' },
    ]},
  ],
  elements(c) {
    var qs = Number(c.quoteSize) || 20;
    var qi = getQuoteIndex();
    var q = QUOTES[qi];
    var lineCount = Math.ceil(q.text.length / 24);
    var quoteHeight = lineCount * Math.round(qs * 1.6);
    return [
      { type: 'rectangle', x: 0, y: 0, w: 976, h: 596, color: c.bgColor, fillColor2: c.bgColor2, locked: true },
      { type: 'text', x: 60, y: 40, size: 28, color: c.decoColor, text: '\u275D', opacity: 40, bold: true },
      { type: 'rectangle', x: 60, y: 80, w: 3, h: 40, color: c.decoColor, radius: 1.5 },
      { type: 'text', x: 80, y: 85, size: qs, color: c.quoteColor, multiLine: true, w: 830, lineHeight: 1.6, text: q.text, fontFamily: 'noto-sans-sc' },
      { type: 'text', x: 80, y: 85 + quoteHeight + 16, size: 14, color: c.authorColor, text: '\u2014 ' + q.author, fontFamily: 'noto-sans-sc' },
    ];
  },
};
