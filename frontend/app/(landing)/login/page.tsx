'use client';

import { useState } from "react";
import { authClient } from "@/lib/auth/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(""); 
    
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await authClient.signIn.email({ email, password });
            router.push("/student/dashboard"); // Redirect to the homepage after successful login
        } catch (error) {
            setError("Login failed. Please check your credentials and try again.");
        }
    };

    return(
        <main className="relative flex flex-1 flex-col items-center justify-center gap-6 bg-[url('/images/login_page_background.jpg')] bg-cover bg-[center_60%]">
            <div id="tint" className="absolute inset-0 bg-[rgba(2,0,112,0.2)] z-10"></div>
            <form onSubmit={handleLogin} className="flex w-2/5 flex-col gap-4 bg-white p-6 rounded-md z-20">
                <h1 className="text-2xl font-bold">Log In</h1>

                <label className="flex flex-col gap-1">
                    <span className="text-gray-600">Email/Phone Number</span>
                    <input type="email" className="border border-gray-300 rounded-md p-2" value={email} onChange={(e) => setEmail(e.target.value)} />
                </label>

                <label className="flex flex-col gap-1">
                    <span className="text-gray-600">Password</span>
                    <input type="password" className="border border-gray-300 rounded-md p-2" value={password} onChange={(e) => setPassword(e.target.value)} />
                </label>
                
                <button type="submit" className="bg-indigo-500 text-white py-2 px-4 rounded-md hover:bg-indigo-600">
                    Log In
                </button>
                {error && <p className="text-red-500">{error}</p>}
            </form>
        </main>
    );
}