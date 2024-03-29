import AgoraRTC from "agora-rtc-sdk-ng";
import AgoraRTM from "./agora-rtm-sdk-1.5.1.js";
import { app_data } from "./env.js";


let uid = sessionStorage.getItem("uid");
if (!uid) {
  //change uid to string for RTC method.
  uid = String(Math.floor(Math.random() * 232));
  sessionStorage.setItem("uid", uid);
}
//required data to join channel
//let token = app_data.token;
let token = null;
let appId = app_data.appID;
let channel = app_data.channel;
let role = "audience";
let audienceLatency = 1;

let client;
let rtcClient;
let rtcchannel;
let rtmClient;
var rtmchannel;

let displayname = ""; //Check on users count to determine this

let statsInterval;
let stats = "";
let displayStat = false;
let handRaiseState = false;

//Declare Variables for Live streaming and initialize
let localTracks = [];
let remoteUsers = {};

let localScreenTracks;
let sharingScreen = false;
let streaming = false;

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

  displayFrame = document.getElementById("stream__box");
  videoFrames = document.getElementsByClassName("video__container");
};

let joinChatinit = async () => {
  displayname = "user_" + uid;
  //console.log("PRANALI Host name created is:" + displayname);
  //PRANALI store hostname in session to use for chat
  sessionStorage.setItem("display_name", displayname);
  // console.log(
  //   "PRANALI Session stored host name is:" +
  //     sessionStorage.getItem("display_name")
  // );
  //Chk RTM
  rtmClient = await AgoraRTM.createInstance(appId);
  //await rtmClient.login({uid,token});
  //Remove Token
  await rtmClient.login({ uid: uid });
  await rtmClient.addOrUpdateLocalUserAttributes({ name: displayname });
  rtmchannel = await rtmClient.createChannel(channel);
  await rtmchannel.join();
  rtmchannel.on("MemberJoined", handleMemberJoined);
  rtmchannel.on("MemberLeft", handleMemberLeft);
  rtmchannel.on("ChannelMessage", handleChannelMessage);
  rtmchannel.on("MessageFromPeer",handleMessageFromPeer);
  getMembers();
};

let joinHostStream = async () => {
  console.log("PRANALI We are inside joinHostStream Function!");
  document.getElementById("join-btn").style.display = "none";
  document.getElementById("join-host-btn").style.display = "none";
  document.getElementsByClassName("stream__actions")[0].style.display = "flex";
  //document.getElementById("stats").style.display = "flex";
  client.setClientRole("host");
  role = "host";
  joinChatinit();
  await client.join(appId, channel, token, uid);

  localTracks = await AgoraRTC.createMicrophoneAndCameraTracks();

  let player = `<div class="video__container" id="user-container-${uid}">
                    <div class="video-player" id="user-${uid}"></div>
                 </div>`;

  document
    .getElementById("streams__container")
    .insertAdjacentHTML("beforeend", player);

  localTracks[1].play(`user-${uid}`);
  await client.publish([localTracks[0], localTracks[1]]);

  console.log("publish success");

  //initStats();
};

let joinStream = async () => {
  document.getElementById("join-btn").style.display = "none";
  document.getElementById("join-host-btn").style.display = "none";
  document.getElementsByClassName("stream__actions")[0].style.display = "flex";
  document.getElementById("raisehand-btn").style.display="flex";
  // document.getElementById("stats").style.display = "flex";
  if (role === "audience") {
    client.setClientRole(role, { level: audienceLatency });
    role = "audience";
    joinChatinit();
    //PRANALI join channel as audience
    await client.join(appId, channel, token, uid);
    // add event listener to play remote tracks when remote user publishs.
    if (client.publish) client.on("user-published", handleUserPublished);
    client.on("user-left", handleUserLeft);
  } else {
    client.setClientRole(role);
  }

//Raise Hand Functionality
document.getElementById("raisehand-btn").addEventListener("click", toggleHandRaise);
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

let toggleCallStat = async (e) => {
  let button = e.currentTarget;
  displayStat = !displayStat;
  if (!displayStat) {
    destructStats();
    button.classList.add("active");
  } else {
    button.classList.remove("active");
    initStats();
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

let toggleHandRaise = async(e) =>{
  let button = e.currentTarget;
  //handRaiseState = !handRaiseState;
  if (!handRaiseState) {
    //If Hand raise is false
    handRaiseState = true;
    button.classList.add("active");
    //document.getElementById("raisehand-btn").innerText="Lower Hand";
   // document.getElementById("raisehand-btn").src="../images/raised-hand-light.png";
    <img src="images/raised-hand-light.png" />
    console.log("PRANALI Hand raised.");
    //Inform host on hand raise
    await rtmchannel.sendMessage({
      text: JSON.stringify({ type: "handraise", displayName: displayname, message:"raised" }),
    }).then(() => {
      console.log("PRANALI Message sent successfully.");
      console.log("PRANALI Your message was: raised" + " sent by: " + displayname);
  }).catch((err) => {
      console.error("PRANALI Message sending failed: " + err);
  })
    
    //Do nothing
  } else {
     //If Hand raise is true
    handRaiseState = false;
    button.classList.remove("active");
    //document.getElementById("raisehand-btn").innerText="Raise Hand";
   // document.getElementById("raisehand-btn").src="../images/raised-hand-icon.png";
        //Send Message to host
        console.log("PRANALI Hand lowered.");
        //send host a message lowering hand

        await rtmchannel.sendMessage({text: JSON.stringify({ type: "handraise", displayName: displayname, message:"lowered" }),}).then(() => {
          console.log("PRANALI Message sent successfully.");
          console.log("PRANALI Your message was: lowered" + " sent by: " + displayname);
      }).catch((err) => {
          console.error("PRANALI Message sending failed: " + err);
      })
   
    //Once message is confirm change role to host
    //Leave existing channel and join as host
    //if Host declines request continue as adudience
   /*
 // Inform channel that rand was raised
                    await channel.sendMessage({ text: "lowered" }).then(() => {
                        console.log("Message sent successfully.");
                        console.log("Your message was: lowered" + " sent by: " + accountName);
                    }).catch((err) => {
                        console.error("Message sending failed: " + err);
                    })
   */
  }

};

let leaveStream = async (e) => {
  e.preventDefault();
console.log("PRANALI we are inside LeaveStream Function!");
  document.getElementById("join-btn").style.display = "block";
  document.getElementById("join-host-btn").style.display = "block";
  document.getElementsByClassName("stream__actions")[0].style.display = "none";
  document.getElementById("stats").style.display = "none";
  //Disable message area
  document.getElementById("messagetextbox").disabled = true;



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
  //PRANALI add message on user left
  rtmchannel.sendMessage({
    text: JSON.stringify({ type: "user_left", displayName: displayname }),
  });

  //Leave the communication channel
  //await leaveChannel();
  await leaveChannel();

  await client.leave();
};

// start collect and show stats information
let initStats = async () => {
  document.getElementById("stats").style.display = "flex";
  statsInterval = setInterval(inCallStats, 1000);
};

// stop collect and show stats information
let destructStats = async () => {
  clearInterval(statsInterval);
  document.getElementById("stattextarea").setAttribute("value", "");
  document.getElementById("stats").style.display = "none";
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
  document.getElementById("join-host-btn").addEventListener("click", joinHostStream);
  document.getElementById("join-btn").addEventListener("click", joinStream);
  document.getElementById("leave-btn").addEventListener("click", leaveStream);
  document.getElementById("callstat-btn").addEventListener("click", toggleCallStat);
  let messageForm = document.getElementById("message__form");
  messageForm.addEventListener("submit", sendMessage);
});

//Handle member join RTM
let handleMemberJoined = async (MemberId) => {
  console.log("PRANALI A new member has joined the room:", MemberId);
  addMemberToDom(MemberId);

  let members = await rtmchannel.getMembers();
  updateMemberTotal(members);

  let { name } = await rtmClient.getUserAttributesByKeys(MemberId, [
    "displayname",
  ]);
};

let addMemberToDom = async (MemberId) => {
  let { name } = await rtmClient.getUserAttributesByKeys(MemberId, [
    "displayname",
  ]);

  let membersWrapper = document.getElementById("member__list");

  let memberItem = `<div class="member__wrapper" id="member__${MemberId}__wrapper">
                      <span class="green__icon"></span>
                      <p class="member_name">user_${MemberId}</p>
                  </div>`;

  membersWrapper.insertAdjacentHTML("beforeend", memberItem);
};

let updateMemberTotal = async (members) => {
  let total = document.getElementById("members__count");
  total.innerText = members.length;
};

let handleMemberLeft = async (MemberId) => {
  console.log("PRANALI we are in handleMemberLeft function");
  removeMemberFromDom(MemberId);

  let members = await rtmchannel.getMembers();
  updateMemberTotal(members);
};

let removeMemberFromDom = async (MemberId) => {
  let memberWrapper = document.getElementById(`member__${MemberId}__wrapper`);
  let name = memberWrapper.getElementsByClassName("member_name")[0].textContent;

  memberWrapper.remove();
};

let sendMessage = async (e) => {
  e.preventDefault();

  let message = e.target.message.value;
  rtmchannel.sendMessage({
    text: JSON.stringify({
      type: "chat",
      message: message,
      displayName: displayname,
    }),
  });

  addMessageToDom(displayname, message);
  e.target.reset();
};

let handleChannelMessage = async (messageData, MemberId) => {
  console.log("PRANALI a new message was received");
  let data = JSON.parse(messageData.text);

  if (data.type === "chat") {
    addMessageToDom(data.displayName, data.message);
  }

  if (data.type === "user_left") {
    document.getElementById(`user-container-${data.uid}`).remove();

    if (userIdInDisplayFrame === `user-container-${uid}`) {
      displayFrame.style.display = null;
    }
  }
  //Handle Hand Raise functionality here
  if (data.type==="handraise" && role ==="host" ){
    console.log("PRANALI Guest "+ data.displayName + " changed their hand raise state to " + data.message);
    //Send Host a pop up box for host request
    if(data.message==="raised"){
      console.log("PRANALI we are in raised function block to show dialog box");
      
     // document.getElementById("confirm").style.display="block";
//       document.getElementById("confirm").style.display = "flex";
//       document.getElementById("promoteAccept").style.display="flex";
//       document.getElementById("cancel").style.display="flex";
//       document.getElementById("modal-body").innerText= data.displayName + " raised their hand. Do you want to make them a host?";
//       let timeOff=1000;
// setInterval(time, timeOff);
// function time(){
//       document.getElementById("confirm").getElementsByClassName("modal-footer")[0].click();

//       document.getElementById("promoteAccept").addEventListener("click",acceptHost);
//       document.getElementById("cancel").addEventListener("click",rejectHost);
let confirmtext = data.displayName + " raised their hand. Do you want to make them a host?";

if(confirm(confirmtext))
{acceptHost();
}
else
{rejectHost();
}
    

    }
    else {
      console.log("PRANALI no hand is raised!");
      //No Hand Raised!
    }
  }
  };

let acceptHost = async () => {
  console.log("PRANALI we are in accept new host request!");


     //send message to user on accepting the request
      rtmchannel.client.sendMessageToPeer({text:JSON.stringify({"type":"acceptnewHost", "message":"host"})}, 
      displayname,).then(sendResult => {
      if (sendResult.hasPeerReceived) {
          console.log("PRANALI Message has been received by: " + displayname + " Message: host");
      } else {
          console.log("PRANALI Message sent to: " + displayname + " Message: host");
      }
    
  }).catch(error => {
      console.log("PRANALI Error sending peer message: " + error);
  });
  // rtmchannel.client.sendMessageToPeer({text:JSON.stringify({"type":"acceptnewHost", "message":"host"})}, 
  //     displayname);

 //hide modal box
 document.getElementById("confirm").style.display="none";
     //leave the audience channel and join in as host channel    
    
};

let rejectHost = () =>{
  console.log("PRANALI we are in reject new host request!");
//send message to audience request not accepted and continue on streaming as is
rtmchannel.client.sendMessageToPeer({text:JSON.stringify({"type":"acceptnewHost", "message":"audience"})}, 
displayname).then(sendResult => {
if (sendResult.hasPeerReceived) {
    console.log("PRANALI peer message Message has been received by: " + displayname + " Message: audience");
} else {
    console.log("PRANALI peer message Message sent to: " + displayname + " Message: audience");
}
}).catch(error => {
console.log("PRANALI Error sending peer message: " + error);
});
     //hide modal box
     //document.getElementById("confirm").style.display="none";
};

let handleMessageFromPeer = async (messageData, displayName) =>{
  console.log("PRANALI inside handleMessageFromPeer frunction! ");
  console.log( "PRANALI" + displayName + " your role changed to : " + messageData.message);
  message = JSON.parse(messageData.text);
   if(messageData.message === "host"){
     console.log("PRANALI we are inside host message before leaving channel");
    leaveStream();
    client.joinHostStream();
   }
   if(messageData.message === "audience"){
    console.log("PRANALI we are inside host message rejected channel");
   }
};

let addMessageToDom = (name, message) => {
  let messagesWrapper = document.getElementById("messages");

  let newMessage = `<div class="message__wrapper">
                      <div class="message__body">
                          <strong class="message__author">${name}</strong>
                          <p class="message__text">${message}</p>
                      </div>
                  </div>`;

  messagesWrapper.insertAdjacentHTML("beforeend", newMessage);

  let lastMessage = document.querySelector(
    "#messages .message__wrapper:last-child"
  );
  if (lastMessage) {
    lastMessage.scrollIntoView();
  }
};

let getMembers = async () => {
  let members = await rtmchannel.getMembers();
  updateMemberTotal(members);
  for (let i = 0; members.length > i; i++) {
    addMemberToDom(members[i]);
  }
};

let leaveChannel = async () => {
  console.log("PRANALI We are in LeaveChannel function!");

  await rtmchannel.leave();
  await rtmClient.logout();
};
joinRoomInit();
