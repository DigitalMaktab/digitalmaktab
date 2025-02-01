import React, { useEffect, useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";
import Peer from "simple-peer";
import settings from "../../config/settings";

const AppOnlineClass = () => {
  const [connection, setConnection] = useState<signalR.HubConnection | null>(
    null
  );
  const [peers, setPeers] = useState<Record<string, Peer.Instance>>({});
  const [userVideos, setUserVideos] = useState<Record<string, MediaStream>>({});
  const [classId, setClassId] = useState<string>("");
  const [joined, setJoined] = useState<boolean>(false);
  const [userStream, setUserStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // ✅ Ensure the video is only set after the user joins
  useEffect(() => {
    if (joined && userStream && videoRef.current) {
      console.log("📹 Assigning stream to videoRef...");
      videoRef.current.srcObject = userStream;
    }
  }, [joined, userStream]);

  const joinClass = async () => {
    if (!classId.trim()) {
      alert("Please enter a valid class ID.");
      return;
    }

    try {
      console.log("🎥 Requesting camera access...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      console.log("✅ Camera access granted, updating stream...");
      setUserStream(stream);

      const newConnection = new signalR.HubConnectionBuilder()
        .withUrl(`${settings.signalRUrl}classhub`, {
          transport: signalR.HttpTransportType.WebSockets,
          withCredentials: true,
        })
        .withAutomaticReconnect()
        .build();

      newConnection.on("UserJoined", (userId) => {
        console.log(`👤 User Joined: ${userId}`);
        const peer = new Peer({ initiator: true, trickle: false, stream });

        peer.on("signal", (signal) => {
          newConnection.invoke("SendOffer", userId, JSON.stringify(signal));
        });

        peer.on("stream", (peerStream) => {
          console.log(`📷 Adding video stream for ${userId}`);
          addVideoStream(userId, peerStream);
        });

        setPeers((prev) => ({ ...prev, [userId]: peer }));
      });

      newConnection.on("ReceiveOffer", (userId, offer) => {
        console.log(`📡 Received offer from ${userId}`);
        const peer = new Peer({ initiator: false, trickle: false, stream });

        peer.signal(JSON.parse(offer));

        peer.on("signal", (signal) => {
          newConnection.invoke("SendAnswer", userId, JSON.stringify(signal));
        });

        peer.on("stream", (peerStream) => {
          addVideoStream(userId, peerStream);
        });

        setPeers((prev) => ({ ...prev, [userId]: peer }));
      });

      newConnection.on("ReceiveAnswer", (userId, answer) => {
        console.log(`✅ Received answer from ${userId}`);
        if (peers[userId]) {
          peers[userId].signal(JSON.parse(answer));
        } else {
          console.log(`🚨 Peer not found for ${userId}, unable to signal!`);
        }
      });

      newConnection.on("UserLeft", (userId) => {
        console.log(`🚪 User Left: ${userId}`);
        removeVideoStream(userId);
      });

      await newConnection.start();
      console.log("🔗 Connected to SignalR");
      await newConnection.invoke("JoinClass", classId);

      newConnection.on("ExistingUsers", (users: string[]) => {
        users.forEach((userId) => {
          const peer = new Peer({ initiator: true, trickle: false, stream });

          peer.on("signal", (signal) => {
            newConnection.invoke("SendOffer", userId, JSON.stringify(signal));
          });

          peer.on("stream", (peerStream) => {
            addVideoStream(userId, peerStream);
          });

          setPeers((prev) => ({ ...prev, [userId]: peer }));
        });
      });

      setConnection(newConnection);
      setJoined(true);
      newConnection.onclose(() => console.log("❌ Disconnected from SignalR"));
      newConnection.onreconnecting(() => console.log("🔄 Reconnecting..."));
      newConnection.onreconnected(() => console.log("✅ Reconnected!"));
    } catch (error) {
      console.error("🚨 Error joining class: ", error);
    }
  };

  const leaveClass = () => {
    console.log("🚪 Leaving class...");
    connection?.invoke("LeaveClass", classId);
    connection?.stop();
    setJoined(false);
    setPeers({});
    setUserVideos({});
    setUserStream(null);
    console.log("❌ Left Class");
  };

  const addVideoStream = (userId: string, stream: MediaStream) => {
    console.log(`📷 Adding video stream for ${userId}`);

    setUserVideos((prev) => {
      return { ...prev, [userId]: stream };
    });

    // Debug the stream assignment
    setTimeout(() => {
      const videoElement = document.querySelector(
        `video[data-user-id="${userId}"]`
      );
      if (videoElement) {
        console.log(
          `✅ Found video element for ${userId}, assigning stream...`
        );
        (videoElement as HTMLVideoElement).srcObject = stream;
      } else {
        console.log(`🚨 Video element for ${userId} not found!`);
      }
    }, 500);
  };

  const removeVideoStream = (userId: string) => {
    console.log(`🚨 Removing video stream for ${userId}`);
    setUserVideos((prev) => {
      const updatedVideos = { ...prev };
      delete updatedVideos[userId];
      return updatedVideos;
    });
  };

  return (
    <div>
      <h2>Online Class</h2>
      {!joined ? (
        <>
          <input
            type="text"
            placeholder="Enter Class ID"
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
          />
          <button onClick={joinClass}>Join Class</button>
        </>
      ) : (
        <>
          <div style={{ display: "flex", flexWrap: "wrap" }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: "200px",
                height: "150px",
                border: "2px solid red",
              }}
            />

            {Object.entries(userVideos).map(([userId, stream]) => (
              <video
                key={userId}
                data-user-id={userId}
                autoPlay
                playsInline
                style={{
                  width: "200px",
                  height: "150px",
                  margin: "5px",
                  border: "2px solid blue",
                }}
                ref={(video) => {
                  if (video && video.srcObject !== stream) {
                    console.log(`🎥 Updating video element for ${userId}`);
                    video.srcObject = stream;
                  }
                }}
              />
            ))}
          </div>
          <button onClick={leaveClass}>Leave Class</button>
        </>
      )}
    </div>
  );
};

export default AppOnlineClass;
