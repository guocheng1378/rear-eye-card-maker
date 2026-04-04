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

// 根据屏幕宽高比自动检测设备类型，生成 MAML 自适应变量
JCM.generateAutoDetectMAML = function () {
  return [
    '  <!-- 自动检测设备：通过屏幕宽高判断机型 -->',
    '  <Var name="isQ100" type="number" expression="ifelse((#view_width <= 860), 1, 0)" />',
    '  <Var name="isQ200" type="number" expression="ifelse(((#view_width > 860) &amp;&amp; (#view_width <= 940)), 1, 0)" />',
    '  <Var name="isP2" type="number" expression="ifelse(((#view_width > 940) &amp;&amp; (#view_width <= 998)), 1, 0)" />',
    '  <Var name="isUltra" type="number" expression="ifelse((#view_width > 998), 1, 0)" />',
    '',
    '  <!-- 摄像头避让边距（各机型比例不同） -->',
    '  <Var name="marginL" type="number" expression="(#isQ100 * (#view_width * 0.28) + #isQ200 * (#view_width * 0.30) + #isP2 * (#view_width * 0.30) + #isUltra * (#view_width * 0.32))" />',
    '',
    '  <!-- 缩放比例（相对 Pro Max 基准 976×596） -->',
    '  <Var name="scaleX" type="number" expression="(#view_width / 976.0)" />',
    '  <Var name="scaleY" type="number" expression="(#view_height / 596.0)" />',
    '',
    '  <!-- 可用区域宽度 -->',
    '  <Var name="safeW" type="number" expression="(#view_width - #marginL - 20)" />',
  ].join("\n");
};
