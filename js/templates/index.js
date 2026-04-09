// ─── Templates: 模板注册表 ────────────────────────────────────────

import custom from './custom.js';
import animated_clock from './animated_clock.js';
import slide_unlock from './slide_unlock.js';
import smart_battery from './smart_battery.js';
import action_buttons from './action_buttons.js';
import number_clock from './number_clock.js';
import weather_cp from './weather_cp.js';
import persistent_counter from './persistent_counter.js';
import fitness_ring from './fitness_ring.js';
import music_player from './music_player.js';
import date_beauty from './date_beauty.js';
import dual_clock from './dual_clock.js';
import quick_note from './quick_note.js';
import brightness_slider from './brightness_slider.js';
import breathing_light from './breathing_light.js';
import photo_frame from './photo_frame.js';
import pomodoro from './pomodoro.js';
import quick_clock from './quick_clock.js';
import daily_quote from './daily_quote.js';
import mini_status from './mini_status.js';

export const TEMPLATES = [
  custom, animated_clock, slide_unlock, smart_battery,
  action_buttons, number_clock, weather_cp, persistent_counter,
  fitness_ring, music_player, date_beauty, dual_clock, quick_note,
  brightness_slider, breathing_light, photo_frame, pomodoro,
  quick_clock, daily_quote, mini_status,
];

export const TPL_CATEGORIES = [
  { id: 'all', label: '全部' },
  { id: 'general', label: '🎨 通用' },
  { id: 'device', label: '📱 设备' },
  { id: 'tool', label: '🔧 工具' },
  { id: 'clock', label: '🕐 时钟' },
  { id: 'health', label: '💪 健康' },
];

export const TPL_CATEGORY_MAP = {
  custom: 'general',
  animated_clock: 'clock',
  slide_unlock: 'general',
  smart_battery: 'device',
  action_buttons: 'tool',
  number_clock: 'clock',
  weather_cp: 'device',
  persistent_counter: 'tool',
  fitness_ring: 'health',
  music_player: 'device',
  date_beauty: 'clock',
  dual_clock: 'clock',
  quick_note: 'general',
  brightness_slider: 'device',
  breathing_light: 'general',
  photo_frame: 'general',
  pomodoro: 'tool',
  quick_clock: 'clock',
  daily_quote: 'general',
  mini_status: 'device',
};
