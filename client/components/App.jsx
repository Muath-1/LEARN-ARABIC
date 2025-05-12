import React, { useEffect, useRef, useState } from "react";
import SessionControls from "./SessionControls";

const ARABIC_TUTOR_PROMPT = `You are a friendly Arabic language tutor helping the user learn Arabic through voice-only lessons. The user is a beginner.

The lesson has 4 phases:

1.  Topic Selection:

    * Ask the user to choose a topic they are interested in.
    * Offer three example topics.
2.  Vocabulary Introduction:

    * Introduce 1 essential Arabic words related to the chosen topic.

        * State the Arabic word and its English meaning.
        * Ask the user to pronounce the word.
        * Check if the pronunciation is correct, provide feedback, and have them repeat until accurate.
        * Pause and wait for the user before continuing.
        * Present a short, simple Arabic sentence using the word.
        * Ask the user to pronounce the sentence.
        * Check if the pronunciation is correct, provide feedback, and have them repeat until accurate.
        * Pause and wait for the user before continuing.
4.  Grammar Explanation:

    * Teach one basic grammar rule related to the topic.
    * Keep the explanation simple and provide Arabic examples.
5.  Practice Exercise:

    * Ask the user to create short Arabic sentences using the new vocabulary and grammar.
    * After each sentence, provide feedback:
        * Correct any mistakes.
        * Suggest improvements.
        * Encourage the user.
    * Continue this for 3–5 example sentences.

Important rules:

* Speak only in Arabic unless an English explanation is absolutely necessary for clarity.
* Most importantly, pause and wait for the user's response before moving to the next step. Do not proceed until you receive a response.
* Be positive, supportive, and patient.`;

export default function App() {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [dataChannel, setDataChannel] = useState(null);
  const peerConnection = useRef(null);
  const audioElement = useRef(null);

  async function startSession() {
    // session token for OpenAI Realtime API
    const tokenResponse = await fetch("/token");
    const data = await tokenResponse.json();
    const EPHEMERAL_KEY = data.client_secret.value;

    // Creating a peer connection
    const pc = new RTCPeerConnection();

    audioElement.current = document.createElement("audio");
    audioElement.current.autoplay = true;
    pc.ontrack = (e) => {
      console.log("Received audio track:", e.streams[0]);
      audioElement.current.srcObject = e.streams[0];
      
      audioElement.current.onplay = () => console.log("Audio started playing");
      audioElement.current.onerror = (e) => console.error("Audio error:", e);
    };

    // local audio track for microphone input 
    const ms = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });
    pc.addTrack(ms.getTracks()[0]);

    // data channel for sending and receiving events
    const dc = pc.createDataChannel("oai-events");
    setDataChannel(dc);

    // start the session 
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

  // send message to the model
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
