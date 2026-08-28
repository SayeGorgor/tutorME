'use client';

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { subjects } from "@/constants/subjects";

export default function Home() {
  const router = useRouter();

  const [subject, setSubject] = useState<string>("");
  const [area, setArea] = useState<string>("");
  const [sessionType, setSessionType] = useState<string>("");

  useEffect(() => {
  }, []);
  
  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const params = new URLSearchParams();

    if(subject) params.set("subject", subject);
    if(area) params.set("area", area);
    if(sessionType) params.set("sessionType", sessionType);

    const queryString = params.toString();
    const searchUrl = `/tutors${queryString ? `?${queryString}` : ""}`;
    router.push(searchUrl);
  };

  return (
    <main id="body" className="flex-1 px-10">

      <div id="top-card" className="flex flex-col bg-blue-100 h-[25rem] rounded-md p-6 my-2">
        <div id="top-card-main-content" className="flex justify-between h-full">

          <div id="top-card-main-content-left" className="flex flex-col h-4/5 justify-between">
            <div className="bg-blue-200 w-fit p-1 rounded-lg text-base">
              Online + Local
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="text-4xl font-bold w-1/2">Learn from the right tutor, wherever you are</h2>
              <h2 className="text-2xl w-1/2">Search trusted tutors by subject, availability, price, and location. Meet online or in person.</h2>
            </div>
          </div>

          <div id="top-card-main-content-right">
            <div id="a-plus-badge" className="flex flex-col bg-indigo-500 h-4/5 rounded-lg items-center p-2">
              <div className="rounded-sm p-6 mt-8 mb-4 bg-indigo-300 text-2xl">
                A+
              </div>
              <p className="font-bold">4.9 Average Rating</p>
              <p>10k+ Sessions Booked</p>
            </div>
          </div>
        </div>

        <form id="search-tutors-section" className="flex rounded-md w-3/4">
          <label className="flex flex-col flex-2 bg-white rounded-l-md">
            <span className="ml-4 mt-1 text-gray-600 text-[.8rem]">SUBJECT</span>
            <select 
              id="subject-dropdown" 
              className="appearance-none p-3 bg-white rounded-l-md cursor-pointer"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            >
              <option value="">Math, Coding, Science...</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>{subject.name}</option>
              ))}
            </select>
          </label>

          <div className="w-px h-full bg-gray-400" />

          <label className="flex flex-col flex-2 bg-white">
            <span className="ml-4 mt-1 text-gray-600 text-[.8rem]">AREA</span>
            <select 
              id="area-dropdown" 
              className="appearance-none p-3 bg-white cursor-pointer"
              value={area}
              onChange={(e) => setArea(e.target.value)}
            >
              <option value="">Atlanta, GA</option>
            </select>
          </label>

          <div className="w-px h-full bg-gray-400" />

          <label className="flex flex-col flex-2 bg-white">
            <span className="ml-4 mt-1 text-gray-600 text-[.8rem]">SESSION TYPE</span>
            <select 
              id="session-dropdown" 
              className="appearance-none p-3 bg-white cursor-pointer"
              value={sessionType}
              onChange={(e) => setSessionType(e.target.value)}
            >
              <option value="">Online + In Person</option>
              <option value="online">Online</option>
              <option value="in-person">In Person</option>
            </select>
          </label>
          
          <button 
            type="submit" 
            className="flex-1 bg-indigo-500 px-10 rounded-r-md cursor-pointer hover:bg-indigo-600 active:bg-indigo-700"
            onClick={(e) => e.preventDefault()}
          >
            Find Tutor
          </button>
        </form>
      </div>

      <div id="info-banner" className="flex justify-evenly items-center h-[calc(100vh_-_35rem)] bg-blue-800 text-white mt-2 rounded-md">
        <p className="text-base">Verified tutor profiles</p>
        <p className="text-base">Secure booking & payments</p>
        <p className="text-base">Online or meet locally</p>
        <p className="text-base">Verified tutor profiles</p>
      </div>
    </main>
  );
}
