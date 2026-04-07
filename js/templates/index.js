// ─── Templates: 模板注册表 ────────────────────────────────────────
// 每个模板一个文件，新增模板只需在此 import + 加到数组

import clock from './clock.js';
import quote from './quote.js';
import battery from './battery.js';
import status from './status.js';
import countdown from './countdown.js';
import music from './music.js';
import gradient from './gradient.js';
import weather from './weather.js';
import steps from './steps.js';
import calendar from './calendar.js';
import dualclock from './dualclock.js';
import dailyquote from './dailyquote.js';
import ring from './ring.js';
import dashboard from './dashboard.js';
import image from './image.js';
import custom from './custom.js';
import weather_real from './weather_real.js';
import music_real from './music_real.js';
import lyrics from './lyrics.js';
import video_wallpaper from './video_wallpaper.js';
import health from './health.js';
import schedule from './schedule.js';
import notification from './notification.js';
import carousel from './carousel.js';
import quick_settings from './quick_settings.js';

export const TEMPLATES = [
  clock, quote, battery, status, countdown, music, gradient,
  weather, steps, calendar, dualclock, dailyquote, ring, dashboard,
  image, custom, weather_real, music_real, lyrics, video_wallpaper,
  health, schedule, notification, carousel, quick_settings,
];

export const TPL_CATEGORIES = [
  { id: 'all', label: '全部' },
  { id: 'time', label: '⏰ 时间' },
  { id: 'info', label: '📊 信息' },
  { id: 'media', label: '🎨 媒体' },
  { id: 'device', label: '📱 设备' },
  { id: 'custom', label: '🛠️ 自定义' },
];

export const TPL_CATEGORY_MAP = {
  clock: 'time', dualclock: 'time', countdown: 'time',
  quote: 'info', status: 'info', weather: 'info', steps: 'info',
  calendar: 'info', dailyquote: 'info', dashboard: 'info',
  battery: 'info', ring: 'info',
  music: 'media', gradient: 'media', image: 'media', lyrics: 'media', video_wallpaper: 'media', carousel: 'media',
  custom: 'custom',
  weather_real: 'device', music_real: 'device', health: 'device', schedule: 'device', notification: 'device', quick_settings: 'device',
};
