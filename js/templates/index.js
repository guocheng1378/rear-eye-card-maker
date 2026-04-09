// ─── Templates: 模板注册表 ────────────────────────────────────────

import custom from './custom.js';
import animated_clock from './animated_clock.js';
import slide_unlock from './slide_unlock.js';
import smart_battery from './smart_battery.js';
import action_buttons from './action_buttons.js';
import number_clock from './number_clock.js';
import weather_cp from './weather_cp.js';
import persistent_counter from './persistent_counter.js';

export const TEMPLATES = [
  custom, animated_clock, slide_unlock, smart_battery,
  action_buttons, number_clock, weather_cp, persistent_counter,
];

export const TPL_CATEGORIES = [
  { id: 'all', label: '全部' },
  { id: 'general', label: '🎨 通用' },
  { id: 'device', label: '📱 设备' },
  { id: 'tool', label: '🔧 工具' },
];

export const TPL_CATEGORY_MAP = {
  custom: 'general',
  animated_clock: 'general',
  slide_unlock: 'general',
  smart_battery: 'general',
  action_buttons: 'tool',
  number_clock: 'general',
  weather_cp: 'device',
  persistent_counter: 'tool',
};
