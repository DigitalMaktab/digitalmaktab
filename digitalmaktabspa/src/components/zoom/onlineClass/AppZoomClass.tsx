import React, { useState } from "react";
import axios from "axios";

const ZoomMeeting: React.FC = () => {
  const [loggedIn, setLoggedIn] = useState(false);
  const [meetingDetails, setMeetingDetails] = useState({
    topic: "",
    duration: 0,
  });

  const handleLogin = () => {
    window.location.href = "http://localhost:5000/api/zoom/login";
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setMeetingDetails({ ...meetingDetails, [name]: value });
  };

  const handleCreateMeeting = async () => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/zoom/create-meeting?topic=${meetingDetails.topic}&duration=${meetingDetails.duration}`
      );
      alert(`Meeting created! Join URL: ${response.data.join_url}`);
    } catch (error) {
      console.error("Error creating meeting:", error);
      alert("Failed to create meeting.");
    }
  };

  return (
    <div>
      {!loggedIn ? (
        <button onClick={handleLogin}>Log in with Zoom</button>
      ) : (
        <div>
          <h2>Create a Zoom Meeting</h2>
          <input
            type="text"
            name="topic"
            placeholder="Meeting Topic"
            onChange={handleInputChange}
          />
          <input
            type="number"
            name="duration"
            placeholder="Duration (minutes)"
            onChange={handleInputChange}
          />
          <button onClick={handleCreateMeeting}>Create Meeting</button>
        </div>
      )}
    </div>
  );
};

export default ZoomMeeting;
