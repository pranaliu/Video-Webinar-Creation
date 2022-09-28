import AgoraRTC from "agora-rtc-sdk-ng";
import { app_data } from "./env.js";

let rtc = {
    // For the local audio and video tracks.
    localAudioTrack: null,
    localVideoTrack: null,
    client: null
};



let uid = sessionStorage.getItem('uid');
if(!uid){
    uid = Math.floor(Math.random() * 232);
    sessionStorage.setItem('uid', uid)
}
//let rtcUid = Math.floor(Math.random() * 232);
let options = {
    // Pass your app ID here.
    appId: app_data.appID,
    // Set the channel name.
    channel: app_data.channel,
    // Set the user role in the channel.
    role: "audience",
    // Use a temp token
    token: app_data.token,
    // Uid
    uid: uid,
};

let client;
let rtmClient;
let channel;

 //Declare Variables for Live streaming and initialize
let localTracks = []
let remoteUsers = {}

let localScreenTracks;
let sharingScreen = false;
let streaming = false;



//roomId = channel

let clientRoleOptions = {
    // Set latency level to low latency
    level: 1
}



async function startBasicLiveStreaming() {

    rtc.client = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
     

    let joinRoomInit = async () => {   
           document.getElementById("join").onclick = async function () {
           rtc.client.setClientRole(options.role, clientRoleOptions);
           await rtc.client.join(options.appId, options.channel, options.token, options.uid);
         };

   joinRoomInit();      

//On click of Join button display rest other buttons and hide join button
        document.getElementById("join-btn").onclick = async function () {
        document.getElementById('join-btn').style.display = 'none';
        document.getElementsByClassName('stream__actions')[0].style.display = 'flex';
    
        //Access mic and camera of device for joining call
        localTracks = await AgoraRTC.createMicrophoneAndCameraTracks();
    
       //Create Video container html element with user-uid for unique id
        let player = `<div class="video__container" id="user-container-${uid}">
                        <div class="video-player" id="user-${uid}"></div>
                     </div>`
    //Insert html element to DOM
        document.getElementById('streams__container').insertAdjacentHTML('beforeend', player);
      //PRANALI check for expand video frame if needed
      //  document.getElementById(`user-container-${uid}`).addEventListener('click', expandVideoFrame);
    
        localTracks[1].play(`user-${uid}`); //Add video track
        await client.publish([localTracks[0], localTracks[1]]); //publish adio and video tracks
       }
 

        document.getElementById("leave").onclick = async function () {
            // Traverse all remote users.
            rtc.client.remoteUsers.forEach(user => {
                // Destroy the dynamically created DIV containers.
                const playerContainer = document.getElementById(user.uid);
                playerContainer && playerContainer.remove();
            });

            // Leave the channel.
            await rtc.client.leave();
        }
    }


    rtc.client.on("user-published", async (user, mediaType) => {
        // Subscribe to a remote user.
        await rtc.client.subscribe(user, mediaType);
        console.log("subscribe success");

        // If the subscribed track is video.
        if (mediaType === "video") {
            // Get `RemoteVideoTrack` in the `user` object.
            const remoteVideoTrack = user.videoTrack;
            // Dynamically create a container in the form of a DIV element for playing the remote video track.
            const remotePlayerContainer = document.createElement("div");
            // Specify the ID of the DIV container. You can use the `uid` of the remote user.
            remotePlayerContainer.id = user.uid.toString();
            remotePlayerContainer.textContent = "Remote user " + user.uid.toString();
            remotePlayerContainer.style.width = "640px";
            remotePlayerContainer.style.height = "480px";
            document.body.append(remotePlayerContainer);

            // Play the remote video track.
            // Pass the DIV container and the SDK dynamically creates a player in the container for playing the remote video track.
            remoteVideoTrack.play(remotePlayerContainer);
        }

        // If the subscribed track is audio.
        if (mediaType === "audio") {
            // Get `RemoteAudioTrack` in the `user` object.
            const remoteAudioTrack = user.audioTrack;
            // Play the audio track. No need to pass any DOM element.
            remoteAudioTrack.play();
            
        }
    });

    rtc.client.on("user-unpublished", user => {
        // Get the dynamically created DIV container.
        const remotePlayerContainer = document.getElementById(user.uid);
        // Destroy the container.
        remotePlayerContainer.remove();
    });
}


startBasicLiveStreaming();