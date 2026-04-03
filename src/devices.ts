// ─── Devices: Single source of truth for device parameters ─────────

import { Device } from './schema';

export const DEVICES: Record<string, Device> = {
  q200: { id: 'q200', label: 'Pro — 904×572',     width: 904, height: 572, cameraZoneRatio: 0.30 },
  p2:   { id: 'p2',   label: 'Pro Max — 976×596',  width: 976, height: 596, cameraZoneRatio: 0.30 },
};

export function getDevice(id: string): Device {
  return DEVICES[id] || DEVICES.q200;
}

export function cameraZoneWidth(device: Device): number {
  return Math.ceil(device.width * device.cameraZoneRatio);
}
