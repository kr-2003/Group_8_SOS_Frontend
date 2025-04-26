import { motion } from "framer-motion";
import React, { useEffect } from "react";
import { useState } from "react";

// icons
import { IoMic as MicOnIcon } from "react-icons/io5";
import { IoMicOff as MicOffIcon } from "react-icons/io5";
import { BsPin as PinIcon } from "react-icons/bs";
import { BsPinFill as PinActiveIcon } from "react-icons/bs";
import { useRef } from "react";

const MeetGridCard = ({ user, micActive, peer, stream, pinnedByDefault = false }) => {
  const [pin, setPin] = useState(pinnedByDefault);
  const videoRef = useRef();
  const [videoActive, setVideoActive] = useState(true);

  useEffect(() => {
    if (stream) {
      // For direct stream (e.g., screen share)
      const videoTrack = stream.getVideoTracks()[0];
      setVideoActive(videoTrack?.enabled ?? true);
      videoRef.current.srcObject = stream;
    } else if (peer) {
      // For peer-based stream
      peer.on("stream", (incomingStream) => {
        const videoTrack = incomingStream.getVideoTracks()[0];
        setVideoActive(videoTrack?.enabled ?? true);
        videoRef.current.srcObject = incomingStream;
      });
    }
  }, [stream, peer]);

  return (
    <motion.div
      layout
      className={`relative bg-lightGray rounded-lg shrink-0 aspect-video overflow-hidden ${
        pin ? "md:col-span-2 md:row-span-2 md:col-start-1 md:row-start-1" : ""
      }`}
    >
      {/* Pin button */}
      <div className="absolute top-4 right-4 z-30">
        <button
          className={`${
            pin ? "bg-blue border-transparent" : "bg-slate-800/70 backdrop-blur border-gray"
          } md:border-2 border-[1px] aspect-square md:p-2.5 p-1.5 cursor-pointer md:rounded-xl rounded-lg text-white md:text-xl text-lg`}
          onClick={() => {
            setPin(!pin);
            window.scrollTo({
              top: 0,
              behavior: "smooth",
            });
          }}
        >
          {pin ? <PinActiveIcon /> : <PinIcon />}
        </button>
      </div>

      {/* Video */}
      <video
        ref={videoRef}
        autoPlay
        muted={user?.name === "You (Sharing Screen)"}
        controls={false}
        className="h-full w-full object-cover rounded-lg"
      />

      {/* Video placeholder if off */}
      {!videoActive && (
        <div className="absolute top-0 left-0 bg-lightGray h-full w-full flex items-center justify-center">
          <img
            className="h-[35%] max-h-[150px] w-auto rounded-full aspect-square object-cover"
            src={
              user?.photoURL ||
              "https://parkridgevet.com.au/wp-content/uploads/2020/11/Profile-300x300.png"
            }
            alt={user?.name}
          />
        </div>
      )}

      {/* Name badge */}
      <div className="absolute bottom-4 left-4">
        <div className="bg-slate-800/70 backdrop-blur border-gray border-2 py-1 px-3 cursor-pointer rounded-md text-white text-xs">
          {user?.name || "Anonymous"}
        </div>
      </div>
    </motion.div>
  );
};

export default MeetGridCard;
