'use client';

import { useState } from "react";
import { authPageClass, authFormClass } from "@/components/auth-layout";

import { useRouter } from "next/navigation";
import Image from "next/image";

import { authClient } from "@/lib/auth/client";
import { getCurrentUser } from "@/lib/api/actions/client-actions";

export default function LoginPage() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const [loading, setLoading] = useState(false);
    const [hasError, setHasError] = useState(false); 
    const [systemMessage, setSystemMessage] = useState("");
    
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setSystemMessage("");
        setHasError(false);

        try {
            const { error: loginError } = await authClient.signIn.email({ email, password });
            if (loginError) {
                setHasError(true);
                setSystemMessage("Login failed, please check your credentials and try again");
            } else {
                const { data: currentUser } = await getCurrentUser();
                if (currentUser) {
                    if(currentUser.role === "admin") {
                        router.push("/student/dashboard");
                    } else {
                        router.push(`/${currentUser.role}/dashboard`);
                    }
                } else {
                    setHasError(true);
                    setSystemMessage("Internal server error");
                }
            }
        } catch (err) {
            setHasError(true);

            if (
                err instanceof Error &&
                "status" in err &&
                err.status === 401 &&
                err.message.includes("email or password")
            ) {
                setSystemMessage(
                    "Invalid login credentials, please try again"
                );
            } else {
                console.error(err);
                setSystemMessage("Internal server error");
            }
        }
            setLoading(false);
        };

    return(
        <main className={authPageClass}>
            <div id="tint" className="absolute inset-0 bg-[rgba(2,0,112,0.2)] z-10"></div>
            <form onSubmit={handleLogin} className={authFormClass}>
                <h1 className="text-2xl font-bold">Log In</h1>

                {loading ? 
                    <Image 
                        src="/icons/loading_animation_icon.svg" 
                        alt="Loading Animation" 
                        width={28} 
                        height={28} 
                        className="self-center inline-block" 
                    /> 
                    : 
                    systemMessage && <p className={`self-center text-lg ${hasError ? "text-red-500" : "text-green-500"}`}>{systemMessage}</p>
                }

                <label className="flex flex-col gap-1">
                    <span className="text-gray-600">Email/Phone Number</span>
                    <input type="email" className="border border-gray-300 rounded-md p-2" value={email} onChange={(e) => setEmail(e.target.value)} />
                </label>

                <label className="flex flex-col gap-1">
                    <span className="text-gray-600">Password</span>
                    <div className="relative">
                        <input type={showPassword ? "text" : "password"} className="border border-gray-300 rounded-md p-2 w-full" value={password} onChange={(e) => setPassword(e.target.value)} />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-1 top-1/2 flex w-11 -translate-y-1/2 items-center justify-center">
                            <Image
                                src={showPassword ? "/icons/hide_password_icon.svg" : "/icons/show_password_icon.svg"}
                                alt={showPassword ? "Hide password" : "Show password"}
                                width={25}
                                height={25}
                                className="cursor-pointer"
                            />
                        </button>
                    </div>
                </label>
                
                <button type="submit" className="bg-indigo-500 text-white py-2 px-4 rounded-md hover:bg-indigo-600">
                    Log In
                </button>
            </form>
        </main>
    );
}