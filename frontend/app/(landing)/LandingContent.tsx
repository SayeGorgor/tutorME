'use client';

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./landing.module.css";

import type { ServiceArea, Subject } from "@/lib/types";
import { getSubjects } from "@/lib/api/actions/client-actions";
import ServiceAreaPicker from "@/components/ServiceAreaPicker";
// import { searchLocations } from "@/lib/api/actions/client-actions";

type SubjectCategory = {
  name: string;
  subjects: Subject[];
}

export default function Home() {
  const router = useRouter();
  const pageRef = useRef<HTMLElement>(null);
  const subjectsBoxRef = useRef<HTMLUListElement>(null);

  const [subject, setSubject] = useState<string>("");
  const [subjectCategories, setSubjectCategories] = useState<SubjectCategory[]>([]);
  const [area, setArea] = useState<ServiceArea | null>(null);
  const [sessionType, setSessionType] = useState("all");
  const [showSubjectsBox, setShowSubjectsBox] = useState<boolean>(false);

  const [error, setError] = useState<string | null>(null);

  useLayoutEffect(() => {
    if (!showSubjectsBox) return;
    const dropdown = subjectsBoxRef.current;
    const field = dropdown?.parentElement;
    if (!dropdown || !field) return;
    const positionDropdown = () => {
      if (!window.matchMedia("(min-width: 64rem)").matches) {
        delete dropdown.dataset.placement;
        dropdown.style.removeProperty("--subjects-max-height");
        return;
      }
      const bounds = field.getBoundingClientRect();
      const gap = 12;
      const margin = 16;
      const above = Math.max(0, bounds.top - gap - margin);
      const below = Math.max(0, window.innerHeight - bounds.bottom - gap - margin);
      const heightLimit = 20 * parseFloat(getComputedStyle(document.documentElement).fontSize);
      const desiredHeight = Math.min(dropdown.scrollHeight + 2, heightLimit);
      const openAbove = below < desiredHeight && above > below;
      dropdown.dataset.placement = openAbove ? "top" : "bottom";
      dropdown.style.setProperty("--subjects-max-height", `${Math.min(heightLimit, openAbove ? above : below)}px`);
    };
    positionDropdown();
    window.addEventListener("resize", positionDropdown);
    window.addEventListener("scroll", positionDropdown, true);
    return () => {
      window.removeEventListener("resize", positionDropdown);
      window.removeEventListener("scroll", positionDropdown, true);
    };
  }, [showSubjectsBox, subjectCategories]);

  useEffect(() => {
    const page = pageRef.current;
    const navigation = page?.previousElementSibling;
    if (!page || !navigation) return;
    const measureNavigation = () => {
      page.style.setProperty("--landing-nav-height", `${navigation.getBoundingClientRect().height}px`);
    };
    measureNavigation();
    const observer = new ResizeObserver(measureNavigation);
    observer.observe(navigation);
    return () => observer.disconnect();
  }, []);

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
  
  
  const findTutor = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (sessionType === "in-person" && !area) { setError("Choose a city or ZIP code for in-person tutoring."); return; }
    const params = new URLSearchParams({ mode: sessionType });
    if (subject) params.set("subject", subject);
    if (area && sessionType !== "online") params.set("areaId", area.id);
    setError(null);
    router.push(`/tutors?${params}`);
  };

  return (
    <main ref={pageRef} id="body" className={`${styles.page} flex-1 px-4 sm:px-6 lg:px-10`}>

      <div id="top-card" className="flex flex-col bg-blue-100 h-[25rem] rounded-md p-6 my-2">
        <div id="top-card-main-content" className="flex justify-between h-full">

          <div id="top-card-main-content-left" className="flex flex-col h-4/5 justify-between">
            <div className="bg-blue-200 w-fit p-1 rounded-lg text-base">
              A LITTLE GUIDANCE. A BIG DIFFERENCE.
            </div>
            <div className="flex flex-col gap-2">
              <h1 className="text-4xl font-bold">Your next breakthrough<br />starts <span>right here.</span></h1>
              <p className="hero-description">Find a tutor who gets you. Build confidence, explore new ideas, and move forward at your pace ? online or close to home.</p>
            </div>
          </div>

          <div id="top-card-main-content-right" className="hidden sm:block" aria-label="Personalized learning">
            <div className="learning-note">
              <div className="note-heading"><span>YOUR NEXT CHAPTER</span><span aria-hidden="true">?</span></div>
              <div className="note-symbol" aria-hidden="true">a? + b?</div>
              <h2>A fresh perspective.<br />A little more confidence.</h2>
              <p>Great things happen when<br />learning feels personal.</p>
              <div className="note-footer"><span aria-hidden="true">?</span> Made for your way of learning</div>
            </div>
          </div>
        </div>

        <form id="search-tutors-section" data-match-location-height onSubmit={findTutor}>
          <div className="search-field relative">
            <label htmlFor="subject-dropdown" className="search-label">Subject</label>
            <input
              id="subject-dropdown"
              type="text"
              placeholder="Subject or skill"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              onFocus={() => setShowSubjectsBox(true)}
              onKeyDown={(e) => { if (e.key === "Escape") setShowSubjectsBox(false); }}
              autoComplete="off"
              aria-controls="subjects-box"
            />
            <ul id="subjects-box" ref={subjectsBoxRef} className={showSubjectsBox ? "subject-options" : "hidden"}>
              {subjectCategories.map(category => <li key={category.name}>
                <p className="mb-2 text-xs font-semibold text-blue-700">{category.name}</p>
                {category.subjects.map(item => <button key={item.id} type="button" onClick={() => { setSubject(item.name); setShowSubjectsBox(false); }} className="block w-full rounded-lg px-2 py-2 text-left text-sm text-slate-600 hover:bg-blue-50 hover:text-blue-800">{item.name}</button>)}
              </li>)}
              {subjectCategories.length === 0 && <li className="text-sm text-slate-500">Type a subject to search.</li>}
            </ul>
          </div>
          <div className="search-field search-area">
            {sessionType === "online" ? <><span className="search-label">Area</span><div className="online-location">Anywhere online</div></> : <ServiceAreaPicker value={area} onChange={setArea} showDescription={false} label="Area" />}
          </div>
          <div className="search-field">
            <label htmlFor="session-dropdown" className="search-label">Session type</label>
            <select id="session-dropdown" value={sessionType} onChange={e => setSessionType(e.target.value)}>
              <option value="all">Online &amp; in person</option>
              <option value="online">Online</option>
              <option value="in-person">In person</option>
            </select>
          </div>
          <button type="submit" className="search-submit">Find a tutor <span aria-hidden="true">&rarr;</span></button>
        </form>
        {error && <p role="alert" className="text-red-500 mt-2">{error}</p>}
      </div>

      <section id="how-it-works" className="how-section">
        <div className="section-heading"><div><p className="eyebrow">A CLEAR PATH FORWARD</p><h2>Good support changes everything.</h2></div><Link href="/tutors">Explore tutors <span aria-hidden="true">?</span></Link></div>
        <div className="steps-grid">
          {[
            ["01", "Find your fit", "Explore tutor profiles and discover someone who matches your goals and learning style."],
            ["02", "Make room to learn", "Check weekly availability and find a time that works with your everyday life."],
            ["03", "Build your confidence", "Bring your questions, work through challenges, and take your next step forward."],
          ].map(([number, title, description]) => <article key={number}><span className="step-number">{number}</span><h3>{title}</h3><p>{description}</p></article>)}
        </div>
      </section>
      <footer className="landing-footer"><span>tutorME ? A better way to move forward.</span><Link href="/signup/tutor">Share what you know. Become a tutor ?</Link></footer>
    </main>
  );
}
