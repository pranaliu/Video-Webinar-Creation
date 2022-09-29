import AgoraRTC from "agora-rtc-sdk-ng";
import AgoraRTM from "./agora-rtm-sdk-1.5.1.js";
import { app_data } from "./env.js";


let uid = sessionStorage.getItem("uid");
if (!uid) {
  uid = Math.floor(Math.random() * 232);
  sessionStorage.setItem("uid", uid);
}
//required data to join channel
let token= app_data.token;
let appId=  app_data.appID;
let channel= app_data.channel;
let role= "audience";
let audienceLatency= 1;

let client;
let rtcClient;
let rtmClient;
let rtcchannel;
//var role;

//let hostname="";
let displayname=""; //Check on users count to determine this

let statsInterval;
let stats = "";

//Declare Variables for Live streaming and initialize
let localTracks = [];
let remoteUsers = {};

let localScreenTracks;
let sharingScreen = false;
let streaming = false;
//roomId = channel

let clientRoleOptions = {
  // Set latency level to low latency
  level: 1,
};
let displayFrame;
let videoFrames;
let userIdInDisplayFrame = null;


let joinRoomInit = async () => {
  client = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
  AgoraRTC.enableLogUpload();
  rtmClient = await AgoraRTM.createInstance(appId);
  // await rtmClient.login({uid,token});

  // await rtmClient.addOrUpdateLocalUserAttributes({'name':displayName})

 
  displayFrame = document.getElementById("stream__box");
  videoFrames = document.getElementsByClassName("video__container");


};
let joinHostStream = async () => {
  document.getElementById("join-btn").style.display = "none";
  document.getElementById("join-host-btn").style.display = "none";
  document.getElementsByClassName("stream__actions")[0].style.display = "flex";
  document.getElementById("stats").style.display = "flex";
  client.setClientRole("host");
  role = "host";
  //PRANALI Create Random Host Name for chat functionality. Later scale this up to get names before joining channel
  displayname = "host_"+uid.toString();
  console.log("PRANALI Host name created is:"+ displayname);
  //PRANALI store hostname in session to use for chat
  sessionStorage.setItem('display_name', displayname);
  console.log("PRANALI Session stored host name is:"+ sessionStorage.getItem("display_name"));
  //console.log("PRANALI joining client role joined is:" + options.role);
  //Chk RTM 
  await rtmClient.login(uid,token);
  let rtmchannel = await rtmClient.createChannel(channel);
   await rtmchannel.join();
   rtmchannel.on('MemberJoined', handleMemberJoined);
  //await rtmClient.channel.join();

  //channel.on('MemberJoined', handleMemberJoined);
  await client.join(appId, channel, token, uid);

  
  // rtmchannel.on('MemberJoined', handleMemberJoined);
  //rtmClient. RTM channel same 
  
  //channel.join();

  //join RTM channel

    //join RTM channel
   // await rtmClient.login({uid,token});
  //rtcchannel = await rtmClient.createChannel(channel);
  //rtmClient.channel = channel;
  //await rtcchannel.join();

  localTracks = await AgoraRTC.createMicrophoneAndCameraTracks();

  let player = `<div class="video__container" id="user-container-${uid}">
                    <div class="video-player" id="user-${uid}"></div>
                 </div>`;

  document
    .getElementById("streams__container")
    .insertAdjacentHTML("beforeend", player);
  // document.getElementById(`user-container-${uid}`).addEventListener('click', expandVideoFrame)

  localTracks[1].play(`user-${uid}`);
  await client.publish([localTracks[0], localTracks[1]]);
  //await client.publish(Object.values(localTracks));
  console.log("publish success");
  

  // await rtmClient.addOrUpdateLocalUserAttributes({'name':displayName})


  //console.log("PRANALI calling audio stats function ");
  //inCallStats();
  initStats();
  //console.log("PRANALI outside of calling audio stats function ");
};

let joinStream = async () => {
  document.getElementById("join-btn").style.display = "none";
  document.getElementById("join-host-btn").style.display = "none";
  document.getElementsByClassName("stream__actions")[0].style.display = "flex";
  document.getElementById("stats").style.display = "flex";
  if (role === "audience") {
    client.setClientRole(role, { level: audienceLatency });
    role = "audience";
  //Create Random Audience Name for chat functionality. Later scale this up to get names before joining channel
  displayname = "User_"+uid.toString();
  console.log("PRANALI display name created is:"+ displayname);
    //PRANALI store hostname in session to use for chat
    sessionStorage.setItem("display_name", displayname);
    //sessionStorage.setItem("key", "value");
    console.log("PRANALI Session stored user name is:"+ sessionStorage.getItem("display_name"));
  
  
    //PRANALI join channel as audience
    await client.join(appId,channel,token,uid);
    // add event listener to play remote tracks when remote user publishs.
    //console.log("PRANALI calling handleuserpublished function");
    if (client.publish) client.on("user-published", handleUserPublished);
    //console.log("PRANALI outside of call handleuserpublished");
    //client.on("user-unpublished", handleUserUnpublished);
    client.on("user-left", handleUserLeft);
  } else {
    client.setClientRole(role);
    //console.log("PRANALI joining else client role joined is:" + options.role);
  }
  initStats();
  await client.join(options.appId, options.channel, options.token, options.uid);

  //For Audience just ignore players for now
  // localTracks = await AgoraRTC.createMicrophoneAndCameraTracks();

  // let player = `<div class="video__container" id="user-container-${uid}">
  //                 <div class="video-player" id="user-${uid}"></div>
  //              </div>`

  // document.getElementById('streams__container').insertAdjacentHTML('beforeend', player)

};

let switchToCamera = async () => {
  let player = `<div class="video__container" id="user-container-${uid}">
                    <div class="video-player" id="user-${uid}"></div>
                 </div>`;
  displayFrame.insertAdjacentHTML("beforeend", player);

  await localTracks[0].setMuted(true);
  await localTracks[1].setMuted(true);

  document.getElementById("mic-btn").classList.remove("active");
  document.getElementById("screen-btn").classList.remove("active");

  localTracks[1].play(`user-${uid}`);
  await client.publish([localTracks[1]]);
};

// PRANALI comment this to find out what should happen with Remote track
let handleUserPublished = async (user, mediaType) => {
  //console.log("PRANALI We are in publish mode");
  remoteUsers[user.uid] = user;

  await client.subscribe(user, mediaType);

  let player = document.getElementById(`user-container-${user.uid}`);
  if (player != null) {
    player.remove();
  }
  player = `<div class="video__container" id="user-container-${user.uid}">
                <div class="video-player" id="user-${user.uid}"></div>
            </div>`;

  // if (player === null) {
  //   player = `<div class="video__container" id="user-container-${user.uid}">
  //               <div class="video-player" id="user-${user.uid}"></div>
  //           </div>`;

  document
    .getElementById("streams__container")
    .insertAdjacentHTML("beforeend", player);

  let videoFrame = document.getElementById(`user-container-${user.uid}`);
  if (mediaType === "video") {
    user.videoTrack.play(`user-${user.uid}`);
  }

  if (mediaType === "audio") {
    user.audioTrack.play();
  }
};


let handleUserLeft = async (user) => {
  //console.log("PRANALI we are in handleUserLeft function")
  delete remoteUsers[user.uid];
  let item = document.getElementById(`user-container-${user.uid}`);
  if (item) {
    item.remove();
  }

  if (userIdInDisplayFrame === `user-container-${user.uid}`) {
    displayFrame.style.display = null;

    let videoFrames = document.getElementsByClassName("video__container");

    for (let i = 0; videoFrames.length > i; i++) {
      videoFrames[i].style.height = "300px";
      videoFrames[i].style.width = "300px";
    }
  }
};

let toggleMic = async (e) => {
  let button = e.currentTarget;

  if (localTracks[0].muted) {
    await localTracks[0].setMuted(false);
    button.classList.add("active");
  } else {
    await localTracks[0].setMuted(true);
    button.classList.remove("active");
  }
};

let toggleCamera = async (e) => {
  let button = e.currentTarget;

  if (localTracks[1].muted) {
    await localTracks[1].setMuted(false);
    button.classList.add("active");
  } else {
    await localTracks[1].setMuted(true);
    button.classList.remove("active");
  }
};

let toggleScreen = async (e) => {
  let screenButton = e.currentTarget;
  let cameraButton = document.getElementById("camera-btn");

  if (!sharingScreen) {
    sharingScreen = true;

    screenButton.classList.add("active");
    cameraButton.classList.remove("active");
    cameraButton.style.display = "none";

    localScreenTracks = await AgoraRTC.createScreenVideoTrack();

    document.getElementById(`user-container-${uid}`).remove();
    displayFrame.style.display = "block";

    let player = `<div class="video__container" id="user-container-${uid}">
                <div class="video-player" id="user-${uid}"></div>
            </div>`;

    displayFrame.insertAdjacentHTML("beforeend", player);


    userIdInDisplayFrame = `user-container-${uid}`;
    localScreenTracks.play(`user-${uid}`);

    //Before sharing screen or other video always unpublish the existing video
    await client.unpublish([localTracks[1]]);
    await client.publish([localScreenTracks]);

    let videoFrames = document.getElementsByClassName("video__container");
    for (let i = 0; videoFrames.length > i; i++) {
      if (videoFrames[i].id != userIdInDisplayFrame) {
        videoFrames[i].style.height = "100px";
        videoFrames[i].style.width = "100px";
      }
    }
  } else {
    sharingScreen = false;
    cameraButton.style.display = "block";
    document.getElementById(`user-container-${uid}`).remove();
    await client.unpublish([localScreenTracks]);

    switchToCamera();
  }
};


let leaveStream = async (e) => {
  e.preventDefault();

  document.getElementById("join-btn").style.display = "block";
  document.getElementById("join-host-btn").style.display = "block";
  document.getElementsByClassName("stream__actions")[0].style.display = "none";
  document.getElementById("stats").style.display = "none";

  for (let i = 0; localTracks.length > i; i++) {
    localTracks[i].stop();
    localTracks[i].close();
  }

  if (localScreenTracks) {
    await client.unpublish([localScreenTracks]);
  }

  //console.log("PRANALI Client role is:"+ role);
  if (role === "host") {
    // console.log("PRANALI uid container is:" + uid);
    await client.unpublish([localTracks[0], localTracks[1]]);
    document.getElementById(`user-container-${uid}`).remove();
  }
  //Destruct collected in call stats
  destructStats();

  await client.leave();
  // channel.sendMessage({text:JSON.stringify({'type':'user_left', 'uid':uid})})
};

// start collect and show stats information
let initStats = async () => {
  statsInterval = setInterval(inCallStats, 1000);
};

// stop collect and show stats information
let destructStats = async () => {
  clearInterval(statsInterval);
  document.getElementById("stattextarea").setAttribute("value", "");
};

//PRANALI Add get in call stat
let inCallStats = async () => {
  // console.log("PRANALI inside of inCallStats function!");
  let statStr = "In Call Stats are :";

  const clientStats = client.getRTCStats();
  const clientStatsList = [
    {
      description: "Number of users in channel",
      value: clientStats.UserCount,
      unit: "",
    },
    {
      description: "Duration in channel",
      value: clientStats.Duration,
      unit: "s",
    },
    {
      description: "Bit rate receiving",
      value: clientStats.RecvBitrate,
      unit: "bps",
    },
    {
      description: "Bit rate being sent",
      value: clientStats.SendBitrate,
      unit: "bps",
    },
    {
      description: "Total bytes received",
      value: clientStats.RecvBytes,
      unit: "bytes",
    },
    {
      description: "Total bytes sent",
      value: clientStats.SendBytes,
      unit: "bytes",
    },
    {
      description: "Outgoing available bandwidth",
      value: clientStats.OutgoingAvailableBandwidth.toFixed(3),
      unit: "kbps",
    },
    {
      description: "RTT from SDK to SD-RTN access node",
      value: clientStats.RTT,
      unit: "ms",
    },
  ];
  clientStatsList.forEach((stat) => {
    statStr = statStr.concat(
      stats.concat(stat.description, ": ", stat.value, " : ", stat.unit)
    );
  });
  //console.log("PRANALI general stats values from string stats are: "+ JSON.stringify(statStr));

  const localStats = {
    video: client.getLocalVideoStats(),
    audio: client.getLocalAudioStats(),
  };
  const localStatsList = [
    {
      description: "Send audio bit rate",
      value: localStats.audio.sendBitrate,
      unit: "bps",
    },
    {
      description: "Total audio bytes sent",
      value: localStats.audio.sendBytes,
      unit: "bytes",
    },
    {
      description: "Total audio packets sent",
      value: localStats.audio.sendPackets,
      unit: "",
    },
    {
      description: "Total audio packets loss",
      value: localStats.audio.sendPacketsLost,
      unit: "",
    },
    {
      description: "Video capture resolution height",
      value: localStats.video.captureResolutionHeight,
      unit: "",
    },
    {
      description: "Video capture resolution width",
      value: localStats.video.captureResolutionWidth,
      unit: "",
    },
    {
      description: "Video send resolution height",
      value: localStats.video.sendResolutionHeight,
      unit: "",
    },
    {
      description: "Video send resolution width",
      value: localStats.video.sendResolutionWidth,
      unit: "",
    },
    {
      description: "video encode delay",
      value: Number(localStats.video.encodeDelay).toFixed(2),
      unit: "ms",
    },
    {
      description: "Send video bit rate",
      value: localStats.video.sendBitrate,
      unit: "bps",
    },
    {
      description: "Total video bytes sent",
      value: localStats.video.sendBytes,
      unit: "bytes",
    },
    {
      description: "Total video packets sent",
      value: localStats.video.sendPackets,
      unit: "",
    },
    {
      description: "Total video packets loss",
      value: localStats.video.sendPacketsLost,
      unit: "",
    },
    {
      description: "Video duration",
      value: localStats.video.totalDuration,
      unit: "s",
    },
    {
      description: "Total video freeze time",
      value: localStats.video.totalFreezeTime,
      unit: "s",
    },
  ];
  localStatsList.forEach((stat) => {
    statStr = statStr.concat(
      stats.concat(stat.description, ": ", stat.value, " : ", stat.unit)
    );
  });
  //Remote stats for audience user

  Object.keys(remoteUsers).forEach((uid) => {
    // get the remote track stats message
    const remoteTracksStats = {
      video: client.getRemoteVideoStats()[uid],
      audio: client.getRemoteAudioStats()[uid],
    };
    const remoteTracksStatsList = [
      //receiveDelay This property is inaccurate on Safari and Firefox. Also on Chrome receiving error on this
      // { description: "Delay of audio from sending to receiving", value: Number(remoteTracksStats.audio.receiveDelay).toFixed(2), unit: "ms" },
      // { description: "Delay of video from sending to receiving", value: Number(remoteTracksStats.video.receiveDelay).toFixed(2), unit: "ms" },
      {
        description: "Total audio bytes received",
        value: remoteTracksStats.audio.receiveBytes,
        unit: "bytes",
      },
      {
        description: "Total audio packets received",
        value: remoteTracksStats.audio.receivePackets,
        unit: "",
      },
      {
        description: "Total audio packets loss",
        value: remoteTracksStats.audio.receivePacketsLost,
        unit: "",
      },
      {
        description: "Total audio packets loss rate",
        value: Number(remoteTracksStats.audio.packetLossRate).toFixed(3),
        unit: "%",
      },
      {
        description: "Video received resolution height",
        value: remoteTracksStats.video.receiveResolutionHeight,
        unit: "",
      },
      {
        description: "Video received resolution width",
        value: remoteTracksStats.video.receiveResolutionWidth,
        unit: "",
      },
      {
        description: "Receiving video bit rate",
        value: remoteTracksStats.video.receiveBitrate,
        unit: "bps",
      },
      {
        description: "Total video bytes received",
        value: remoteTracksStats.video.receiveBytes,
        unit: "bytes",
      },
      {
        description: "Total video packets received",
        value: remoteTracksStats.video.receivePackets,
        unit: "",
      },
      {
        description: "Total video packets loss",
        value: remoteTracksStats.video.receivePacketsLost,
        unit: "",
      },
      {
        description: "Total video packets loss rate",
        value: Number(remoteTracksStats.video.receivePacketsLost).toFixed(3),
        unit: "%",
      },
      {
        description: "Video duration",
        value: remoteTracksStats.video.totalDuration,
        unit: "s",
      },
      {
        description: "Total video freeze time",
        value: remoteTracksStats.video.totalFreezeTime,
        unit: "s",
      },
      {
        description: "video freeze rate",
        value: Number(remoteTracksStats.video.freezeRate).toFixed(3),
        unit: "%",
      },
    ];
    remoteTracksStatsList.forEach((stat) => {
      statStr = statStr.concat(
        stats.concat(stat.description, ": ", stat.value, " : ", stat.unit)
      );
    });
  });

  //Show up Stats on UI
  document.getElementById("stattextarea").setAttribute("value", statStr);
};

document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("camera-btn").addEventListener("click", toggleCamera);
  document.getElementById("mic-btn").addEventListener("click", toggleMic);
  document.getElementById("screen-btn").addEventListener("click", toggleScreen);
  document
    .getElementById("join-host-btn")
    .addEventListener("click", joinHostStream);
  document.getElementById("join-btn").addEventListener("click", joinStream);
  document.getElementById("leave-btn").addEventListener("click", leaveStream);
});

//Handle member join RTM
let handleMemberJoined = async (MemberId) => {
  console.log('PRANALI A new member has joined the room:', MemberId)
  // addMemberToDom(MemberId)

  // let members = await channel.getMembers()
  // updateMemberTotal(members)

  // let {name} = await rtmClient.getUserAttributesByKeys(MemberId, ['name'])

}

joinRoomInit();
