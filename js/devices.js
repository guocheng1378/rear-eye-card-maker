// ─── Devices: 设备参数 ─────────────────────────────────────────────

JCM.DEVICES = {
  q200:  { id: 'q200',  label: 'Pro — 904×572',       width: 904,  height: 572,  cameraZoneRatio: 0.30 },
  p2:    { id: 'p2',    label: 'Pro Max — 976×596',    width: 976,  height: 596,  cameraZoneRatio: 0.30 },
  q100:  { id: 'q100',  label: '标准版 — 840×520',     width: 840,  height: 520,  cameraZoneRatio: 0.28 },
  ultra: { id: 'ultra', label: 'Ultra — 1020×620',     width: 1020, height: 620,  cameraZoneRatio: 0.32 },
};

JCM.getDevice = function (id) {
  return JCM.DEVICES[id] || JCM.DEVICES.p2;
};

JCM.cameraZoneWidth = function (device) {
  return Math.ceil(device.width * device.cameraZoneRatio);
};
