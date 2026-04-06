// ─── Transcode: 浏览器端视频转码 (FFmpeg.wasm) ──────────────────────

JCM._ffmpegLoaded = false;
JCM._ffmpegLoading = false;
JCM._ffmpeg = null;

// 检测是否需要转码
JCM.needsTranscode = function (file) {
  // GIF 要转（作为视频处理时需要标准 MP4）
  if (file.type === 'image/gif') return true;
  // MP4 容器跳过（假定 H.264，用户可手动强制转码）
  if (file.type === 'video/mp4') return false;
  // 其他视频格式（mov, webm, avi, mkv 等）必须转码
  if (file.type.indexOf('video/') === 0) return true;
  return false;
};

// 强制转码指定素材（用于 MP4 编码不兼容的情况）
JCM.forceTranscodeAsset = function (fname) {
  var fi = JCM.uploadedFiles[fname];
  if (!fi) return Promise.reject(new Error('素材不存在'));

  var isVideo = fi.mimeType && fi.mimeType.indexOf('video/') === 0;
  if (!isVideo) return Promise.reject(new Error('不是视频文件'));

  // 从 ArrayBuffer 重建 File 对象
  var ext = fname.split('.').pop().toLowerCase() || 'mp4';
  var mime = fi.mimeType || ('video/' + ext);
  var blob = new Blob([fi.data], { type: mime });
  var file = new File([blob], fi.originalName || fname, { type: mime });

  toast('🔄 正在强制转码为 H.264...', 'info');

  return JCM.transcodeToH264(file, function (pct) {
    toast('🔄 转码中 ' + pct + '%...', 'info');
  }).then(function (transcoded) {
    return new Promise(function (resolve) {
      var reader = new FileReader();
      reader.onload = function (ev) {
        var buf = ev.target.result;
        var blobUrl = URL.createObjectURL(new Blob([buf], { type: 'video/mp4' }));
        JCM.uploadedFiles[fname] = {
          data: buf,
          mimeType: 'video/mp4',
          dataUrl: blobUrl,
          originalName: transcoded.name
        };
        toast('✅ 转码完成: ' + transcoded.name, 'success');
        resolve();
      };
      reader.readAsArrayBuffer(transcoded);
    });
  }).catch(function (e) {
    toast('❌ 转码失败: ' + e.message, 'error');
  });
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
    // 强制使用 .mp4 扩展名（不管原始格式是什么）
    var baseName = file.name.replace(/\.[^.]+$/, '');
    return new File([blob], baseName + '.mp4', { type: 'video/mp4' });
  }).catch(function (e) {
    try { ffmpeg.terminate(); } catch (_) {}
    JCM._ffmpegLoaded = false;
    JCM._ffmpeg = null;
    throw e;
  });
};
