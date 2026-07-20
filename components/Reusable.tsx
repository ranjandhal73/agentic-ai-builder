import React from "react";


export const GrayTitle = ({children}: {children: React.ReactNode}) => {
    return <span className="text-white/60">{children}</span>
}

export const BlueTitle = ({
    children, className = ""
}: {
    children: React.ReactNode;
    className?: string
}) => {
    return (
        <span className={`bg-linear-to-br font-serif from-blue-300 via-blue-400 to-blue-600 bg-clip-text text-transparent ${className}`}>{children}</span>
    );
};

export const SectionLabel = ({
    children
}: {
    children: React.ReactNode;
}) => {
    return (
        <p 
            className={`inline-flex items-center gap-2 text-xs font-semibold text-blue-400 tracking-[0.14rem] uppercase mb-4`}
        >
            <span className="w-4 h-px bg-blue-400"/>
                {children}
            <span className="w-4 h-px bg-blue-400"/>
        </p>
    );
};

export const SectionHeading = ({ gray, blue }: {gray: string; blue: string}) => {
    return (
        <h2 className="font-serif text-[clamp(2rem,4vw,3rem)] leading-[1.1] tracking-tight">
            <GrayTitle>{gray}</GrayTitle>
            <br />
            <BlueTitle>{blue}</BlueTitle>
        </h2>
    );
}

