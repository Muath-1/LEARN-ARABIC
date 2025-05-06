import React, { useEffect, useRef, useState } from "react";
import SessionControls from "./SessionControls";

const ARABIC_TUTOR_PROMPT = `You are a friendly Arabic language tutor helping the user learn Arabic through voice-only lessons. The user is a beginner.

The lesson has 4 phases:
1. **Topic Selection** – Ask the user to choose a topic they are interested and give three examples topics 
2. **Vocabulary Introduction** – Give 5 essential Arabic words related to the topic. For each word:
   - Provide the Arabic word
   - Its English meaning
   - Ask the user to repeat the word out loud and check if they are pronouncing it correctly (don't move on until they are pronouncing it correctly)
   - A short simple Arabic sentence using the word and and check if they are pronouncing it correctly (don't move on until they are pronouncing it correctly)
   - Wait for the user before continuing
3. **Grammar Explanation** – Teach 1 basic grammar rule related to the topic. Keep it simple and provide Arabic examples.
4. **Practice Exercise** – Ask the user to create short Arabic sentences using the new vocabulary and grammar.
   - After each sentence, give feedback: correct mistakes, suggest improvements, and encourage the user.
   - Continue for 3–5 examples.

Important rules:
- Speak only Arabic unless explaining something in English is necessary.
- Pause and wait for the user's response before moving to the next step.
- Be positive and supportive.`;

export default function App() {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [dataChannel, setDataChannel] = useState(null);
  const peerConnection = useRef(null);
  const audioElement = useRef(null);

  async function startSession() {
    // Get a session token for OpenAI Realtime API
    const tokenResponse = await fetch("/token");
    const data = await tokenResponse.json();
    const EPHEMERAL_KEY = data.client_secret.value;

    // Create a peer connection
    const pc = new RTCPeerConnection();

    // Set up to play remote audio from the model
    audioElement.current = document.createElement("audio");
    audioElement.current.autoplay = true;
    pc.ontrack = (e) => {
      console.log("Received audio track:", e.streams[0]);
      audioElement.current.srcObject = e.streams[0];
      
      // Add event listeners to check audio state
      audioElement.current.onplay = () => console.log("Audio started playing");
      audioElement.current.onerror = (e) => console.error("Audio error:", e);
    };

    // Add local audio track for microphone input in the browser
    const ms = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });
    pc.addTrack(ms.getTracks()[0]);

    // Set up data channel for sending and receiving events
    const dc = pc.createDataChannel("oai-events");
    setDataChannel(dc);

    // Start the session using the Session Description Protocol (SDP)
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const baseUrl = "https://api.openai.com/v1/realtime";
    const model = "gpt-4o-realtime-preview-2024-12-17";
    const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
      method: "POST",
      body: offer.sdp,
      headers: {
        Authorization: `Bearer ${EPHEMERAL_KEY}`,
        "Content-Type": "application/sdp",
      },
    });

    const answer = {
      type: "answer",
      sdp: await sdpResponse.text(),
    };
    await pc.setRemoteDescription(answer);

    peerConnection.current = pc;
  }

  
  function stopSession() {
    if (dataChannel) {
      dataChannel.close();
    }

    peerConnection.current.getSenders().forEach((sender) => {
      if (sender.track) {
        sender.track.stop();
      }
    });

    if (peerConnection.current) {
      peerConnection.current.close();
    }

    setIsSessionActive(false);
    setDataChannel(null);
    peerConnection.current = null;
  }

  // Send a message to the model
  function sendClientEvent(message) {
    if (dataChannel) {
      const timestamp = new Date().toLocaleTimeString();
      message.event_id = message.event_id || crypto.randomUUID();

      dataChannel.send(JSON.stringify(message));

      if (!message.timestamp) {
        message.timestamp = timestamp;
      }
    } else {
      console.error(
        "Failed to send message - no data channel available",
        message,
      );
    }
  }

  
  useEffect(() => {
    if (dataChannel) {
      dataChannel.addEventListener("message", (e) => {
        const event = JSON.parse(e.data);
        if (!event.timestamp) {
          event.timestamp = new Date().toLocaleTimeString();
        }
        console.log("Received event:", event);
      });

      dataChannel.addEventListener("open", () => {
        console.log("Data channel opened. Sending initial tutor prompt.");
        // Send the initial prompt to define the AI's role
        const initialPromptEvent = {
          type: "conversation.item.create",
          item: {
            type: "message",
            role: "user", // Using 'user' role to send the instructions as the initial message
            content: [
              {
                type: "input_text",
                text: ARABIC_TUTOR_PROMPT,
              },
            ],
          },
        };
        
        sendClientEvent(initialPromptEvent);

        setIsSessionActive(true);
      });
    }
  }, [dataChannel, sendClientEvent]);

  return (
    <>
      <main className="absolute top-0 left-0 right-0 bottom-0 flex flex-col items-center justify-center p-4">
        <SessionControls
          startSession={startSession}
          stopSession={stopSession}
          isSessionActive={isSessionActive}
        />
      </main>
    </>
  );
}
