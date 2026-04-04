// ─── Transcode: 浏览器端视频转码 (FFmpeg.wasm) ──────────────────────

JCM._ffmpegLoaded = false;
JCM._ffmpegLoading = false;
JCM._ffmpeg = null;

// 检测是否需要转码
JCM.needsTranscode = function (file) {
  // MP4 文件跳过（假定 H.264）
  if (file.type === 'video/mp4') return false;
  // GIF 也要转（作为视频处理时需要标准 MP4）
  if (file.type === 'image/gif') return true;
  // 其他视频格式需要转码
  if (file.type.indexOf('video/') === 0) return true;
  return false;
};

// 加载 FFmpeg.wasm（按需加载，首次约 25MB）
JCM._loadFFmpeg = function () {
  if (JCM._ffmpegLoaded && JCM._ffmpeg) return Promise.resolve(JCM._ffmpeg);
  if (JCM._ffmpegLoading) {
    return new Promise(function (resolve, reject) {
      var check = setInterval(function () {
        if (JCM._ffmpegLoaded && JCM._ffmpeg) { clearInterval(check); resolve(JCM._ffmpeg); }
      }, 200);
      setTimeout(function () { clearInterval(check); reject(new Error('加载超时')); }, 60000);
    });
  }

  JCM._ffmpegLoading = true;

  return new Promise(function (resolve, reject) {
    // 动态加载 FFmpeg.wasm 脚本
    if (typeof FFmpegWASM === 'undefined') {
      var s1 = document.createElement('script');
      s1.src = 'https://unpkg.com/@ffmpeg/umd@0.12.10/dist/ffmpeg.js';
      s1.onload = function () { initFFmpeg().then(resolve).catch(reject); };
      s1.onerror = function () { reject(new Error('无法加载 FFmpeg 脚本')); };
      document.head.appendChild(s1);
    } else {
      initFFmpeg().then(resolve).catch(reject);
    }
  });

  function initFFmpeg() {
    var ffmpeg = new FFmpegWASM.FFmpeg();
    return ffmpeg.load({
      coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js',
      wasmURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm'
    }).then(function () {
      JCM._ffmpeg = ffmpeg;
      JCM._ffmpegLoaded = true;
      JCM._ffmpegLoading = false;
      return ffmpeg;
    }).catch(function (e) {
      JCM._ffmpegLoading = false;
      throw e;
    });
  }
};

// 转码视频为 MP4 (H.264)
JCM.transcodeToH264 = function (file, onProgress) {
  var ffmpeg;
  var inputName;

  return JCM._loadFFmpeg().then(function (ff) {
    ffmpeg = ff;

    // 进度回调
    if (onProgress) {
      var handler = function (e) { onProgress(Math.round((e.progress || 0) * 100)); };
      ffmpeg.on('progress', handler);
    }

    // 写入源文件
    var ext = file.name.split('.').pop().toLowerCase() || 'mp4';
    inputName = 'input.' + ext;

    return new Response(file).arrayBuffer();
  }).then(function (buf) {
    return ffmpeg.writeFile(inputName, new Uint8Array(buf));
  }).then(function () {
    return ffmpeg.exec([
      '-i', inputName,
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '28',
      '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      '-y',
      'output.mp4'
    ]);
  }).then(function (exitCode) {
    if (exitCode !== 0) throw new Error('转码失败 (exit ' + exitCode + ')');
    return ffmpeg.readFile('output.mp4');
  }).then(function (data) {
    // 清理临时文件
    try { ffmpeg.deleteFile(inputName); } catch (e) {}
    try { ffmpeg.deleteFile('output.mp4'); } catch (e) {}
    try { ffmpeg.terminate(); } catch (e) {}
    JCM._ffmpegLoaded = false;
    JCM._ffmpeg = null;

    if (data.length < 1024) throw new Error('转码输出异常');

    var blob = new Blob([data.buffer], { type: 'video/mp4' });
    var baseName = file.name.replace(/\.[^.]+$/, '');
    return new File([blob], baseName + '.mp4', { type: 'video/mp4' });
  }).catch(function (e) {
    try { ffmpeg.terminate(); } catch (_) {}
    JCM._ffmpegLoaded = false;
    JCM._ffmpeg = null;
    throw e;
  });
};
