import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { useReactMediaRecorder } from "react-media-recorder";

// Icons
import { IoChatboxOutline as ChatIcon } from "react-icons/io5";
import { VscTriangleDown as DownIcon } from "react-icons/vsc";
import { FaUsers as UsersIcon } from "react-icons/fa";
import { FiSend as SendIcon } from "react-icons/fi";
import { FcGoogle as GoogleIcon } from "react-icons/fc";
import { MdCallEnd as CallEndIcon } from "react-icons/md";
import { MdClear as ClearIcon } from "react-icons/md";
import { AiOutlineLink as LinkIcon } from "react-icons/ai";
import { MdOutlineContentCopy as CopyToClipboardIcon } from "react-icons/md";
import { IoVideocamSharp as VideoOnIcon } from "react-icons/io5";
import { IoVideocamOff as VideoOffIcon } from "react-icons/io5";
import { AiOutlineShareAlt as ShareIcon } from "react-icons/ai";
import { IoMic as MicOnIcon } from "react-icons/io5";
import { IoMicOff as MicOffIcon } from "react-icons/io5";
import { BsPin as PinIcon } from "react-icons/bs";
import { BsPinFill as PinActiveIcon } from "react-icons/bs";
import { BsSoundwave as MorseIcon } from "react-icons/bs";
import { MdScreenShare as ScreenShareIcon } from "react-icons/md";
import { BsRecordCircle as RecordIcon } from "react-icons/bs";
import { BsStopCircle as StopIcon } from "react-icons/bs";
import { QRCode } from "react-qrcode-logo";
import MeetGridCard from "../components/MeetGridCard";

// Framer Motion
import { motion, AnimatePresence } from "framer-motion";

// Importing audios
import joinSFX from "../sounds/join.mp3";
import msgSFX from "../sounds/message.mp3";
import leaveSFX from "../sounds/leave.mp3";

// Simple Peer
import Peer from "simple-peer";
import { io } from "socket.io-client";
import { useAuth } from "../context/AuthContext";
import Loading from "../components/Loading";

import { SelfieSegmentation } from "@mediapipe/selfie_segmentation";
import { Camera } from "@mediapipe/camera_utils";

import axios from "axios";

import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";

const Room = () => {
  const [loading, setLoading] = useState(true);
  const [localStream, setLocalStream] = useState(null);
  const navigate = useNavigate();
  const [micOn, setMicOn] = useState(true);
  const [showChat, setShowChat] = useState(true);
  const [share, setShare] = useState(false);
  const [joinSound] = useState(new Audio(joinSFX));
  const { roomID } = useParams();
  const chatScroll = useRef();
  const [pin, setPin] = useState(false);
  const [peers, setPeers] = useState([]);
  const socket = useRef();
  const peersRef = useRef([]);
  const [videoActive, setVideoActive] = useState(true);
  const [msgs, setMsgs] = useState([]);
  const [msgText, setMsgText] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const localVideo = useRef();
  const mediaRecorder = useRef(null);
  const [signLanguageText, setSignLanguageText] = useState("");
  const [transcriptions, setTranscriptions] = useState({}); // New state for transcriptions

  // user
  const { user, login } = useAuth();
  const [particpentsOpen, setParticpentsOpen] = useState(true);
  const [processedStream, setProcessedStream] = useState(null);
  const processedVideo = useRef();
  const [isRecording, setIsRecording] = useState(true);
  const [roomTranscripts, setRoomTranscripts] = useState([]);
  const recognitionRef = useRef(null);
  const [isCaptionOn, setIsCaptionOn] = useState(false);

  const latestMessageRef = useRef(null);
  const allMessagesRef = useRef([]);
  const [prediction, setPrediction] = useState("");
  const canvasRef = useRef();
  const [signLangText, setSignLangText] = useState("");
  const [prevChar, setPrevChar] = useState("");

  const morseCodeMap = {
    'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.',
    'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..',
    'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.',
    'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
    'Y': '-.--', 'Z': '--..', '0': '-----', '1': '.----', '2': '..---',
    '3': '...--', '4': '....-', '5': '.....', '6': '-....', '7': '--...',
    '8': '---..', '9': '----.', '.': '.-.-.-', ',': '--..--', '?': '..--..',
    "'": '.----.', '!': '-.-.--', '/': '-..-.-', '(': '-.--.', ')': '-.--.-',
    '&': '.-...', ':': '---...', ';': '-.-.-.', '=': '-...-', '+': '.-.-.',
    '-': '-....-', '_': '..--.-', '"': '.-..-.', '$': '...-..-', '@': '.--.-.',
    ' ': ' ',
  };

  const textToMorse = (text) => {
    return text.toUpperCase().split('').map(char => morseCodeMap[char] || '').join(' ');
  };

  const playMorse = async (morseCode, dotDuration = 100) => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.value = 600;
    gainNode.gain.value = 0.5;
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start();

    const symbols = morseCode.split(' ');
    let currentTime = audioContext.currentTime;

    for (const symbol of symbols) {
      for (const unit of symbol) {
        if (unit === '.') {
          gainNode.gain.setValueAtTime(0.5, currentTime);
          currentTime += dotDuration / 1000;
          gainNode.gain.setValueAtTime(0, currentTime);
          currentTime += dotDuration / 1000;
        } else if (unit === '-') {
          gainNode.gain.setValueAtTime(0.5, currentTime);
          currentTime += (dotDuration * 3) / 1000;
          gainNode.gain.setValueAtTime(0, currentTime);
          currentTime += dotDuration / 1000;
        }
      }
      currentTime += (dotDuration * 3) / 1000;
    }

    setTimeout(() => {
      oscillator.stop();
      audioContext.close();
    }, currentTime * 1000 + 100);
  };
  const [screenStream, setScreenStream] = useState(null);
  const [screenSharing, setScreenSharing] = useState(false);
  const canvasRefScreen = useRef(null);
  const audioContextRef = useRef(null);
  const [downloadTriggered, setDownloadTriggered] = useState(false);
  const [isSignLanguage, setIsSignLanguage] = useState(false);


  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  const captionButtonClick = () => {
    setIsCaptionOn(!isCaptionOn);
  }

  // Initialize react-media-recorder
  const { status, startRecording, stopRecording, mediaBlobUrl, clearBlobUrl } = useReactMediaRecorder({
    video: true,
    audio: true,
    mimeType: "video/webm;codecs=vp8,opus",
  });

  // Initialize Gemini AI
  const genAI = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  // LocalStorage key for messages
  const storageKey = `chat_${roomID}`;

  // Load messages from localStorage on mount
  useEffect(() => {
    const storedMsgs = localStorage.getItem(storageKey);
    if (storedMsgs) {
      try {
        setMsgs(JSON.parse(storedMsgs));
      } catch (err) {
        console.error("Error parsing localStorage messages:", err);
      }
    }
  }, [storageKey]);

  // Save messages to localStorage whenever msgs changes
  useEffect(() => {
    if (msgs.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(msgs));
    }
  }, [msgs]);

  // Clear localStorage on meeting end (unmount or End Call)
  useEffect(() => {
    return () => {
      localStorage.removeItem(storageKey);
      setMsgs([]);
    };
  }, [storageKey]);

  // Fetch Gemini suggestions for the latest message
  useEffect(() => {
    if (msgs.length === 0) return;

    const latestMsg = msgs[msgs.length - 1].message;
    const fetchSuggestions = async () => {
      try {
        const prompt = `Provide 3 short reply suggestions for the following chat message: "${latestMsg}". Just provide the replies in 3 new lines in plain text. Do not give any extra information.`;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const suggestionList = text
          .split("\n")
          .filter((line) => line.trim())
          .slice(0, 3);
        setSuggestions(suggestionList);
      } catch (err) {
        console.error("Error fetching Gemini suggestions:", err);
        setSuggestions([]);
      }
    };

    fetchSuggestions();
  }, [msgs]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (chatScroll.current) {
      chatScroll.current.scrollTop = chatScroll.current.scrollHeight;
    }
  }, [msgs, suggestions]);

  // Handle sending a message
  const sendMessage = (e) => {
    e.preventDefault();
    if (msgText.trim()) {
      socket.current.emit("send message", {
        roomID,
        from: socket.current.id,
        user: {
          id: user.uid,
          name: user?.displayName,
          profilePic: user.photoURL,
        },
        message: msgText.trim(),
      });
      setMsgs((msgs) => [
        ...msgs,
        {
          send: true,
          user: {
            id: user.uid,
            name: user?.displayName,
            profilePic: user.photoURL,
          },
          message: msgText.trim(),
        },
      ]);
      setMsgText("");
      setSuggestions([]);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.code === 'KeyL' && event.metaKey) {
        if (latestMessageRef.current) {
          playMorseWithSender("Latest Message", latestMessageRef.current.user?.name, latestMessageRef.current.message);
        }
      } else if (event.code === 'KeyE' && event.metaKey) { // Using metaKey (Cmd on Mac, Win on PC) as a modifier, adjust as needed
        if (allMessagesRef.current.length > 0) {
          playMorseForAllMessages(allMessagesRef.current);
        }
      }
    };

    const handleKeyUp = (event) => {
      if (event.code === 'Space') {
        clearTimeout(spacebarTimer.current);
      } else if (event.code === 'KeyA' && event.metaKey) {
        clearTimeout(spacebarATimer.current);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      clearTimeout(spacebarTimer.current);
      clearTimeout(spacebarATimer.current);
    };
  }, [msgs, user]);

  const spacebarTimer = useRef(null);
  const spacebarATimer = useRef(null);

  const playMorseWithSender = (context, sender, text) => {
    const senderMorse = textToMorse(`Sender: ${sender}`);
    const messageMorse = textToMorse(`Message: ${text}`);
    console.log(`Sender: ${sender} Message: ${text}`);
    playMorse(`${textToMorse(context)} .-. .-. .-.-. ${senderMorse} .-.-. ${messageMorse}`); // Using '.-.-.' as a separator
  };

  const playMorseForAllMessages = (messages) => {
    let fullMorse = textToMorse("All Messages");
    messages.forEach((msg, index) => {
      const senderMorse = textToMorse(`Sender: ${msg.user?.name}`);
      const messageMorse = textToMorse(`Message: ${msg.message}`);
      fullMorse += ` .-.-. ${senderMorse} .-.-. ${messageMorse}`; // Using '.-.-.' as a separator
      if (index < messages.length - 1) {
        fullMorse += ` ...-.-... `; // Adding a longer pause between messages
      }
    });
    playMorse(fullMorse);
  };

  useEffect(() => {
    if (msgs.length > 0) {
      latestMessageRef.current = msgs[msgs.length - 1];
      allMessagesRef.current = [...msgs];
    }
  }, [msgs]);

  // Handle selecting a suggestion
  const handleSuggestionClick = (suggestion) => {
    setMsgText(suggestion);
  };

  // Composite video streams onto canvas and mix audio
  const setupRecordingStream = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = 1280; // Adjust for desired resolution
    canvas.height = 720;

    // Audio context for mixing
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    const dest = audioContextRef.current.createMediaStreamDestination();

    // Add local stream audio
    if (localStream) {
      const source = audioContextRef.current.createMediaStreamSource(localStream);
      source.connect(dest);
    }

    // Add screen stream audio (if active)
    if (screenStream) {
      const screenSource = audioContextRef.current.createMediaStreamSource(screenStream);
      screenSource.connect(dest);
    }

    // Add peer streams audio
    peers.forEach((peer) => {
      if (peer.peer.stream) {
        const peerSource = audioContextRef.current.createMediaStreamSource(peer.peer.stream);
        peerSource.connect(dest);
      }
    });

    // Composite video streams
    const drawStreams = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let xOffset = 0;
      const videoWidth = canvas.width / (1 + peers.length + (screenSharing ? 1 : 0));
      const videoHeight = canvas.height;

      // Draw local video
      if (localVideo.current && videoActive) {
        ctx.drawImage(localVideo.current, xOffset, 0, videoWidth, videoHeight);
        xOffset += videoWidth;
      }

      // Draw peer videos
      peers.forEach((peer) => {
        const peerVideo = document.getElementById(`peer-video-${peer.peerID}`);
        if (peerVideo) {
          ctx.drawImage(peerVideo, xOffset, 0, videoWidth, videoHeight);
          xOffset += videoWidth;
        }
      });

      // Draw screen share
      if (screenSharing && screenStream) {
        const screenVideo = document.createElement("video");
        screenVideo.srcObject = screenStream;
        screenVideo.play();
        ctx.drawImage(screenVideo, xOffset, 0, videoWidth, videoHeight);
      }
    };

    // Update canvas at 30fps
    const interval = setInterval(drawStreams, 1000 / 30);

    // Combine canvas video and mixed audio
    const canvasStream = canvas.captureStream(30);
    const audioStream = dest.stream;
    const combinedStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...audioStream.getAudioTracks(),
    ]);

    return { combinedStream, interval };
  };

  // Start recording
  const handleStartRecording = () => {
    const { combinedStream, interval } = setupRecordingStream();
    setDownloadTriggered(false); // Reset download trigger for new recording
    startRecording({ stream: combinedStream });
    canvasRef.current.dataset.interval = interval; // Store interval ID
  };

  // Stop recording and download
  const handleStopRecording = () => {
    stopRecording();
    const interval = canvasRef.current.dataset.interval;
    if (interval) clearInterval(interval);
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  // Download recorded video
  useEffect(() => {
    if (mediaBlobUrl && status === "stopped" && !downloadTriggered) {
      const link = document.createElement("a");
      link.href = mediaBlobUrl;
      const timestamp = new Date().toISOString().replace("T", "_").split(".")[0].replace(/:/g, "-");
      link.download = `meeting_${timestamp}.webm`;
      link.click();
      setDownloadTriggered(true); // Mark download as triggered
      clearBlobUrl(); // Clear the blob URL to prevent reuse
    }
  }, [mediaBlobUrl, status, downloadTriggered, clearBlobUrl]);


  useEffect(() => {
    if (!SpeechRecognition.browserSupportsSpeechRecognition()) {
      console.log("Speech Recognition not supported");
      return;
    }

    // Store the recognition instance
    recognitionRef.current = SpeechRecognition.getRecognition();

    if (isRecording) {
      console.log("Starting speech recognition...");
      SpeechRecognition.startListening({
        continuous: true,
        language: "en-US",
      });
    } else {
      console.log("Stopping speech recognition...");
      SpeechRecognition.stopListening();
    }

    // Handle recognition stop or error to restart
    const handleRecognitionEnd = () => {
      if (isRecording && !listening) {
        console.log("Recognition ended, restarting...");
        SpeechRecognition.startListening({
          continuous: true,
          language: "en-US",
        });
      }
    };

    const handleRecognitionError = (event) => {
      console.error("Recognition error:", event.error);
      if (isRecording && !listening) {
        console.log("Recognition error, restarting...");
        SpeechRecognition.startListening({
          continuous: true,
          language: "en-US",
        });
      }
    };

    recognitionRef.current.onend = handleRecognitionEnd;
    recognitionRef.current.onerror = handleRecognitionError;

    // Cleanup on component unmount
    return () => {
      SpeechRecognition.stopListening();
      if (mediaRecorder.current?.state === "recording") {
        mediaRecorder.current.stop();
      }
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
      }
    };
  }, []);

  // // Handle transcript updates
  useEffect(() => {
    if (transcript) {
      console.log("New transcript:", transcript);
      socket.current.emit("transcript", {
        roomID,
        userId: user.uid,
        text: transcript,
        username: user?.displayName
      });
      // Optionally reset transcript after processing
      // resetTranscript();
    }
  }, [transcript, roomID, user.uid]);

  const captureAndSendFrame = async () => {
    if (isSignLanguage && localVideo.current && localVideo.current.videoWidth > 0 && localVideo.current.videoHeight > 0) {
      const canvas = canvasRef.current;
      canvas.width = localVideo.current.videoWidth;
      canvas.height = localVideo.current.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(
        localVideo.current,
        0,
        0,
        canvas.width,
        canvas.height
      );

      canvas.toBlob(async (blob) => {
        if (blob) {
          const formData = new FormData();
          formData.append("image", blob, "frame.png"); // 'image' must match your FastAPI endpoint's parameter name

          try {
            const response = await fetch("http://localhost:8000/predict", {
              method: "POST",
              body: formData,
            });

            if (response.ok) {
              const data = await response.json();
              setPrediction(data.message); // Or handle the prediction data as needed
              console.log(data);
              setSignLangText(data.result);
              setPrevChar(data.current_letter);
            } else {
              console.error(
                "Error sending frame:",
                response.status,
                response.statusText
              );
            }
          } catch (error) {
            console.error("Error sending frame:", error);
          }
        }
      }, "image/png");
    }
  };

  const signLanguageButtonClick = () => {
    setIsSignLanguage(!isSignLanguage);
  };

  useEffect(() => {
    let intervalId;

    if (isSignLanguage) {
      intervalId = setInterval(captureAndSendFrame, 1000); // Trigger capture every 1 second
    } else {
      clearInterval(intervalId); // Clear the interval when sign language mode is off
    }

    return () => clearInterval(intervalId); // Cleanup on unmount or when isSignLanguage changes
  }, [isSignLanguage]); // Re-run effect when isSignLanguage changes

  useEffect(() => {
    const unsub = () => {
      socket.current = io.connect("https://group8-sos-backend.onrender.com");
      // Receive processed sign language text from backend
      socket.current.on("sign-language-text", (data) => {
        setSignLanguageText(data.text);
      });

      // Receive transcription text from backend
      socket.current.on("transcription-text", ({ userId, text }) => {
        setTranscriptions((prev) => ({
          ...prev,
          [userId]: text,
        }));
      });

      // socket.current.on("room-transcripts", (data) => {
      //   console.log("Received room transcripts:", data.transcripts);
      //   setRoomTranscripts(data.transcripts);
      // });

      // socket.current.on("room-transcripts", (data) => {
      //   console.log("Received room transcripts:", data.transcripts);
      //   setRoomTranscripts(data.transcripts);
      // });

      socket.current.on("room-transcripts", (data) => {
        console.log("Received room transcripts:", data.transcripts);
        setRoomTranscripts((prev) => {
          const transcriptMap = new Map();

          // Add existing transcripts to the map
          prev.forEach((transcript) => {
            transcriptMap.set(transcript.username, transcript);
          });

          // Update or add new transcripts
          data.transcripts.forEach((transcript) => {
            transcriptMap.set(transcript.username, {
              ...transcript,
              timestamp: transcript.timestamp || Date.now(),
            });
          });

          // Convert map back to array and sort by timestamp
          return Array.from(transcriptMap.values()).sort(
            (a, b) => a.timestamp - b.timestamp
          );
        });
        setRoomTranscripts((prev) => {
          const transcriptMap = new Map();

          // Add existing transcripts to the map
          prev.forEach((transcript) => {
            transcriptMap.set(transcript.username, transcript);
          });

          // Update or add new transcripts
          data.transcripts.forEach((transcript) => {
            transcriptMap.set(transcript.username, {
              ...transcript,
              timestamp: transcript.timestamp || Date.now(),
            });
          });

          // Convert map back to array and sort by timestamp
          return Array.from(transcriptMap.values()).sort(
            (a, b) => a.timestamp - b.timestamp
          );
        });
      });

      socket.current.on("message", (data) => {
        const audio = new Audio(msgSFX);
        if (user?.uid !== data.user.id) {
          audio.play();
        }
        const msg = {
          send: user?.uid === data.user.id,
          ...data,
        };
        setMsgs((msgs) => [...msgs, msg]);
      });

      if (user) {
        navigator.mediaDevices
          .getUserMedia({
            video: true,
            audio: true,
          })
          .then((stream) => {
            setLoading(false);
            setLocalStream(stream);
            localVideo.current.srcObject = stream;

            // Start streaming to backend
            // startStreamingToBackend(stream);

            socket.current.emit("join room", {
              roomID,
              user: {
                uid: user?.uid,
                email: user?.email,
                name: user?.displayName,
                photoURL: user?.photoURL,
              },
            });

            socket.current.on("all users", (users) => {
              const peers = [];
              users.forEach((user) => {
                const peer = createPeer(user.userId, socket.current.id, stream);
                peersRef.current.push({
                  peerID: user.userId,
                  peer,
                  user: user.user,
                });
                peers.push({
                  peerID: user.userId,
                  peer,
                  user: user.user,
                });
              });
              setPeers(peers);
            });

            socket.current.on("user joined", (payload) => {
              const peer = addPeer(payload.signal, payload.callerID, stream);
              peersRef.current.push({
                peerID: payload.callerID,
                peer,
                user: payload.user,
              });

              const peerObj = {
                peerID: payload.callerID,
                peer,
                user: payload.user,
              };

              setPeers((users) => [...users, peerObj]);
            });

            socket.current.on("receiving returned signal", (payload) => {
              const item = peersRef.current.find((p) => p.peerID === payload.id);
              item.peer.signal(payload.signal);
            });

            socket.current.on("user left", (id) => {
              const audio = new Audio(leaveSFX);
              audio.play();
              const peerObj = peersRef.current.find((p) => p.peerID === id);
              if (peerObj) peerObj.peer.destroy();
              const peers = peersRef.current.filter((p) => p.peerID !== id);
              peersRef.current = peers;
              setPeers((users) => users.filter((p) => p.peerID !== id));
            });
          });
      }

    };
    unsub();



    // Cleanup on unmount
    return () => {

      if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
        mediaRecorder.current.stop();
      }
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
      socket.current.disconnect();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [user, roomID]);

  // Auto-scroll chat to the latest message
  useEffect(() => {
    if (chatScroll.current) {
      chatScroll.current.scrollTop = chatScroll.current.scrollHeight;
    }
  }, [msgs]);

  // Start streaming video to backend
  const startStreamingToBackend = (stream) => {
    mediaRecorder.current = new MediaRecorder(stream, {
      mimeType: "video/webm;codecs=vp8",
      videoBitsPerSecond: 1000000,
    });

    mediaRecorder.current.ondataavailable = async (event) => {
      if (event.data.size > 0) {
        const arrayBuffer = await event.data.arrayBuffer();
        socket.current.emit("video-chunk", {
          roomID,
          userId: user.uid,
          chunk: arrayBuffer,
        });
      }
    };

    mediaRecorder.current.onstop = () => {
      socket.current.emit("video-stream-end", { roomID, userId: user.uid });
    };

    mediaRecorder.current.start(100);
  };

  if (!browserSupportsSpeechRecognition) {
    return <span>Browser doesn't support speech recognition.</span>;
  }

  const createPeer = (userToSignal, callerID, stream) => {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream,
    });

    peer.on("signal", (signal) => {
      socket.current.emit("sending signal", {
        userToSignal,
        callerID,
        signal,
        user: user
          ? {
            uid: user?.uid,
            email: user?.email,
            name: user?.displayName,
            photoURL: user?.photoURL,
          }
          : null,
      });
    });

    return peer;
  };

  const addPeer = (incomingSignal, callerID, stream) => {
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream,
    });
    peer.on("signal", (signal) => {
      socket.current.emit("returning signal", { signal, callerID });
    });
    joinSound.play();
    peer.signal(incomingSignal);
    return peer;
  };

  return (
    <>
      {user ? (
        <AnimatePresence>
          {loading ? (
            <div className="bg-lightGray">
              <Loading />
            </div>
          ) : (
            user && (
              <motion.div layout className="flex flex-row bg-darkBlue2 text-white w-full">
                <motion.div layout className="flex flex-col bg-darkBlue2 justify-between w-full">
                  <div
                    className="flex-shrink-0 overflow-y-scroll p-3"
                    style={{
                      height: "calc(100vh - 128px)",
                    }}
                  >
                    <motion.div
                      layout
                      className={`grid grid-cols-1 gap-4 ${showChat ? "md:grid-cols-2" : "lg:grid-cols-3 sm:grid-cols-2"}`}
                    >
                      <motion.div
                        layout
                        className={`relative bg-lightGray rounded-lg aspect-video overflow-hidden ${pin && "md:col-span-2 md:row-span-2 md:col-start-1 md:row-start-1"}`}
                      >
                        <div className="absolute top-4 right-4 z-20">
                          <button
                            className={`${pin ? "bg-blue border-transparent" : "bg-slate-800/70 backdrop-blur border-gray"} md:border-2 border-[1px] aspect-square md:p-2.5 p-1.5 cursor-pointer md:rounded-xl rounded-lg text-white md:text-xl text-lg`}
                            onClick={() => setPin(!pin)}
                          >
                            {pin ? <PinActiveIcon /> : <PinIcon />}
                          </button>
                        </div>

                        <video
                          ref={localVideo}
                          muted
                          autoPlay
                          controls={false}
                          className="h-full w-full object-cover rounded-lg"
                        />
                        <canvas
                          ref={canvasRef}
                          style={{ display: "none" }} //  Hide the canvas
                        ></canvas>
                        {!videoActive && (
                          <div className="absolute top-0 left-0 bg-lightGray h-full w-full flex items-center justify-center">
                            <img
                              className="h-[35%] max-h-[150px] w-auto rounded-full aspect-square object-cover"
                              src={user?.photoURL}
                              alt={user?.displayName}
                            />
                          </div>
                        )}

                        <div className="absolute bottom-4 left-4">
                          <div className="bg-slate-800/70 backdrop-blur border-gray border-2 py-1 px-3 cursor-pointer rounded-md text-white text-xs">
                            {user?.displayName}
                          </div>
                        </div>
                      </motion.div>
                      {peers.map((peer) => (
                        <MeetGridCard key={peer?.peerID} user={peer.user} micActive={peer.micActive} peer={peer.peer} />
                      ))}

                      {screenSharing && screenStream && (
                        <MeetGridCard
                          key="screen-share"
                          user={{ name: "You (Sharing Screen)", photoURL: user?.photoURL }}
                          stream={screenStream}
                          pinnedByDefault
                        />
                      )}
                    </motion.div>
                  </div>
                  {isSignLanguage && (
                    <div className="flex items-center justify-between bg-darkBlue1 p-3">
                      <div className="text-xl text-slate-400">
                        {signLangText}
                      </div>
                      <div className="ml-2 text-sm font">Sign Language</div>
                      <div className="ml-auto text-lg">
                        {prevChar}
                      </div>
                    </div>
                  )}
                  {isCaptionOn && <div className="mt-4">
                    {/* <p className="text-sm font-medium">Room Transcripts:</p> */}
                    <div className="mt-2 flex flex-col gap-2">
                      {roomTranscripts.map((transcript, index) => (
                        <div
                          key={transcript.username} // Use username as key for uniqueness
                          className="bg-darkBlue1 py-2 px-3 text-xs rounded-lg border-2"
                          style={{ border: "1px solid #ececec" }}
                        >
                          <span className="ml-2 text-sm font">{transcript.username || "Unknown"} : </span>
                          <span className="ml-1 text-sm font">{transcript.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>}
                  <div className="w-full h-16 bg-darkBlue1 border-t-2 border-lightGray p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        <div>
                          <button
                            className={`${micOn ? "bg-blue border-transparent" : "bg-slate-800/70 backdrop-blur border-gray"} border-2 p-2 cursor-pointer rounded-xl text-white text-xl`}
                            onClick={() => {
                              const audio = localVideo.current.srcObject.getAudioTracks()[0];
                              if (micOn) {
                                audio.enabled = false;
                                setMicOn(false);
                              } else {
                                audio.enabled = true;
                                setMicOn(true);
                              }
                            }}
                          >
                            {micOn ? <MicOnIcon /> : <MicOffIcon />}
                          </button>
                        </div>

                        <div>
                          <button
                            className={`${videoActive ? "bg-blue border-transparent" : "bg-slate-800/70 backdrop-blur border-gray"} border-2 p-2 cursor-pointer rounded-xl text-white text-xl`}
                            onClick={() => {
                              const videoTrack = localStream.getTracks().find((track) => track.kind === "video");
                              if (videoActive) {
                                videoTrack.enabled = false;
                              } else {
                                videoTrack.enabled = true;
                              }
                              setVideoActive(!videoActive);
                            }}
                          >
                            {videoActive ? <VideoOnIcon /> : <VideoOffIcon />}
                          </button>
                        </div>
                        <div>
                            <button onClick={captionButtonClick}
                              className={`${isCaptionOn ? "bg-blue border-transparent" : "bg-slate-800/70 backdrop-blur border-gray"} border-2 p-2 cursor-pointer rounded-xl text-white`}
                              style={{ fontSize: "14px" }}
                            >
                              Caption
                            </button>
                        </div>
                        <div>
                            <button onClick={signLanguageButtonClick}
                              className={`${isSignLanguage ? "bg-blue border-transparent" : "bg-slate-800/70 backdrop-blur border-gray"} border-2 p-2 cursor-pointer rounded-xl text-white`}
                              style={{ fontSize: "14px" }}
                            >
                              Sign Language
                            </button>
                        </div>
                        <div>
                        </div>
                        <div>
                          <button
                            className={`${screenSharing ? "bg-blue border-transparent" : "bg-slate-800/70 backdrop-blur border-gray"} border-2 p-2 cursor-pointer rounded-xl text-white text-xl`}
                            onClick={async () => {
                              if (!screenSharing) {
                                try {
                                  const stream = await navigator.mediaDevices.getDisplayMedia({
                                    video: { cursor: "always" },
                                    audio: false,
                                  });

                                  setScreenStream(stream);
                                  setScreenSharing(true);

                                  stream.getVideoTracks()[0].onended = () => {
                                    setScreenStream(null);
                                    setScreenSharing(false);
                                  };
                                } catch (err) {
                                  console.error("Screen sharing error:", err);
                                }
                              } else {
                                screenStream?.getTracks().forEach((track) => track.stop());
                                setScreenStream(null);
                                setScreenSharing(false);
                              }
                            }}
                          >
                            {screenSharing ? <ScreenShareIcon /> : <ScreenShareIcon />}
                          </button>
                        </div>
                        <div>
                          <button
                            className={`${status === "recording" ? "bg-blue border-transparent" : "bg-slate-800/70 backdrop-blur border-gray"} border-2 p-2 cursor-pointer rounded-xl text-white text-xl`}
                            onClick={handleStartRecording}
                            disabled={status === "recording"}
                          >
                            <RecordIcon />
                          </button>
                        </div>
                        <div>
                          <button
                            className={`${status === "recording" ? "bg-blue border-transparent" : "bg-slate-800/70 backdrop-blur border-gray"} border-2 p-2 cursor-pointer rounded-xl text-white text-xl`}
                            onClick={handleStopRecording}
                            disabled={status !== "recording"}
                          >
                            <StopIcon />
                          </button>
                        </div>
                      </div>
                      <div className="flex-grow flex justify-center">
                        <button
                          className="py-2 px-4 flex items-center gap-2 rounded-lg bg-red"
                          onClick={() => {
                            navigate("/");
                            window.location.reload();
                          }}
                        >
                          <CallEndIcon size={20} />
                          <span className="hidden sm:block text-xs">End Call</span>
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <div>
                          <button
                            className={`bg-slate-800/70 backdrop-blur border-gray border-2 p-2 cursor-pointer rounded-xl text-white text-xl`}
                            onClick={() => setShare(true)}
                          >
                            <ShareIcon size={22} />
                          </button>
                        </div>
                        <div>
                          <button
                            className={`${showChat ? "bg-blue border-transparent" : "bg-slate-800/70 backdrop-blur border-gray"} border-2 p-2 cursor-pointer rounded-xl text-white text-xl`}
                            onClick={() => setShowChat(!showChat)}
                          >
                            <ChatIcon />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
                {/* <div className="p-3">
                  <p>Microphone: {listening ? "on" : "off"}</p>
                  <button onClick={SpeechRecognition.startListening}>Start</button>
                  <button onClick={SpeechRecognition.stopListening}>Stop</button>
                  <button onClick={resetTranscript}>Reset</button>
                  <p>Speech Transcript: {transcript}</p>
                  <p>Sign Language Text: {signLanguageText}</p>
                    <div className="mt-4">
                      <p className="text-sm font-medium">Room Transcripts:</p>
                      <div className="mt-2 flex flex-col gap-2">
                        {roomTranscripts.map((transcript, index) => (
                          <div
                            key={transcript.username} // Use username as key for uniqueness
                            className="bg-darkBlue1 py-2 px-3 text-xs rounded-lg border-2 border-lightGray"
                          >
                            <span className="font-medium">{transcript.username || "Unknown"}: </span>
                            {transcript.text}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="mt-4">
                      <p className="text-sm font-medium">Room Transcripts:</p>
                      <div className="mt-2 flex flex-col gap-2">
                        {roomTranscripts.map((transcript, index) => (
                          <div
                            key={transcript.username} // Use username as key for uniqueness
                            className="bg-darkBlue1 py-2 px-3 text-xs rounded-lg border-2 border-lightGray"
                          >
                            <span className="font-medium">{transcript.username || "Unknown"}: </span>
                            {transcript.text}
                          </div>
                        ))}
                      </div>
                    </div>
                  <div className="mt-4">
                    <p className="text-sm font-medium">Video Transcriptions:</p>
                    <div className="mt-2 flex flex-col gap-2">
                      {Object.entries(transcriptions).map(([userId, text]) => {
                        const peer = peersRef.current.find((p) => p.user.uid === userId) || {
                          user: { name: userId === user.uid ? user.displayName : "Unknown" },
                        };
                        return (
                          <div
                            key={userId}
                            className="bg-darkBlue1 py-2 px-3 text-xs rounded-lg border-2 border-lightGray"
                          >
                            <span className="font-medium">{peer.user.name || "Unknown"}: </span>
                            {text}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div> */}
                {showChat && (
                  <motion.div
                    layout
                    className="flex flex-col w-[30%] flex-shrink-0 border-l-2 border-lightGray"
                  >
                    <div
                      className="flex-shrink-0 overflow-y-scroll"
                      style={{
                        height: "calc(100vh - 128px)",
                      }}
                    >
                      <div className="flex flex-col bg-darkBlue1 w-full border-b-2 border-gray">
                        <div
                          className="flex items-center w-full p-3 cursor-pointer"
                          onClick={() => setParticpentsOpen(!particpentsOpen)}
                        >
                          <div className="text-xl text-slate-400">
                            <UsersIcon />
                          </div>
                          <div className="ml-2 text-sm font">Participants</div>
                          <div
                            className={`${particpentsOpen && "rotate-180"} transition-all ml-auto text-lg`}
                          >
                            <DownIcon />
                          </div>
                        </div>
                        <motion.div
                          layout
                          className={`${particpentsOpen ? "block" : "hidden"} flex flex-col w-full mt-2 h-full max-h-[50vh] overflow-y-scroll gap-3 p-2 bg-blue-600`}
                        >
                          <AnimatePresence>
                            <motion.div
                              layout
                              initial={{ x: 100, opacity: 0 }}
                              animate={{ x: 0, opacity: 1 }}
                              transition={{ duration: 0.08 }}
                              exit={{ opacity: 0 }}
                              whileHover={{ scale: 1.05 }}
                              className="p-2 flex bg-gray items-center transition-all hover:bg-slate-900 gap-2 rounded-lg"
                            >
                              <img
                                src={
                                  user.photoURL ||
                                  "https://parkridgevet.com.au/wp-content/uploads/2020/11/Profile-300x300.png"
                                }
                                alt={user.displayName || "Anonymous"}
                                className="block w-8 h-8 aspect-square rounded-full mr-2"
                              />
                              <span className="font-medium text-sm">
                                {user.displayName || "Anonymous"}
                              </span>
                            </motion.div>
                            {peers.map((user) => (
                              <motion.div
                                layout
                                initial={{ x: 100, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ duration: 0.08 }}
                                exit={{ opacity: 0 }}
                                key={user.peerID}
                                whileHover={{ scale: 1.05 }}
                                className="p-2 flex bg-gray items-center transition-all hover:bg-slate-900 gap-2 rounded-lg"
                              >
                                <img
                                  src={
                                    user.user.photoURL ||
                                    "https://parkridgevet.com.au/wp-content/uploads/2020/11/Profile-300x300.png"
                                  }
                                  alt={user.user.name || "Anonymous"}
                                  className="block w-8 h-8 aspect-square rounded-full mr-2"
                                />
                                <span className="font-medium text-sm">
                                  {user.user.name || "Anonymous"}
                                </span>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </motion.div>
                      </div>
                      <div className="h-full">
                        <div className="flex items-center bg-darkBlue1 p-3 w-full">
                          <div className="text-xl text-slate-400">
                            <ChatIcon />
                          </div>
                          <div className="ml-2 text-sm font">Chat</div>
                          <div
                            className="ml-auto text-lg"
                            onClick={() => setParticpentsOpen(!particpentsOpen)}
                          >
                            <DownIcon />
                          </div>
                        </div>
                        <motion.div
                          layout
                          ref={chatScroll}
                          className="p-3 h-full overflow-y-scroll flex flex-col gap-4 scrollbar-thin scrollbar-thumb-blue-600 scrollbar-track-darkBlue1"
                        >
                          {msgs.map((msg, index) => (
                            <motion.div
                              layout
                              key={index}
                              initial={{ x: msg.send ? 100 : -100, opacity: 0 }}
                              animate={{ x: 0, opacity: 1 }}
                              transition={{ duration: 0.08 }}
                              className={`flex items-center gap-2 ${msg?.user.id === user?.uid ? "flex-row-reverse" : ""
                                }`}
                              key={index}
                            >
                              <img
                                src={msg?.user.profilePic}
                                alt={msg?.user.name}
                                className="h-8 w-8 aspect-square rounded-full object-cover"
                              />
                              <div className="relative flex-grow">
                                <div className="flex flex-col gap-2">
                                <p className="bg-darkBlue1 py-2 px-3 text-xs w-auto max-w-[87%] rounded-lg border-2 border-lightGray">
                                    {msg?.message}
                                  </p>
                                <button
                                  onClick={() => playMorse(textToMorse(msg?.message))}
                                  className="absolute top-1/2 right-2 -translate-y-1/2 bg-slate-800/70 backdrop-blur border-gray border-[1px] rounded-full p-1 text-white text-xs cursor-pointer"
                                  aria-label={`Play Morse code for message: ${msg?.message}`}
                                >
                                  <MorseIcon size={14} />
                                </button>
                              </div>
                                {index === msgs.length - 1 && suggestions.length > 0 && msg.user.id !== user.uid && (
                                  <div className="flex flex-wrap gap-2">
                                    {suggestions.map((suggestion, suggestionIndex) => (
                                      <button
                                        key={suggestionIndex}
                                        type="button"
                                        onClick={() => handleSuggestionClick(suggestion)}
                                        className="bg-blue text-white px-3 py-1 rounded-lg text-xs hover:bg-blue-600"
                                      >
                                        {suggestion}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          ))}
                        </motion.div>
                      </div>
                    </div>
                    <div className="w-full bg-darkBlue1 border-t-2 border-lightGray p-3">
                      <form onSubmit={sendMessage}>
                        <div className="flex items-center gap-2">
                          <div className="relative flex-grow">
                            <input
                              type="text"
                              value={msgText}
                              onChange={(e) => setMsgText(e.target.value)}
                              className="h-10 p-3 w-full text-sm text-darkBlue1 outline-none rounded-lg"
                              placeholder="Enter message.."
                            />
                            {msgText && (
                              <button
                                type="button"
                                onClick={() => setMsgText("")}
                                className="bg-transparent text-darkBlue2 absolute top-0 right-0 text-lg cursor-pointer p-2 h-full"
                              >
                                <ClearIcon />
                              </button>
                            )}
                          </div>
                          <div>
                            <button className="bg-blue h-10 text-md aspect-square rounded-lg flex items-center justify-center">
                              <SendIcon />
                            </button>
                          </div>
                        </div>
                      </form>
                    </div>
                  </motion.div>
                )}
                <canvas ref={canvasRefScreen} style={{ display: "none" }} />
              </motion.div>
            )
          )}
          {share && (
            <div className="fixed flex items-center justify-center top-0 left-0 h-full w-full z-30 bg-slate-800/60 backdrop-blur">
              <div className="bg-white p-3 rounded shadow shadow-white w-full mx-auto max-w-[500px] relative">
                <div className="flex items-center justify-between">
                  <div className="text-slate-800">Share the link with someone to join the room</div>
                  <div>
                    <ClearIcon size={30} color="#121212" onClick={() => setShare(false)} />
                  </div>
                </div>
                <div className="my-5 rounded flex items-center justify-between gap-2 text-sm text-slate-500 bg-slate-200 p-2">
                  <LinkIcon />
                  <div className="flex-grow">
                    {window.location.href.length > 40
                      ? `${window.location.href.slice(0, 37)}...`
                      : window.location.href}
                  </div>
                  <CopyToClipboardIcon
                    className="cursor-pointer"
                    onClick={() => navigator.clipboard.writeText(window.location.href)}
                  />
                </div>
                <div className="flex w-full aspect-square h-full justify-center items-center">
                  <QRCode
                    size={200}
                    value={window.location.href}
                    logoImage="/images/logo.png"
                    qrStyle="dots"
                    style={{ width: "100%" }}
                    eyeRadius={10}
                  />
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>
      ) : (
        <div className="h-full bg-darkBlue2 flex items-center justify-center">
          <button
            className="flex items-center gap-2 p-1 pr-3 rounded text-white font-bold bg-blue transition-all"
            onClick={login}
          >
            <div className="p-2 bg-white rounded">
              <GoogleIcon size={24} />
            </div>
            Login with Google
          </button>
        </div>
      )}
    </>
  );
};

export default Room;