import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { v4 as uuid } from "uuid";
import { MdArrowBack as BackIcon } from "react-icons/md";
import { MdContentCopy as CopyIcon } from "react-icons/md";
import { useAuth } from "../context/AuthContext";
import { firestore } from "../firebase/config";
import { collection, addDoc } from "firebase/firestore";

const ScheduleMeeting = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: "",
    date: "",
    time: "",
    description: "",
    invitedEmails: "",
  });
  const [error, setError] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
    setCopied(false);
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      setError("Meeting title is required");
      return false;
    }
    const selectedDateTime = new Date(`${formData.date}T${formData.time}`);
    if (!formData.date || !formData.time || selectedDateTime <= new Date()) {
      setError("Please select a future date and time");
      return false;
    }
    // Validate email addresses
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const emails = formData.invitedEmails
      .split(",")
      .map((email) => email.trim())
      .filter((email) => email);
    if (emails.length === 0) {
      setError("At least one invited email is required");
      return false;
    }
    const invalidEmails = emails.filter((email) => !emailRegex.test(email));
    if (invalidEmails.length > 0) {
      setError(`Invalid email address(es): ${invalidEmails.join(", ")}`);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      setError("Please log in to schedule a meeting");
      return;
    }
    if (validateForm()) {
      console.log("Form data:", formData);
      setIsSubmitting(true);
      try {
        const roomID = uuid();
        const emails = formData.invitedEmails
          .split(",")
          .map((email) => email.trim())
          .filter((email) => email);
        const meeting = {
          roomID,
          title: formData.title,
          date: formData.date,
          time: formData.time,
          description: formData.description,
          createdBy: user.displayName || "Anonymous",
          createdByUid: user.uid,
          createdAt: new Date().toISOString(),
          invitedEmails: emails,
        };
        await addDoc(collection(firestore, "meetings"), meeting);
        const link = `${window.location.origin}/room/${roomID}`;
        setMeetingLink(link);
        setFormData({ title: "", date: "", time: "", description: "", invitedEmails: "" });
        setError("");
      } catch (err) {
        setError("Failed to schedule meeting: " + err.message);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleLogin = async () => {
    try {
      await login();
    } catch (err) {
      setError("Failed to log in: " + err.message);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(meetingLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-darkBlue1 min-h-screen text-slate-400 p-4">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-white bg-blue py-2 px-4 rounded-lg mb-4 hover:bg-blue-600"
        >
          <BackIcon size={20} />
          Back to Home
        </button>
        <div className="bg-darkBlue2 rounded-xl p-6 shadow-lg">
          <h1 className="text-2xl text-white font-semibold mb-4">Schedule a Meeting</h1>
          {user ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-300 mb-1">Meeting Title</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="w-full bg-lightGray text-white p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue"
                  placeholder="Enter meeting title"
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-slate-300 mb-1">Date</label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    className="w-full bg-lightGray text-white p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-slate-300 mb-1">Time</label>
                  <input
                    type="time"
                    name="time"
                    value={formData.time}
                    onChange={handleChange}
                    className="w-full bg-lightGray text-white p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Invited People (comma-separated emails)</label>
                <input
                  type="text"
                  name="invitedEmails"
                  value={formData.invitedEmails}
                  onChange={handleChange}
                  className="w-full bg-lightGray text-white p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue"
                  placeholder="e.g., user1@example.com, user2@example.com"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Description (Optional)</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full bg-lightGray text-white p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue"
                  placeholder="Enter meeting description"
                  rows="4"
                />
              </div>
              {error && <p className="text-red-400">{error}</p>}
              <button
                type="submit"
                className="w-full bg-blue text-white py-2 rounded-lg hover:bg-blue-600 disabled:bg-blue-400"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Scheduling..." : "Schedule Meeting"}
              </button>
            </form>
          ) : (
            <div className="text-center">
              <p className="text-slate-300 mb-4">Please log in to schedule a meeting.</p>
              <button
                onClick={handleLogin}
                className="bg-blue text-white py-2 px-4 rounded-lg hover:bg-blue-600"
              >
                Log in with Google
              </button>
            </div>
          )}
          {meetingLink && (
            <div className="mt-6 p-4 bg-lightGray rounded-lg">
              <p className="text-white mb-2">Meeting Scheduled! Share this link:</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={meetingLink}
                  readOnly
                  className="flex-1 bg-darkBlue2 text-white p-2 rounded-lg"
                />
                <button
                  onClick={copyToClipboard}
                  className="bg-blue text-white p-2 rounded-lg hover:bg-blue-600"
                >
                  <CopyIcon size={20} />
                </button>
              </div>
              {copied && <p className="text-green-400 mt-2">Link copied to clipboard!</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScheduleMeeting;