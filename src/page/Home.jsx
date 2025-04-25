import React, { useEffect, useState } from "react";
import HomeCard from "../components/HomeCard";
import { useAuth } from "../context/AuthContext";
import { v4 as uuid } from "uuid";
import { MdVideoCall as NewCallIcon } from "react-icons/md";
import { MdAddBox as JoinCallIcon } from "react-icons/md";
import { BsCalendarDate as CalenderIcon } from "react-icons/bs";
import { Link } from "react-router-dom";
import { firestore } from "../firebase/config";
import { collection, query, where, onSnapshot } from "firebase/firestore";

const roomId = uuid();

const Home = () => {
  const { user, login } = useAuth();
  const [date, setDate] = useState(new Date());
  const [meetings, setMeetings] = useState([]);
  const [isLoadingMeetings, setIsLoadingMeetings] = useState(true);
  const [error, setError] = useState("");

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  // Fetch meetings created by or inviting the user
  useEffect(() => {
    if (!user || !user.email) {
      setMeetings([]);
      setIsLoadingMeetings(false);
      return;
    }
    setIsLoadingMeetings(true);
    // Query for meetings created by the user
    const createdQuery = query(
      collection(firestore, "meetings"),
      where("createdByUid", "==", user.uid)
    );
    // Query for meetings where the user is invited
    const invitedQuery = query(
      collection(firestore, "meetings"),
      where("invitedEmails", "array-contains", user.email)
    );

    // Combine results from both queries
    const unsubscribeCreated = onSnapshot(
      createdQuery,
      (snapshot) => {
        const createdMeetings = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          isCreator: true,
        }));
        // Merge with invited meetings and sort by date/time
        setMeetings((prev) => {
          const invitedMeetings = prev.filter((m) => !m.isCreator);
          const combinedMeetings = [...createdMeetings, ...invitedMeetings];
          return combinedMeetings.sort((a, b) => {
            const dateA = a.date && a.time ? new Date(`${a.date}T${a.time}`) : new Date(0);
            const dateB = b.date && b.time ? new Date(`${b.date}T${b.time}`) : new Date(0);
            return dateA - dateB;
          });
        });
      },
      (err) => {
        console.error("Error fetching created meetings:", err);
        setError("Failed to load meetings: " + err.message);
        setIsLoadingMeetings(false);
      }
    );

    const unsubscribeInvited = onSnapshot(
      invitedQuery,
      (snapshot) => {
        const invitedMeetings = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          isCreator: false,
        }));
        // Merge with created meetings and sort by date/time
        setMeetings((prev) => {
          const createdMeetings = prev.filter((m) => m.isCreator);
          const combinedMeetings = [...createdMeetings, ...invitedMeetings];
          return combinedMeetings.sort((a, b) => {
            const dateA = a.date && a.time ? new Date(`${a.date}T${a.time}`) : new Date(0);
            const dateB = b.date && b.time ? new Date(`${b.date}T${b.time}`) : new Date(0);
            return dateA - dateB;
          });
        });
        setIsLoadingMeetings(false);
        setError("");
      },
      (err) => {
        console.error("Error fetching invited meetings:", err);
        setError("Failed to load meetings: " + err.message);
        setIsLoadingMeetings(false);
      }
    );

    return () => {
      unsubscribeCreated();
      unsubscribeInvited();
    };
  }, [user]);

  // Clock update
  useEffect(() => {
    const timerId = setInterval(() => setDate(new Date()), 1000);
    return () => clearInterval(timerId);
  }, []);

  const handleLogin = async () => {
    try {
      await login();
    } catch (err) {
      console.error("Login failed:", err);
      setError("Failed to log in: " + err.message);
    }
  };

  return (
    <div className="bg-darkBlue1 min-h-screen text-slate-400">
      <div className="flex h-full md:gap-2 flex-col md:flex-row">
        {/* Left Sidebar: Cards and GitHub Link */}
        <div className="p-3 w-auto h-auto items-center">
          <div className="flex gap-2 md:gap-6 mb-3 md:mb-6">
            <Link to={`/room/${roomId}`} className="block w-full">
              <HomeCard
                title="New Meeting"
                desc="Create a new meeting"
                icon={<NewCallIcon />}
                iconBgColor="lightYellows"
                bgColor="bg-yellow"
                route={`/room/`}
              />
            </Link>
            <Link to={`/join`} className="block w-full">
              <HomeCard
                title="Join Meeting"
                desc="via invitation link"
                icon={<JoinCallIcon />}
                bgColor="bg-blue"
              />
            </Link>
          </div>
          <div className="flex gap-2 md:gap-6">
            <Link to={`/schedule`} className="block w-full">
              <HomeCard
                title="Schedule"
                desc="schedule your meeting"
                icon={<CalenderIcon size={20} />}
                bgColor="bg-blue"
              />
            </Link>
          </div>
          <div>
            <div className="p-3 md:p-4 md:rounded-xl rounded md:text-base text-sm md:mt-6 mt-2 text-white md:font-semibold text-center w-full bg-blue">
              <a href="https://github.com" target="_blank" rel="noreferrer">
                Group 8 SOS
              </a>
            </div>
          </div>
        </div>
        {/* Right Section: Clock and Scheduled Meetings */}
        <div className="flex-grow md:h-screen md:border-l-2 border-lightGray p-3 md:p-4">
          {/* Clock and Welcome */}
          <div className="relative md:h-52 w-full bg-slate-500 rounded md:rounded-2xl p-3 mb-6">
            <div className="md:absolute bottom-2 left-2 md:bottom-6 md:left-6">
              {user && <h1 className="text-4xl">Welcome {user?.displayName}</h1>}
              <p className="md:text-7xl text-4xl text-white">
                {`${date.getHours() < 10 ? `0${date.getHours()}` : date.getHours()}:${
                  date.getMinutes() < 10 ? `0${date.getMinutes()}` : date.getMinutes()
                }`}
              </p>
              <p className="text-slate-300 font-thin my-1">
                {`${days[date.getDay()]},${date.getDate()} ${
                  months[date.getMonth()]
                } ${date.getFullYear()}`}
              </p>
            </div>
          </div>
          {/* Scheduled Meetings Section */}
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl text-white font-semibold mb-4">Scheduled Meetings</h2>
            {error && <p className="text-red-400 mb-4">{error}</p>}
            {user ? (
              isLoadingMeetings ? (
                <p className="text-slate-300">Loading meetings...</p>
              ) : meetings.length > 0 ? (
                <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-600 scrollbar-track-darkBlue1 pr-2">
                  {meetings.map((meeting) => (
                    <div
                      key={meeting.id}
                      className="bg-darkBlue2 p-4 rounded-lg shadow-lg flex justify-between items-center mb-4"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg text-white">{meeting.title}</h3>
                          {!meeting.isCreator && (
                            <span className="text-xs text-blue-300 bg-blue-900 px-2 py-1 rounded">
                              Invited
                            </span>
                          )}
                        </div>
                        <p className="text-slate-300">
                          {new Date(`${meeting.date}T${meeting.time}`).toLocaleString()}
                        </p>
                        <p className="text-slate-400 text-sm">{meeting.description}</p>
                        <p className="text-slate-400 text-sm">Created by: {meeting.createdBy}</p>
                      </div>
                      <Link
                        to={`/room/${meeting.roomID}`}
                        className="bg-blue text-white py-2 px-4 rounded-lg hover:bg-blue-600"
                      >
                        Join
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-300">No scheduled meetings found.</p>
              )
            ) : (
              <div className="text-center">
                <p className="text-slate-300 mb-4">Please log in to view scheduled meetings.</p>
                <button
                  onClick={handleLogin}
                  className="bg-blue text-white py-2 px-4 rounded-lg hover:bg-blue-600"
                >
                  Log in with Google
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;