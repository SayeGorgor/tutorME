'use client';

import { useState } from "react";
import { authClient } from "@/lib/auth/client";
import { createUser } from "@/lib/api/actions/client-actions";
import type { UserRole } from "@/lib/types";

export default function SignupPage() {
    const [email, setEmail] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [role, setRole] = useState<UserRole>("student");

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            alert("Passwords do not match");
            return;
        }
        try {
            const name = `${firstName} ${lastName}`;
            const { data: result } = await authClient.signUp.email({ email, password, name });

            if(result?.user) {
                const res = await createUser({
                    authID: result.user.id,
                    email,
                    firstName,
                    lastName,
                    role,
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
                });
            }
            alert("Signup successful");
        } catch (error) {
            console.error(error);
            alert("Signup failed");
        }
    };

    return(
        <main className="relative flex flex-1 flex-col items-center justify-center gap-6 bg-[url('/images/login_page_background.jpg')] bg-cover bg-[center_60%]">
            <div id="tint" className="absolute inset-0 bg-[rgba(2,0,112,0.2)] z-10"></div>
            <form className="flex w-2/5 flex-col gap-4 bg-white p-6 rounded-md z-20" onSubmit={handleSignUp}>
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Sign Up</h1>
                    <label className="flex items-center gap-2">
                        <span className="text-gray-600">Role<span className="text-red-500">*</span></span>
                        <select className="border border-gray-300 rounded-md p-2" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
                            <option value="student">Student</option>
                            <option value="tutor">Tutor</option>
                            <option value="admin">Admin</option>
                        </select>
                    </label>
                </div>

                <div className="flex gap-4">
                    <label className="flex flex-1 flex-col gap-1">
                        <span className="text-gray-600">First Name<span className="text-red-500">*</span></span>
                        <input type="text" className="border border-gray-300 rounded-md p-2" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                    </label>
                    <label className="flex flex-1 flex-col gap-1">
                        <span className="text-gray-600">Last Name<span className="text-red-500">*</span></span>
                        <input type="text" className="border border-gray-300 rounded-md p-2" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                    </label>
                </div>

                <label className="flex flex-col gap-1">
                    <span className="text-gray-600">Email<span className="text-red-500">*</span></span>
                    <input type="email" className="border border-gray-300 rounded-md p-2" value={email} onChange={(e) => setEmail(e.target.value)} />
                </label>

                <label className="flex flex-col gap-1">
                    <span className="text-gray-600">Password<span className="text-red-500">*</span></span>
                    <input type="password" className="border border-gray-300 rounded-md p-2" value={password} onChange={(e) => setPassword(e.target.value)} />
                </label>

                <label className="flex flex-col gap-1">
                    <span className="text-gray-600">Confirm Password<span className="text-red-500">*</span></span>
                    <input type="password" className="border border-gray-300 rounded-md p-2" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                </label>

                <button type="submit" className="bg-indigo-500 text-white py-2 px-4 rounded-md hover:bg-indigo-600 cursor-pointer">
                    Sign Up
                </button>
            </form>
        </main>
    );
}