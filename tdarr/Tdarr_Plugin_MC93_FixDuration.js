/* eslint no-plusplus: ["error", { "allowForLoopAfterthoughts": true }] */
function details() {
  return {
    id: 'Tdarr_Plugin_MC93_FixDuration',
    Stage: 'Pre-processing',
    Name: 'Migz-Duration fix',
    Type: 'Video',
    Operation: 'Clean',
    Description: 'File will be copied to fix duration \n\n',
    Version: '1.3',
    Link:
      'https://github.com/HaveAGitGat/Tdarr_Plugins/blob/master/Community/Tdarr_Plugin_MC93_MigzImageRemoval.js',
    Tags: 'pre-processing,ffmpeg,video only',
  };
}

function plugin(file, librarySettings) {
  const response = {
    processFile: false,
    preset: '',
    handBrakeMode: false,
    container: `.${file.container}`,
    FFmpegMode: true,
    reQueueAfter: true,
    infoLog: '',
  };

  // Check if file is a video. If it isn't then exit plugin.
  if (file.fileMedium !== 'video') {
    response.processFile = false;
    response.infoLog += '☒File is not a video. \n';
    return response;
  }

  // Set up required variables.
  let convert = false;

  // Check if file duration is missing.
  if ((file.meta.Duration === '') || (file.meta.Duration === undefined)) {
    convert = true;
  }

  // Convert file if convert variable is set to true.
  if (convert === true) {
    response.preset += `,-map 0 -c copy -max_muxing_queue_size 9999`;
    response.infoLog += '☒File is missing duration info. Recopying. \n';
    response.processFile = true;
  } else {
    response.processFile = false;
    response.infoLog
      += "☑File has valid duration info. \n";
  }
  return response;
}
module.exports.details = details;
module.exports.plugin = plugin;
