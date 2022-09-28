import AgoraRTC from "agora-rtc-sdk-ng";
import { app_data } from "./env.js";

let rtc = {
    // For the local audio and video tracks.
    localAudioTrack: null,
    localVideoTrack: null,
    client: null
};
let rtcUid = Math.floor(Math.random() * 232);

var remoteUsers = {};

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
    uid: rtcUid,
};


let clientRoleOptions = {
    // Set latency level to low latency
    level: 1
}

async function startBasicLiveStreaming() {

    rtc.client = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
      //Declare Variables for Live streaming and initialize
  let streaming = false;
  let shareScreen = false;
  //Check if needed localtracks PRANALI for screen sharing etc option
  let localTracks = [];
  let localScreenTracks;

    window.onload = function () {
        //GitHub Code
        $("#join-form").submit(async function (e) {
            e.preventDefault();
            $("#host-join").attr("disabled", true);
            $("#audience-join").attr("disabled", true);
            try {
                // options.appid = $("#appid").val();
                // options.token = $("#token").val();
                // options.channel = $("#channel").val();
                // options.uid = Number($("#uid").val());
                await join();
                if (options.role === "host") {
                    $("#success-alert a").attr("href", `index.html?appid=${options.appId}&channel=${options.channel}&token=${options.token}`);
                    if (options.token) {
                        $("#success-alert-with-token").css("display", "block");
                    } else {
                        $("#success-alert a").attr("href", `index.html?appid=${options.appId}&channel=${options.channel}&token=${options.token}`);
                        $("#success-alert").css("display", "block");
                    }
                }
            } catch (error) {
                console.error(error);
            } finally {
                $("#leave").attr("disabled", false);
            }
        })
        
        $("#leave").click(function (e) {
            leave();
        })
//PRANALI commenting below original code to test on githiub code

        // document.getElementById("join").onclick = async function () {
        //     rtc.client.setClientRole(options.role, clientRoleOptions);
        //     await rtc.client.join(options.appId, options.channel, options.token, options.uid);
        // }
        //PRANALI GITHUB CODE
        // join the channel
    options.uid =  client.join(options.appId, options.channel, options.token || null, options.uid || null);
         // create local audio and video tracks
        localTracks.audioTrack =  AgoraRTC.createMicrophoneAudioTrack();
        localTracks.videoTrack =  AgoraRTC.createCameraVideoTrack();
        // play local video track
        localTracks.videoTrack.play("local-player");
        $("#local-player-name").text(`localTrack(${options.uid})`);
        // publish local tracks to channel
         client.publish(Object.values(localTracks));
        console.log("publish success");

        let toggleStream = async () => {
     
            if (!streaming) {
              alert("PRANALI Stream is starting!");
              streaming = true;
              document.getElementById("stream_btn").innerText = "Stop Streaming";
             // PRANALI uncomment this once basic button tests 
             togglevideoshare();
            } else {
              streaming = false;
              document.getElementById("stream_btn").innerText = "Start Streaming";
            }
          };

           let togglevideoshare = () => {
      rtc.client.setClientRole("host");
      localTracks =  AgoraRTC.createMicrophoneAndCameraTracks(); //Ask user for access to Mic and Camera while joining the livestreaming
      // play local video track
      localTracks.videoTrack.play("local-player");
      $("#local-player-name").text(`localTrack(${options.uid})`);
      // publish local tracks to channel
      client.publish(Object.values(localTracks));
      console.log("publish success");
      //Create Video Player
      //Define classes for Div in stylesheet
      //let player = `<div class="video-container" id = "user-container-${rtcUid}">
     // <div class="video-player id="user-${rtcUid}"></div>
      //</div>`
      let player = `<div>
      New Container
      </div>`
    //PRANALI check on this  document.getElementById("video_stream").insertAdjacentHTML("beforebegin",player);
   // localTracks[1].play(`user-${rtcUid}`);
    //await rtc.client.publish(localTracks[0],localTracks[1]); //Check what is the aletrnative over here
    };

        document.getElementById("stream_btn").onclick = toggleStream;

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

startBasicLiveStreaming()