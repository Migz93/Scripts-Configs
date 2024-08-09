function details() {
  return {
    id: "Tdarr_Plugin_MC93_MigzSSJGodRemux",
    Stage: "Pre-processing",
    Name: "Migz Super Saiyan God Remux Plugin",
    Type: "Video",
    Operation: "Transcode",
    Description: `Does everything all my current plugins do but in a single plugin. \n\n`,
    Version: "1",
    Link: "https://github.com/HaveAGitGat/Tdarr_Plugins/blob/master/Community/Tdarr_Plugin_MC93_Migz1FFMPEG.js",
    Tags: "pre-processing,ffmpeg,video only,configurable",
    Inputs: [{
        name: "container",
        tooltip: `Specify output container of file, ensure that all stream types you may have are supported by your chosen container. mkv is recommended.
               \\nExample:\\n
               mkv

               \\nExample:\\n
               mp4`,
      },
      {
        name: "force_conform",
        tooltip: `Make the file conform to output containers requirements.
                \\n Drop hdmv_pgs_subtitle/eia_608/subrip/timed_id3 for MP4.
                \\n Drop data streams/mov_text/eia_608/timed_id3 for MKV.
                \\n Default is false.
               \\nExample:\\n
               true

               \\nExample:\\n
               false`,
      },
      {
        name: "clean_audio",
        tooltip: `Specify if audio titles should be checked & cleaned. Optional.
               \\nExample:\\n
               true
               \\nExample:\\n
               false`,
      },
      {
        name: "clean_subtitles",
        tooltip: `Specify if subtitle titles should be checked & cleaned. Optional.
               \\nExample:\\n
               true
               \\nExample:\\n
               false`,
      },
      {
        name: "custom_title_matching",
        tooltip: `By default if you enable audio or subtitle cleaning the plugin only looks for titles with more then 3 full stops, this is what i think is the safest way to identify junk metadata without removing real metadata that you might want to keep. Here you can specify your own text for it to also search for to match and remove. Comma separated. Optional.
               \\nExample:\\n
               MiNX - Small HD episodes
               \\nExample:\\n
               MiNX - Small HD episodes,GalaxyTV - small excellence!`,
      },
      {
        name: "language",
        tooltip: `Specify language tag/s here for the audio tracks you'd like to keep, recommended to keep "und" as this stands for undertermined, some files may not have the language specified. Must follow ISO-639-2 3 letter format. https://en.wikipedia.org/wiki/List_of_ISO_639-2_codes
               \\nExample:\\n
               eng
               \\nExample:\\n
               eng,und
               \\nExample:\\n
               eng,und,jap`,
      },
      {
        name: "subtitle_language",
        tooltip: `Specify language tag/s here for the subtitle tracks you'd like to keep. Must follow ISO-639-2 3 letter format. https://en.wikipedia.org/wiki/List_of_ISO_639-2_codes
               \\nExample:\\n
               eng
               \\nExample:\\n
               eng,jap`,
      },
      {
        name: "commentary",
        tooltip: `Specify if audio tracks that contain commentary/description should be removed.
               \\nExample:\\n
               true
               \\nExample:\\n
               false`,
      },
      {
        name: "forced",
        tooltip: `Specify if subtitle tracks tagged as forced should be removed.
               \\nExample:\\n
               true
               \\nExample:\\n
               false`,
      },
      {
        name: "tag_language",
        tooltip: `Specify a single language for audio tracks with no language or unknown language to be tagged with, leave empty to disable, you must have "und" in your list of languages to keep for this to function. Must follow ISO-639-2 3 letter format. https://en.wikipedia.org/wiki/List_of_ISO_639-2_codes
               \\nExample:\\n
               eng
               \\nExample:\\n
               por`,
      },
      {
        name: "tag_title",
        tooltip: `Specify audio tracks with no title to be tagged with the number of channels they contain. Do NOT use this with mp4, as mp4 does not support title tags.
    \\nExample:\\n
    true
    \\nExample:\\n
    false`,
      },
      {
        name: "aac_stereo",
        tooltip: `Specify if any 2.0 audio tracks should be converted to aac for maximum compatability with devices. Optional.
             \\nExample:\\n
             true
             \\nExample:\\n
             false`,
      },
      {
        name: "downmix",
        tooltip: `Specify if downmixing should be used to create extra audio tracks. I.e if you have an 8ch but no 2ch or 6ch, create the missing audio tracks from the 8 ch. Likewise if you only have 6ch, create the missing 2ch from it. Optional.
             \\nExample:\\n
             true
             \\nExample:\\n
             false`,
      },
      {
        name: 'dts_flac',
        type: 'string',
        defaultValue: '',
        inputUI: {
          type: 'text',
        },
        tooltip: `Specify if DTS should be converted to FLAC. Optional.
                 \\nExample:\\n
                 true
    
                 \\nExample:\\n
                 false`,
      },
      {
        name: 'remove_attachments',
        type: 'string',
        defaultValue: '',
        inputUI: {
          type: 'text',
        },
        tooltip: `Specify if any attachment streams should be removed. Optional.
                 \\nExample:\\n
                 true
    
                 \\nExample:\\n
                 false`,
      },
    ],
  };
}

function plugin(file, librarySettings, inputs) {
  var response = {
    processFile: false,
    preset: "",
    handBrakeMode: false,
    FFmpegMode: true,
    reQueueAfter: true,
    infoLog: "",
  };

  // Check if inputs.container has been configured. If it hasn't then exit plugin.
  if (inputs.container == "") {
    response.infoLog +=
      "☒Container has not been configured within plugin settings, please configure required options. Skipping this plugin. \n";
    response.processFile = false;
    return response;
  }

  // Check if inputs.language has been configured. If it hasn't then exit plugin.
  if (inputs.language == "") {
    response.infoLog +=
      "☒Language/s keep have not been configured within plugin settings, please configure required options. Skipping this plugin.  \n";
    response.processFile = false;
    return response;
  }

  // Check if file is a video. If it isn't then exit plugin.
  if (file.fileMedium !== "video") {
    response.processFile = false;
    response.infoLog += "☒File is not a video. \n";
    return response;
  }

  // Set up required variables.
  var ffmpegCommandInsert = "";
  var videoIdx = 0;
  var audioIdx = 0;
  var subtitleIdx = 0;
  var convert = false;
  var language = inputs.language.split(",");
  var subtitle_language = inputs.subtitle_language.split(",");
  var audioStreamsRemoved = 0;
  var audioStreamCount = file.ffProbeData.streams.filter(
    (row) => row.codec_type.toLowerCase() == "audio"
  ).length;
  var has2Channel = false;
  var has6Channel = false;
  var has8Channel = false;
  var attachmentStreamFound = false;


  // Check if inputs.custom_title_matching has been configured. If it has then set variable
  if (typeof inputs.custom_title_matching != "undefined") {
    var custom_title_matching = inputs.custom_title_matching.toLowerCase().split(",");
  }

  // Check if force_conform option is checked. If so then check streams and add any extra parameters required to make file conform with output format.
  if (inputs.force_conform == "true") {
    if (inputs.container.toLowerCase() == "mkv") {
      ffmpegCommandInsert += `-map -0:d `;
      for (var i = 0; i < file.ffProbeData.streams.length; i += 1)
        try {
          if (
            file.ffProbeData.streams[i].codec_name
            .toLowerCase() == "mov_text" ||
            file.ffProbeData.streams[i].codec_name
            .toLowerCase() == "eia_608" ||
            file.ffProbeData.streams[i].codec_name
            .toLowerCase() == "timed_id3"
          ) {
            ffmpegCommandInsert += `-map -0:${i} `;
          }
        } catch (err) {}
    }
    if (inputs.container.toLowerCase() == "mp4") {
      for (var i = 0; i < file.ffProbeData.streams.length; i += 1)
        try {
          if (
            file.ffProbeData.streams[i].codec_name
            .toLowerCase() == "hdmv_pgs_subtitle" ||
            file.ffProbeData.streams[i].codec_name
            .toLowerCase() == "eia_608" ||
            file.ffProbeData.streams[i].codec_name
            .toLowerCase() == "subrip" ||
            file.ffProbeData.streams[i].codec_name
            .toLowerCase() == "timed_id3"
          ) {
            ffmpegCommandInsert += `-map -0:${i} `;
          }
        } catch (err) {}
    }
  }

  // Check if overall file metadata title is not empty, if it's not empty set to "".
  if (
    !(
      typeof file.meta.Title === 'undefined' ||
      file.meta.Title === '""' ||
      file.meta.Title === ''
    )
  ) {
    try {
      ffmpegCommandInsert += ` -metadata title= `;
      convert = true;
    } catch (err) {}
  }

  // Check if inputs.remove_attachments is set to true AND if stream is attachment stream. Removing any streams that are applicable.
  if (inputs.remove_attachments.toLowerCase() == "true") {
      for (var i = 0; i < file.ffProbeData.streams.length; i += 1)
        try {
          if (
            file.ffProbeData.streams[i].codec_type.toLowerCase() == "attachment"
          ) {
            attachmentStreamFound = true;
            convert = true;
          }
        } catch (err) {}
      if (attachmentStreamFound == true) {
        response.infoLog += `☒Attachment stream was found and input is set to remove.\n`;
        ffmpegCommandInsert += `-map -0:t `;
      }
    }

  // Go through each stream in the file.
  for (var i = 0; i < file.ffProbeData.streams.length; i += 1) {
    try {
      // Go through all audio streams and check if 2,6 & 8 channel tracks exist or not.
      if (file.ffProbeData.streams[i].codec_type.toLowerCase() == "audio" &&
        !(file.ffProbeData.streams[i].tags.title
          .toLowerCase()
          .includes("commentary") ||
          file.ffProbeData.streams[i].tags.title
          .toLowerCase()
          .includes("description") &&
          !(language.indexOf(file.ffProbeData.streams[i].tags.language.toLowerCase()) === -1)))
      {
        if (
		  file.ffProbeData.streams[i].channels == "2"
		  && file.ffProbeData.streams[i].tags.language.toLowerCase() === 'eng'
		) {
          has2Channel = true;
        }
        if (
		  file.ffProbeData.streams[i].channels == "6"
		  && file.ffProbeData.streams[i].tags.language.toLowerCase() === 'eng'
		) {
          has6Channel = true;
        }
        if (
		  file.ffProbeData.streams[i].channels == "8"
		  && file.ffProbeData.streams[i].tags.language.toLowerCase() === 'eng'
		) {
          has8Channel = true;
        }
      }
    } catch (err) {}
  }

  // Go through each stream in the file.
  for (var i = 0; i < file.ffProbeData.streams.length; i += 1) {
    // Check if stream is a video.
    if (file.ffProbeData.streams[i].codec_type.toLowerCase() == "video") {
      // Check if codec of stream is mjpeg/png, if so then remove this "video" stream. mjpeg/png are usually embedded pictures that can cause havoc with plugins.
      if (file.ffProbeData.streams[i].codec_name == "mjpeg" || file.ffProbeData.streams[i].codec_name == "png") {
        ffmpegCommandInsert += `-map -v:${videoIdx} `;
      }

      //Check if file.container does NOT match inputs.container. If so remux file.
      if (file.container != inputs.container) {
        response.infoLog += `☒File is currently ${file.container} but requested to be in ${inputs.container} container. Remuxing. \n`;
        convert = true;
      } else if (file.container == inputs.container) {
        response.infoLog += `☑File is already in ${inputs.container} container. \n`;
      }


      try {
        // Check if stream title is not empty, if it's not empty set to "".
        if (
          !(
            typeof file.ffProbeData.streams[i].tags.title === 'undefined' ||
            file.ffProbeData.streams[i].tags.title === '""' ||
            file.ffProbeData.streams[i].tags.title === ''
          )
        ) {
          response.infoLog += `☒Video stream title is not empty, most likely junk metadata. Removing title from stream ${i} \n`;
          ffmpegCommandInsert += `-metadata:s:v:${videoIdx} title= `;
          convert = true;
        }
      } catch (err) {}

      // Increment videoIdx.
      videoIdx++;
    }

    // Check if title metadata of audio stream has more then 3 full stops.
    // If so then it's likely to be junk metadata so remove.
    // Then check if any audio streams match with user input custom_title_matching variable, if so then remove.
    if (file.ffProbeData.streams[i].codec_type.toLowerCase() == "audio") {
      if (inputs.clean_audio.toLowerCase() == "true")
        try {
          if (
            !(
              typeof file.ffProbeData.streams[i].tags.title === 'undefined' ||
              file.ffProbeData.streams[i].tags.title === '""' ||
              file.ffProbeData.streams[i].tags.title === ''
            )
          ) {
            if (file.ffProbeData.streams[i].tags.title.split(".").length - 1 > 3)
              try {
                response.infoLog += `☒More then 3 full stops detected in audio title, likely to be junk metadata. Removing title from stream ${i} \n`;
                ffmpegCommandInsert += `-metadata:s:a:${audioIdx} title= `;
                convert = true;
              } catch (err) {}
            if (typeof inputs.custom_title_matching != "undefined")
              try {
                if (custom_title_matching.indexOf(file.ffProbeData.streams[i].tags.title.toLowerCase()) !== -1) {
                  response.infoLog += `☒Audio matched custom input. Removing title from stream ${i} \n`;
                  ffmpegCommandInsert += `-metadata:s:a:${audioIdx} title= `;
                  convert = true;
                }
              } catch (err) {}
          }
        } catch (err) {}
      // Check if stream is audio AND checks if the tracks language code does not match any of the languages entered in inputs.language.
      try {
        if (language.indexOf(file.ffProbeData.streams[i].tags.language.toLowerCase()) === -1) {
          audioStreamsRemoved++;
          ffmpegCommandInsert += `-map -0:a:${audioIdx} `;
          response.infoLog += `☒Audio stream detected as being an unwanted language, removing. Audio stream 0:a:${audioIdx} - ${file.ffProbeData.streams[
          i
        ].tags.language.toLowerCase()} \n`;
          convert = true;
        }
      } catch (err) {}

      // Catch error here incase the title metadata is completely missing.
      try {
        // Check if inputs.commentary is set to true AND if stream is audio AND then checks for stream titles with the following "commentary, description". Removing any streams that are applicable.
        if (inputs.commentary.toLowerCase() == "true" &&
          (file.ffProbeData.streams[i].tags.title
            .toLowerCase()
            .includes("commentary") ||
            file.ffProbeData.streams[i].tags.title
            .toLowerCase()
            .includes("description"))
        ) {
          audioStreamsRemoved++;
          ffmpegCommandInsert += `-map -0:a:${audioIdx} `;
          response.infoLog += `☒Audio stream detected as being Commentary or Description, removing. Audio stream 0:a:${audioIdx} - ${file.ffProbeData.streams[i].tags.title}. \n`;
          convert = true;
        }
      } catch (err) {}

      // Check if inputs.tag_language has something entered (Entered means user actually wants something to happen, empty would disable this) AND checks that stream is audio.
      if (inputs.tag_language != "") {
        // Catch error here incase the metadata is completely missing.
        try {
          // Look for audio with "und" or "cpe" as metadata language.
          if (
            file.ffProbeData.streams[i].tags.language
            .toLowerCase()
            .includes("und") ||
            file.ffProbeData.streams[i].tags.language
            .toLowerCase()
            .includes("cpe")
          ) {
            ffmpegCommandInsert += `-metadata:s:a:${audioIdx} language=${inputs.tag_language} `;
            response.infoLog += `☒Audio stream detected as having unknown language tagged, tagging as ${inputs.tag_language}. \n`;
            convert = true;
          }
        } catch (err) {}

        // Checks if the tags metadata is completely missing, if so this would cause playback to show language as "undefined". No catch error here otherwise it would never detect the metadata as missing.
        if (typeof file.ffProbeData.streams[i].tags == "undefined") {
          ffmpegCommandInsert += `-metadata:s:a:${audioIdx} language=${inputs.tag_language} `;
          response.infoLog += `☒Audio stream detected as having no language tagged, tagging as ${inputs.tag_language}. \n`;
          convert = true;
        }
        // Checks if the tags.language metadata is completely missing, if so this would cause playback to show language as "undefined". No catch error here otherwise it would never detect the metadata as missing.
        else {
          if (typeof file.ffProbeData.streams[i].tags.language == "undefined") {
            ffmpegCommandInsert += `-metadata:s:a:${audioIdx} language=${inputs.tag_language} `;
            response.infoLog += `☒Audio stream detected as having no language tagged, tagging as ${inputs.tag_language}. \n`;
            convert = true;
          }
        }
      }

      try {
        // Check if title metadata is missing from any streams AND inputs.tag_title set to true AND if stream type is audio. Add title to any applicable streams.
        if (
          typeof file.ffProbeData.streams[i].tags.title == "undefined" &&
          inputs.tag_title.toLowerCase() == "true" &&
          file.ffProbeData.streams[i].codec_type.toLowerCase() == "audio"
        ) {
          if (file.ffProbeData.streams[i].channels == "8") {
            ffmpegCommandInsert += `-metadata:s:a:${audioIdx} title="7.1" `;
            response.infoLog += `☒Audio stream detected as 8 channel audio track with no title, tagging title. Audio stream 0:a:${audioIdx} tagged as "7.1" \n`;
            convert = true;
          }
          if (file.ffProbeData.streams[i].channels == "6") {
            ffmpegCommandInsert += `-metadata:s:a:${audioIdx} title="5.1" `;
            response.infoLog += `☒Audio stream detected as 6 channel audio track with no title, tagging title. Audio stream 0:a:${audioIdx} tagged as "5.1" \n`;
            convert = true;
          }
          if (file.ffProbeData.streams[i].channels == "2") {
            ffmpegCommandInsert += `-metadata:s:a:${audioIdx} title="2.0" `;
            response.infoLog += `☒Audio stream detected as 2 channel audio track with no title, tagging title. Audio stream 0:a:${audioIdx} tagged as "2.0" \n`;
            convert = true;
          }
        }
      } catch (err) {}

      // Catch error here incase user left inputs.downmix empty.
      try {
        // Check if inputs.downmix is set to true.
        if (inputs.downmix.toLowerCase() == "true") {
          // Check if file has 8 channel audio but no 6 channel, if so then create extra downmix from the 8 channel.
          if (
            has8Channel == true &&
            has6Channel == false &&
            file.ffProbeData.streams[i].channels == "8" &&
            !(language.indexOf(file.ffProbeData.streams[i].tags.language.toLowerCase()) === -1) &&
			file.ffProbeData.streams[i].tags.language.toLowerCase() === 'eng'
          ) {
            ffmpegCommandInsert += `-map 0:${i} -c:a:${audioIdx} ac3 -ac 6 -metadata:s:a:${audioIdx} title="5.1" `;
            response.infoLog +=
              "☒Audio track is 8 channel, no 6 channel exists. Creating 6 channel from 8 channel. \n";
            convert = true;
			has6Channel = true;
          }
          // Check if file has 6 channel audio but no 2 channel, if so then create extra downmix from the 6 channel.
          if (
            has6Channel == true &&
            has2Channel == false &&
            file.ffProbeData.streams[i].channels == "6" &&
            !(language.indexOf(file.ffProbeData.streams[i].tags.language.toLowerCase()) === -1) &&
			file.ffProbeData.streams[i].tags.language.toLowerCase() === 'eng'
          ) {
            ffmpegCommandInsert += `-map 0:${i} -c:a:${audioIdx} aac -ac 2 -metadata:s:a:${audioIdx} title="2.0" `;
            response.infoLog +=
              "☒Audio track is 6 channel, no 2 channel exists. Creating 2 channel from 6 channel. \n";
            convert = true;
			has2Channel = true;
          }
        }
      } catch (err) {}

      // Catch error here incase user left inputs.aac_stereo empty.
      try {
        // Check if inputs.aac_stereo is set to true.
        if (inputs.aac_stereo.toLowerCase() == "true") {
          // Check if codec_name for stream is NOT aac AND check if channel ammount is 2.
          if (
            file.ffProbeData.streams[i].codec_name != "aac" &&
            file.ffProbeData.streams[i].channels == "2"
          ) {
            ffmpegCommandInsert += `-c:a:${audioIdx} aac `;
            response.infoLog +=
              "☒Audio track is 2 channel but is not AAC. Converting. \n";
            convert = true;
          }
        }
      } catch (err) {}

      // Catch error here incase user left inputs.dts_flac empty.
      try {
        // Check if inputs.dts_flac is set to true.
        if (inputs.dts_flac === 'true') {
          // Check if codec_name for stream is dts.
          if (
            file.ffProbeData.streams[i].codec_name === 'dts'
          ) {

            if (
              file.ffProbeData.streams[i].channels === 2
            ) {
              ffmpegCommandInsert += `-c:a:${audioIdx} flac -metadata:s:a:${audioIdx} title="2.0" `;
            } if (
              file.ffProbeData.streams[i].channels === 6
            ) {
              ffmpegCommandInsert += `-c:a:${audioIdx} flac -metadata:s:a:${audioIdx} title="5.1" `;
            } if (
              file.ffProbeData.streams[i].channels === 8
            ) {
              ffmpegCommandInsert += `-c:a:${audioIdx} flac -metadata:s:a:${audioIdx} title="7.1" `;
            } 
            response.infoLog += '☒Audio track is DTS, converting to flac. \n';
            convert = true;
          }
        }
      } catch (err) {
        // Error
      }

      // Increment audioIdx.
      audioIdx++;
    }

    // Check if title metadata of subtitle stream has more then 3 full stops.
    // If so then it's likely to be junk metadata so remove.
    // Then check if any streams match with user input custom_title_matching variable, if so then remove.
    if (file.ffProbeData.streams[i].codec_type.toLowerCase() == "subtitle") {
      if (inputs.clean_subtitles.toLowerCase() == "true")
        try {
          if (
            !(
              typeof file.ffProbeData.streams[i].tags.title === 'undefined' ||
              file.ffProbeData.streams[i].tags.title === '""' ||
              file.ffProbeData.streams[i].tags.title === ''
            )
          ) {
            if (file.ffProbeData.streams[i].tags.title.split(".").length - 1 > 3)
              try {
                response.infoLog += `☒More then 3 full stops detected in subtitle title, likely to be junk metadata. Removing title from stream ${i} \n`;
                ffmpegCommandInsert += ` -metadata:s:s:${subtitleIdx} title= `;
                convert = true;
              } catch (err) {}
            if (typeof inputs.custom_title_matching != "undefined")
              try {
                if (custom_title_matching.indexOf(file.ffProbeData.streams[i].tags.title.toLowerCase()) !== -1) {
                  response.infoLog += `☒Subtitle matched custom input. Removing title from stream ${i} \n`;
                  ffmpegCommandInsert += ` -metadata:s:s:${subtitleIdx} title= `;
                  convert = true;
                }
              } catch (err) {}
          }
        } catch (err) {}

      try {
        // Check if stream is subtitle AND checks if the tracks language code does not match any of the languages entered in inputs.language.
        if (subtitle_language.indexOf(
            file.ffProbeData.streams[i].tags.language.toLowerCase()
          ) === -1) {
          ffmpegCommandInsert += `-map -0:s:${subtitleIdx} `;
          response.infoLog += `☒Subtitle stream detected as being an unwanted language, removing. Subtitle stream 0:s:${subtitleIdx} - ${file.ffProbeData.streams[
          i
        ].tags.language.toLowerCase()} \n`;
          convert = true;
        }
      } catch (err) {}

      // Catch error here incase the title metadata is completely missing.
      try {
        // Check if inputs.commentary is set to true AND if stream is subtitle AND then checks for stream titles with the following "commentary, description". Removing any streams that are applicable.
        if (
          inputs.commentary.toLowerCase() == "true" &&
          file.ffProbeData.streams[i].codec_type.toLowerCase() == "subtitle" &&
          (file.ffProbeData.streams[i].tags.title
            .toLowerCase()
            .includes("commentary") ||
            file.ffProbeData.streams[i].tags.title
            .toLowerCase()
            .includes("description"))
        ) {
          ffmpegCommandInsert += `-map -0:s:${subtitleIdx} `;
          response.infoLog += `☒Subtitle stream detected as being Commentary or Description, removing. Subtitle stream 0:s:${subtitleIdx} - ${file.ffProbeData.streams[i].tags.title}. \n`;
          convert = true;
        }
      } catch (err) {}
	  
    // Catch error here incase the title metadata is completely missing.
    try {
      // Check if inputs.forced is set to true
      // AND if stream is subtitle
      // AND then checks for stream titles with the following "force.
      // Removing any streams that are applicable.
      if (
        inputs.forced === true
        && file.ffProbeData.streams[i].codec_type.toLowerCase() === 'subtitle'
        && (file.ffProbeData.streams[i].tags.title
          .toLowerCase()
          .includes('force'))
      ) {
        ffmpegCommandInsert += `-map -0:s:${subtitleIdx} `;
        response.infoLog += `☒Subtitle stream 0:s:${subtitleIdx} detected as being forced, removing. \n`;
        convert = true;
      }
    } catch (err) {
      // Error
    }

    // Catch error here incase the title metadata is completely missing. working on this bit
    try {
      // Check if wanted languages includes portuguese
      // AND if stream is subtitle
      // AND then checks for stream titles with "brazil".
      // Removing any streams that are applicable.
      if (
        inputs.language.includes('por')
        && file.ffProbeData.streams[i].codec_type.toLowerCase() === 'subtitle'
        && (file.ffProbeData.streams[i].tags.title
          .toLowerCase()
          .includes('brazil'))
      ) {
        ffmpegCommandInsert += `-map -0:s:${subtitleIdx} `;
        response.infoLog += `☒Subtitle stream 0:s:${subtitleIdx} detected as being brazillian instead of portuguese, removing. \n`;
        convert = true;
      }
    } catch (err) {
      // Error
    }

      // Check if inputs.tag_language has something entered (Entered means user actually wants something to happen, empty would disable this) AND checks that stream is subtitle.
      if (
        inputs.tag_language != "" &&
        file.ffProbeData.streams[i].codec_type.toLowerCase() == "subtitle"
      ) {
        // Catch error here incase the metadata is completely missing.
        try {
          // Look for subtitle with "und" as metadata language.
          if (
            file.ffProbeData.streams[i].tags.language
            .toLowerCase()
            .includes("und")
          ) {
            ffmpegCommandInsert += `-metadata:s:s:${subtitleIdx} language=${inputs.tag_language} `;
            response.infoLog += `☒Subtitle stream detected as having unknown language tagged, tagging as ${inputs.tag_language}. \n`;
            convert = true;
          }
        } catch (err) {}

        // Checks if the tags metadata is completely missing, if so this would cause playback to show language as "undefined". No catch error here otherwise it would never detect the metadata as missing.
        if (typeof file.ffProbeData.streams[i].tags == "undefined") {
          ffmpegCommandInsert += `-metadata:s:s:${subtitleIdx} language=${inputs.tag_language} `;
          response.infoLog += `☒Subtitle stream detected as having no language tagged, tagging as ${inputs.tag_language}. \n`;
          convert = true;
        }
        // Checks if the tags.language metadata is completely missing, if so this would cause playback to show language as "undefined". No catch error here otherwise it would never detect the metadata as missing.
        else {
          if (typeof file.ffProbeData.streams[i].tags.language == "undefined") {
            ffmpegCommandInsert += `-metadata:s:s:${subtitleIdx} language=${inputs.tag_language} `;
            response.infoLog += `☒Subtitle stream detected as having no language tagged, tagging as ${inputs.tag_language}. \n`;
            convert = true;
          }
        }
      }

      // Increment subtitleIdx.
      subtitleIdx++;
    }

  }



  // Failsafe to cancel processing if all streams would be removed following this plugin. We don't want no audio.
  if (audioStreamsRemoved == audioStreamCount) {
    response.infoLog +=
      "☒Cancelling plugin otherwise all audio tracks would be removed. \n";
    response.processFile = false;
    return response;
  }


  // Convert file if convert variable is set to true.
  if (convert == true) {
    response.container = "." + inputs.container;
    response.preset += `, -map 0 -c copy ${ffmpegCommandInsert} -max_muxing_queue_size 9999`;
    response.processFile = true;
    response.infoLog += `☒File has matched a transcode condition. \n`;
  } else {
    response.infoLog += "☑File didn't match any trasncode/remux conditions. \n";
  }
  return response;
}
module.exports.details = details;
module.exports.plugin = plugin;