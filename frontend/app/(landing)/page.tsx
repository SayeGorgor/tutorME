'use client';

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import styles from "./landing.module.css";

import type { Location, Subject } from "@/lib/types";
import { getSubjects } from "@/lib/api/actions/client-actions";
import SearchIcon from "@/public/icons/search_icon.svg";
// import { searchLocations } from "@/lib/api/actions/client-actions";

type SubjectCategory = {
  name: string;
  subjects: Subject[];
}

export default function Home() {
  const router = useRouter();
  const subjectsBoxRef = useRef<HTMLUListElement>(null);

  const [subject, setSubject] = useState<string>("");
  const [subjectCategories, setSubjectCategories] = useState<SubjectCategory[]>([]);
  const [area, setArea] = useState<Location | null>({city: "Atlanta", state: "GA", zip: "30301", country: "US", latitude: 33.7490, longitude: -84.3880});
  const [areaSearch, setAreaSearch] = useState<string>("");
  const [sessionType, setSessionType] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSubjectsBox, setShowSubjectsBox] = useState<boolean>(false);

  const [error, setError] = useState<string | null>(null);

  // useEffect(() => {
  //   const timeout = setTimeout(async () => {
  //     if(search.trim() === "") {
  //       setSearchResults([]);
  //       return;
  //     }
      
  //     try {
  //       const results = await searchLocations(search);
  //       setSearchResults(results);
  //       console.log("Search results:", results);
  //     } catch (error) {
  //       console.error("Failed to search locations:", error);
  //     }
  //   }, 300);

  //   return () => clearTimeout(timeout);
  // }, [search]);

  useEffect(() => {
    const handleClickOutsideSubjectsBox = (event: MouseEvent) => {
      if (
        subjectsBoxRef.current && 
        !subjectsBoxRef.current.contains(event.target as Node)
      ) {
        setShowSubjectsBox(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutsideSubjectsBox);

    return () => {
      document.removeEventListener("mousedown", handleClickOutsideSubjectsBox);
    };
  }, []);

  //Filter subjects by category
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const { data: subjectsData } = await getSubjects();
        const subjectByCategory = subjectsData?.reduce<Record<string, Subject[]>>((groups, subject) => {
            if(!groups[subject.category]) {
              groups[subject.category] = [];
            }

            groups[subject.category].push(subject);

            return groups;
          }, 
          {}
        );

        setSubjectCategories(Object.entries(subjectByCategory ?? {}).map(([category, subjects]) => ({
          name: category,
          subjects,
        })));
      } catch (error) {
        console.error("Failed to fetch subjects:", error);
      }
    };

    fetchSubjects();
  }, []);
  
  
  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const params = new URLSearchParams();

    if(subject) params.set("subject", subject);
    if(areaSearch) params.set("area", areaSearch);
    if(sessionType) params.set("sessionType", sessionType);

    const queryString = params.toString();
    const searchUrl = `/tutors${queryString ? `?${queryString}` : ""}`;
    router.push(searchUrl);
  };

  const findTutor = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if(!subject) {
      setError("Must select a subject.");
      return;
    }

    const params = new URLSearchParams();
    setError(null);

    params.set("subject", subject);
    params.set("city", area?.city || "");
    params.set("state", area?.state || "");
    params.set("lat", area?.latitude?.toString() || "");
    params.set("long", area?.longitude?.toString() || "");
    if(sessionType) {
      params.set("sessionType", sessionType);
    }

    const queryString = params.toString();
    router.push(`/tutors${queryString ? `?${queryString}` : ""}`);
  };

  return (
    <main id="body" className={`${styles.page} flex-1 px-4 sm:px-6 lg:px-10`}>

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

          <div id="top-card-main-content-right" className="hidden sm:block">
            <div id="a-plus-badge" className="flex flex-col bg-indigo-500 h-4/5 rounded-lg items-center p-2">
              <div className="rounded-sm p-6 mt-8 mb-4 bg-indigo-300 text-2xl">
                A+
              </div>
              <p className="font-bold">4.9 Average Rating</p>
              <p>10k+ Sessions Booked</p>
            </div>
          </div>
        </div>

        <form id="search-tutors-section" className="flex rounded-md">
          <label className="relative flex flex-col flex-2 bg-white rounded-l-md">
            <span className="ml-3 mt-1 text-gray-600 text-[.8rem]">SUBJECT</span>
            <input 
              id="subject-dropdown" 
              type="text"
              placeholder="Math, Coding, Science..."
              className="appearance-none p-3 bg-white rounded-l-md cursor-pointer"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              onFocus={() => setShowSubjectsBox(true)}
            />
            <ul
              id="subjects-box"
              ref={subjectsBoxRef}
              className={`absolute top-full bottom-auto left-0 mt-1 lg:top-auto lg:bottom-full lg:mb-1 flex max-h-[40dvh] lg:max-h-72 flex-wrap w-full lg:w-150 max-w-[calc(100vw-4rem)] z-10 bg-white border border-gray-400 rounded-md overflow-y-auto ${showSubjectsBox ? 'block' : 'hidden'}`}
            >
              {subjectCategories.map((category) => (
                <li key={category.name} className="p-2">
                  <span className="block text-lg font-semibold">
                    {category.name}
                  </span>
                  {category.subjects?.map((subject) => (
                    <button 
                      key={subject.id}  
                      className="block text-md text-gray-500 hover:text-gray-700 cursor-pointer"
                      onClick={(e) => {
                        e.preventDefault();
                        setSubject(subject.name);
                        setShowSubjectsBox(false);
                      }}
                    >
                      {subject.name}
                    </button>
                  ))}
                </li>
              ))}
            </ul>
          </label>

          <div className="w-px h-full bg-gray-400" />

          <label className="relative flex flex-col flex-2 bg-white">
            <span className="ml-3 mt-1 text-gray-600 text-[.8rem]">AREA</span>
            <div className="flex items-center">
              <input 
                id="area-input" 
                type="text" 
                placeholder="Atlanta, GA..." 
                className="p-3 bg-white cursor-pointer"
                value={areaSearch}
                onChange={(e) => setAreaSearch(e.target.value)}
              />
              {/* <Image 
                src="/icons/search_icon.svg" 
                alt="Search Icon" 
                width={30} 
                height={30} 
                className="mb-2 mr-5 -translate-x-1/2" 
              /> */}
              <SearchIcon className="absolute right-[-25] mb-2 mr-5 -translate-x-1/2 h-8.5 w-8.5 sm:h-9 sm:w-9" />
            </div>
          </label>

          <div className="w-px h-full bg-gray-400" />

          <label className="flex flex-col flex-2 bg-white">
            <span className="ml-3 mt-1 text-gray-600 text-[.8rem]">SESSION TYPE</span>
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
            onClick={findTutor}
          >
            Find Tutor
          </button>
        </form>
        {error && <p className="text-red-500 mt-2">{error}</p>}
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
