export const subjects = [
    {
        id: "math",
        name: "Math",
        topics: [
            "Algebra",
            "Geometry",
            "Trigonometry",
            "Calculus"
        ]
    },
    {
        id: "english",
        name: "English",
        topics: [
            "Grammar",
            "US Literature",
        ]
    },
    {
        id: "science",
        name: "Science",
        topics: [
            "Chemistry",
            "Physics",
            "Biology",
        ]
    },
    {
        id: "social-studies",
        name: "Social Studies",
        topics: [
            "US History",
            "World History",
            "US Government",
        ]
    },
    {
        id: "coding",
        name: "Coding",
        topics: [
            "Java",
            "JavaScript",
            "C#",
            "Python",
            "GO",
            "Rust"
        ]
    },
    {
        id: "sat-prep",
        name: "SAT Prep",
        topics: [
            "SAT Math Prep",
            "SAT Reading/English Prep",
            "SAT Full Prep",
        ]
    },
    {
        id: "act-prep",
        name: "ACT Prep",
        topics: [
            "ACT Math Prep",
            "ACT Reading/English Prep",
            "ACT Science Prep",
            "ACT Full Prep",
        ]
    },
] as const;

export type Subject = (typeof subjects)[number];