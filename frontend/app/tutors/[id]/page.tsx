'use client';

import { useState, useEffect } from "react";

export default function TutorProfilePage({ 
    params, 
} : {
    params: Promise<{ id: number }>;
}) {
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
        <h1>Tutor Profile {id} Page</h1>
    )
}