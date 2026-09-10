'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TutorProfilePage({ 
    params, 
} : {
    params: Promise<{ id: number }>;
}) {
    const router = useRouter();
    
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [id, setId] = useState<number | null>(null);
    
    useEffect(() => {
        const fetchTutorProfile = async () => {
            const { id } = await params;
            setId(id);
        };
        fetchTutorProfile();
    }, [params]);

    return (
        <div>
            <h1>Tutor Profile {id} Page</h1>
            <button onClick={() => router.back()}>Back</button>
        </div>
    )
}