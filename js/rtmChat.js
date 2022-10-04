//import AgoraRTM from "./agora-rtm-sdk-1.5.1.js";


 let rtmClient;
 var rtmchannel;

 let statsInterval;
let stats = "";
let displayStat = false;
let uid = sessionStorage.getItem("uid");
let appId = app_data.appID;

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
    getMembers();
  };

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
  console.log("PRANALI We are in LeaveChannel function RTM!");

  await rtmchannel.leave();
  await rtmClient.logout();
};