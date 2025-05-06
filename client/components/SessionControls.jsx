import React, { useState } from "react";
import { CloudOff } from "react-feather";


function Button({ children, onClick, className }) {
  return (
    <button
      className={`bg-gray-800 text-white rounded-full p-4 flex items-center gap-1 ${className}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function SessionStopped({ startSession }) {
  const [isActivating, setIsActivating] = useState(false);

  function handleStartSession() {
    if (isActivating) return;

    setIsActivating(true);
    startSession();
  }

  return (
    <div className="flex items-center justify-center w-full h-full">
      <Button
        onClick={handleStartSession}
        className={isActivating ? "bg-gray-600" : "bg-blue-800"}
      >
        {isActivating ? "starting session..." : "start lesson"}
      </Button>
    </div>
  );
}

function SessionActive({ stopSession }) {
  return (
    <div className="flex items-center justify-center w-full h-full gap-4">
      <Button onClick={stopSession} icon={<CloudOff height={16} />}>
        disconnect
      </Button>
    </div>
  );
}

export default function SessionControls({
  startSession,
  stopSession,
  isSessionActive,
}) {
  return (
    <div className="flex gap-4 border-t-2 border-gray-200 h-full rounded-md">
      {isSessionActive ? (
        <SessionActive
          stopSession={stopSession}
        />
      ) : (
        <SessionStopped startSession={startSession} />
      )}
    </div>
  );
}
